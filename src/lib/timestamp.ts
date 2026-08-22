/**
 * Timestamp embedding for PNG files.
 * Port of Rust timestamp.rs (PNG-only version).
 */

import { embedExifTime, getCreationTimeFromChunk } from "./png";
import { extractTimestampString } from "./regex";

/**
 * Extracts a timestamp from a filename, optionally applying the selected
 * timezone to Unix timestamps contained in the filename.
 */
export function extractTimestampFromFilename(filename: string, timezoneOffsetHours: number, ignoreTimezone: boolean): string | null {
    return extractTimestampString(filename, ignoreTimezone ? 0 : timezoneOffsetHours);
}

/**
 * Embeds a timestamp extracted from PNG metadata or filename into the image's EXIF data.
 *
 * @param imageBuffer - PNG file data
 * @param filename - Original filename (used as fallback for timestamp extraction)
 * @param timezoneOffsetHours - Timezone offset in hours for chunk-based timestamps
 * @param ignoreFilenameTimezone - Whether filename timestamps should ignore the timezone setting
 * @returns New PNG buffer with embedded eXIf chunk
 * @throws Error if filename doesn't end with .png or no timestamp is found
 */
export function embedTimestampFromFilename(imageBuffer: Uint8Array, filename: string, timezoneOffsetHours: number, ignoreFilenameTimezone = true): Uint8Array {
    // Verify .png extension (case-insensitive)
    if (!filename.toLowerCase().endsWith(".png")) {
        throw new Error("File is not a PNG: " + filename);
    }

    // Try getting timestamp from PNG chunks first
    let timestamp = getCreationTimeFromChunk(imageBuffer, timezoneOffsetHours);

    // Fall back to extracting timestamp from filename
    if (timestamp === null) {
        timestamp = extractTimestampFromFilename(filename, timezoneOffsetHours, ignoreFilenameTimezone);
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
export function embedTimestampManual(imageBuffer: Uint8Array, exifTime: string): Uint8Array {
    return embedExifTime(exifTime, imageBuffer);
}
