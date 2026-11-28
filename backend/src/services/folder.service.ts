import { env } from '../config/env.js';
import * as folderRepo from '../repositories/folder.repo.js';
import type { NewFolderRow } from '../types/database.js';
import { NotFoundError, ValidationFailedError } from '../utils/errors.js';
import { newFolderId } from '../utils/id.js';
import { folderRowToDto, type FolderDto } from '../utils/row-mappers.js';
import type {
  CreateFolderInput,
  ListFoldersQuery,
  UpdateFolderInput,
} from '../validators/folder.js';

const ownerId = (): string => env.LOCAL_OWNER_ID;

/** Chặn parentId trỏ tới folder không tồn tại hoặc tự trỏ chính nó. */
async function assertValidParent(
  parentId: string,
  selfId: string,
  targetOwnerId = ownerId(),
): Promise<void> {
  if (parentId === selfId) {
    throw new ValidationFailedError('A folder cannot be its own parent');
  }
  const parent = await folderRepo.selectById(targetOwnerId, parentId);
  if (!parent) {
    throw new ValidationFailedError(`Parent folder "${parentId}" does not exist`);
  }
}

export async function createFolder(
  input: CreateFolderInput,
  targetOwnerId = ownerId(),
): Promise<FolderDto> {
  const id = input.id ?? newFolderId();
  const parentId = input.parentId ?? null;

  if (parentId !== null) {
    await assertValidParent(parentId, id, targetOwnerId);
  }

  const row: NewFolderRow = {
    id,
    owner_id: targetOwnerId,
    name: input.name,
    parent_id: parentId,
    sort_order: input.order ?? null,
    created_at: input.createdAt ?? new Date(),
    updated_at: input.updatedAt ?? new Date(),
  };

  const created = await folderRepo.insert(row);
  return folderRowToDto(created);
}

export async function listFolders(
  query: ListFoldersQuery,
  targetOwnerId = ownerId(),
): Promise<FolderDto[]> {
  const filters = query.parentId !== undefined ? { parentId: query.parentId } : {};
  const rows = await folderRepo.listByOwner(targetOwnerId, filters);
  return rows.map(folderRowToDto);
}

export async function getFolder(
  id: string,
  targetOwnerId = ownerId(),
): Promise<FolderDto> {
  const row = await folderRepo.selectById(targetOwnerId, id);
  if (!row) throw new NotFoundError(`Folder "${id}" not found`);
  return folderRowToDto(row);
}

export async function updateFolder(
  id: string,
  input: UpdateFolderInput,
  targetOwnerId = ownerId(),
): Promise<FolderDto> {
  const existing = await folderRepo.selectById(targetOwnerId, id);
  if (!existing) throw new NotFoundError(`Folder "${id}" not found`);

  if (input.parentId !== undefined && input.parentId !== null) {
    await assertValidParent(input.parentId, id, targetOwnerId);
  }

  const patch: {
    name?: string;
    parent_id?: string | null;
    sort_order?: number | null;
  } = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.parentId !== undefined) patch.parent_id = input.parentId;
  if (input.order !== undefined) patch.sort_order = input.order;

  const updated = await folderRepo.update(targetOwnerId, id, patch);
  if (!updated) throw new NotFoundError(`Folder "${id}" not found`);
  return folderRowToDto(updated);
}

export async function deleteFolder(
  id: string,
  targetOwnerId = ownerId(),
): Promise<FolderDto> {
  const deleted = await folderRepo.softDelete(targetOwnerId, id);
  if (!deleted) throw new NotFoundError(`Folder "${id}" not found`);
  return folderRowToDto(deleted);
}
