/** Hành động của phím trong ô trả lời quiz (THUẦN — component thực thi). */
export type QuizKeyAction = 'submit' | 'advance' | 'hint' | 'none';

export interface QuizKeyContext {
  key: string; // event.key
  /** IME đang gõ dở: event.isComposing hoặc keyCode === 229. */
  composing: boolean;
  /** Câu hiện tại đã nộp chưa. */
  submitted: boolean;
  /** Ô nhập có nội dung (sau trim) không. */
  canSubmit: boolean;
}

/**
 * Quyết định hành động từ một phím — THUẦN, tất định.
 * QUAN TRỌNG (IME): khi `composing` thì Enter/Tab KHÔNG nộp/bỏ qua (tránh nộp nhầm
 * khi đang chọn chữ bằng bộ gõ tiếng Nhật).
 * - Enter: đã nộp → sang câu tiếp (advance); chưa nộp + có nội dung → nộp (submit); rỗng → none.
 * - Tab: chưa ở trạng thái phản hồi (chưa nộp) → gợi ý (hint); đã nộp → none.
 */
export function decideQuizKey(ctx: QuizKeyContext): QuizKeyAction {
  if (ctx.composing) return 'none';
  if (ctx.key === 'Enter') {
    if (ctx.submitted) return 'advance';
    return ctx.canSubmit ? 'submit' : 'none';
  }
  if (ctx.key === 'Tab') {
    return ctx.submitted ? 'none' : 'hint';
  }
  return 'none';
}
