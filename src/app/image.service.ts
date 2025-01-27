import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ImageService {
  private worker: Worker;

  constructor() {
    this.worker = new Worker(new URL('./workers/image.ts', import.meta.url));
  }

  private async fixExif(file: Uint8Array, filename: string): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      this.worker.onmessage = (event) => {
        if (event.data.error) {
          console.error('Error in worker:', event.data.error);
          reject(event.data.error);
        } else {
          console.log('Received image from worker');
          resolve(event.data.image as Uint8Array);
        }
      };

      console.log('Sending image to worker...');
      this.worker.postMessage({ file, filename });
    });
  }

  public async uploadToGooglePhotos(file: Uint8Array, filename: string, accessToken: string): Promise<void> {
    const image = await this.fixExif(file, filename);
    console.log('Uploading image to Google Photos...');

    const uploaded = await fetch('https://photoslibrary.googleapis.com/v1/uploads', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/octet-stream',
        'X-Goog-Upload-File-Name': filename,
        'X-Goog-Upload-Protocol': 'raw',
      },
      body: image,
    });

    if (!uploaded.ok) {
      throw new Error(`Failed to upload image: ${uploaded.statusText}`);
    }

    const uploadToken = await uploaded.text();
    console.log('Upload token:', uploadToken);

    const created = await fetch('https://photoslibrary.googleapis.com/v1/mediaItems:batchCreate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        newMediaItems: [
          {
            // description: 'Uploaded from PNG Timestamp Fixer',
            simpleMediaItem: {
              uploadToken,
            },
          },
        ],
      }),
    });

    if (!created.ok) {
      throw new Error(`Failed to create media item: ${created.statusText}`);
    }

    console.log('Image uploaded successfully');
    return;
  }
}
