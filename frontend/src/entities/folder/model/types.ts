import type { FolderDto } from '../../../shared/api';

/**
 * Thư mục phía client — nguồn sự thật local-first (AGENTS §7.1). Map 1-1 với DTO
 * server / cột DB; KHÔNG đổi tên field. (owner_id chỉ có ở server.)
 */
export type LocalFolder = FolderDto;

/** Input tạo folder (khớp validators/folder.ts của BE). */
export interface CreateFolderInput {
  id?: string;
  name: string;
  parentId?: string | null;
  order?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

/** Input cập nhật folder (ít nhất một field). */
export interface UpdateFolderInput {
  name?: string;
  parentId?: string | null;
  order?: number | null;
  updatedAt?: string;
}
