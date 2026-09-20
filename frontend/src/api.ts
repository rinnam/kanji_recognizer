import { MOCK_MESSAGE, MOCK_PREDICTIONS } from "./mockData";
import type { RecognizeResponse } from "./types";

/**
 * Stub API — UI-only, giả lập latency để preview skeleton/loading.
 *
 * TODO(BE): thay body bằng fetch thật:
 *   // JSON base64:
 *   fetch("/api/kanji/recognize", {
 *     method: "POST",
 *     headers: { "Content-Type": "application/json" },
 *     body: JSON.stringify({ image: dataUrl }),
 *   })
 *   // hoặc multipart:
 *   const fd = new FormData(); fd.append("image", file);
 *   fetch("/api/kanji/recognize", { method: "POST", body: fd })
 */
export function mockRecognize(_image: string | null): Promise<RecognizeResponse> {
  return new Promise((resolve) => {
    window.setTimeout(() => {
      resolve({
        success: true,
        predictions: MOCK_PREDICTIONS,
        message: MOCK_MESSAGE,
      });
    }, 1400);
  });
}
