import type { LocalVocabulary } from '../../../entities/vocabulary';

/**
 * Khóa chống trùng Quick Add — KHỚP backend: cùng (word, reading) với reading null
 * coi như chuỗi rỗng. So khớp chính xác (phân biệt hoa/thường như cột text của PG),
 * có trim 2 đầu để nhất quán với giá trị sẽ lưu/đẩy lên server.
 */
export function dedupeKey(word: string, reading: string | null | undefined): string {
  return `${word.trim()}\u0000${(reading ?? '').trim()}`;
}

/**
 * Tìm từ CÒN SỐNG trùng (word, reading) trong phạm vi thư mục (nếu chỉ định).
 * - `folderId === undefined`: tìm trên toàn bộ danh sách.
 * - `folderId === null`: chỉ tìm trong nhóm chưa gán thư mục (folderIds rỗng).
 * - `typeof folderId === 'string'`: chỉ tìm trong thư mục có id đó.
 */
export function findDuplicate(
  vocabularies: LocalVocabulary[],
  word: string,
  reading: string | null | undefined,
  folderId?: string | null,
): LocalVocabulary | undefined {
  const key = dedupeKey(word, reading);
  return vocabularies.find((item) => {
    if (item.deletedAt !== null) return false;
    if (dedupeKey(item.word, item.reading) !== key) return false;
    if (folderId === undefined) return true;
    if (folderId === null) return item.folderIds.length === 0;
    return item.folderIds.includes(folderId);
  });
}
