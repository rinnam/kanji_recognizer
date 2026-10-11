import type { FolderDto, VocabularyDto } from '../dto';

/**
 * Port lưu trữ local (M2) — hợp đồng duy nhất giữa logic dùng chung và nơi
 * chứa dữ liệu của từng nền tảng (Web: IndexedDB · Mobile: expo-sqlite).
 * - Chỉ upsert theo `id` (ghi đè toàn bản ghi); xóa = tombstone (bản ghi có
 *   `deletedAt`), KHÔNG có thao tác xóa vật lý (tránh server hồi sinh).
 * - Mọi phương thức đều async để Web/Mobile triển khai đồng nhất.
 */
export interface FolderStore {
  /** Tất cả thư mục (gồm tombstone) — sync cần để đẩy thao tác xóa. */
  all(): Promise<FolderDto[]>;
  /** Upsert hàng loạt theo `id` (ghi đè). Mảng rỗng = no-op. */
  putMany(rows: readonly FolderDto[]): Promise<void>;
}

export interface VocabStore {
  /** Tất cả từ vựng (gồm tombstone). */
  all(): Promise<VocabularyDto[]>;
  /** Upsert hàng loạt theo `id` (ghi đè). Mảng rỗng = no-op. */
  putMany(rows: readonly VocabularyDto[]): Promise<void>;
}

export interface MetaStore {
  /** Con trỏ sync (`sync.lastPulledAt` / `sync.lastPushedAt`). Chưa có → null. */
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
}

export interface StoragePort {
  readonly folders: FolderStore;
  readonly vocabs: VocabStore;
  readonly meta: MetaStore;
}
