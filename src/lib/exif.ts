/**
 * Minimal EXIF TIFF binary data creation containing DateTimeOriginal tag.
 * Replaces the Rust kamadak-exif crate's Writer.
 */

/**
 * Creates minimal TIFF structure with DateTimeOriginal (tag 0x9003) in the Exif IFD.
 *
 * TIFF Layout (Little Endian):
 *   Offset 0:  TIFF Header (8 bytes) - "II", magic 42, offset to IFD0
 *   Offset 8:  IFD0 (14 bytes) - 1 entry: ExifIFDPointer (0x8769)
 *   Offset 22: IFD0 next-IFD pointer (4 bytes) - 0 (no next IFD)
 *   Offset 26: Exif sub-IFD (14 bytes) - 1 entry: DateTimeOriginal (0x9003)
 *   Offset 40: Exif sub-IFD next-IFD pointer (4 bytes) - 0
 *   Offset 44: DateTimeOriginal string data (20 bytes)
 *
 * @param exifTime - Date/time string in format "YYYY:MM:DD HH:MM:SS" (19 chars)
 * @returns Uint8Array containing the complete TIFF/EXIF binary data
 */
export function createExifData(exifTime: string): Uint8Array {
  const dateTimeBytes = 20; // 19 chars + null terminator
  const tiffHeaderSize = 8;
  const ifd0Size = 2 + 12 + 4; // entry count(2) + 1 entry(12) + next-IFD pointer(4) = 18
  const exifIfdSize = 2 + 12 + 4; // entry count(2) + 1 entry(12) + next-IFD pointer(4) = 18
  const totalSize = tiffHeaderSize + ifd0Size + exifIfdSize + dateTimeBytes; // 8 + 18 + 18 + 20 = 64

  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  const littleEndian = true;

  let offset = 0;

  // --- TIFF Header (8 bytes) ---
  // Byte order: "II" (Little Endian)
  bytes[offset] = 0x49; // 'I'
  bytes[offset + 1] = 0x49; // 'I'
  offset += 2;

  // Magic number: 42
  view.setUint16(offset, 42, littleEndian);
  offset += 2;

  // Offset to IFD0 (immediately after header)
  view.setUint32(offset, tiffHeaderSize, littleEndian);
  offset += 4;

  // --- IFD0 (starts at offset 8) ---
  const ifd0Offset = offset;

  // Number of entries: 1
  view.setUint16(offset, 1, littleEndian);
  offset += 2;

  // IFD0 Entry: ExifIFDPointer (tag 0x8769)
  const exifIfdDataOffset = ifd0Offset + ifd0Size; // where Exif sub-IFD starts
  view.setUint16(offset, 0x8769, littleEndian); // Tag
  offset += 2;
  view.setUint16(offset, 4, littleEndian); // Type: LONG (4)
  offset += 2;
  view.setUint32(offset, 1, littleEndian); // Count: 1
  offset += 4;
  view.setUint32(offset, exifIfdDataOffset, littleEndian); // Value: offset to Exif sub-IFD
  offset += 4;

  // Next IFD pointer: 0 (no more IFDs)
  view.setUint32(offset, 0, littleEndian);
  offset += 4;

  // --- Exif sub-IFD (starts at exifIfdDataOffset) ---
  const stringDataOffset = exifIfdDataOffset + exifIfdSize;

  // Number of entries: 1
  view.setUint16(offset, 1, littleEndian);
  offset += 2;

  // Exif IFD Entry: DateTimeOriginal (tag 0x9003)
  view.setUint16(offset, 0x9003, littleEndian); // Tag
  offset += 2;
  view.setUint16(offset, 2, littleEndian); // Type: ASCII (2)
  offset += 2;
  view.setUint32(offset, dateTimeBytes, littleEndian); // Count: 20
  offset += 4;
  view.setUint32(offset, stringDataOffset, littleEndian); // Value: offset to string data
  offset += 4;

  // Next IFD pointer: 0
  view.setUint32(offset, 0, littleEndian);
  offset += 4;

  // --- DateTimeOriginal string data (20 bytes) ---
  for (let i = 0; i < exifTime.length && i < 19; i++) {
    bytes[offset + i] = exifTime.charCodeAt(i);
  }
  bytes[offset + 19] = 0x00; // null terminator

  return bytes;
}
