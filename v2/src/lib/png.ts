/**
 * PNG chunk parsing and eXIf chunk embedding.
 * Port of Rust png.rs.
 */

import { crc32 } from "./crc32";
import { createExifData } from "./exif";

/** PNG file signature bytes. */
const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

/** Pads a number to 2 digits with leading zero. */
function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

/** Pads a number to 4 digits with leading zeros. */
function pad4(n: number): string {
  return n.toString().padStart(4, "0");
}

/** Reads a 4-byte big-endian unsigned integer from a Uint8Array at the given offset. */
function readUint32BE(data: Uint8Array, offset: number): number {
  return (
    ((data[offset] << 24) |
      (data[offset + 1] << 16) |
      (data[offset + 2] << 8) |
      data[offset + 3]) >>>
    0
  );
}

/** Reads a 2-byte big-endian unsigned integer from a Uint8Array at the given offset. */
function readUint16BE(data: Uint8Array, offset: number): number {
  return (data[offset] << 8) | data[offset + 1];
}

/** Decodes ASCII bytes to a string. */
function decodeAscii(data: Uint8Array, start: number, length: number): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += String.fromCharCode(data[start + i]);
  }
  return result;
}

/**
 * Parses an RFC 1123 date string.
 * Format: "Thu, 25 Jan 2025 04:56:25 +0000"
 */
function parseRfc1123(timeStr: string): Date | null {
  const months: Record<string, number> = {
    Jan: 0,
    Feb: 1,
    Mar: 2,
    Apr: 3,
    May: 4,
    Jun: 5,
    Jul: 6,
    Aug: 7,
    Sep: 8,
    Oct: 9,
    Nov: 10,
    Dec: 11,
  };

  const match = timeStr.match(
    /^\w{3},\s+(\d{1,2})\s+(\w{3})\s+(\d{4})\s+(\d{2}):(\d{2}):(\d{2})\s+([+-]\d{4})$/,
  );
  if (!match) return null;

  const [, dayStr, monthStr, yearStr, hourStr, minStr, secStr, tzStr] = match;
  const monthIndex = months[monthStr];
  if (monthIndex === undefined) return null;

  const year = parseInt(yearStr, 10);
  const day = parseInt(dayStr, 10);
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minStr, 10);
  const second = parseInt(secStr, 10);

  // Parse timezone offset
  const tzSign = tzStr[0] === "+" ? 1 : -1;
  const tzHours = parseInt(tzStr.substring(1, 3), 10);
  const tzMinutes = parseInt(tzStr.substring(3, 5), 10);
  const tzOffsetMs = tzSign * (tzHours * 60 + tzMinutes) * 60 * 1000;

  const date = new Date(Date.UTC(year, monthIndex, day, hour, minute, second));
  return new Date(date.getTime() - tzOffsetMs);
}

/**
 * Parses an ISO 8601 date string.
 * Format: "2025-01-25T04:56:25+0000"
 */
function parseIso8601(timeStr: string): Date | null {
  const match = timeStr.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})([+-]\d{4})$/,
  );
  if (!match) return null;

  const [, yearStr, monthStr, dayStr, hourStr, minStr, secStr, tzStr] = match;

  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  const day = parseInt(dayStr, 10);
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minStr, 10);
  const second = parseInt(secStr, 10);

  const tzSign = tzStr[0] === "+" ? 1 : -1;
  const tzHours = parseInt(tzStr.substring(1, 3), 10);
  const tzMinutes = parseInt(tzStr.substring(3, 5), 10);
  const tzOffsetMs = tzSign * (tzHours * 60 + tzMinutes) * 60 * 1000;

  const date = new Date(Date.UTC(year, month, day, hour, minute, second));
  return new Date(date.getTime() - tzOffsetMs);
}

/**
 * Parses an EXIF-format date string.
 * Format: "2025:01:25 04:56:25"
 */
