import init, { embed_timestamp_from_filename as embedExif } from "../../wasm/pkg";

const initialized = init();
self.onmessage = async (event: MessageEvent) => {
  const { file, filename }: { file: Uint8Array<ArrayBuffer>, filename: string } = event.data;
  await initialized;

  try {
    console.log("[ExifWorker] Getting image properties...");

    const fetchProps = async () => {
      const image = await embedExif(file, filename);
      self.postMessage({ image });
    };

    // 現状WASMで発生したpanicをキャッチする方法がない
    // https://rajrajhans.com/2023/07/handling-rust-panics-in-wasm/
    await Promise.race([
      fetchProps(),
      new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error("Image processing timed out"));
        }, 20000);
      }),
    ]);
  } catch (error) {
    console.log("WASM error:", error);
    self.postMessage({ error: (error as Error).message });
  }
};
