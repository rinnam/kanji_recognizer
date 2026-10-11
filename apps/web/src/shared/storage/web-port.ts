import type {
  FolderDto,
  StoragePort,
  VocabularyDto,
} from '@kanji-nest/core';
import { STORE } from '../config';
import { idbBulkPut, idbGet, idbGetAll, idbPut } from '../lib';

interface MetaRecord {
  key: string;
  value: string;
}

/**
 * Adapter Web của `StoragePort` trên IndexedDB (M2). Bọc helper `shared/lib`
 * có sẵn; ngữ nghĩa upsert-theo-id và tombstone giữ nguyên như logic hiện tại
 * (put đè toàn bản ghi, đọc gồm cả tombstone để sync đẩy thao tác xóa).
 * M3 sẽ chuyển các hook/entity sang dùng port này thay vì gọi idb trực tiếp.
 */
export function createWebStoragePort(db: IDBDatabase): StoragePort {
  return {
    folders: {
      all: () => idbGetAll<FolderDto>(db, STORE.folders),
      putMany: (rows) =>
        rows.length === 0
          ? Promise.resolve()
          : idbBulkPut<FolderDto>(db, STORE.folders, [...rows]),
    },
    vocabs: {
      all: () => idbGetAll<VocabularyDto>(db, STORE.vocabularies),
      putMany: (rows) =>
        rows.length === 0
          ? Promise.resolve()
          : idbBulkPut<VocabularyDto>(db, STORE.vocabularies, [...rows]),
    },
    meta: {
      get: async (key) => (await idbGet<MetaRecord>(db, STORE.meta, key))?.value ?? null,
      set: (key, value) => idbPut<MetaRecord>(db, STORE.meta, { key, value }),
    },
  };
}