function parseExifFormat(timeStr: string): string | null {
  const match = timeStr.match(
    /^(\d{4}):(\d{2}):(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/,
  );
  if (!match) return null;
  return timeStr;
}

/**
 * Formats a Date object as an EXIF time string.
 */
function formatExifTime(date: Date): string {
  const year = pad4(date.getUTCFullYear());
  const month = pad2(date.getUTCMonth() + 1);
  const day = pad2(date.getUTCDate());
  const hour = pad2(date.getUTCHours());
  const minute = pad2(date.getUTCMinutes());
  const second = pad2(date.getUTCSeconds());
  return `${year}:${month}:${day} ${hour}:${minute}:${second}`;
}

/**
 * Converts a "Creation Time" string to EXIF format.
 *
 * Tries parsing in order:
 *   1. RFC 1123 (e.g., "Thu, 25 Jan 2025 04:56:25 +0000")
 *   2. ISO 8601 (e.g., "2025-01-25T04:56:25+0000")
 *   3. EXIF format (e.g., "2025:01:25 04:56:25")
 *
 * @returns Formatted string "YYYY:MM:DD HH:MM:SS" or null
 */
export function creationTimeToExifTime(timeStr: string): string | null {
  // Try RFC 1123
  const rfc1123Date = parseRfc1123(timeStr);
  if (rfc1123Date) {
    return formatExifTime(rfc1123Date);
  }

  // Try ISO 8601
  const isoDate = parseIso8601(timeStr);
  if (isoDate) {
    return formatExifTime(isoDate);
  }

  // Try EXIF format (already in the right format)
  const exifResult = parseExifFormat(timeStr);
  if (exifResult) {
    return exifResult;
  }

  return null;
}

/**
 * Reads PNG chunks and extracts creation time information.
 *
 * @param imageBuffer - PNG file data
 * @param unixTimeOffset - Timezone offset in hours for tIME chunk
 * @returns Formatted timestamp "YYYY:MM:DD HH:MM:SS" or null
 * @throws Error if eXIf chunk already exists
 */
export function getCreationTimeFromChunk(
  imageBuffer: Uint8Array,
  unixTimeOffset: number,
): string | null {
  // Skip PNG signature
  let offset = 8;

  while (offset + 8 <= imageBuffer.length) {
    const chunkLength = readUint32BE(imageBuffer, offset);
    const chunkType = decodeAscii(imageBuffer, offset + 4, 4);
    const chunkDataStart = offset + 8;

    if (chunkDataStart + chunkLength > imageBuffer.length) {
      break;
    }

    if (chunkType === "eXIf") {
      throw new Error("eXIf chunk already exists");
    }

    if (chunkType === "tIME" && chunkLength === 7) {
      const year = readUint16BE(imageBuffer, chunkDataStart);
      const month = imageBuffer[chunkDataStart + 2];
      const day = imageBuffer[chunkDataStart + 3];
      const hour = imageBuffer[chunkDataStart + 4];
      const minute = imageBuffer[chunkDataStart + 5];
      const second = imageBuffer[chunkDataStart + 6];

      // Create UTC date, then apply timezone offset
      const date = new Date(
        Date.UTC(year, month - 1, day, hour, minute, second),
      );
      const offsetMs = unixTimeOffset * 60 * 60 * 1000;
      const adjusted = new Date(date.getTime() + offsetMs);

      return formatExifTime(adjusted);
    }

    if (chunkType === "tEXt" || chunkType === "iTXt") {
      const chunkData = decodeAscii(
        imageBuffer,
        chunkDataStart,
        chunkLength,
      );

      if (chunkData.includes("Creation Time")) {
        // Find the value after null separator (tEXt) or look for the value
        // In tEXt chunks, keyword and value are separated by a null byte
        const nullIndex = chunkData.indexOf("\0");
        if (nullIndex !== -1) {
          const keyword = chunkData.substring(0, nullIndex);
          if (keyword === "Creation Time") {
            const value = chunkData.substring(nullIndex + 1);
            const exifTime = creationTimeToExifTime(value.trim());
            if (exifTime) {
              return exifTime;
            }
          }
        }
      }
    }

    // Move to next chunk: length(4) + type(4) + data(chunkLength) + crc(4)
    offset += 12 + chunkLength;
  }

  return null;
}

/**
 * Embeds an eXIf chunk with the given EXIF time into a PNG image buffer.
 *
 * @param exifTime - Date/time string in format "YYYY:MM:DD HH:MM:SS"
 * @param imageBuffer - Original PNG file data
 * @returns New PNG buffer with the eXIf chunk inserted after IHDR
 */
export function embedExifTime(
  exifTime: string,
  imageBuffer: Uint8Array,
): Uint8Array {
  // Verify PNG signature
  for (let i = 0; i < PNG_SIGNATURE.length; i++) {
    if (imageBuffer[i] !== PNG_SIGNATURE[i]) {
      throw new Error("Invalid PNG signature");
    }
  }

  // Create EXIF data
  const exifData = createExifData(exifTime);

  // Build the eXIf chunk type bytes
  const chunkTypeBytes = new Uint8Array([
    0x65, 0x58, 0x49, 0x66, // "eXIf"
  ]);

  // Compute CRC32 over chunk_type + chunk_data
  const crcInput = new Uint8Array(chunkTypeBytes.length + exifData.length);
  crcInput.set(chunkTypeBytes, 0);
  crcInput.set(exifData, chunkTypeBytes.length);
  const crcValue = crc32(crcInput);

  // Build complete eXIf chunk: length(4) + type(4) + data + crc(4)
  const exifChunkSize = 4 + 4 + exifData.length + 4;
  const exifChunk = new Uint8Array(exifChunkSize);
  const exifChunkView = new DataView(exifChunk.buffer);

  let writeOffset = 0;

  // Chunk length (4 bytes, big-endian)
  exifChunkView.setUint32(writeOffset, exifData.length, false);
  writeOffset += 4;

  // Chunk type: "eXIf"
  exifChunk.set(chunkTypeBytes, writeOffset);
  writeOffset += 4;

  // Chunk data
  exifChunk.set(exifData, writeOffset);
  writeOffset += exifData.length;

  // CRC32 (4 bytes, big-endian)
  exifChunkView.setUint32(writeOffset, crcValue, false);

  // Find the end of the IHDR chunk to insert after it
  // IHDR is always the first chunk after the 8-byte signature
  const ihdrLength = readUint32BE(imageBuffer, 8);
  const insertOffset = 8 + 4 + 4 + ihdrLength + 4; // signature + length + type + data + crc

  // Build new buffer: [before insert point] + [eXIf chunk] + [after insert point]
  const newBuffer = new Uint8Array(imageBuffer.length + exifChunkSize);
  newBuffer.set(imageBuffer.subarray(0, insertOffset), 0);
  newBuffer.set(exifChunk, insertOffset);
  newBuffer.set(imageBuffer.subarray(insertOffset), insertOffset + exifChunkSize);

  return newBuffer;
}
