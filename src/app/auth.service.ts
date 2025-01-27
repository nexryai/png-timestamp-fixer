import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private clientId = '491654368730-sdjjubefa3b3ulsm8h8gvhkosclthn27.apps.googleusercontent.com';
  private accessToken: string | null = null;

  public initClient() {
    // Google Identity Services クライアントを初期化
    //@ts-ignore
    google.accounts.oauth2.initTokenClient({
      client_id: this.clientId,
      scope: 'https://www.googleapis.com/auth/photoslibrary.appendonly',
      //@ts-ignore
      callback: (response: google.accounts.oauth2.TokenResponse) => {
        this.accessToken = response.access_token;
        console.log('Access token acquired:', this.accessToken);
      },
    });
  }

  public async requestAccessToken(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      //@ts-ignore
      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: this.clientId,
        scope: 'https://www.googleapis.com/auth/photoslibrary.appendonly',
        //@ts-ignore
        callback: (response) => {
          if (response.access_token) {
            this.accessToken = response.access_token;
            resolve();
          } else {
            reject('Failed to acquire access token.');
          }
        },
      });

      // トークンのリクエストを開始
      tokenClient.requestAccessToken();
    });
  }

  public isSignedIn(): boolean {
    return !!this.accessToken;
  }

  public getAccessToken(): string {
    if (!this.accessToken) {
      throw new Error('Access token is not available.');
    }
    return this.accessToken;
  }

  public async getUserName(): Promise<string> {
    if (!this.accessToken) {
      throw new Error('Access token is not available.');
    }

    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user information.');
    }

    const data = await response.json();
    return data.name;
  }
}
