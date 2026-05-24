/**
 * CRC32 checksum calculation using a lookup table approach.
 * Equivalent to Rust crc32fast.
 */

const CRC32_POLYNOMIAL = 0xedb88320;

/** Precomputed CRC32 lookup table (256 entries). */
const CRC32_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let crc = i;
    for (let j = 0; j < 8; j++) {
      if (crc & 1) {
        crc = (crc >>> 1) ^ CRC32_POLYNOMIAL;
      } else {
        crc = crc >>> 1;
      }
    }
    table[i] = crc;
  }
  return table;
})();

/** Computes CRC32 checksum for the given data. */
export function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ data[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}
