use chrono::{NaiveDateTime, DateTime, Utc};
use regex::Regex;

pub fn extract_timestamp_string(input: &str, unix_time_offset: i32) -> Option<String> {
    // 正規表現パターン
    let patterns = [
        // YYYY-MM-DD_HH:MM:SS または YYYY-MM-DD HH:MM:SS
        r"(\d{4})-(\d{2})-(\d{2})[_ ](\d{2}):(\d{2}):(\d{2})",
        // YYYYMMDDHHMMSS
        r"(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})",
        // UNIXタイムスタンプ
        r"(\d{10})",
    ];

    for pattern in patterns {
        let re = Regex::new(pattern).unwrap();

        if let Some(caps) = re.captures(input) {
            if pattern == patterns[0] {
                // YYYY-MM-DD_HH:MM:SS パターン
                let year = caps.get(1).unwrap().as_str();
                let month = caps.get(2).unwrap().as_str();
                let day = caps.get(3).unwrap().as_str();
                let hour = caps.get(4).unwrap().as_str();
                let minute = caps.get(5).unwrap().as_str();
                let second = caps.get(6).unwrap().as_str();
                return Some(format!("{}:{}:{} {}:{}:{}", year, month, day, hour, minute, second));
            } else if pattern == patterns[1] {
                // YYYYMMDDHHMMSS パターン
                let year = caps.get(1).unwrap().as_str();
                let month = caps.get(2).unwrap().as_str();
                let day = caps.get(3).unwrap().as_str();
                let hour = caps.get(4).unwrap().as_str();
                let minute = caps.get(5).unwrap().as_str();
                let second = caps.get(6).unwrap().as_str();
                return Some(format!("{}:{}:{} {}:{}:{}", year, month, day, hour, minute, second));
            } else if pattern == patterns[2] {
                // UNIXタイムスタンプ パターン
                let timestamp_str = caps.get(1).unwrap().as_str();
                if let Ok(timestamp) = timestamp_str.parse::<i64>() {
                    // UNIXタイムスタンプをUTC日付に変換
                    let naive_datetime = NaiveDateTime::from_timestamp_opt(timestamp, 0)?;
                    // UTCに変換
                    let datetime_utc: DateTime<Utc> = DateTime::from_utc(naive_datetime, Utc);

                    // オフセットを加算
                    let datetime_local = datetime_utc + chrono::Duration::hours(unix_time_offset as i64);

                    return Some(datetime_local.format("%Y:%m:%d %H:%M:%S").to_string());
                }
            }
        }
    }

    None
}


#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_timestamps() {
        // YYYY-MM-DD HH:MM:SS
        assert_eq!(
            extract_timestamp_string("スクリーンショット 2025-01-22 20:26:51", 0),
            Some("2025:01:22 20:26:51".to_string())
        );
        // YYYY-MM-DD_HH:MM:SS
        assert_eq!(
            extract_timestamp_string("2025-01-22_20:26:51", 0),
            Some("2025:01:22 20:26:51".to_string())
        );
        // YYYYMMDDHHMMSS
        assert_eq!(
            extract_timestamp_string("20250122202651", 0),
            Some("2025:01:22 20:26:51".to_string())
        );
        // UNIXタイムスタンプ
        assert_eq!(
            extract_timestamp_string("_download0_StarRail_Image_1728111920_png_.png", 9),
            Some("2024:10:05 16:05:20".to_string())
        );
    }

    #[test]
    fn test_invalid_timestamps() {
        // 不正な形式
        assert_eq!(extract_timestamp_string("invalid input", 0), None);
        // 部分的なタイムスタンプ (不完全なデータ)
        assert_eq!(extract_timestamp_string("2025-01", 0), None);
        // 短い桁数のUNIXタイムスタンプ
        assert_eq!(extract_timestamp_string("123456789", 0), None);
    }
}