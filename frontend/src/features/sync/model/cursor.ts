import { STORE } from '../../../shared/config';
import { idbGet, idbPut } from '../../../shared/lib';

/**
 * Con trỏ đồng bộ lưu trong object store `meta` (keyPath 'key'):
 *  - `lastPulledAt`: mốc delta cho lần pull kế (serverTime do server trả về).
 *  - `lastPushedAt`: `updatedAt` lớn nhất của các bản ghi đã đẩy (KHÔNG dùng giờ client).
 */
export const SYNC_META_KEY = {
  lastPulledAt: 'sync.lastPulledAt',
  lastPushedAt: 'sync.lastPushedAt',
} as const;

interface MetaRecord {
  key: string;
  value: string;
}

export interface SyncCursor {
  lastPulledAt: string | null;
  lastPushedAt: string | null;
}

async function readMeta(db: IDBDatabase, key: string): Promise<string | null> {
  const record = await idbGet<MetaRecord>(db, STORE.meta, key);
  return record?.value ?? null;
}

async function writeMeta(db: IDBDatabase, key: string, value: string): Promise<void> {
  await idbPut<MetaRecord>(db, STORE.meta, { key, value });
}

/** Đọc cả hai con trỏ (song song). Chưa có → null. */
export async function readSyncCursor(db: IDBDatabase): Promise<SyncCursor> {
  const [lastPulledAt, lastPushedAt] = await Promise.all([
    readMeta(db, SYNC_META_KEY.lastPulledAt),
    readMeta(db, SYNC_META_KEY.lastPushedAt),
  ]);
  return { lastPulledAt, lastPushedAt };
}

export function writeLastPulledAt(db: IDBDatabase, value: string): Promise<void> {
  return writeMeta(db, SYNC_META_KEY.lastPulledAt, value);
}

export function writeLastPushedAt(db: IDBDatabase, value: string): Promise<void> {
  return writeMeta(db, SYNC_META_KEY.lastPushedAt, value);
}
