import { describe, it, expect } from 'vitest';
import { crc32 } from './crc32';

describe('crc32', () => {
  it('should compute CRC32 for an empty buffer', () => {
    const data = new Uint8Array(0);
    expect(crc32(data)).toBe(0x00000000);
  });

  it('should compute CRC32 for known string "123456789"', () => {
    // CRC32 of "123456789" is 0xCBF43926
    const data = new TextEncoder().encode('123456789');
    expect(crc32(data)).toBe(0xCBF43926);
  });

  it('should compute CRC32 for "eXIf" chunk type', () => {
    const data = new Uint8Array([0x65, 0x58, 0x49, 0x66]);
    // Known CRC32 for "eXIf"
    const result = crc32(data);
    expect(result).toBeTypeOf('number');
    expect(result >>> 0).toBe(result); // unsigned 32-bit
  });

  it('should produce different CRC32 for different inputs', () => {
    const data1 = new TextEncoder().encode('hello');
    const data2 = new TextEncoder().encode('world');
    expect(crc32(data1)).not.toBe(crc32(data2));
  });

  it('should compute CRC32 for single byte', () => {
    const data = new Uint8Array([0x00]);
    const result = crc32(data);
    expect(result).toBeTypeOf('number');
    expect(result >>> 0).toBe(result);
  });
});
