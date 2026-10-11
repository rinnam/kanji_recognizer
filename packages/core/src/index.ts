/**
 * @kanji-nest/core — logic + kiểu THUẦN dùng chung cho Web (apps/web) và
 * Mobile (apps/mobile). CẤM import React/DOM/IndexedDB/network ở đây.
 */
export type {
  JlptLevel,
  SrsRating,
  FolderDto,
  VocabularyDto,
  QuizAttemptDto,
  QuizSessionDto,
  SyncCounts,
  PullResult,
  PushResult,
} from './dto';
export { JLPT_LEVELS } from './dto';
export {
  decideQuizKey,
  type QuizKeyAction,
  type QuizKeyContext,
} from './quiz-keymap';
export { applyScope, type ScopeSelection } from './scope-apply';
export { normalizeAnswer, gradeAnswer } from './quiz-grade';
export type {
  QuizType,
  QuizQuestion,
  GradedQuizItem,
  QuizResult,
} from './quiz-types';
export {
  MAX_ATTEMPTS,
  initialAttemptState,
  remainingAttempts,
  applyAnswer,
  applyHint,
  toOutcome,
  type AttemptState,
  type AttemptStatus,
  type AttemptOutcome,
} from './quiz-attempt';
export {
  selectFeedbackContent,
  type FeedbackVocab,
  type FeedbackChip,
  type FeedbackContent,
} from './quiz-feedback';
export { buildQuestions, type QuizMode } from './quiz-questions';
export { gradeSession, toCreateSessionInput } from './quiz-session';
export type { QuizAttemptInput, CreateQuizSessionInput } from './quiz-session';
export { orderQuestions } from './quiz-order';
export { selectQuizPool } from './quiz-pool';
