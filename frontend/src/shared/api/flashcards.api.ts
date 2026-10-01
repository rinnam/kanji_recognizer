import type { SrsRating, VocabularyDto } from './dto';
import { request } from './http';

/** Hàng đợi ôn: thẻ tới hạn/thẻ mới (GET /flashcards/due). */
export function listDueFlashcards(limit?: number): Promise<VocabularyDto[]> {
  return request<VocabularyDto[]>('/flashcards/due', { query: { limit } });
}

/** Áp SM-2 cho một thẻ, trả về vocab đã cập nhật lịch ôn (POST /flashcards/:id/review). */
export function reviewFlashcard(id: string, rating: SrsRating): Promise<VocabularyDto> {
  return request<VocabularyDto>(`/flashcards/${encodeURIComponent(id)}/review`, {
    method: 'POST',
    body: { rating },
  });
}
