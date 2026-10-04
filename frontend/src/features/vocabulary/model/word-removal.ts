import type { LocalVocabulary } from '../../../entities/vocabulary';

/** Số liệu dry-run cho hộp xác nhận gỡ/xóa từ (Phần 7D). */
export interface WordRemovalCounts {
  /** Số từ được GIỮ: chỉ gỡ liên kết trong phạm vi, vẫn còn thư mục khác. */
  detached: number;
  /** Số từ bị XÓA HẲN (tombstone): hết thư mục sau khi gỡ, hoặc phạm vi = toàn cục. */
  deleted: number;
}

/** Kế hoạch gỡ/xóa từ: bản ghi cần ghi + số liệu. THUẦN, không đụng DB. */
export interface WordRemovalPlan {
  /** Từ được GIỮ, đã cắt các folderId trong phạm vi; updatedAt = now. */
  toUpdate: LocalVocabulary[];
  /** Từ bị TOMBSTONE; deletedAt = updatedAt = now. */
  toTombstone: LocalVocabulary[];
  counts: WordRemovalCounts;
}

/**
 * Lập kế hoạch GỠ/XÓA từ khi người dùng xóa trong một phạm vi đang xem (THUẦN, tất định — KHÔNG
 * đụng DB). Vì sau 7C một từ có thể thuộc NHIỀU thư mục, xóa nó khi đang xem một thư mục chỉ nên
 * GỠ khỏi thư mục đó, không được làm mất nó khỏi các thư mục khác.
 *  - Chỉ xét từ CÒN SỐNG có `id ∈ ids` (từ đã tombstone / id lạ → bỏ qua).
 *  - `scopeFolderIds === null` (xem 'Tất cả từ vựng' hoặc tìm kiếm toàn cục):
 *      TOMBSTONE mọi từ được chọn (xóa hẳn).
 *  - Có `scopeFolderIds` (phạm vi = thư mục đang chọn + con cháu): với mỗi từ, bỏ các id thuộc
 *      phạm vi khỏi `folderIds`;
 *      • còn thư mục khác → GIỮ từ (CẬP NHẬT folderIds đã cắt);
 *      • hết thư mục → TOMBSTONE.
 *  - Mọi bản ghi bị ảnh hưởng đặt `updatedAt = now` (và `deletedAt = now` nếu tombstone) để sync
 *    (LWW) coi là "bẩn" và đẩy lên server — nếu không, thao tác xóa KHÔNG bao giờ lan truyền.
 */
export function planWordRemoval(
  vocabs: readonly LocalVocabulary[],
  ids: readonly string[],
  scopeFolderIds: ReadonlySet<string> | null,
  now: string,
): WordRemovalPlan {
  const idSet = new Set(ids);
  const toUpdate: LocalVocabulary[] = [];
  const toTombstone: LocalVocabulary[] = [];

  for (const vocab of vocabs) {
    if (!idSet.has(vocab.id) || vocab.deletedAt !== null) continue;

    if (scopeFolderIds === null) {
      toTombstone.push({ ...vocab, deletedAt: now, updatedAt: now });
      continue;
    }

    const remaining = vocab.folderIds.filter((id) => !scopeFolderIds.has(id));
    if (remaining.length > 0) {
      toUpdate.push({ ...vocab, folderIds: remaining, updatedAt: now });
    } else {
      toTombstone.push({ ...vocab, folderIds: remaining, deletedAt: now, updatedAt: now });
    }
  }

  return {
    toUpdate,
    toTombstone,
    counts: { detached: toUpdate.length, deleted: toTombstone.length },
  };
}
