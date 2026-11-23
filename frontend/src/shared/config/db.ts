/**
 * Cấu hình IndexedDB local-first (bản chính của client — local-first, CONTEXT.md).
 * Nâng version khi đổi object store / index.
 */
export const DB_NAME = 'kanji-nest';
export const DB_VERSION = 2;

/** Tên object store. `meta` giữ con trỏ đồng bộ (lastPulledAt) + version schema. */
export const STORE = {
  folders: 'folders',
  vocabularies: 'vocabularies',
  meta: 'meta',
  pending: 'pending',
} as const;

export type StoreName = (typeof STORE)[keyof typeof STORE];
