import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { MatButton } from '@angular/material/button';
import { AuthService } from './auth.service';
import { MatProgressBar } from '@angular/material/progress-bar';
import { ImageService } from './image.service';
import { NgOptimizedImage } from '@angular/common';

enum LoadState {
  Ready,
  PermissionRequired,
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
          @if (loadState() === LoadState.Checking) {
            <p>Loading...</p>
          } @else if (loadState() === LoadState.Ready) {
            <h2>{{ uploadStatusText }}</h2>
            <p class="progress-message">
              {{ uploadStatusSubText }}
            </p>
            <mat-progress-bar mode="determinate" [value]="uploadProgress" [bufferValue]="uploadProgress" />
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
              This is a tool that embeds an EXIF format timestamp into a png file, <br>
              allowing it to be handled with the correct timestamp in Google Photos and photo viewers.
              <br><br>
              <a href="/">Terms & Privacy</a>
            </p>
            <div class="start-button">
              <button mat-button (click)="setOutputDirectory()">
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
  protected LoadState = LoadState;
  protected loadState = signal(LoadState.PermissionRequired);
  protected uploadStatusText = 'Please select files to fix timestamp.';
  protected uploadStatusSubText = 'Waiting for you to select files to fix.';
  protected uploadProgress = 0;
  private directoryHandle: FileSystemDirectoryHandle | undefined = undefined;

  constructor(
    private readonly authService: AuthService,
    private readonly imageService: ImageService,
  ) { }

  title = 'PNG Timestamp Fixer';

  ngOnInit() {
    this.authService.initClient();
  }

  public async setOutputDirectory() {
    /*
      SecurityErrorになる

      //@ts-ignore
      this.directoryHandle = await window.showDirectoryPicker();

      if (this.directoryHandle) {
        this.loadState.set(LoadState.Ready);
      }
    */

    this.loadState.set(LoadState.Ready);
  }

  public async handleFiles(files: FileList) {
    this.uploadProgress = 0;
    this.uploadStatusText = 'Processing...';
    this.uploadStatusSubText = 'Fixing timestamps and saving to directory...';

    let failed = 0;

    // @ts-ignore
    this.directoryHandle = await window.showDirectoryPicker();

    for (let i = 0; i < files.length; i++) {
      const buffer = new Uint8Array(await files[i].arrayBuffer());
      const filename = files[i].name;

      try {
        await this.imageService.saveToDirectory(buffer, filename, this.directoryHandle!);
      } catch (e) {
        console.error(e);
        failed++;
      }

      this.uploadProgress = ((i + 1) / files.length) * 100;
    }

    this.uploadProgress = 100;
    this.uploadStatusText = 'Done!';
    this.uploadStatusSubText = failed > 0
      ? `Failed to process ${failed} files.`
      : 'All files processed successfully.';
  }

  public async selectAndUploadFiles() {
    const fileElem = document.getElementById('fileElem') as HTMLInputElement;
    fileElem.click();
  }
}
