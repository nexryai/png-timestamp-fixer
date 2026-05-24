import { describe, it, expect } from 'vitest';
import { extractTimestampString } from './regex';

describe('extractTimestampString', () => {
  describe('valid timestamps', () => {
    it('should parse YYYY-MM-DD HH:MM:SS format', () => {
      expect(
        extractTimestampString('スクリーンショット 2025-01-22 20:26:51', 0)
      ).toBe('2025:01:22 20:26:51');
    });

    it('should parse YYYY-MM-DD_HH:MM:SS format', () => {
      expect(
        extractTimestampString('2025-01-22_20:26:51', 0)
      ).toBe('2025:01:22 20:26:51');
    });

    it('should parse YYYYMMDDHHMMSS format', () => {
      expect(
        extractTimestampString('20250122202651', 0)
      ).toBe('2025:01:22 20:26:51');
    });

    it('should parse Unix timestamp with timezone offset', () => {
      expect(
        extractTimestampString(
          '_download0_StarRail_Image_1728111920_png_.png', 9
        )
      ).toBe('2024:10:05 16:05:20');
    });

    it('should handle filename with prefix and suffix', () => {
      const result = extractTimestampString('screenshot_2025-01-22_20:26:51.png', 0);
      expect(result).toBe('2025:01:22 20:26:51');
    });
  });

  describe('invalid timestamps', () => {
    it('should return null for invalid input', () => {
      expect(extractTimestampString('invalid input', 0)).toBeNull();
    });

    it('should return null for partial timestamp', () => {
      expect(extractTimestampString('2025-01', 0)).toBeNull();
    });

    it('should return null for short digit sequences (< 10 digits)', () => {
      expect(extractTimestampString('123456789', 0)).toBeNull();
    });
  });
});
