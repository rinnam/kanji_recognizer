import type { ApiError, Deck, LibraryFilters, LibraryResponse, SaveItemInput } from './types';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/v1';

const ERROR_MESSAGES: Record<string, string> = {
  OFFLINE: 'Thư viện không khả dụng khi bạn đang ngoại tuyến.',
  NOT_FOUND: 'Mục bạn yêu cầu trong Thư viện không còn tồn tại.',
  CONFLICT: 'Mục này đã được thay đổi ở nơi khác. Dữ liệu Thư viện mới nhất sẽ được tải lại.',
  VALIDATION_ERROR: 'Một số thông tin trong Thư viện không hợp lệ. Hãy kiểm tra và thử lại.'
};

export function getLibraryErrorMessage(error: ApiError): string {
  return ERROR_MESSAGES[error.code ?? ''] ?? 'Không thể hoàn tất yêu cầu với Thư viện. Hãy thử lại.';
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers }
    });
  } catch (cause) {
    const error = new Error('Thư viện không khả dụng khi ngoại tuyến') as ApiError;
    error.code = 'OFFLINE';
    error.cause = cause;
    throw error;
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { code?: string; message?: string };
    const error = new Error(payload.message ?? 'Yêu cầu với Thư viện không thành công') as ApiError;
    error.status = response.status;
    error.code = payload.code;
    throw error;
  }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>;
}

export function getLibrary(filters: LibraryFilters, cursor?: string): Promise<LibraryResponse> {
  const params = new URLSearchParams({ sort: filters.sort, limit: '24' });
  if (filters.q.trim()) params.set('q', filters.q.trim());
  if (filters.kind) params.set('kind', filters.kind);
  if (filters.deckId) params.set('deckId', filters.deckId);
  if (filters.jlptLevel) params.set('jlptLevel', filters.jlptLevel);
  if (cursor) params.set('cursor', cursor);
  return request(`/library?${params}`);
}

export function saveLibraryItem(input: SaveItemInput): Promise<unknown> {
  return request('/library/items', { method: 'POST', body: JSON.stringify(input) });
}

export function createDeck(name: string, description: string | null, parentId: string | null): Promise<Deck> {
  return request('/library/decks', { method: 'POST', body: JSON.stringify({ name, description, parentId }) });
}

export function updateDeck(deck: Deck, changes: { name?: string; description?: string | null; parentId?: string | null }): Promise<Deck> {
  return request(`/library/decks/${deck.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ ...changes, expectedVersion: deck.version })
  });
}

export function deleteDeck(deck: Deck): Promise<void> {
  return request(`/library/decks/${deck.id}?expectedVersion=${encodeURIComponent(deck.version)}`, { method: 'DELETE' });
}
