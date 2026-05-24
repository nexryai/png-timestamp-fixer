import { describe, it, expect } from 'vitest';
import { createExifData } from './exif';

describe('createExifData', () => {
  it('should create a 64-byte TIFF binary', () => {
    const result = createExifData('2025:01:25 13:56:25');
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBe(64);
  });

  it('should start with Little Endian TIFF header "II"', () => {
    const result = createExifData('2025:01:25 13:56:25');
    // "II" = 0x49, 0x49
    expect(result[0]).toBe(0x49);
    expect(result[1]).toBe(0x49);
  });

  it('should have TIFF magic number 42', () => {
    const result = createExifData('2025:01:25 13:56:25');
    const view = new DataView(result.buffer);
    expect(view.getUint16(2, true)).toBe(42);
  });

  it('should have IFD0 offset pointing to 8', () => {
    const result = createExifData('2025:01:25 13:56:25');
    const view = new DataView(result.buffer);
    expect(view.getUint32(4, true)).toBe(8); // IFD0 starts at offset 8
  });

  it('should contain ExifIFDPointer tag (0x8769) in IFD0', () => {
    const result = createExifData('2025:01:25 13:56:25');
    const view = new DataView(result.buffer);
    // IFD0 starts at offset 8, first entry tag at offset 10
    expect(view.getUint16(10, true)).toBe(0x8769);
  });

  it('should contain DateTimeOriginal tag (0x9003) in Exif sub-IFD', () => {
    const result = createExifData('2025:01:25 13:56:25');
    const view = new DataView(result.buffer);
    // Exif sub-IFD starts at offset 26, first entry tag at offset 28
    expect(view.getUint16(28, true)).toBe(0x9003);
  });

  it('should contain the datetime string at the end with null terminator', () => {
    const timeStr = '2025:01:25 13:56:25';
    const result = createExifData(timeStr);
    // String data starts at offset 44
    const strBytes = result.slice(44, 44 + 19);
    const decoded = new TextDecoder().decode(strBytes);
    expect(decoded).toBe(timeStr);
    // Null terminator
    expect(result[44 + 19]).toBe(0x00);
  });
});
