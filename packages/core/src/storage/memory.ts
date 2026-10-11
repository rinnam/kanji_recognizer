import type { FolderDto, VocabularyDto } from '../dto';
import type { StoragePort } from './port';

/** Dữ liệu mồi cho port memory (mặc định rỗng). */
export interface MemorySeed {
  folders?: readonly FolderDto[];
  vocabs?: readonly VocabularyDto[];
  meta?: Readonly<Record<string, string>>;
}

/**
 * Port memory (Map) — triển khai tham chiếu của `StoragePort` để test hợp
 * đồng và chạy logic sync/engine mà KHÔNG cần nền tảng (node). Ngữ nghĩa
 * upsert theo `id`, mảng rỗng no-op — adapter Web/Mobile phải khớp.
 */
export function createMemoryStoragePort(seed: MemorySeed = {}): StoragePort {
  const folders = new Map<string, FolderDto>();
  const vocabs = new Map<string, VocabularyDto>();
  const meta = new Map<string, string>();
  for (const row of seed.folders ?? []) folders.set(row.id, row);
  for (const row of seed.vocabs ?? []) vocabs.set(row.id, row);
  for (const [key, value] of Object.entries(seed.meta ?? {})) meta.set(key, value);
  return {
    folders: {
      all: () => Promise.resolve([...folders.values()]),
      putMany: (rows) => {
        for (const row of rows) folders.set(row.id, row);
        return Promise.resolve();
      },
    },
    vocabs: {
      all: () => Promise.resolve([...vocabs.values()]),
      putMany: (rows) => {
        for (const row of rows) vocabs.set(row.id, row);
        return Promise.resolve();
      },
    },
    meta: {
      get: (key) => Promise.resolve(meta.get(key) ?? null),
      set: (key, value) => {
        meta.set(key, value);
        return Promise.resolve();
      },
    },
  };
}
