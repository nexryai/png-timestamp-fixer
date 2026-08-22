# Firebase Hosting OIDC 初回セットアップ

GitHub ActionsからFirebase Hostingへ、サービスアカウントキーを保存せずにデプロイするための初回設定です。Google Cloud Shellで実行してください。

このリポジトリのWorkflowは、GitHubのRepository Variablesにある次の値を参照します。

- `GCP_WORKLOAD_IDENTITY_PROVIDER`
- `GCP_SERVICE_ACCOUNT`

## 1. 設定値

フォーク先に合わせて、少なくとも`PROJECT_ID`と`GITHUB_REPOSITORY`を変更します。デフォルトブランチが`main`ではない場合は`GITHUB_BRANCH`も変更してください。

```bash
set -euo pipefail

PROJECT_ID="timestamp-fixer"
GITHUB_REPOSITORY="nexryai/png-timestamp-fixer"
GITHUB_BRANCH="main"

SERVICE_ACCOUNT_ID="github-firebase-hosting"
WORKLOAD_IDENTITY_POOL_ID="github-actions"
WORKLOAD_IDENTITY_PROVIDER_ID="github"
```

以降のコマンドは、変数が設定された同じCloud Shellセッションで続けて実行します。スクリプトファイルとして実行する場合は、GitHub Variablesの登録まで同じスクリプト内で実行するか、必要な値を再取得してください。

## 2. プロジェクトとAPIの準備

```bash
gcloud config set project "${PROJECT_ID}"

gcloud services enable \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  sts.googleapis.com \
  firebase.googleapis.com \
  firebasehosting.googleapis.com \
  cloudresourcemanager.googleapis.com \
  --project="${PROJECT_ID}"

PROJECT_NUMBER="$(
  gcloud projects describe "${PROJECT_ID}" \
    --format="value(projectNumber)"
)"

GITHUB_REPOSITORY_ID="$(
  curl -fsSL "https://api.github.com/repos/${GITHUB_REPOSITORY}" |
    jq -r '.id'
)"

if [[ -z "${PROJECT_NUMBER}" || -z "${GITHUB_REPOSITORY_ID}" || "${GITHUB_REPOSITORY_ID}" == "null" ]]; then
  echo "プロジェクト番号またはGitHub Repository IDを取得できませんでした。" >&2
  exit 1
fi
```

## 3. デプロイ用サービスアカウント

```bash
SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_ID}@${PROJECT_ID}.iam.gserviceaccount.com"

if ! gcloud iam service-accounts describe "${SERVICE_ACCOUNT_EMAIL}" \
  --project="${PROJECT_ID}" >/dev/null 2>&1; then
  gcloud iam service-accounts create "${SERVICE_ACCOUNT_ID}" \
    --project="${PROJECT_ID}" \
    --display-name="GitHub Firebase Hosting deployer"
fi

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
  --role="roles/firebasehosting.admin" \
  --quiet

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
  --role="roles/serviceusage.apiKeysViewer" \
  --quiet

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
  --role="roles/serviceusage.serviceUsageConsumer" \
  --quiet
```

サービスアカウントキーの作成やダウンロードは不要です。

## 4. Workload Identity Pool

```bash
if ! gcloud iam workload-identity-pools describe \
  "${WORKLOAD_IDENTITY_POOL_ID}" \
  --project="${PROJECT_ID}" \
  --location="global" >/dev/null 2>&1; then
  gcloud iam workload-identity-pools create \
    "${WORKLOAD_IDENTITY_POOL_ID}" \
    --project="${PROJECT_ID}" \
    --location="global" \
    --display-name="GitHub Actions"
fi
```

## 5. GitHub OIDC Provider

ProviderはGitHubリポジトリの不変IDと対象ブランチで制限します。これにより、ほかのリポジトリやブランチのOIDCトークンでは認証できません。

