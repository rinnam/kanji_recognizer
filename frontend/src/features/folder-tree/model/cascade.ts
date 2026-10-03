import type { LocalFolder } from '../../../entities/folder';
import { collectDescendantFolderIds, type LocalVocabulary } from '../../../entities/vocabulary';

/** Số liệu dry-run cho hộp xác nhận xóa thư mục. */
export interface FolderCascadeCounts {
  /** Tổng số thư mục bị tombstone (GỒM thư mục gốc được chọn). */
  folders: number;
  /** Số thư mục con cháu (KHÔNG tính thư mục gốc) — hiển thị trong hộp xác nhận. */
  childFolders: number;
  /** Số từ bị tombstone (chỉ thuộc các thư mục bị xóa). */
  vocabTombstoned: number;
  /** Số từ được GIỮ nhưng mất liên kết tới thư mục bị xóa (còn thư mục khác). */
  vocabKept: number;
}

/** Kế hoạch xóa dây chuyền: bản ghi cần ghi + số liệu. THUẦN, không đụng DB. */
export interface FolderCascadePlan {
  /** Thư mục cần tombstone (gồm gốc), đã đặt deletedAt = updatedAt = now. */
  folders: LocalFolder[];
  /** Từ cần ghi: từ bị tombstone + từ được giữ (đã cắt folderIds); tất cả updatedAt = now. */
  vocabularies: LocalVocabulary[];
  counts: FolderCascadeCounts;
}

const EMPTY_PLAN: FolderCascadePlan = {
  folders: [],
  vocabularies: [],
  counts: { folders: 0, childFolders: 0, vocabTombstoned: 0, vocabKept: 0 },
};

/**
 * Lập kế hoạch XÓA DÂY CHUYỀN khi tombstone thư mục `rootId` (THUẦN, tất định — KHÔNG đụng DB):
 *  - Tombstone CHÍNH NÓ + MỌI thư mục con cháu còn sống.
 *  - Với mỗi từ CÒN SỐNG có `folderIds` giao với tập bị xóa:
 *      • còn thư mục SỐNG khác (ngoài tập) → GIỮ từ, cập nhật `folderIds` (bỏ các id bị xóa);
 *      • hết thư mục sống → TOMBSTONE từ.
 *  - Từ không giao với tập bị xóa → KHÔNG đụng tới.
 *  - Mọi bản ghi bị ảnh hưởng đặt `updatedAt = now` (và `deletedAt = now` nếu bị tombstone)
 *    để sync (LWW) coi là "bẩn" và đẩy lên server — nếu không, việc xóa KHÔNG bao giờ lan truyền.
 * `rootId` không phải thư mục còn sống (đã xóa / không tồn tại) → kế hoạch rỗng (idempotent).
 */
export function planFolderCascade(
  folders: readonly LocalFolder[],
  vocabs: readonly LocalVocabulary[],
  rootId: string,
  now: string,
): FolderCascadePlan {
  const descendantIds = collectDescendantFolderIds(folders, rootId);
  if (descendantIds.size === 0) return EMPTY_PLAN;

  const livingFolderIds = new Set<string>();
  for (const folder of folders) {
    if (folder.deletedAt === null) livingFolderIds.add(folder.id);
  }

  const tombstonedFolders = folders
    .filter((folder) => descendantIds.has(folder.id))
    .map((folder) => ({ ...folder, deletedAt: now, updatedAt: now }));

  const vocabularies: LocalVocabulary[] = [];
  let vocabTombstoned = 0;
  let vocabKept = 0;
  for (const vocab of vocabs) {
    if (vocab.deletedAt !== null) continue;
    const touchesDeleted = vocab.folderIds.some((id) => descendantIds.has(id));
    if (!touchesDeleted) continue;
    const remaining = vocab.folderIds.filter((id) => !descendantIds.has(id));
    const hasLivingOther = remaining.some((id) => livingFolderIds.has(id));
    if (hasLivingOther) {
      vocabularies.push({ ...vocab, folderIds: remaining, updatedAt: now });
      vocabKept += 1;
    } else {
      vocabularies.push({ ...vocab, folderIds: remaining, deletedAt: now, updatedAt: now });
      vocabTombstoned += 1;
    }
  }

  return {
    folders: tombstonedFolders,
    vocabularies,
    counts: {
      folders: tombstonedFolders.length,
      childFolders: Math.max(0, tombstonedFolders.length - 1),
      vocabTombstoned,
      vocabKept,
    },
  };
}
