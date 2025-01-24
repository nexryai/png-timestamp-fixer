import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ExifService {
  private exifWorker: Worker;

  constructor() {
    this.exifWorker = new Worker(new URL('./workers/exif.ts', import.meta.url));
    console.log('ExifService initialized');
  }

  public async getExif(file: Uint8Array, filename: string): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      this.exifWorker.onmessage = (event) => {
        if (event.data.error) {
          console.error('Error in worker:', event.data.error);
          reject(event.data.error);
        } else {
          console.log('Received image from worker');
          resolve(event.data.image as Uint8Array);
        }
      };

      console.log('Sending image to worker...');
      this.exifWorker.postMessage({ file, filename });
    });
  }
}
