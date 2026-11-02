/**
 * Model thực thể Kanji (Hán tự) trong Kanji Nest.
 */

import type { JlptLevel } from '../../../shared/api';

export interface KanjiDetail {
  /** Ký tự Hán tự (1 chữ). */
  character: string;
  /** Âm Hán Việt (viết HOA). */
  sinoVietnamese: string;
  /** Giải nghĩa tiếng Việt ngắn gọn. */
  meaning: string;
  /** Âm On (Katakana). */
  onyomi: string[];
  /** Âm Kun (Hiragana, có thể có dấu chấm tách okurigana). */
  kunyomi: string[];
  /** Số nét bút. */
  strokeCount?: number;
  /** Cấp độ JLPT (N5..N1). */
  jlptLevel?: JlptLevel;
  /** Bộ thủ chính. */
  radical?: string;
}

/** Phân đoạn chuỗi từ vựng thành từng phần Kanji hoặc Kana. */
export interface KanjiSegment {
  text: string;
  isKanji: boolean;
}
