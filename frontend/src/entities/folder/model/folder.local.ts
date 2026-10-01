import { STORE } from '../../../shared/config';
import {
  idbBulkPut,
  idbCount,
  idbDelete,
  idbGet,
  idbGetAll,
  idbPut,
} from '../../../shared/lib';
import type { LocalFolder } from './types';

/** Local-first store cho folders (IndexedDB là bản chính của client). */
export function getAllFoldersLocal(db: IDBDatabase): Promise<LocalFolder[]> {
  return idbGetAll<LocalFolder>(db, STORE.folders);
}

export function getFolderLocal(
  db: IDBDatabase,
  id: string,
): Promise<LocalFolder | undefined> {
  return idbGet<LocalFolder>(db, STORE.folders, id);
}

export function putFolderLocal(db: IDBDatabase, folder: LocalFolder): Promise<void> {
  return idbPut(db, STORE.folders, folder);
}

export function putFoldersLocal(
  db: IDBDatabase,
  folders: readonly LocalFolder[],
): Promise<void> {
  return idbBulkPut(db, STORE.folders, folders);
}

export function deleteFolderLocal(db: IDBDatabase, id: string): Promise<void> {
  return idbDelete(db, STORE.folders, id);
}

export function countFolders(db: IDBDatabase): Promise<number> {
  return idbCount(db, STORE.folders);
}
