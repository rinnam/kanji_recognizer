import { db } from '../config/database.js';
import type { Executor } from './types.js';

function exec(trx?: Executor): Executor {
  return trx ?? db;
}

/** Gắn vocab vào danh sách folder (bỏ qua nếu rỗng). */
export async function linkFolders(
  vocabularyId: string,
  folderIds: string[],
  trx?: Executor,
): Promise<void> {
  if (folderIds.length === 0) return;
  await exec(trx)
    .insertInto('vocabulary_folders')
    .values(folderIds.map((folderId) => ({ vocabulary_id: vocabularyId, folder_id: folderId })))
    .onConflict((oc) => oc.columns(['vocabulary_id', 'folder_id']).doNothing())
    .execute();
}

/** Xóa toàn bộ liên kết folder của một vocab. */
export async function unlinkAll(vocabularyId: string, trx?: Executor): Promise<void> {
  await exec(trx)
    .deleteFrom('vocabulary_folders')
    .where('vocabulary_id', '=', vocabularyId)
    .execute();
}

/** Thay thế toàn bộ liên kết folder của một vocab bằng tập mới. */
export async function replaceLinks(
  vocabularyId: string,
  folderIds: string[],
  trx?: Executor,
): Promise<void> {
  await unlinkAll(vocabularyId, trx);
  await linkFolders(vocabularyId, folderIds, trx);
}

/** Lấy danh sách folder_id của một vocab. */
export async function listFolderIds(
  vocabularyId: string,
  trx?: Executor,
): Promise<string[]> {
  const rows = await exec(trx)
    .selectFrom('vocabulary_folders')
    .select('folder_id')
    .where('vocabulary_id', '=', vocabularyId)
    .execute();
  return rows.map((r) => r.folder_id);
}

/**
 * Lọc trong tập folderIds những id thực sự tồn tại cho owner (còn sống).
 * Dùng khi sync để tránh vi phạm FK vocabulary_folders.folder_id.
 */
export async function listExistingFolderIds(
  ownerId: string,
  folderIds: string[],
  trx?: Executor,
): Promise<string[]> {
  if (folderIds.length === 0) return [];
  const rows = await exec(trx)
    .selectFrom('folders')
    .select('id')
    .where('owner_id', '=', ownerId)
    .where('id', 'in', folderIds)
    .where('deleted_at', 'is', null)
    .execute();
  return rows.map((r) => r.id);
}
