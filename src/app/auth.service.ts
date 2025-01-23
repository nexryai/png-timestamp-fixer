/// <reference types="gapi"/>
/// <reference types="gapi.auth2"/>

import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private authClient!: gapi.auth2.GoogleAuth;

  public clientLoad(): void {
    // gapi.authインスタンスを使用できるようにロードする(scopeはOAuthの同意画面で設定したScopeを指定)
    gapi.load('client:auth2', () => {
      this.authClient = gapi.auth2.init({
        client_id: '491654368730-sdjjubefa3b3ulsm8h8gvhkosclthn27.apps.googleusercontent.com',
        fetch_basic_profile: true,
        scope: 'openid https://www.googleapis.com/auth/photoslibrary.appendonly',
      });
      gapi.client.init({
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/photoslibrary/v1/rest']
      })
    });

    console.log('clientLoad');
  }

  public async signIn(): Promise<void> {
    const res = await this.authClient.signIn();
  }
}
