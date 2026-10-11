import { DB_NAME, DB_VERSION, STORE } from '../config/db';

/**
 * Wrapper IndexedDB thuần (KHÔNG thêm dependency). Mở + migrate schema ở version 1,
 * kèm các thao tác get/getAll/put/bulkPut/delete/count bọc Promise.
 */
export function openKanjiDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (): void => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE.folders)) {
        const folders = db.createObjectStore(STORE.folders, { keyPath: 'id' });
        folders.createIndex('by_parentId', 'parentId');
        folders.createIndex('by_updatedAt', 'updatedAt');
        folders.createIndex('by_deletedAt', 'deletedAt');
      }

      if (!db.objectStoreNames.contains(STORE.vocabularies)) {
        const vocab = db.createObjectStore(STORE.vocabularies, { keyPath: 'id' });
        vocab.createIndex('by_updatedAt', 'updatedAt');
        vocab.createIndex('by_deletedAt', 'deletedAt');
        vocab.createIndex('by_srsNextReview', 'srsNextReview');
        vocab.createIndex('by_folderIds', 'folderIds', { multiEntry: true });
        vocab.createIndex('by_tags', 'tags', { multiEntry: true });
      }

      if (!db.objectStoreNames.contains(STORE.meta)) {
        db.createObjectStore(STORE.meta, { keyPath: 'key' });
      }
    };

    request.onsuccess = (): void => resolve(request.result);
    request.onerror = (): void =>
      reject(request.error ?? new Error('Không mở được IndexedDB'));
    request.onblocked = (): void =>
      reject(new Error('IndexedDB bị chặn (một tab khác đang giữ phiên bản cũ)'));
  });
}

function store(db: IDBDatabase, name: string, mode: IDBTransactionMode): IDBObjectStore {
  return db.transaction(name, mode).objectStore(name);
}

function toPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = (): void => resolve(request.result);
    request.onerror = (): void =>
      reject(request.error ?? new Error('Lỗi thao tác IndexedDB'));
  });
}

export function idbGet<T>(
  db: IDBDatabase,
  name: string,
  key: IDBValidKey,
): Promise<T | undefined> {
  return toPromise<T | undefined>(
    store(db, name, 'readonly').get(key) as IDBRequest<T | undefined>,
  );
}

export function idbGetAll<T>(db: IDBDatabase, name: string): Promise<T[]> {
  return toPromise<T[]>(store(db, name, 'readonly').getAll() as IDBRequest<T[]>);
}

export function idbGetAllByIndex<T>(
  db: IDBDatabase,
  name: string,
  index: string,
  query: IDBValidKey | IDBKeyRange,
): Promise<T[]> {
  return toPromise<T[]>(
    store(db, name, 'readonly').index(index).getAll(query) as IDBRequest<T[]>,
  );
}

export function idbCount(db: IDBDatabase, name: string): Promise<number> {
  return toPromise<number>(store(db, name, 'readonly').count());
}

export async function idbPut<T>(db: IDBDatabase, name: string, value: T): Promise<void> {
  await toPromise(store(db, name, 'readwrite').put(value));
}

export function idbBulkPut<T>(
  db: IDBDatabase,
  name: string,
  values: readonly T[],
): Promise<void> {
  if (values.length === 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(name, 'readwrite');
    const objectStore = transaction.objectStore(name);
    for (const value of values) objectStore.put(value);
    transaction.oncomplete = (): void => resolve();
    transaction.onerror = (): void =>
      reject(transaction.error ?? new Error('Lỗi ghi hàng loạt IndexedDB'));
    transaction.onabort = (): void =>
      reject(transaction.error ?? new Error('Giao dịch IndexedDB bị hủy'));
  });
}

export async function idbDelete(
  db: IDBDatabase,
  name: string,
  key: IDBValidKey,
): Promise<void> {
  await toPromise(store(db, name, 'readwrite').delete(key));
}

/** Một lệnh ghi hàng loạt vào một store (dùng cho `idbBulkPutMany`). */
export interface IdbStoreWrite {
  store: string;
  values: readonly unknown[];
}

/**
 * Ghi hàng loạt vào NHIỀU store trong MỘT transaction (nguyên tử: hoặc tất cả, hoặc không).
 * Dùng cho xóa dây chuyền (tombstone folders + vocabularies cùng lúc). Bỏ qua write rỗng;
 * không còn write nào → no-op.
 */
export function idbBulkPutMany(
  db: IDBDatabase,
  writes: readonly IdbStoreWrite[],
): Promise<void> {
  const active = writes.filter((write) => write.values.length > 0);
  if (active.length === 0) return Promise.resolve();
  const storeNames = active.map((write) => write.store);
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeNames, 'readwrite');
    for (const write of active) {
      const objectStore = transaction.objectStore(write.store);
      for (const value of write.values) objectStore.put(value);
    }
    transaction.oncomplete = (): void => resolve();
    transaction.onerror = (): void =>
      reject(transaction.error ?? new Error('Lỗi ghi hàng loạt nhiều store IndexedDB'));
    transaction.onabort = (): void =>
      reject(transaction.error ?? new Error('Giao dịch IndexedDB bị hủy'));
  });
}
