import { STORE } from '../../../shared/config';
import {
  idbBulkPut,
  idbCount,
  idbDelete,
  idbGet,
  idbGetAll,
  idbGetAllByIndex,
  idbPut,
} from '../../../shared/lib';
import type { LocalVocabulary } from './types';

/** Local-first store cho vocabularies (IndexedDB là bản chính của client). */
export function getAllVocabulariesLocal(db: IDBDatabase): Promise<LocalVocabulary[]> {
  return idbGetAll<LocalVocabulary>(db, STORE.vocabularies);
}

export function getVocabularyLocal(
  db: IDBDatabase,
  id: string,
): Promise<LocalVocabulary | undefined> {
  return idbGet<LocalVocabulary>(db, STORE.vocabularies, id);
}

/** Lọc theo folder bằng index multiEntry `by_folderIds`. */
export function getVocabulariesByFolderLocal(
  db: IDBDatabase,
  folderId: string,
): Promise<LocalVocabulary[]> {
  return idbGetAllByIndex<LocalVocabulary>(
    db,
    STORE.vocabularies,
    'by_folderIds',
    folderId,
  );
}

export function putVocabularyLocal(
  db: IDBDatabase,
  vocab: LocalVocabulary,
): Promise<void> {
  return idbPut(db, STORE.vocabularies, vocab);
}

export function putVocabulariesLocal(
  db: IDBDatabase,
  vocabularies: readonly LocalVocabulary[],
): Promise<void> {
  return idbBulkPut(db, STORE.vocabularies, vocabularies);
}

export function deleteVocabularyLocal(db: IDBDatabase, id: string): Promise<void> {
  return idbDelete(db, STORE.vocabularies, id);
}

export function countVocabularies(db: IDBDatabase): Promise<number> {
  return idbCount(db, STORE.vocabularies);
}
