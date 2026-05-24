/**
 * Timestamp extraction from filenames using regex patterns.
 * Port of Rust regex.rs.
 */

/** Pads a number to 2 digits with leading zero. */
function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

/** Pads a number to 4 digits with leading zeros. */
function pad4(n: number): string {
  return n.toString().padStart(4, "0");
}

/**
 * Extracts a timestamp string from the input using regex patterns.
 *
 * Tries 3 patterns in order:
 *   1. "YYYY-MM-DD HH:MM:SS" or "YYYY-MM-DD_HH:MM:SS"
 *   2. "YYYYMMDDHHmmss" (14 consecutive digits)
 *   3. Unix timestamp (10 consecutive digits)
 *
 * @param input - Input string (typically a filename)
 * @param unixTimeOffset - Timezone offset in hours for unix timestamp conversion
 * @returns Formatted string "YYYY:MM:DD HH:MM:SS" or null
 */
export function extractTimestampString(
  input: string,
  unixTimeOffset: number,
): string | null {
  // Pattern 1: YYYY-MM-DD[_ ]HH:MM:SS
  const pattern1 = /(\d{4})-(\d{2})-(\d{2})[_ ](\d{2}):(\d{2}):(\d{2})/;
  const match1 = input.match(pattern1);
  if (match1) {
    const [, year, month, day, hour, minute, second] = match1;
    return `${year}:${month}:${day} ${hour}:${minute}:${second}`;
  }

  // Pattern 2: YYYYMMDDHHmmss (14 consecutive digits)
  const pattern2 = /(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/;
  const match2 = input.match(pattern2);
  if (match2) {
    const [, year, month, day, hour, minute, second] = match2;
    return `${year}:${month}:${day} ${hour}:${minute}:${second}`;
  }

  // Pattern 3: Unix timestamp (10 consecutive digits)
  const pattern3 = /(\d{10})/;
  const match3 = input.match(pattern3);
  if (match3) {
    const unixTimestamp = parseInt(match3[1], 10);
    const date = new Date(unixTimestamp * 1000);

    // Add timezone offset
    const offsetMs = unixTimeOffset * 60 * 60 * 1000;
    const adjusted = new Date(date.getTime() + offsetMs);

    const year = pad4(adjusted.getUTCFullYear());
    const month = pad2(adjusted.getUTCMonth() + 1);
    const day = pad2(adjusted.getUTCDate());
    const hour = pad2(adjusted.getUTCHours());
    const minute = pad2(adjusted.getUTCMinutes());
    const second = pad2(adjusted.getUTCSeconds());

    return `${year}:${month}:${day} ${hour}:${minute}:${second}`;
  }

  return null;
}
