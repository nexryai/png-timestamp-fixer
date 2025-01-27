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
  styleUrl: './app.component.scss',
  template: `
    <main class="main">
      <div class="content">
        <div class="left-side">
          @if (authState() === AuthState.Checking) {
            <p>Loading...</p>
          } @else if (authState() === AuthState.SignedIn) {
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
  `
})
export class AppComponent {
  public AuthState = AuthState;
  public authState = signal(AuthState.Checking);
  private accessToken = '';

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
      this.accessToken = this.authService.getAccessToken();
      this.authState.set(AuthState.SignedIn);
    }
  }

  public async handleFiles(files: FileList) {
    for (let i = 0; i < files.length; i++) {
      const buffer = new Uint8Array(await files[i].arrayBuffer());
      const filename = files[i].name;

      try {
        await this.imageService.uploadToGooglePhotos(buffer, filename, this.accessToken);
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
