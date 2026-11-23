import type { FolderDto, VocabularyDto } from '../../packages/contracts/src/study';
import { compareFolders } from '../../frontend/src/entities/folder/model/path';

export interface FolderRow {
  folder: FolderDto;
  depth: number;
  childIds: ReadonlySet<string>;
  count: number;
}

export function buildFolderTree(folders: FolderDto[], words: VocabularyDto[]): FolderRow[] {
  const active = folders.filter((folder) => folder.deletedAt === null);
  const live = words.filter((word) => word.deletedAt === null);
  const ids = new Set(active.map(({ id }) => id));
  const children = new Map<string | null, FolderDto[]>();
  for (const folder of [...active].sort(compareFolders)) {
    const parent = folder.parentId && ids.has(folder.parentId) ? folder.parentId : null;
    const siblings = children.get(parent) ?? [];
    siblings.push(folder);
    children.set(parent, siblings);
  }
  const visited = new Set<string>();
  const rows: FolderRow[] = [];
  function visit(folder: FolderDto, depth: number): ReadonlySet<string> {
    if (visited.has(folder.id)) return new Set();
    visited.add(folder.id);
    const childIds = new Set([folder.id]);
    const row = { folder, depth, childIds, count: 0 };
    rows.push(row);
    for (const child of children.get(folder.id) ?? []) {
      for (const id of visit(child, depth + 1)) childIds.add(id);
    }
    row.count = live.filter((word) => word.folderIds.some((id) => childIds.has(id))).length;
    return childIds;
  }
  for (const folder of children.get(null) ?? []) visit(folder, 0);
  for (const folder of active) visit(folder, 0);
  return rows;
}
