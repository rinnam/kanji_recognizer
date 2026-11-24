export type QuizletRating = 'repeat' | 'hard' | 'okay' | 'easy';

export interface QuizletCardState {
  id: string;
  stage: 'new' | 'learning' | 'graduated';
  /** Target graduation days when user picks Okay / Easy on the next review */
  okayDays: number;
  easyDays: number;
  /** Priority for in-session re-queue: 1 = Repeat (≤1m/≤5m), 2 = Hard (≤5m/≤10m), 3 = Okay (≤10m) */
  urgency: number;
  lastRatedAt: number;
  graduatedDays?: number;
}

export interface QuizletButtonOption {
  rating: QuizletRating;
  label: string;
  intervalLabel: string;
  graduates: boolean;
  days: number;
}

export const QUIZLET_BATCH_SIZE = 10;

function formatDays(days: number): string {
  if (days === 7) return '1 tuần';
  return `${days} ngày`;
}

export function createInitialCardState(id: string): QuizletCardState {
  return {
    id,
    stage: 'new',
    okayDays: 4,
    easyDays: 7,
    urgency: 0,
    lastRatedAt: 0,
  };
}

export interface PersistedWordSrs {
  id: string;
  srsInterval?: number | null;
  srsRepetition?: number | null;
  srsNextReview?: string | null;
}

/**
 * Hydrates Quizlet SRS states from BOTH:
 * 1) Database (srsNextReview / srsInterval / srsRepetition):
 *    - If srsNextReview is still in the future and srsRepetition > 0 -> 'graduated' for today.
 *    - When the next day arrives (now >= srsNextReview), it automatically becomes due again!
 * 2) Local AsyncStorage mid-session state:
 *    - Preserves in-session 'learning' cards (Repeat / Hard / Okay <=10m) across page reloads.
 */
export function hydrateQuizletStates(
  words: PersistedWordSrs[],
  savedLocal: Record<string, QuizletCardState>,
  nowMs = Date.now(),
): Record<string, QuizletCardState> {
  const result: Record<string, QuizletCardState> = {};
  for (const w of words) {
    const nextMs = w.srsNextReview ? Date.parse(w.srsNextReview) : NaN;
    const isGraduatedInDb = Number.isFinite(nextMs) && nextMs > nowMs && (w.srsRepetition ?? 0) > 0;
    if (isGraduatedInDb) {
      result[w.id] = {
        id: w.id,
        stage: 'graduated',
        okayDays: w.srsInterval ?? 4,
        easyDays: Math.max((w.srsInterval ?? 4) + 2, 7),
        urgency: 0,
        lastRatedAt: nowMs,
        graduatedDays: w.srsInterval ?? 1,
      };
      continue;
    }

    const local = savedLocal[w.id];
    if (local && local.stage === 'learning') {
      result[w.id] = local;
    }
  }
  return result;
}

/**
 * Exact Quizlet Spaced Repetition button options & intervals observed empirically:
 * - New:
 *   Repeat (≤1 phút) -> learning [1d, 2d]
 *   Hard   (≤5 phút) -> learning [2d, 3d]
 *   Okay   (≤10 phút) -> learning [4d, 1w]
 *   Easy   (4 ngày)   -> graduated (4d)
 * - Learning:
 *   Repeat (≤5 phút) -> learning [1d, 2d]
 *   Hard   (≤10 phút) -> learning [1d, 2d]
 *   Okay   (okayDays) -> graduated (okayDays)
 *   Easy   (easyDays) -> graduated (easyDays)
 */
export function getQuizletOptions(state: QuizletCardState): QuizletButtonOption[] {
  if (state.stage === 'new') {
    return [
      { rating: 'repeat', label: 'Lặp lại', intervalLabel: '≤1 phút', graduates: false, days: 0 },
      { rating: 'hard', label: 'Khó', intervalLabel: '≤5 phút', graduates: false, days: 0 },
      { rating: 'okay', label: 'Ổn', intervalLabel: '≤10 phút', graduates: false, days: 0 },
      { rating: 'easy', label: 'Dễ', intervalLabel: '4 ngày', graduates: true, days: 4 },
    ];
  }

  return [
    { rating: 'repeat', label: 'Lặp lại', intervalLabel: '≤5 phút', graduates: false, days: 0 },
    { rating: 'hard', label: 'Khó', intervalLabel: '≤10 phút', graduates: false, days: 0 },
    { rating: 'okay', label: 'Ổn', intervalLabel: formatDays(state.okayDays), graduates: true, days: state.okayDays },
    { rating: 'easy', label: 'Dễ', intervalLabel: formatDays(state.easyDays), graduates: true, days: state.easyDays },
  ];
}

