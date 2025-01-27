import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { MatButton } from '@angular/material/button';
import { AuthService } from './auth.service';
import { MatProgressBar } from '@angular/material/progress-bar';
import { ImageService } from './image.service';
import { NgOptimizedImage } from '@angular/common';

enum AuthState {
  SignedIn,
  SignedOut,
  Checking,
}

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    MatButton,
    MatProgressBar,
    NgOptimizedImage,
    NgOptimizedImage,
  ],
  template: `
    <main class="main">
      <div class="content">
        <div class="left-side">
          @if (authState() === AuthState.Checking) {
            <p>Loading...</p>
          } @else if (authState() === AuthState.SignedOut) {
            <h2>Please select files to upload</h2>
            <p class="progress-message">
              Waiting for you to select files to upload.
            </p>
            <mat-progress-bar mode="determinate" value="40"></mat-progress-bar>
            <div class="start-button">
              <input
                type="file"
                id="fileElem"
                multiple
                accept="image/*"
                style="display:none"
                (change)="handleFiles($any($event.target).files)"
              />
              <button mat-button (click)="selectAndUploadFiles()">
                Select files
              </button>
            </div>
          } @else {
            <h1>Welcome to <br> {{ title }}</h1>
            <p>
              This is an UNOFFICIAL Google Photos Uploader with timestamps fixer.<br>
              Note: Only png files are supported.
              <br><br>
              <a href="/">Terms & Privacy</a>
            </p>
            <div class="start-button">
              <button mat-button (click)="signIn()">
                Get started
              </button>
            </div>
          }
        </div>
        <div class="divider" role="separator" aria-label="Divider"></div>
        <div class="angular-logo">
          <p>Powered by</p>
          <img ngSrc="/angular.svg" alt="Angular Logo" width="128" height="32"/>
        </div>
        <div class="copyright">
          <p>©2025 nexryai All rights reserved.</p>
        </div>
      </div>
    </main>
    <router-outlet/>
  `,
  styles: `
    :host {
      --bright-blue: oklch(51.01% 0.274 263.83);
      --electric-violet: oklch(53.18% 0.28 296.97);
      --french-violet: oklch(47.66% 0.246 305.88);
      --vivid-pink: oklch(69.02% 0.277 332.77);
      --hot-red: oklch(61.42% 0.238 15.34);
      --orange-red: oklch(63.32% 0.24 31.68);

      --gray-900: oklch(19.37% 0.006 300.98);
      --gray-700: oklch(36.98% 0.014 302.71);
      --gray-400: oklch(70.9% 0.015 304.04);

      --red-to-pink-to-purple-vertical-gradient: linear-gradient(
        180deg,
        var(--orange-red) 0%,
        var(--vivid-pink) 50%,
        var(--electric-violet) 100%
      );

      --red-to-pink-to-purple-horizontal-gradient: linear-gradient(
        90deg,
        var(--orange-red) 0%,
        var(--vivid-pink) 50%,
        var(--electric-violet) 100%
      );

      --pill-accent: var(--bright-blue);

      font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
      Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji",
      "Segoe UI Symbol";
      box-sizing: border-box;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    h1 {
      font-size: 3.125rem;
      color: var(--gray-900);
      font-weight: 500;
      line-height: 100%;
      letter-spacing: -0.125rem;
      margin: 0;
      font-family: "Inter Tight", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
      Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji",
      "Segoe UI Symbol";
    }

    p {
      margin: 0;
      color: var(--gray-700);
    }

    a {
      color: var(--gray-600);
      text-decoration: none;
    }

    main {
      width: 100%;
      min-height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 1rem;
      box-sizing: inherit;
      position: relative;
    }

    .angular-logo {
      position: absolute;
      bottom: 1rem;
      left: 1rem;
      margin: 6px;
    }

    .angular-logo > p {
      margin-bottom: 8px;
    }

    .content {
      display: flex;
      justify-content: space-around;
      width: 100%;
      max-width: 700px;
      margin-bottom: 3rem;
    }

    .content h1 {
      margin-top: 1.75rem;
    }

    .content p {
      margin-top: 1.5rem;
    }

    .divider {
      width: 1px;
      background: var(--red-to-pink-to-purple-vertical-gradient);
      margin-inline: 0.5rem;
    }

    .progress-message {
      margin-bottom: 6px;
    }

    .start-button {
      width: 550px;
      display: flex;
      justify-content: end;
    }

    button {
      margin-top: 2rem;
    }

    .copyright {
      position: absolute;
      bottom: 1rem;
      right: 1rem;
    }

    @media screen and (max-width: 650px) {
      .content {
        flex-direction: column;
        width: max-content;
      }

      .divider {
        height: 1px;
        width: 100%;
        background: var(--red-to-pink-to-purple-horizontal-gradient);
        margin-block: 1.5rem;
      }
    }
  `
})
export class AppComponent {
  public AuthState = AuthState;
  public authState = signal(AuthState.Checking);

  constructor(
    private readonly authService: AuthService,
    private readonly imageService: ImageService,
  ) {}

  title = 'PNG Timestamp Fixer';

  ngOnInit() {
    this.authService.initClient();
    this.authState.set(this.authService.isSignedIn() ? AuthState.SignedIn : AuthState.SignedOut);
  }

  public async signIn() {
    await this.authService.requestAccessToken();
    const ok = this.authService.isSignedIn();
    if (!ok) {
      alert('You must grant the permission to use this app.');
    } else {
      console.log(await this.authService.getUserName());
      this.authState.set(AuthState.SignedIn);
    }
  }

  public async handleFiles(files: FileList) {
    for (let i = 0; i < files.length; i++) {
      const buffer = new Uint8Array(await files[i].arrayBuffer());
      const filename = files[i].name;

      try {
        const image = await this.imageService.uploadToGooglePhotos(buffer, filename);

        // download the image
        const blob = new Blob([image], { type: 'image/png' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);

      } catch (e) {
        console.error(e);
      }
    }
  }

  public async selectAndUploadFiles() {
    const fileElem = document.getElementById('fileElem') as HTMLInputElement;
    fileElem.click();
  }
}
