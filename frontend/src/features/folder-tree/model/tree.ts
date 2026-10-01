import type { LocalFolder } from '../../../entities/folder';

/** Khoảng cách giữa các giá trị order (chừa chỗ chèn giữa mà không phải đánh lại số). */
export const ORDER_STEP = 1000;

export interface FolderTreeNode {
  folder: LocalFolder;
  children: FolderTreeNode[];
}

/** Vá trí di chuyển một folder: đổi parent + order. */
export interface FolderMovePatch {
  id: string;
  parentId: string | null;
  order: number;
}

/** Map id → folder, CHỈ gồm folder còn sống (deletedAt === null). */
export function livingById(folders: LocalFolder[]): Map<string, LocalFolder> {
  const map = new Map<string, LocalFolder>();
  for (const folder of folders) {
    if (folder.deletedAt === null) map.set(folder.id, folder);
  }
  return map;
}

/**
 * Parent "hiệu lực": nếu parent không còn sống (bị xóa/mất) thì coi như gốc (null)
 * để folder con không biến mất khỏi cây (BE không cascade khi tombstone).
 */
export function effectiveParentId(
  byId: Map<string, LocalFolder>,
  folder: LocalFolder,
): string | null {
  return folder.parentId !== null && byId.has(folder.parentId) ? folder.parentId : null;
}

/** So sánh thứ tự hiển thị: order tăng dần (null xuống cuối), rồi createdAt tăng dần. */
function compareFolders(a: LocalFolder, b: LocalFolder): number {
  const ao = a.order ?? Number.POSITIVE_INFINITY;
  const bo = b.order ?? Number.POSITIVE_INFINITY;
  if (ao !== bo) return ao - bo;
  if (a.createdAt < b.createdAt) return -1;
  if (a.createdAt > b.createdAt) return 1;
  return 0;
}

/** Danh sách folder con (còn sống) của một parent, đã sắp thứ tự. */
export function siblingsOf(
  folders: LocalFolder[],
  parentKey: string | null,
): LocalFolder[] {
  const byId = livingById(folders);
  const list: LocalFolder[] = [];
  for (const folder of byId.values()) {
    if (effectiveParentId(byId, folder) === parentKey) list.push(folder);
  }
  return list.sort(compareFolders);
}

/** Dựng cây từ danh sách phẳng: lọc tombstone, re-root orphan, sắp thứ tự. */
export function buildTree(folders: LocalFolder[]): FolderTreeNode[] {
  const byId = livingById(folders);
  const childrenOf = new Map<string | null, LocalFolder[]>();
  for (const folder of byId.values()) {
    const key = effectiveParentId(byId, folder);
    const list = childrenOf.get(key) ?? [];
    list.push(folder);
    childrenOf.set(key, list);
  }
  const build = (parentKey: string | null): FolderTreeNode[] => {
    const list = (childrenOf.get(parentKey) ?? []).slice().sort(compareFolders);
    return list.map((folder) => ({ folder, children: build(folder.id) }));
  };
  return build(null);
}

/** `ancestorId` có phải tổ tiên của `nodeId` không (chặn kéo folder vào chính con cháu). */
export function isAncestor(
  folders: LocalFolder[],
  ancestorId: string,
  nodeId: string,
): boolean {
  const byId = livingById(folders);
  const seen = new Set<string>();
  let current = byId.get(nodeId);
  while (current !== undefined && current.parentId !== null && byId.has(current.parentId)) {
    if (seen.has(current.id)) break;
    seen.add(current.id);
    if (current.parentId === ancestorId) return true;
    current = byId.get(current.parentId);
  }
  return false;
}

function isInvalidTarget(
  folders: LocalFolder[],
  draggedId: string,
  parentKey: string | null,
): boolean {
  return (
    parentKey !== null && (parentKey === draggedId || isAncestor(folders, draggedId, parentKey))
  );
}

/** Kéo folder vào trong một parent (hoặc gốc nếu null): nối vào cuối. */
export function reparentAppend(
  folders: LocalFolder[],
  draggedId: string,
  parentKey: string | null,
): FolderMovePatch[] {
  const byId = livingById(folders);
  if (!byId.has(draggedId)) return [];
  if (isInvalidTarget(folders, draggedId, parentKey)) return [];
  const siblings = siblingsOf(folders, parentKey).filter((f) => f.id !== draggedId);
  return [{ id: draggedId, parentId: parentKey, order: (siblings.length + 1) * ORDER_STEP }];
}

/** Kéo folder đặt NGAY TRƯỚC `beforeId` (cùng parent với beforeId): đánh lại order. */
export function reorderBefore(
  folders: LocalFolder[],
  draggedId: string,
  beforeId: string,
): FolderMovePatch[] {
  if (draggedId === beforeId) return [];
  const byId = livingById(folders);
  const dragged = byId.get(draggedId);
  const before = byId.get(beforeId);
  if (dragged === undefined || before === undefined) return [];

  const parentKey = effectiveParentId(byId, before);
  if (isInvalidTarget(folders, draggedId, parentKey)) return [];

  const siblings = siblingsOf(folders, parentKey).filter((f) => f.id !== draggedId);
  const index = siblings.findIndex((f) => f.id === beforeId);
  if (index < 0) return [];

  const ordered = [...siblings.slice(0, index), dragged, ...siblings.slice(index)];
  const patches: FolderMovePatch[] = [];
  ordered.forEach((folder, i) => {
    const order = (i + 1) * ORDER_STEP;
    const movedOrReordered =
      folder.id === draggedId ||
      folder.order !== order ||
      effectiveParentId(byId, folder) !== parentKey;
    if (movedOrReordered) patches.push({ id: folder.id, parentId: parentKey, order });
  });
  return patches;
}
