import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getAllFoldersLocal,
  getFolderLocal,
  putFolderLocal,
  putFoldersLocal,
  type LocalFolder,
} from '../../../entities/folder';
import { getAllVocabulariesLocal } from '../../../entities/vocabulary';
import { useDb } from '../../../shared/db';
import { STORE } from '../../../shared/config';
import { emitDataChanged, idbBulkPutMany, newFolderId, nowIso } from '../../../shared/lib';
import { planFolderCascade, type FolderCascadeCounts } from './cascade';
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
  folders: LocalFolder[];
  tree: FolderTreeNode[];
  status: Status;
  error: string | null;
  reload: () => Promise<void>;
  create: (name: string, parentId: string | null) => Promise<void>;
  rename: (id: string, name: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  /** Dry-run: số liệu xóa dây chuyền (F/V/K) để hiển thị hộp xác nhận, KHÔNG ghi gì. */
  planRemove: (id: string) => Promise<FolderCascadeCounts>;
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
      emitDataChanged();
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
      emitDataChanged();
      await reload();
    },
    [db, reload],
  );

  // Xóa mềm DÂY CHUYỀN (tombstone) để đồng bộ lan truyền; KHÔNG hard-delete (tránh server hồi
  // sinh). Tombstone thư mục + MỌI con cháu + các từ chỉ thuộc chúng; từ còn thuộc thư mục khác
  // chỉ bị cắt liên kết (giữ lại). Ghi folders + vocabularies trong MỘT transaction IndexedDB
  // (nguyên tử), emit change-bus MỘT lần. Mọi bản ghi bị ảnh hưởng đều có updatedAt = now.
  const remove = useCallback(
    async (id: string): Promise<void> => {
      const [allFolders, allVocab] = await Promise.all([
        getAllFoldersLocal(db),
        getAllVocabulariesLocal(db),
      ]);
      const plan = planFolderCascade(allFolders, allVocab, id, nowIso());
      if (plan.folders.length === 0 && plan.vocabularies.length === 0) return;
      await idbBulkPutMany(db, [
        { store: STORE.folders, values: plan.folders },
        { store: STORE.vocabularies, values: plan.vocabularies },
      ]);
      emitDataChanged();
      await reload();
    },
    [db, reload],
  );

  // Dry-run cho hộp xác nhận: tính số thư mục con / từ bị xóa / từ được giữ mà KHÔNG ghi gì.
  const planRemove = useCallback(
    async (id: string): Promise<FolderCascadeCounts> => {
      const [allFolders, allVocab] = await Promise.all([
        getAllFoldersLocal(db),
        getAllVocabulariesLocal(db),
      ]);
      return planFolderCascade(allFolders, allVocab, id, nowIso()).counts;
    },
    [db],
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
      emitDataChanged();
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

  return {
    folders,
    tree,
    status,
    error,
    reload,
    create,
    rename,
    remove,
    planRemove,
    moveInto,
    moveBefore,
  };
}
