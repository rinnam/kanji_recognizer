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
