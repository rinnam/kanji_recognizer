import type { LocalVocabulary } from '../../../entities/vocabulary';
import { folderPath, type LocalFolder } from '../../../entities/folder';
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
 * Phân loại một từ nhập vào theo quy tắc thẻ độc lập từng thư mục:
 * - Trùng trong cùng file: skip 'in-file'
 * - Trùng trong chính thư mục đích (hoặc trùng chưa gán thư mục khi targetFolderId === null): skip
 * - Từ đã có ở thư mục khác: tạo thẻ mới độc lập ('new').
 */
export function classifyIncoming({
  incoming,
  targetFolderId,
  vocabs,
  folders,
  seenKeys,
}: ClassifyIncomingArgs): ClassifyResult {
  const key = dedupeKey(incoming.word, incoming.reading);

  // (1) Trùng với một dòng đã xử lý trước đó trong cùng lần import.
  if (seenKeys !== undefined && seenKeys.has(key)) {
    return { kind: 'skip', reason: 'in-file' };
  }

  // (2) Chưa chọn thư mục đích: từ đã tồn tại trong hệ thống → bỏ qua (exists).
  if (targetFolderId === null) {
    const existing = findDuplicate(vocabs, incoming.word, incoming.reading);
    if (existing !== undefined) {
      const existingPath = firstFolderPath(existing, folders);
      return { kind: 'skip', reason: 'exists', existingPath };
    }
    return { kind: 'new' };
  }

  // (3) Đã chọn thư mục đích: chỉ kiểm tra trùng trong chính thư mục đích.
  const existingInFolder = vocabs.find(
    (item) =>
      item.deletedAt === null &&
      item.folderIds.includes(targetFolderId) &&
      dedupeKey(item.word, item.reading) === key,
  );
  if (existingInFolder !== undefined) {
    const existingPath = folderPath(folders, targetFolderId) || UNFILED_LABEL;
    return { kind: 'skip', reason: 'in-branch', existingPath };
  }

  // Khác thư mục: tạo thẻ độc lập bình thường.
  return { kind: 'new' };
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
