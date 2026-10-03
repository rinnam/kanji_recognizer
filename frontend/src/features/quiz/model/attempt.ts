/**
 * Trạng thái "3 lần thử" cho MỘT câu typing quiz — THUẦN, tất định, KHÔNG DOM/DB/mạng.
 * Mỗi câu cho tối đa MAX_ATTEMPTS lần nhập. Hết lượt (sai lần cuối) hoặc bấm gợi ý
 * thì lộ đáp án ('revealed').
 *
 * Payload gửi BE KHÔNG đổi: userAnswer = chữ gõ cuối cùng, isCorrect = kết quả cuối
 * (session.ts/toCreateSessionInput giữ nguyên — toOutcome chỉ cung cấp đúng 2 giá trị đó).
 */

export const MAX_ATTEMPTS = 3;

export type AttemptStatus = 'answering' | 'correct' | 'revealed';

export interface AttemptState {
  /** Số lần ĐÃ nhập (không tính bấm gợi ý). */
  attempts: number;
  /** Chữ gõ gần nhất (đã bỏ khoảng trắng thừa); null nếu chưa gõ gì. */
  lastAnswer: string | null;
  status: AttemptStatus;
  /** Đã dùng gợi ý (Hán Việt) để lộ đáp án hay chưa. */
  usedHint: boolean;
}

/** Kết quả cuối của một câu — khớp payload BE (userAnswer, isCorrect) + số lần thử. */
export interface AttemptOutcome {
  isCorrect: boolean;
  userAnswer: string | null;
  attemptNo: number;
}

/** Trạng thái khởi tạo cho một câu mới. */
export function initialAttemptState(): AttemptState {
  return { attempts: 0, lastAnswer: null, status: 'answering', usedHint: false };
}

/** Số lần thử còn lại (>= 0). */
export function remainingAttempts(state: AttemptState): number {
  return Math.max(0, MAX_ATTEMPTS - state.attempts);
}

/** Chữ gõ: rỗng/chỉ khoảng trắng -> null (coi như "chưa gõ"). */
function normalizeTyped(typed: string): string | null {
  return typed.trim() === '' ? null : typed;
}

/**
 * Áp một lần nhập — THUẦN. Chỉ xử lý khi đang 'answering' (sau 'correct'/'revealed' là bất biến).
 * - đúng -> 'correct'.
 * - sai & còn lượt (attempts mới < MAX_ATTEMPTS) -> 'answering' (còn lại = MAX_ATTEMPTS - attempts).
 * - sai ở lần MAX_ATTEMPTS -> 'revealed'.
 */
export function applyAnswer(state: AttemptState, isCorrect: boolean, typed: string): AttemptState {
  if (state.status !== 'answering') return state;
  const attempts = state.attempts + 1;
  const lastAnswer = normalizeTyped(typed);
  if (isCorrect) {
    return { ...state, attempts, lastAnswer, status: 'correct' };
  }
  const status: AttemptStatus = attempts >= MAX_ATTEMPTS ? 'revealed' : 'answering';
  return { ...state, attempts, lastAnswer, status };
}

/** Bấm gợi ý -> lộ đáp án ngay, đánh dấu usedHint. Chỉ khi đang 'answering'. */
export function applyHint(state: AttemptState): AttemptState {
  if (state.status !== 'answering') return state;
  return { ...state, status: 'revealed', usedHint: true };
}

/**
 * Kết quả cuối — THUẦN. isCorrect chỉ true khi 'correct';
 * userAnswer = chữ gõ cuối (null nếu chưa gõ); attemptNo = số lần đã nhập.
 */
export function toOutcome(state: AttemptState): AttemptOutcome {
  return {
    isCorrect: state.status === 'correct',
    userAnswer: state.lastAnswer,
    attemptNo: state.attempts,
  };
}
