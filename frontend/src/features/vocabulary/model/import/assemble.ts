import type { LocalVocabulary } from '../../../../entities/vocabulary';
import type { NormalizedImport } from './types';

/**
 * Dựng danh sách `LocalVocabulary` sẵn sàng GHI từ các bản ghi đã chuẩn hóa (THUẦN, tất định).
 *
 * - `id = makeId()` cho từng bản (tiêm vào để unit test được tính duy nhất của id).
 * - `createdAt` TĂNG DẦN theo thứ tự dòng trong file: `base + chỉ số` (mili-giây) ⇒ khi sắp
 *   theo `createdAt` vẫn giữ ĐÚNG thứ tự người dùng nhập. `updatedAt = createdAt`.
 * - `folderId != null` → gán đúng MỘT thư mục; `null` ("Tất cả từ vựng") → KHÔNG gán thư mục.
 * - Toàn bộ `srs*` = null (từ mới, chưa học) ⇒ KHÔNG đụng chạm SM-2.
 *
 * Không chạm DOM/DB/React — việc ghi IndexedDB (một transaction) + phát đổi dữ liệu nằm ở
 * tầng gọi (useVocabulary.importNew).
 */
export function assembleImportVocabularies(
  records: readonly NormalizedImport[],
  folderId: string | null,
  baseIso: string,
  makeId: () => string,
): LocalVocabulary[] {
  const baseMs = Date.parse(baseIso);
  return records.map((record, index) => {
    const stamp = new Date(baseMs + index).toISOString();
    return {
      id: makeId(),
      word: record.word,
      meaning: record.meaning,
      reading: record.reading,
      sinoVietnamese: record.sinoVietnamese,
      example: record.example,
      exampleMeaning: record.exampleMeaning,
      note: record.note,
      tags: [],
      jlptLevel: record.jlptLevel,
      srsInterval: null,
      srsRepetition: null,
      srsEaseFactor: null,
      srsNextReview: null,
      // Mảng RIÊNG cho mỗi bản (tránh dùng chung tham chiếu giữa các bản ghi).
      folderIds: folderId !== null ? [folderId] : [],
      createdAt: stamp,
      updatedAt: stamp,
      deletedAt: null,
    };
  });
}
