/**
 * Service chuyển văn bản tiếng Nhật thành giọng nói (TTS) chất lượng cao.
 * Proxy tới Google Translate TTS với đầy đủ ngữ điệu và trọng âm Tokyo (Pitch Accent).
 */

const GOOGLE_TTS_ENDPOINT = 'https://translate.google.com/translate_tts';
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export interface TtsAudioResult {
  buffer: Buffer;
  contentType: string;
}

/** Tách lấy phần đọc đầu tiên, loại bỏ ký tự phân cách lựa chọn (/ , ; 、). */
export function cleanTtsPrompt(raw: string): string {
  if (!raw) return '';
  const first = raw.split(/[/／;；、,\n]/)[0] ?? '';
  return first.trim();
}

/**
 * Lấy audio phát âm tiếng Nhật từ Google Translate TTS.
 * Trả về buffer MP3 và content-type, hoặc null nếu lỗi/timeout.
 */
export async function fetchJapaneseTts(
  rawText: string,
  fetchFn: typeof fetch = fetch,
): Promise<TtsAudioResult | null> {
  const text = cleanTtsPrompt(rawText);
  if (!text) return null;

  const url = `${GOOGLE_TTS_ENDPOINT}?ie=UTF-8&client=tw-ob&tl=ja&q=${encodeURIComponent(text)}`;

  try {
    const response = await fetchFn(url, {
      headers: {
        Referer: 'https://translate.google.com/',
        'User-Agent': USER_AGENT,
        Accept: '*/*',
      },
      signal: AbortSignal.timeout(4500),
    });

    if (!response.ok) {
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength === 0) {
      return null;
    }

    return {
      buffer: Buffer.from(arrayBuffer),
      contentType: response.headers.get('content-type') ?? 'audio/mpeg',
    };
  } catch {
    return null;
  }
}
