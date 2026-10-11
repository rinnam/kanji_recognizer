import { collectDescendantFolderIds, type LocalVocabulary } from '../../../entities/vocabulary';
import { folderPath, rootFolderId, type LocalFolder } from '../../../entities/folder';
import { dedupeKey, findDuplicate } from './dedupe';

/** Nhãn hiển thị khi từ đã có nhưng chưa thuộc thư mục nào. */
const UNFILED_LABEL = 'Chưa gán thư mục';

/** Từ đang nhập cần phân loại (chỉ cần word + reading để so khớp khóa). */
export interface IncomingWord {
  word: string;
  reading: string | null | undefined;
}

/**
 * Kết quả phân loại một từ khi nhập vào `targetFolderId`:
 * - 'new'   : chưa có từ sống trùng khóa → tạo mới.
 * - 'link'  : đã có ở NHÁNH KHÁC (hoặc chưa gán thư mục) → gắn từ có sẵn vào thư mục đích.
 * - 'skip'  : bỏ qua. 'in-branch' = đã có trong cùng nhánh; 'exists' = chưa chọn thư mục mà từ đã có;
 *             'in-file' = trùng với một dòng ĐÃ xử lý trước đó trong cùng lần import.
 */
export type ClassifyResult =
  | { kind: 'new' }
  | { kind: 'link'; existingId: string; existingPath: string }
  | { kind: 'skip'; reason: 'in-branch' | 'exists'; existingPath: string }
  | { kind: 'skip'; reason: 'in-file' };

/** Tham số cho {@link classifyIncoming}. `seenKeys` chứa khóa các dòng đã xử lý trong lần import. */
export interface ClassifyIncomingArgs {
  incoming: IncomingWord;
  targetFolderId: string | null;
  vocabs: LocalVocabulary[];
  folders: LocalFolder[];
  seenKeys?: ReadonlySet<string>;
}

/** Đường dẫn thư mục đầu tiên (còn sống) chứa từ; không có → nhãn 'Chưa gán thư mục'. */
function firstFolderPath(vocab: LocalVocabulary, folders: LocalFolder[]): string {
  for (const folderId of vocab.folderIds) {
    const path = folderPath(folders, folderId);
    if (path !== '') return path;
  }
  return UNFILED_LABEL;
}

/**
 * Phân loại một từ nhập vào theo quy tắc "trùng theo nhánh" (THUẦN, không đụng UI/SRS).
 * Nhánh của thư mục đích = cây dưới thư mục gốc cao nhất ({@link rootFolderId}). Chỉ xét từ còn sống.
 * Nơi gọi tự thêm khóa đã xử lý vào `seenKeys` sau mỗi dòng để bắt trùng trong cùng file.
 */
export function classifyIncoming({
  incoming,
  targetFolderId,
  vocabs,
  folders,
  seenKeys,
}: ClassifyIncomingArgs): ClassifyResult {
  const key = dedupeKey(incoming.word, incoming.reading);

  // (4) Trùng với một dòng đã xử lý trước đó trong cùng lần import.
  if (seenKeys !== undefined && seenKeys.has(key)) {
    return { kind: 'skip', reason: 'in-file' };
  }

  const existing = findDuplicate(vocabs, incoming.word, incoming.reading);
  if (existing === undefined) return { kind: 'new' };

  const existingPath = firstFolderPath(existing, folders);

  // Chưa chọn thư mục đích: từ đã tồn tại → bỏ qua.
  if (targetFolderId === null) {
    return { kind: 'skip', reason: 'exists', existingPath };
  }

  // Nhánh (cây dưới gốc cao nhất) của thư mục đích.
  const branch = collectDescendantFolderIds(folders, rootFolderId(folders, targetFolderId));
  const inBranch = existing.folderIds.some((folderId) => branch.has(folderId));
  if (inBranch) {
    return { kind: 'skip', reason: 'in-branch', existingPath };
  }

  // Từ có sẵn ở nhánh khác (hoặc chưa gán thư mục) → gắn vào thư mục đích.
  return { kind: 'link', existingId: existing.id, existingPath };
}

/**
 * Gắn `folderId` vào một từ có sẵn: trả về BẢN GHI MỚI với `folderIds` là hợp không trùng và
 * `updatedAt = now`. KHÔNG sửa đối tượng cũ, KHÔNG ghi đè các trường khác (gồm SRS).
 */
export function linkVocabulary(
  vocab: LocalVocabulary,
  folderId: string,
  now: string,
): LocalVocabulary {
  const folderIds = vocab.folderIds.includes(folderId)
    ? [...vocab.folderIds]
    : [...vocab.folderIds, folderId];
  return { ...vocab, folderIds, updatedAt: now };
}
