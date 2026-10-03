import type { LocalVocabulary } from '../../../entities/vocabulary';

/**
 * "Đặt lại tiến độ SRS" — các hàm THUẦN (không DOM/DB) để unit test.
 *
 * ⚠️ KHÔNG đổi công thức SM-2 (ở entities/card). Reset chỉ đưa 4 trường srs* về null
 * (thẻ trở lại trạng thái "mới") và cập nhật `updatedAt` = now để sync coi là "bẩn" và
 * đẩy lên server. Chỉ ảnh hưởng thẻ trong phạm vi được truyền vào.
 */

/** Thẻ có "tiến độ SRS" đáng để reset = đã có bất kỳ trường srs* nào khác null. */
export function hasSrsProgress(vocab: LocalVocabulary): boolean {
  return (
    vocab.srsNextReview !== null ||
    vocab.srsRepetition !== null ||
    vocab.srsInterval !== null ||
    vocab.srsEaseFactor !== null
  );
}

/**
 * Danh sách thẻ sẽ bị reset trong một tập (phạm vi hiện tại): chỉ thẻ còn sống VÀ
 * đang có tiến độ SRS. Dùng để hiển thị số lượng trong Modal xác nhận và để ghi.
 */
export function selectResetTargets(
  vocabs: readonly LocalVocabulary[],
): LocalVocabulary[] {
  return vocabs.filter((v) => v.deletedAt === null && hasSrsProgress(v));
}

/** Đặt lại tiến độ SRS của MỘT thẻ (THUẦN): null hoá srs* + updatedAt = now. */
export function resetSrsProgress(
  vocab: LocalVocabulary,
  now: Date,
): LocalVocabulary {
  return {
    ...vocab,
    srsInterval: null,
    srsRepetition: null,
    srsEaseFactor: null,
    srsNextReview: null,
    updatedAt: now.toISOString(),
  };
}

/** Phụ thuộc tiêm vào để orchestration test được mà KHÔNG cần DOM/DB. */
export interface ResetPersistDeps {
  /** Ghi nhiều bản ghi trong MỘT lần (một transaction IndexedDB). */
  put: (vocabs: readonly LocalVocabulary[]) => Promise<void>;
  emit: () => void;
}

/**
 * Reset tiến độ của nhiều thẻ: ghi local MỘT lần rồi PHÁT change-bus MỘT lần (để sync
 * đẩy lên). Trả về danh sách bản ghi đã reset (để UI cập nhật tại chỗ). Nếu không có thẻ
 * nào cần reset thì KHÔNG ghi và KHÔNG emit.
 */
export async function persistResetSrs(
  deps: ResetPersistDeps,
  targets: readonly LocalVocabulary[],
  now: Date,
): Promise<LocalVocabulary[]> {
  const reset = targets.map((v) => resetSrsProgress(v, now));
  if (reset.length > 0) {
    await deps.put(reset);
    deps.emit();
  }
  return reset;
}
