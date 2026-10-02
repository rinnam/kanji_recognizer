import type { LocalVocabulary } from './types';

/**
 * Thông tin tối thiểu của thư mục cần cho việc tính phạm vi. `LocalFolder` map được
 * trực tiếp vào kiểu này (có đủ id/parentId/deletedAt) nên không cần phụ thuộc chéo entity.
 */
export interface ScopeFolder {
  id: string;
  parentId: string | null;
  deletedAt: string | null;
}

/**
 * Tập id thư mục thuộc phạm vi khi chọn `rootId`: gồm CHÍNH NÓ + MỌI thư mục con cháu,
 * chỉ tính thư mục còn sống (deletedAt === null). Thư mục đã xóa không nằm trong tập;
 * nếu `rootId` không phải thư mục còn sống thì trả về tập rỗng. THUẦN, tất định.
 */
export function collectDescendantFolderIds(
  folders: readonly ScopeFolder[],
  rootId: string,
): Set<string> {
  const childrenByParent = new Map<string | null, string[]>();
  const livingIds = new Set<string>();
  for (const folder of folders) {
    if (folder.deletedAt !== null) continue;
    livingIds.add(folder.id);
    const siblings = childrenByParent.get(folder.parentId) ?? [];
    siblings.push(folder.id);
    childrenByParent.set(folder.parentId, siblings);
  }

  const result = new Set<string>();
  if (!livingIds.has(rootId)) return result;
  const stack: string[] = [rootId];
  while (stack.length > 0) {
    const id = stack.pop() as string;
    if (result.has(id)) continue;
    result.add(id);
    for (const child of childrenByParent.get(id) ?? []) stack.push(child);
  }
  return result;
}

/**
 * Danh sách từ CÒN SỐNG (deletedAt === null) thuộc phạm vi thư mục đang chọn.
 * - `selectedFolderId === null` → tất cả từ còn sống.
 * - ngược lại → từ có ít nhất một `folderId` thuộc phạm vi (gồm thư mục con cháu).
 * Một từ thuộc nhiều thư mục chỉ xuất hiện MỘT lần (lọc trên mảng vocabs). Giữ nguyên
 * thứ tự đầu vào để nơi dùng tự sắp theo createdAt / bốc ngẫu nhiên. THUẦN, tất định.
 */
export function selectWordsInScope(
  vocabs: readonly LocalVocabulary[],
  folders: readonly ScopeFolder[],
  selectedFolderId: string | null,
): LocalVocabulary[] {
  const living = vocabs.filter((item) => item.deletedAt === null);
  if (selectedFolderId === null) return living;
  const scope = collectDescendantFolderIds(folders, selectedFolderId);
  if (scope.size === 0) return [];
  return living.filter((item) => item.folderIds.some((id) => scope.has(id)));
}