export function applyQuizletRating(
  state: QuizletCardState,
  rating: QuizletRating,
  nowMs = Date.now(),
): { next: QuizletCardState; graduatedDays: number | null; feedback: string } {
  const options = getQuizletOptions(state);
  const chosen = options.find((o) => o.rating === rating) ?? options[0];

  if (state.stage === 'new') {
    if (rating === 'easy') {
      return {
        next: { ...state, stage: 'graduated', graduatedDays: 4, lastRatedAt: nowMs },
        graduatedDays: 4,
        feedback: `Dễ · Quay lại sau 4 ngày`,
      };
    }
    if (rating === 'repeat') {
      return {
        next: { ...state, stage: 'learning', okayDays: 1, easyDays: 2, urgency: 1, lastRatedAt: nowMs },
        graduatedDays: null,
        feedback: `Lặp lại · Quay lại sau ≤1 phút`,
      };
    }
    if (rating === 'hard') {
      return {
        next: { ...state, stage: 'learning', okayDays: 2, easyDays: 3, urgency: 2, lastRatedAt: nowMs },
        graduatedDays: null,
        feedback: `Khó · Quay lại sau ≤5 phút`,
      };
    }
    return {
      next: { ...state, stage: 'learning', okayDays: 4, easyDays: 7, urgency: 3, lastRatedAt: nowMs },
      graduatedDays: null,
      feedback: `Ổn · Quay lại sau ≤10 phút`,
    };
  }

  // Learning stage
  if (rating === 'repeat' || rating === 'hard') {
    return {
      next: {
        ...state,
        stage: 'learning',
        okayDays: 1,
        easyDays: 2,
        urgency: rating === 'repeat' ? 1 : 2,
        lastRatedAt: nowMs,
      },
      graduatedDays: null,
      feedback: `${chosen.label} · Quay lại sau ${chosen.intervalLabel}`,
    };
  }

  const days = rating === 'okay' ? state.okayDays : state.easyDays;
  return {
    next: { ...state, stage: 'graduated', graduatedDays: days, lastRatedAt: nowMs },
    graduatedDays: days,
    feedback: `${chosen.label} · Quay lại sau ${formatDays(days)}`,
  };
}

/**
 * Selects the next card ID using Quizlet's batching + priority re-queueing:
 * - Introduces up to QUIZLET_BATCH_SIZE (10) consecutive New cards per batch.
 * - Once batchNewCount reaches 10 (or no New cards remain), drains pending Learning cards
 *   ordered by urgency (Repeat -> Hard -> Okay) and oldest lastRatedAt first.
 */
export function pickNextQuizletCard(
  orderedIds: string[],
  states: Record<string, QuizletCardState>,
  batchNewCount: number,
  justRatedId?: string,
): { nextId: string | null; resetBatch: boolean } {
  const newIds = orderedIds.filter((id) => (states[id]?.stage ?? 'new') === 'new');
  const learningStates = orderedIds
    .map((id) => states[id])
    .filter((s): s is QuizletCardState => Boolean(s && s.stage === 'learning'));

  const shouldDrainLearning = learningStates.length > 0 && (batchNewCount >= QUIZLET_BATCH_SIZE || newIds.length === 0);

  if (shouldDrainLearning) {
    const sorted = [...learningStates].sort((a, b) => a.urgency - b.urgency || a.lastRatedAt - b.lastRatedAt);
    const candidate = sorted.find((s) => s.id !== justRatedId) ?? sorted[0];
    return { nextId: candidate.id, resetBatch: learningStates.length === 1 };
  }

  if (newIds.length > 0) {
    return { nextId: newIds[0], resetBatch: false };
  }

  return { nextId: null, resetBatch: false };
}
