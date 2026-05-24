/**
 * Timestamp embedding for PNG files.
 * Port of Rust timestamp.rs (PNG-only version).
 */

import { getCreationTimeFromChunk, embedExifTime } from "./png";
import { extractTimestampString } from "./regex";

/**
 * Embeds a timestamp extracted from PNG metadata or filename into the image's EXIF data.
 *
 * @param imageBuffer - PNG file data
 * @param filename - Original filename (used as fallback for timestamp extraction)
 * @param timezoneOffsetHours - Timezone offset in hours for chunk-based timestamps
 * @returns New PNG buffer with embedded eXIf chunk
 * @throws Error if filename doesn't end with .png or no timestamp is found
 */
export function embedTimestampFromFilename(
  imageBuffer: Uint8Array,
  filename: string,
  timezoneOffsetHours: number,
): Uint8Array {
  // Verify .png extension (case-insensitive)
  if (!filename.toLowerCase().endsWith(".png")) {
    throw new Error("File is not a PNG: " + filename);
  }

  // Try getting timestamp from PNG chunks first
  let timestamp = getCreationTimeFromChunk(imageBuffer, timezoneOffsetHours);

  // Fall back to extracting timestamp from filename
  if (timestamp === null) {
    timestamp = extractTimestampString(filename, 0);
  }

  if (timestamp === null) {
    throw new Error("Timestamp not found");
  }

  console.log("Detected timestamp: " + timestamp);

  return embedExifTime(timestamp, imageBuffer);
}

/**
 * Embeds a manually specified EXIF timestamp into a PNG image.
 *
 * @param imageBuffer - PNG file data
 * @param exifTime - Date/time string in format "YYYY:MM:DD HH:MM:SS"
 * @returns New PNG buffer with embedded eXIf chunk
 */
export function embedTimestampManual(
  imageBuffer: Uint8Array,
  exifTime: string,
): Uint8Array {
  return embedExifTime(exifTime, imageBuffer);
}
