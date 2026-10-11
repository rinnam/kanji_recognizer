import type { LocalVocabulary } from '../../../entities/vocabulary';

/**
 * Khóa chống trùng Quick Add — KHỚP backend: cùng (word, reading) với reading null
 * coi như chuỗi rỗng. So khớp chính xác (phân biệt hoa/thường như cột text của PG),
 * có trim 2 đầu để nhất quán với giá trị sẽ lưu/đẩy lên server.
 */
export function dedupeKey(word: string, reading: string | null | undefined): string {
  return `${word.trim()}\u0000${(reading ?? '').trim()}`;
}

/** Tìm từ CÒN SỐNG trùng (word, reading). Trả về bản trùng đầu tiên hoặc undefined. */
export function findDuplicate(
  vocabularies: LocalVocabulary[],
  word: string,
  reading: string | null | undefined,
): LocalVocabulary | undefined {
  const key = dedupeKey(word, reading);
  return vocabularies.find(
    (item) => item.deletedAt === null && dedupeKey(item.word, item.reading) === key,
  );
}
