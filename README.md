# GooglePhotosUploader

## What is this?
This tool solves the problem of timestamps being incorrect when uploaded to Google Photos because EXIF is not recorded when saving game console screenshots, etc. in PNG format.  
It guesses the date and time of creation from the PNG's `tIME`, `tEXt/Creation Time` chunks, or if that is not available, from the file name, records it in an `eXIf` chunk, and uploads it.  
Since no re-encoding occurs, the image quality is not degraded at all. All processing is done on the client side using WASM, so privacy is protected.
