# GooglePhotosUploader

## What is this? (これは何)
This tool solves the problem of timestamps being incorrect when uploaded to Google Photos because EXIF is not recorded when saving game console screenshots, etc. in PNG format.  
It guesses the date and time of creation from the PNG's `tIME`, `tEXt/Creation Time` chunks, or if that is not available, from the file name, records it in an `eXIf` chunk, and uploads it.  
Since no re-encoding occurs, the image quality is not degraded at all. All processing is done on the client side using WASM, so privacy is protected.

PS5などのゲームコンソールでPNG形式のスクリーンショットを撮ると、Google Photosなど一部の写真管理アプリで撮影日時が正常に認識されない問題を解決するWebアプリです。  
このツールはPNGの`tIME`, `tEXt/Creation Time`チャンク、それが利用できない場合はファイル名から撮影日時を推測し、PNGEXT 1.5.0 で仕様となった`eXIf`チャンクに書き込みます。
画像の再エンコードは発生しないため画質が劣化することはありません。またブラウザのWASMを利用して処理を行うため、サーバーに画像がアップロードされることもありません。
