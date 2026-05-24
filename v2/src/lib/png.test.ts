import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { getCreationTimeFromChunk, embedExifTime, creationTimeToExifTime } from './png';

// Helper to load test PNG file
function loadTestPng(): Uint8Array {
  const filePath = resolve(__dirname, '../../test/data/test3.png');
  const buffer = readFileSync(filePath);
  return new Uint8Array(buffer);
}

describe('creationTimeToExifTime', () => {
  it('should parse EXIF format', () => {
    expect(creationTimeToExifTime('2025:01:25 04:56:25')).toBe('2025:01:25 04:56:25');
  });

  it('should return null for invalid input', () => {
    expect(creationTimeToExifTime('not a date')).toBeNull();
  });

  it('should return null for empty string', () => {
    expect(creationTimeToExifTime('')).toBeNull();
  });
});

describe('getCreationTimeFromChunk', () => {
  it('should extract creation time from test PNG with offset +9 (JST)', () => {
    const buffer = loadTestPng();
    const result = getCreationTimeFromChunk(buffer, 9);
    expect(result).toBe('2025:01:25 13:56:25');
  });

  it('should extract creation time with offset 0 (UTC)', () => {
    const buffer = loadTestPng();
    const result = getCreationTimeFromChunk(buffer, 0);
    expect(result).not.toBeNull();
  });

  it('should return null for non-PNG data', () => {
    const fakeData = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0]);
    const result = getCreationTimeFromChunk(fakeData, 0);
    expect(result).toBeNull();
  });

  it('should throw if eXIf chunk already exists', () => {
    const buffer = loadTestPng();
    // Embed exif first
    const withExif = embedExifTime('2025:01:25 13:56:25', buffer);
    // Now trying to read should throw
    expect(() => getCreationTimeFromChunk(withExif, 9)).toThrow('eXIf chunk already exists');
  });
});

describe('embedExifTime', () => {
  it('should produce a valid PNG with eXIf chunk', () => {
    const buffer = loadTestPng();
    const result = embedExifTime('2025:01:25 13:56:25', buffer);

    // Result should be larger than original
    expect(result.length).toBeGreaterThan(buffer.length);

    // Should still have valid PNG signature
    expect(result[0]).toBe(137);
    expect(result[1]).toBe(80);
    expect(result[2]).toBe(78);
    expect(result[3]).toBe(71);
  });

  it('should throw for non-PNG data', () => {
    const fakeData = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(() => embedExifTime('2025:01:25 13:56:25', fakeData)).toThrow('Invalid PNG signature');
  });

  it('should insert eXIf chunk after IHDR', () => {
    const buffer = loadTestPng();
    const result = embedExifTime('2025:01:25 13:56:25', buffer);

    // After IHDR (always 13 bytes of data), the eXIf chunk should follow
    // IHDR chunk: 8 (sig) + 4 (len) + 4 (type) + 13 (data) + 4 (crc) = 33 bytes
    // So eXIf chunk type starts at offset 33 + 4 (length) = 37
    const chunkType = String.fromCharCode(
      result[37], result[38], result[39], result[40]
    );
    expect(chunkType).toBe('eXIf');
  });
});
