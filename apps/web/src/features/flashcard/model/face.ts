import type { LocalVocabulary } from '../../../entities/vocabulary';

/** Hai mặt thẻ. */
export type CardFace = 'front' | 'back';

/** Mặt trước: ĐÚNG 2 thành phần — từ vựng + Âm Hán Việt (ẩn khi rỗng). */
export interface FrontFace {
  face: 'front';
  word: string;
  sinoVietnamese: string | null;
}

/** Mặt sau: cách đọc / nghĩa / câu ví dụ / dịch câu ví dụ (ẩn trường rỗng). */
export interface BackFace {
  face: 'back';
  reading: string | null;
  meaning: string;
  example: string | null;
  exampleMeaning: string | null;
}

export type FaceContent = FrontFace | BackFace;

function clean(value: string | null): string | null {
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/**
 * Chọn nội dung hiển thị cho một mặt thẻ — THUẦN, tất định. Trường rỗng/null trả về
 * `null` để component ẩn đúng khối (không để khoảng trống). KHÔNG đổi logic SM-2.
 */
export function selectFaceContent(vocab: LocalVocabulary, face: CardFace): FaceContent {
  if (face === 'front') {
    return { face: 'front', word: vocab.word, sinoVietnamese: clean(vocab.sinoVietnamese) };
  }
  return {
    face: 'back',
    reading: clean(vocab.reading),
    meaning: vocab.meaning,
    example: clean(vocab.example),
    exampleMeaning: clean(vocab.exampleMeaning),
  };
}