```bash
if ! gcloud iam workload-identity-pools providers describe \
  "${WORKLOAD_IDENTITY_PROVIDER_ID}" \
  --project="${PROJECT_ID}" \
  --location="global" \
  --workload-identity-pool="${WORKLOAD_IDENTITY_POOL_ID}" >/dev/null 2>&1; then
  gcloud iam workload-identity-pools providers create-oidc \
    "${WORKLOAD_IDENTITY_PROVIDER_ID}" \
    --project="${PROJECT_ID}" \
    --location="global" \
    --workload-identity-pool="${WORKLOAD_IDENTITY_POOL_ID}" \
    --display-name="GitHub repository provider" \
    --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.repository_id=assertion.repository_id,attribute.repository_owner=assertion.repository_owner,attribute.ref=assertion.ref" \
    --attribute-condition="assertion.repository_id == '${GITHUB_REPOSITORY_ID}' && assertion.ref == 'refs/heads/${GITHUB_BRANCH}'"
fi
```


## 6. GitHub Actionsにサービスアカウントの権限借用を許可

GitHub OIDCで認証されたこのリポジトリのWorkflowに、デプロイ用サービスアカウントの権限を一時的に借用することを許可します。

```bash
WORKLOAD_IDENTITY_POOL_NAME="$(
  gcloud iam workload-identity-pools describe \
    "${WORKLOAD_IDENTITY_POOL_ID}" \
    --project="${PROJECT_ID}" \
    --location="global" \
    --format="value(name)"
)"

gcloud iam service-accounts add-iam-policy-binding \
  "${SERVICE_ACCOUNT_EMAIL}" \
  --project="${PROJECT_ID}" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/${WORKLOAD_IDENTITY_POOL_NAME}/attribute.repository_id/${GITHUB_REPOSITORY_ID}" \
  --quiet
```

## 7. GitHub Repository Variables

Providerの完全なリソース名を取得します。

```bash
WORKLOAD_IDENTITY_PROVIDER_NAME="$(
  gcloud iam workload-identity-pools providers describe \
    "${WORKLOAD_IDENTITY_PROVIDER_ID}" \
    --project="${PROJECT_ID}" \
    --location="global" \
    --workload-identity-pool="${WORKLOAD_IDENTITY_POOL_ID}" \
    --format="value(name)"
)"

printf 'GCP_WORKLOAD_IDENTITY_PROVIDER=%s\n' "${WORKLOAD_IDENTITY_PROVIDER_NAME}"
printf 'GCP_SERVICE_ACCOUNT=%s\n' "${SERVICE_ACCOUNT_EMAIL}"
```

GitHub CLIへログインし、Repository Variablesとして登録します。SecretsやEnvironment Variablesではなく、Repository Variablesへ登録する必要があります。

```bash
gh auth status || gh auth login --hostname github.com --web

gh variable set GCP_WORKLOAD_IDENTITY_PROVIDER \
  --repo="${GITHUB_REPOSITORY}" \
  --body="${WORKLOAD_IDENTITY_PROVIDER_NAME}"

gh variable set GCP_SERVICE_ACCOUNT \
  --repo="${GITHUB_REPOSITORY}" \
  --body="${SERVICE_ACCOUNT_EMAIL}"

gh variable list --repo="${GITHUB_REPOSITORY}"
```

GitHub CLIを利用しない場合は、GitHubの次の画面から同じ2つの値を登録します。

`Repository Settings → Secrets and variables → Actions → Variables`

## 8. 設定確認

```bash
gcloud iam workload-identity-pools providers describe \
  "${WORKLOAD_IDENTITY_PROVIDER_ID}" \
  --project="${PROJECT_ID}" \
  --location="global" \
  --workload-identity-pool="${WORKLOAD_IDENTITY_POOL_ID}"

gcloud iam service-accounts get-iam-policy \
  "${SERVICE_ACCOUNT_EMAIL}" \
  --project="${PROJECT_ID}"
```

IAMとWorkload Identity Federationの設定反映には数分かかる場合があります。反映後、対象ブランチへpushすると`.github/workflows/firebase-hosting-merge.yml`が実行されます。

認証ステップで次のエラーが出る場合は、GitHub Repository Variablesが未設定または別のスコープに登録されています。

```text
the GitHub Action workflow must specify exactly one of
"workload_identity_provider" or "credentials_json"
```

その場合は`gh variable list --repo="${GITHUB_REPOSITORY}"`で、次の2項目が存在することを確認してください。

- `GCP_WORKLOAD_IDENTITY_PROVIDER`
- `GCP_SERVICE_ACCOUNT`
