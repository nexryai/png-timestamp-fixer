use std::{error::Error, io};
use chrono::{NaiveDateTime, TimeZone, Utc};
use exif::Field;
use std::io::{BufReader, Read};


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

        // 既にeXIfチャンクがある場合、panic
        if &chunk_type_bytes == b"eXIf" {
            panic!("eXIf chunk already exists");
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

/// PNGファイルにeXIfチャンクを挿入し、EXIF撮影日時を埋め込む関数
pub fn embed_exif_time(exif_time: String, image_buffer: &Vec<u8>) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    // PNGファイルの署名を確認
    const PNG_SIGNATURE: &[u8; 8] = b"\x89PNG\r\n\x1a\n";
    if &image_buffer[0..8] != PNG_SIGNATURE {
        return Err("Invalid PNG signature".into());
    }

    // eXIfチャンクを構築
    let exif_binary = create_exif_data(exif_time)?;
    let exif_chunk = create_exif_chunk(exif_binary);

    // 新しいPNGファイルを構築
    let mut new_png = Vec::new();
    new_png.extend_from_slice(PNG_SIGNATURE);

    let mut offset = 8; // PNG署名の後ろにシーク
    let mut inserted = false;

    while offset < image_buffer.len() {
        // 現在のチャンクの長さ、種類、終了位置を取得
        let length = u32::from_be_bytes([image_buffer[offset], image_buffer[offset + 1], image_buffer[offset + 2], image_buffer[offset + 3]]);
        let chunk_type = &image_buffer[offset + 4..offset + 8];
        let chunk_end = offset + 12 + length as usize;

        // 新しいPNGにチャンクをコピーしてシーク
        new_png.extend_from_slice(&image_buffer[offset..chunk_end]);
        offset = chunk_end;

        if chunk_type == b"IHDR" && !inserted {
            // IHDRチャンクの後に新しいeXIfチャンクを挿入
            new_png.extend_from_slice(&exif_chunk);
            inserted = true;
        }
    }

    Ok(new_png)
}


fn create_exif_data(exif_time: String) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    use exif::{Tag, In, Value};
    use exif::experimental::Writer;

    let field = Field {
        tag: Tag::DateTimeOriginal,
        ifd_num: In::PRIMARY,
        value: Value::Ascii(vec![exif_time.into_bytes()]),
    };

    let mut writer = Writer::new();
    let mut buf = std::io::Cursor::new(Vec::new());

    // EXIFのTag::DateTimeに撮影日時を設定
    writer.push_field(&field);
    writer.write(&mut buf, false)?;

    let exif_data = buf.into_inner();

    // EXIFバイナリデータを取得
    Ok(exif_data)
}

fn create_exif_chunk(exif_data: Vec<u8>) -> Vec<u8> {
    let mut chunk = Vec::new();

    // チャンクデータの長さを計算
    let length = exif_data.len() as u32;
    chunk.extend_from_slice(&length.to_be_bytes());

    // チャンクタイプ（eXIf固定）
    let chunk_type = b"eXIf";
    chunk.extend_from_slice(chunk_type);

    // チャンクデータ
    chunk.extend_from_slice(&exif_data);

    // CRC計算
    // chunk全体ではなく、チャンクタイプとチャンクデータのみが対象であることに注意
    let mut hasher = crc32fast::Hasher::new();
    hasher.update(chunk_type);
    hasher.update(&exif_data);
    let crc = hasher.finalize();

    // チェックサムを追加して完成させる
    chunk.extend_from_slice(&crc.to_be_bytes());

    chunk
}



#[cfg(test)]
mod tests {
    use io::Write;

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

    #[test]
    fn test_embed_exif_time() {
        let file_path = "/Users/nexryai/test3.png";
        let mut file = File::open(file_path).unwrap();
        let mut buffer = Vec::new();
        file.read_to_end(&mut buffer).unwrap();

        let exif_time = "2025:01:25 13:56:25".to_string();
        let new_png = embed_exif_time(exif_time, &buffer).unwrap();

        // write new png
        let mut new_file = File::create("/Users/nexryai/test3_new.png").unwrap();
        new_file.write_all(&new_png).unwrap();
    }
}