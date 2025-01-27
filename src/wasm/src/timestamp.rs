use little_exif::{metadata::Metadata, exif_tag::ExifTag, filetype::FileExtension};
use wasm_bindgen::prelude::*;
use crate::log;
use crate::png::{embed_exif_time, get_creation_time_from_chunk};
use crate::regex::extract_timestamp_string;

// WASMにエクスポートする関数
#[wasm_bindgen]
pub fn embed_timestamp_from_filename(mut image_buffer: Vec<u8>, filename: String) -> Result<Vec<u8>, JsValue> {
    // filenameからファイルタイプを取得
    let filetype = match filename.split('.').last() {
        Some(filetype) => filetype,
        None => return Err(JsValue::from_str("Invalid filename")),
    };

    // ファイルタイプをJPEG/PNG/WebPのいずれかに変換
    let file_type = match filetype {
        "jpeg" => FileExtension::JPEG,
        "png" => FileExtension::PNG { as_zTXt_chunk: false },
        "webp" => FileExtension::WEBP,
        _ => return Err(JsValue::from_str("Invalid file type")),
    };

    let timestamp: String;

    // PNGならメタデータからのタイムスタンプの取得を試みる（失敗しても無視）
    if file_type == (FileExtension::PNG { as_zTXt_chunk: false }) {
        timestamp = match get_creation_time_from_chunk(&image_buffer, 9) {
            Some(timestamp) => timestamp,
            None => match extract_timestamp_string(&filename, 0) {
                Some(timestamp) => timestamp,
                None => return Err(JsValue::from_str("Timestamp not found")),
            },
        };
    } else {
        // それ以外のファイル形式ならファイル名からタイムスタンプを取得
        timestamp = match extract_timestamp_string(&filename, 0) {
            Some(timestamp) => timestamp,
            None => return Err(JsValue::from_str("Timestamp not found")),
        };
    }

    log(&format!("Detected timestamp: {}", timestamp));

    // pngの場合は、exifチャンクを挿入する
    if file_type == (FileExtension::PNG { as_zTXt_chunk: false }) {
        match embed_exif_time(timestamp, &image_buffer) {
            Ok(new_image_buffer) => {
                return Ok(new_image_buffer);
            }
            Err(e) => {
                return Err(JsValue::from_str(&format!("Error embedding EXIF data: {}", e)));
            }
        }
    }

    // EXIFメタデータの作成
    let mut metadata = match Metadata::new_from_vec(&image_buffer, file_type) {
        Ok(metadata) => metadata,
        Err(e) => return Err(JsValue::from_str(&format!("Error reading EXIF data: {}", e))),
    };

    // タイムスタンプをEXIF情報に埋め込む
    metadata.set_tag(ExifTag::DateTimeOriginal(timestamp));

    // 画像のEXIF情報を書き込む
    //let mut output_buffer = image_buffer;
    if let Err(e) = metadata.write_to_vec(&mut image_buffer, file_type) {
        return Err(JsValue::from_str(&format!("Error writing EXIF data: {}", e)));
    }

    // EXIFデータが埋め込まれた画像を返す
    Ok(image_buffer)
}