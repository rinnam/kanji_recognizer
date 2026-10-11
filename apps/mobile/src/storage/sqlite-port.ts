import type {
  FolderDto,
  StoragePort,
  VocabularyDto,
} from '@kanji-nest/core';
import * as SQLite from 'expo-sqlite';

/** Tên file DB của app kanjismart trên thiết bị. */
export const APP_DB_NAME = 'kanjismart.db';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS folders (id TEXT PRIMARY KEY, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS vocabularies (id TEXT PRIMARY KEY, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
`;

/** Mở (và dựng schema nếu chưa có) DB của app. Gọi một lần khi khởi động. */
export function openAppDatabase(): SQLite.SQLiteDatabase {
  const db = SQLite.openDatabaseSync(APP_DB_NAME);
  db.execSync(SCHEMA);
  return db;
}

function parseRow<T>(value: string): T {
  return JSON.parse(value) as T;
}

function putManyRows(
  db: SQLite.SQLiteDatabase,
  table: 'folders' | 'vocabularies',
  rows: readonly { id: string }[],
): void {
  if (rows.length === 0) return;
  db.withTransactionSync(() => {
    for (const row of rows) {
      db.runSync(
        `INSERT OR REPLACE INTO ${table} (id, data) VALUES (?, ?)`,
        row.id,
        JSON.stringify(row),
      );
    }
  });
}

/**
 * Adapter Mobile của `StoragePort` trên expo-sqlite (M2). Mỗi bản ghi là một
 * hàng `{id, data JSON}` — cùng ngữ nghĩa với object store IndexedDB bên Web
 * (upsert theo id, đọc gồm tombstone). M3 sẽ dùng port này cho màn hình học.
 */
export function createSqliteStoragePort(db: SQLite.SQLiteDatabase): StoragePort {
  return {
    folders: {
      all: () =>
        Promise.resolve(
          db
            .getAllSync<{ data: string }>('SELECT data FROM folders')
            .map((row) => parseRow<FolderDto>(row.data)),
        ),
      putMany: (rows) => {
        putManyRows(db, 'folders', rows);
        return Promise.resolve();
      },
    },
    vocabs: {
      all: () =>
        Promise.resolve(
          db
            .getAllSync<{ data: string }>('SELECT data FROM vocabularies')
            .map((row) => parseRow<VocabularyDto>(row.data)),
        ),
      putMany: (rows) => {
        putManyRows(db, 'vocabularies', rows);
        return Promise.resolve();
      },
    },
    meta: {
      get: (key) => {
        const row = db.getFirstSync<{ value: string }>(
          'SELECT value FROM meta WHERE key = ?',
          key,
        );
        return Promise.resolve(row?.value ?? null);
      },
      set: (key, value) => {
        db.runSync('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', key, value);
        return Promise.resolve();
      },
    },
  };
}
