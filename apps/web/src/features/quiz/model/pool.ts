import { applyScope, type LocalVocabulary, type ScopeSelection } from '../../../entities/vocabulary';

/**
 * Chọn BỘ từ cho một phiên quiz theo phạm vi — THUẦN, tất định (ủy quyền `applyScope`,
 * một nguồn sự thật dùng chung Flashcard & Quiz). Hàm này CHỈ chọn tập hợp; thứ tự câu
 * trong phiên do nơi dùng tự xáo (Fisher–Yates mỗi phiên).
 */
export function selectQuizPool(
  base: readonly LocalVocabulary[],
  selection: ScopeSelection,
): LocalVocabulary[] {
  return applyScope(base, selection);
}
