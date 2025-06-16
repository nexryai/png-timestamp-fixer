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

    // UUIDを生成
    const uploadName = crypto.randomUUID();

    const uploaded = await fetch('https://photoslibrary.googleapis.com/v1/uploads', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/octet-stream',
        // HTTPヘッダーに非ASCII文字は含められないのでUUIDにする
        'X-Goog-Upload-File-Name': uploadName,
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

  public async saveToDirectory(file: Uint8Array, filename: string, directoryHandle: FileSystemDirectoryHandle): Promise<void> {
    try {
      // Exif データを修正
      const fixedImage = await this.fixExif(file, filename);

      // query permission
      //@ts-ignore
      await directoryHandle.queryPermission({ mode: 'readwrite' });
      const fileHandle = await directoryHandle.getFileHandle(filename, { create: true });

      const writable = await fileHandle.createWritable();
      await writable.write(fixedImage);
      await writable.close();

      console.log(`Fixed image saved to ${filename}`);
    } catch (error) {
      console.error('Failed to save image:', error);
      throw new Error('Could not save file to directory');
    }
  }
}
