import { request } from '../../../shared/api';
import type { FolderDto } from '../../../shared/api';
import type { CreateFolderInput, LocalFolder, UpdateFolderInput } from '../model';

export function listFolders(parentId?: string): Promise<LocalFolder[]> {
  return request<FolderDto[]>('/folders', { query: { parentId } });
}

export function getFolder(id: string): Promise<LocalFolder> {
  return request<FolderDto>(`/folders/${encodeURIComponent(id)}`);
}

export function createFolder(input: CreateFolderInput): Promise<LocalFolder> {
  return request<FolderDto>('/folders', { method: 'POST', body: input });
}

export function updateFolder(id: string, patch: UpdateFolderInput): Promise<LocalFolder> {
  return request<FolderDto>(`/folders/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: patch,
  });
}

export function deleteFolder(id: string): Promise<void> {
  return request<void>(`/folders/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
