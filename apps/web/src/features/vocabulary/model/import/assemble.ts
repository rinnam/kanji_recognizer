import type { LocalVocabulary } from '../../../../entities/vocabulary';
import { linkVocabulary } from '../branch-dedupe';
import type { NormalizedImport, PreviewRow } from './types';

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

/** Kết quả dựng danh sách GHI khi nhập: các hàng cần ghi + số từ mới / số từ gắn thêm. */
export interface ImportWritePlan {
  /** Gộp từ mới + từ gắn, GHI trong MỘT transaction (new id → thêm; id cũ → cập nhật). */
  rows: LocalVocabulary[];
  added: number;
  linked: number;
}

/**
 * Dựng danh sách GHI (THUẦN) từ bảng xem trước đã phân loại:
 * - status 'new'  → tạo bản mới (assembleImportVocabularies, `createdAt` tăng dần theo thứ tự).
 * - status 'link' → linkVocabulary(bản CÒN SỐNG có sẵn, folderId, now): gộp folderIds không
 *   trùng, `updatedAt = now`; KHÔNG đụng SRS/các trường khác, KHÔNG sửa đối tượng cũ.
 * Bỏ qua 'duplicate'/'error'. `folderId === null` ⇒ không có hàng 'link'. Dùng cho một
 * transaction IndexedDB ở useVocabulary.importNew.
 */
export function assembleImportWrites(
  previews: readonly PreviewRow[],
  vocabs: readonly LocalVocabulary[],
  folderId: string | null,
  now: string,
  makeId: () => string,
): ImportWritePlan {
  const byId = new Map(vocabs.map((item) => [item.id, item] as const));
  const newRecords = previews.filter((row) => row.status === 'new').map((row) => row.record);
  const newRows = assembleImportVocabularies(newRecords, folderId, now, makeId);

  const linkRows: LocalVocabulary[] = [];
  if (folderId !== null) {
    for (const row of previews) {
      if (row.status !== 'link' || row.existingId === undefined) continue;
      const existing = byId.get(row.existingId);
      if (existing !== undefined) linkRows.push(linkVocabulary(existing, folderId, now));
    }
  }

  return { rows: [...newRows, ...linkRows], added: newRows.length, linked: linkRows.length };
}
