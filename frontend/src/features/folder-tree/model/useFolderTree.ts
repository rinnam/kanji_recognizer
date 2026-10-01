import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getAllFoldersLocal,
  getFolderLocal,
  putFolderLocal,
  putFoldersLocal,
  type LocalFolder,
} from '../../../entities/folder';
import { useDb } from '../../../shared/db';
import { newFolderId, nowIso } from '../../../shared/lib';
import {
  ORDER_STEP,
  buildTree,
  reorderBefore,
  reparentAppend,
  siblingsOf,
  type FolderMovePatch,
  type FolderTreeNode,
} from './tree';

type Status = 'loading' | 'error' | 'ready';

export interface FolderTreeApi {
  tree: FolderTreeNode[];
  status: Status;
  error: string | null;
  reload: () => Promise<void>;
  create: (name: string, parentId: string | null) => Promise<void>;
  rename: (id: string, name: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  moveInto: (draggedId: string, parentId: string | null) => Promise<void>;
  moveBefore: (draggedId: string, beforeId: string) => Promise<void>;
}

const READ_ERROR = 'Không đọc được thư mục.';

/** Quản lý cây thư mục local-first (đọc/ghi IndexedDB qua entities/folder). */
export function useFolderTree(): FolderTreeApi {
  const db = useDb();
  const [folders, setFolders] = useState<LocalFolder[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);

  const fetchLiving = useCallback(async (): Promise<LocalFolder[]> => {
    const all = await getAllFoldersLocal(db);
    return all.filter((folder) => folder.deletedAt === null);
  }, [db]);

  const reload = useCallback(async (): Promise<void> => {
    setStatus('loading');
    try {
      setFolders(await fetchLiving());
      setError(null);
      setStatus('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : READ_ERROR);
      setStatus('error');
    }
  }, [fetchLiving]);

  // Nạp lần đầu: KHÔNG setState đồng bộ trước await (tránh cascading render).
  useEffect(() => {
    let active = true;
    void (async (): Promise<void> => {
      try {
        const living = await fetchLiving();
        if (!active) return;
        setFolders(living);
        setError(null);
        setStatus('ready');
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : READ_ERROR);
        setStatus('error');
      }
    })();
    return () => {
      active = false;
    };
  }, [fetchLiving]);

  const create = useCallback(
    async (name: string, parentId: string | null): Promise<void> => {
      const trimmed = name.trim();
      if (trimmed === '') return;
      const now = nowIso();
      const siblings = siblingsOf(folders, parentId);
      const folder: LocalFolder = {
        id: newFolderId(),
        name: trimmed,
        parentId,
        order: (siblings.length + 1) * ORDER_STEP,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };
      await putFolderLocal(db, folder);
      await reload();
    },
    [db, folders, reload],
  );

  const rename = useCallback(
    async (id: string, name: string): Promise<void> => {
      const trimmed = name.trim();
      if (trimmed === '') return;
      const existing = await getFolderLocal(db, id);
      if (existing === undefined) return;
      await putFolderLocal(db, { ...existing, name: trimmed, updatedAt: nowIso() });
      await reload();
    },
    [db, reload],
  );

  // Xóa mềm (tombstone) để đồng bộ lan truyền; KHÔNG hard-delete (tránh server hồi sinh).
  const remove = useCallback(
    async (id: string): Promise<void> => {
      const existing = await getFolderLocal(db, id);
      if (existing === undefined) return;
      const now = nowIso();
      await putFolderLocal(db, { ...existing, deletedAt: now, updatedAt: now });
      await reload();
    },
    [db, reload],
  );

  const applyPatches = useCallback(
    async (patches: FolderMovePatch[]): Promise<void> => {
      if (patches.length === 0) return;
      const byId = new Map(folders.map((folder) => [folder.id, folder]));
      const now = nowIso();
      const updated: LocalFolder[] = [];
      for (const patch of patches) {
        const folder = byId.get(patch.id);
        if (folder === undefined) continue;
        updated.push({
          ...folder,
          parentId: patch.parentId,
          order: patch.order,
          updatedAt: now,
        });
      }
      await putFoldersLocal(db, updated);
      await reload();
    },
    [db, folders, reload],
  );

  const moveInto = useCallback(
    async (draggedId: string, parentId: string | null): Promise<void> => {
      await applyPatches(reparentAppend(folders, draggedId, parentId));
    },
    [applyPatches, folders],
  );

  const moveBefore = useCallback(
    async (draggedId: string, beforeId: string): Promise<void> => {
      await applyPatches(reorderBefore(folders, draggedId, beforeId));
    },
    [applyPatches, folders],
  );

  const tree = useMemo(() => buildTree(folders), [folders]);

  return { tree, status, error, reload, create, rename, remove, moveInto, moveBefore };
}
