import type { JlptLevel } from '../../../shared/api';

/** Trim 2 đầu; chuỗi rỗng -> null (dùng cho các trường tùy chọn). THUẦN. */
export function trimToNull(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/** Dữ liệu thô từ form Quick Add (mọi ô đều là chuỗi; JLPT có thể null). */
export interface RawQuickAdd {
  word: string;
  reading: string;
  sinoVietnamese: string;
  meaning: string;
  example: string;
  exampleMeaning: string;
  jlptLevel: JlptLevel | null;
  note: string;
}

/** Dữ liệu đã chuẩn hóa để lưu: word/meaning trim; các trường còn lại trim -> null. */
export interface NormalizedQuickAdd {
  word: string;
  meaning: string;
  reading: string | null;
  sinoVietnamese: string | null;
  example: string | null;
  exampleMeaning: string | null;
  note: string | null;
  jlptLevel: JlptLevel | null;
}

/**
 * Chuẩn hóa input Quick Add (THUẦN, tất định): trim `word`/`meaning`; các trường tùy chọn
 * trim -> null. Âm Hán Việt (`sinoVietnamese`) LƯU NGUYÊN như người dùng gõ (chỉ trim 2
 * đầu) — việc IN HOA là trách nhiệm của CSS lúc hiển thị, KHÔNG đổi dữ liệu lưu/đẩy lên.
 */
export function normalizeQuickAdd(raw: RawQuickAdd): NormalizedQuickAdd {
  return {
    word: raw.word.trim(),
    meaning: raw.meaning.trim(),
    reading: trimToNull(raw.reading),
    sinoVietnamese: trimToNull(raw.sinoVietnamese),
    example: trimToNull(raw.example),
    exampleMeaning: trimToNull(raw.exampleMeaning),
    note: trimToNull(raw.note),
    jlptLevel: raw.jlptLevel,
  };
}
