import { review as computeReview, type SrsRating } from '../../../entities/card';
import type { LocalVocabulary } from '../../../entities/vocabulary';

/**
 * Áp một lần đánh giá SM-2 lên MỘT thẻ (THUẦN, tất định) → trả về bản ghi MỚI.
 *
 * ⚠️ BẤT BIẾN QUAN TRỌNG (yêu cầu brief mục 4): mỗi lần ghi srs* phải
 *   (1) cập nhật srsInterval/srsRepetition/srsEaseFactor/srsNextReview theo SM-2, VÀ
 *   (2) cập nhật `updatedAt` = now.
 * Thiếu (2), sync sẽ KHÔNG coi thẻ là "bẩn" → tiến độ học không được đẩy lên server.
 * Công thức SM-2 KHÔNG viết lại ở đây — dùng lại `entities/card` (mirror BE srs.service).
 * Xem test tại tests/unit/flashcard.test.ts.
 */
export function applyReview(
  vocab: LocalVocabulary,
  rating: SrsRating,
  now: Date,
): LocalVocabulary {
  const result = computeReview(
    {
      interval: vocab.srsInterval,
      repetition: vocab.srsRepetition,
      easeFactor: vocab.srsEaseFactor,
    },
    rating,
    now,
  );
  return {
    ...vocab,
    srsInterval: result.interval,
    srsRepetition: result.repetition,
    srsEaseFactor: result.easeFactor,
    srsNextReview: result.nextReview.toISOString(),
    updatedAt: now.toISOString(),
  };
}

/** Phụ thuộc tiêm vào để orchestration test được mà KHÔNG cần DOM/DB. */
export interface ReviewPersistDeps {
  put: (vocab: LocalVocabulary) => Promise<void>;
  emit: () => void;
}

/**
 * Ghi kết quả ôn xuống local rồi PHÁT change-bus (THUẦN qua deps tiêm vào).
 * Thứ tự: ghi IndexedDB TRƯỚC → emit SAU (sync chỉ nên chạy khi dữ liệu đã nằm trong store).
 * Trả về bản ghi đã cập nhật để UI cập nhật tại chỗ.
 */
export async function persistReview(
  deps: ReviewPersistDeps,
  vocab: LocalVocabulary,
  rating: SrsRating,
  now: Date,
): Promise<LocalVocabulary> {
  const next = applyReview(vocab, rating, now);
  await deps.put(next);
  deps.emit();
  return next;
}
