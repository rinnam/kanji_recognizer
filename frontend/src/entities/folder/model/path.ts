import type { LocalFolder } from './types';

/** Thư mục còn sống (chưa bị tombstone). */
function isLiving(folder: LocalFolder): boolean {
  return folder.deletedAt === null;
}

/**
 * Chuẩn hóa tên thư mục CHỈ để SO SÁNH (không dùng khi hiển thị/lưu):
 * NFC + bỏ khoảng trắng đầu/cuối + gộp khoảng trắng giữa + hạ chữ thường.
 * Giữ nguyên dấu tiếng Việt (chỉ gộp cách biểu diễn Unicode, KHÔNG bóc dấu).
 */
export function normalizeFolderName(name: string): string {
  return name.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
}

/** Khóa gộp theo (parentId, tên chuẩn hóa) — tách null parent khỏi id rỗng. */
function siblingKey(parentId: string | null, name: string): string {
  return `${parentId ?? '\u0000root'}\u0001${normalizeFolderName(name)}`;
}

/**
 * Có thư mục SỐNG KHÁC cùng `parentId` mang tên (đã chuẩn hóa) trùng không?
 * `excludeId` để bỏ qua chính thư mục đang đổi tên.
 */
export function isFolderNameTaken(
  folders: LocalFolder[],
  parentId: string | null,
  name: string,
  excludeId?: string,
): boolean {
  const target = normalizeFolderName(name);
  if (target === '') return false;
  return folders.some(
    (folder) =>
      isLiving(folder) &&
      folder.id !== excludeId &&
      folder.parentId === parentId &&
      normalizeFolderName(folder.name) === target,
  );
}

/**
 * id các thư mục SỐNG đang trùng tên với anh em CÙNG `parentId` (dữ liệu cũ chưa ràng buộc).
 * Trả về Set rỗng nếu không có trùng.
 */
export function findDuplicateSiblingIds(folders: LocalFolder[]): Set<string> {
  const groups = new Map<string, LocalFolder[]>();
  for (const folder of folders) {
    if (!isLiving(folder)) continue;
    const key = siblingKey(folder.parentId, folder.name);
    const list = groups.get(key) ?? [];
    list.push(folder);
    groups.set(key, list);
  }
  const duplicates = new Set<string>();
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    for (const folder of list) duplicates.add(folder.id);
  }
  return duplicates;
}

/**
 * So sánh thứ tự hiển thị cây: `order` tăng dần (null xuống cuối) → `createdAt` tăng dần →
 * `id` (chốt thứ tự tất định). features/folder-tree dùng lại hàm này.
 */
export function compareFolders(a: LocalFolder, b: LocalFolder): number {
  const ao = a.order ?? Number.POSITIVE_INFINITY;
  const bo = b.order ?? Number.POSITIVE_INFINITY;
  if (ao !== bo) return ao - bo;
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
  if (a.id !== b.id) return a.id < b.id ? -1 : 1;
  return 0;
}

/**
 * Đường dẫn đầy đủ từ gốc tới thư mục `id` (vd 'Kanji N3 › 01'); `id` lạ → ''.
 * Cha đã bị xóa coi như gốc (dừng chuỗi). Có chống vòng lặp.
 */
export function folderPath(folders: LocalFolder[], id: string, sep = ' › '): string {
  const byId = new Map<string, LocalFolder>();
  for (const folder of folders) {
    if (isLiving(folder)) byId.set(folder.id, folder);
  }
  const names: string[] = [];
  const seen = new Set<string>();
  let current = byId.get(id);
  while (current !== undefined && !seen.has(current.id)) {
    seen.add(current.id);
    names.push(current.name);
    current = current.parentId !== null ? byId.get(current.parentId) : undefined;
  }
  return names.reverse().join(sep);
}

/** Một dòng chọn thư mục: id, nhãn = đường dẫn đầy đủ, độ sâu (để thụt lề nếu cần). */
export interface FolderOption {
  id: string;
  label: string;
  depth: number;
}

/**
 * Danh sách chọn thư mục theo thứ tự DFS (cha NGAY TRƯỚC con); nhãn là đường dẫn đầy đủ.
 * Chỉ gồm thư mục còn sống; orphan (cha đã xóa) được coi là gốc — khớp cây hiển thị.
 */
export function folderOptions(folders: LocalFolder[], sep = ' › '): FolderOption[] {
  const living = folders.filter(isLiving);
  const byId = new Map(living.map((folder) => [folder.id, folder] as const));
  const childrenOf = new Map<string | null, LocalFolder[]>();
  for (const folder of living) {
    const parentKey =
      folder.parentId !== null && byId.has(folder.parentId) ? folder.parentId : null;
    const list = childrenOf.get(parentKey) ?? [];
    list.push(folder);
    childrenOf.set(parentKey, list);
  }
  const options: FolderOption[] = [];
  const walk = (parentKey: string | null, depth: number): void => {
    const list = (childrenOf.get(parentKey) ?? []).slice().sort(compareFolders);
    for (const folder of list) {
      options.push({ id: folder.id, label: folderPath(living, folder.id, sep), depth });
      walk(folder.id, depth + 1);
    }
  };
  walk(null, 0);
  return options;
}
