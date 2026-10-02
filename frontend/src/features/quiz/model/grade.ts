/**
 * Chấm điểm typing quiz phía client — MIRROR nguyên văn
 * backend/src/services/quiz.service.ts (`normalizeAnswer` / `gradeAnswer`).
 * THUẦN, tất định, KHÔNG phụ thuộc DOM/DB/mạng.
 *
 * Chuẩn hóa trước khi so khớp: NFC → trim → gộp khoảng trắng → hạ chữ thường.
 * Giữ đồng nhất với BE để chấm cục bộ (local-first) ra cùng kết quả như server.
 */
export function normalizeAnswer(value: string): string {
  return value.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
}

/** Đúng khi userAnswer (sau chuẩn hóa, khác rỗng) khớp một trong các đáp án chấp nhận. */
export function gradeAnswer(
  userAnswer: string | null | undefined,
  acceptedAnswers: readonly string[],
): boolean {
  if (userAnswer === null || userAnswer === undefined) return false;
  const normalized = normalizeAnswer(userAnswer);
  if (normalized === '') return false;
  return acceptedAnswers.some((answer) => normalizeAnswer(answer) === normalized);
}
