import type { KanjiSegment } from './types';

/** Regex kiểm tra ký tự nằm trong dải Unicode chữ Hán (CJK Unified Ideographs). */
const KANJI_REGEX = /[\u4e00-\u9faf\u3400-\u4dbf]/;

/** Kiểm tra một ký tự có phải là Kanji (Hán tự) không. */
export function isKanji(char: string): boolean {
  if (!char || char.length === 0) return false;
  return KANJI_REGEX.test(char);
}

/** Trích xuất danh sách các chữ Hán duy nhất từ một chuỗi văn bản. */
export function extractKanji(text: string): string[] {
  if (!text) return [];
  const result: string[] = [];
  const seen = new Set<string>();

  for (const char of text) {
    if (isKanji(char) && !seen.has(char)) {
      seen.add(char);
      result.push(char);
    }
  }

  return result;
}

/**
 * Phân đoạn từ tiếng Nhật thành các khối Kanji và Kana liên tiếp.
 * Ví dụ: "豊かな" → [{ text: '豊', isKanji: true }, { text: 'かな', isKanji: false }]
 */
export function segmentJapaneseWord(text: string): KanjiSegment[] {
  if (!text) return [];

  const segments: KanjiSegment[] = [];

  for (const char of text) {
    const kanji = isKanji(char);
    const last = segments[segments.length - 1];

    // Kanji thì luôn tách từng chữ để người dùng có thể hover/click tra cứu từng Hán tự riêng biệt
    if (kanji) {
      segments.push({ text: char, isKanji: true });
    } else {
      // Kana/Romaji/Ký hiệu thì gom liền nhau
      if (last && !last.isKanji) {
        last.text += char;
      } else {
        segments.push({ text: char, isKanji: false });
      }
    }
  }

  return segments;
}

/**
 * Tách chuỗi âm Hán Việt tương ứng với từng chữ Hán.
 * Ví dụ: "重要" có 2 chữ Hán, sino="TRỌNG YẾU" → map chữ 0 là "TRỌNG", chữ 1 là "YẾU".
 */
export function mapSinoForKanjiIndex(
  sinoText: string | null | undefined,
  kanjiIndex: number,
  totalKanjiInWord: number,
): string | null {
  if (!sinoText) return null;

  const parts = sinoText
    .trim()
    .split(/[\s,/-]+/)
    .filter(Boolean);

  if (parts.length === totalKanjiInWord && parts[kanjiIndex]) {
    return parts[kanjiIndex].toUpperCase();
  }

  // Nếu không khớp số lượng thì trả về nguyên chuỗi
  return sinoText.trim().toUpperCase();
}
