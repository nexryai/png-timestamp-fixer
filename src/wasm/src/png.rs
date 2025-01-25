use std::error::Error;
use chrono::{NaiveDateTime, ParseError, TimeZone, Utc};
use std::fs::File;
use std::io::{BufReader, Read};

/// PNGチャンクヘッダーの長さ
const CHUNK_HEADER_SIZE: usize = 8;

/// PNGシグネチャ
const PNG_SIGNATURE: [u8; 8] = [137, 80, 78, 71, 13, 10, 26, 10];

pub fn get_creation_time_from_chunk(image_buffer: &Vec<u8>, unix_time_offset: i32) -> Option<String> {
    let mut reader = BufReader::new(image_buffer.as_slice());

    // PNGシグネチャの確認
    let mut signature = [0u8; 8];
    if reader.read_exact(&mut signature).is_err() {
        return None;
    }

    if signature != PNG_SIGNATURE {
        return None;
    }

    // チャンクを順次読み取る
    loop {
        // チャンクの長さを取得
        let mut length_bytes = [0u8; 4];
        if reader.read_exact(&mut length_bytes).is_err() {
            break; // ファイル末尾に到達
        }
        let length = u32::from_be_bytes(length_bytes) as usize;

        // チャンクタイプを取得
        let mut chunk_type_bytes = [0u8; 4];
        if reader.read_exact(&mut chunk_type_bytes).is_err() {
            break; // チャンクを無視して次のチャンクへ
        };

        // チャンクデータを読み込む
        let mut chunk_data = vec![0u8; length];
        if reader.read_exact(&mut chunk_data).is_err() {
            break; // チャンクを無視して次のチャンクへ
        };

        // CRCをスキップ
        let mut crc_bytes = [0u8; 4];
        if reader.read_exact(&mut crc_bytes).is_err() {
            break; // チャンクを無視して次のチャンクへ
        };

        // tIMEチャンクの場合
        if &chunk_type_bytes == b"tIME" {
            if chunk_data.len() == 7 {
                let year = u16::from_be_bytes([chunk_data[0], chunk_data[1]]);
                let month = chunk_data[2];
                let day = chunk_data[3];
                let hour = chunk_data[4];
                let minute = chunk_data[5];
                let second = chunk_data[6];

                // UTCからオフセットを加算
                let naive_datetime = NaiveDateTime::new(
                    chrono::NaiveDate::from_ymd_opt(year as i32, month as u32, day as u32)?,
                    chrono::NaiveTime::from_hms_opt(hour as u32, minute as u32, second as u32)?,
                );

                // UTCに変換
                let datetime_utc = TimeZone::from_utc_datetime(&Utc, &naive_datetime);

                // オフセットを加算
                let datetime_local = datetime_utc + chrono::Duration::hours(unix_time_offset as i64);

                return Some(datetime_local.format("%Y:%m:%d %H:%M:%S").to_string());
            }
        }

        // tEXtまたはiTXtチャンクの場合
        if &chunk_type_bytes == b"tEXt" || &chunk_type_bytes == b"iTXt" {
            let data_str = String::from_utf8_lossy(&chunk_data);
            if let Some(entry) = data_str.split_once("Creation Time") {
                if let Some(time_str) = entry.1.split('=').nth(1) {
                    return creation_time_to_exif_time(time_str).ok();
                }
            }
        }
    }

    None
}

fn creation_time_to_exif_time(time_str: &str) -> Result<String, Box<dyn Error>> {
    // RFC 1123で試行
    if let Ok(time) = NaiveDateTime::parse_from_str(time_str, "%a, %d %b %Y %H:%M:%S %z") {
        return Ok(time.format("%Y:%m:%d %H:%M:%S").to_string());
    }

    // ISO 8601で試行
    if let Ok(time) = NaiveDateTime::parse_from_str(time_str, "%Y-%m-%dT%H:%M:%S%z") {
        return Ok(time.format("%Y:%m:%d %H:%M:%S").to_string());
    }

    // EXIF形式で試行
    if let Ok(time) = NaiveDateTime::parse_from_str(time_str, "%Y:%m:%d %H:%M:%S") {
        return Ok(time.format("%Y:%m:%d %H:%M:%S").to_string());
    }

    Err(format!("Failed to parse datetime: {}", time_str).into())
}



#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::File;
    use std::io::Read;

    #[test]
    fn main() {
        let file_path = "/Users/nexryai/test3.png";
        let mut file = File::open(file_path).unwrap();
        let mut buffer = Vec::new();
        file.read_to_end(&mut buffer).unwrap();

        let creation_time = get_creation_time_from_chunk(&buffer, 9).unwrap();
        assert_eq!(creation_time, "2025:01:25 13:56:25");
    }
}