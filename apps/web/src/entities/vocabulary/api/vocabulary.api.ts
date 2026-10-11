import { request } from '../../../shared/api';
import type { VocabularyDto } from '../../../shared/api';
import type {
  CreateVocabularyInput,
  ListVocabulariesQuery,
  LocalVocabulary,
  UpdateVocabularyInput,
} from '../model';

export function listVocabularies(
  filters: ListVocabulariesQuery = {},
): Promise<LocalVocabulary[]> {
  const query: Record<string, string | number | boolean | undefined> = {
    folderId: filters.folderId,
    jlptLevel: filters.jlptLevel,
    search: filters.search,
    limit: filters.limit,
    offset: filters.offset,
  };
  return request<VocabularyDto[]>('/vocabularies', { query });
}

export function getVocabulary(id: string): Promise<LocalVocabulary> {
  return request<VocabularyDto>(`/vocabularies/${encodeURIComponent(id)}`);
}

export function createVocabulary(
  input: CreateVocabularyInput,
): Promise<LocalVocabulary> {
  return request<VocabularyDto>('/vocabularies', { method: 'POST', body: input });
}

export function updateVocabulary(
  id: string,
  patch: UpdateVocabularyInput,
): Promise<LocalVocabulary> {
  return request<VocabularyDto>(`/vocabularies/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: patch,
  });
}

export function deleteVocabulary(id: string): Promise<void> {
  return request<void>(`/vocabularies/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
