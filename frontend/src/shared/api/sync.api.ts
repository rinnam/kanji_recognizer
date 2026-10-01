import type { FolderDto, PullResult, PushResult, VocabularyDto } from './dto';
import { request } from './http';

/** Body push: client đẩy bản ghi local-first (folders/vocabularies) lên server. */
export interface PushPayload {
  folders?: FolderDto[];
  vocabularies?: VocabularyDto[];
}

/** Pull theo delta kể từ `since` (bỏ trống = toàn bộ) — GET /sync/pull. */
export function pull(since?: string): Promise<PullResult> {
  return request<PullResult>('/sync/pull', { query: { since } });
}

/** Push LWW idempotent (POST /sync/push). */
export function push(payload: PushPayload): Promise<PushResult> {
  return request<PushResult>('/sync/push', { method: 'POST', body: payload });
}
