/**
 * @kanji-nest/core — logic + kiểu THUẦN dùng chung cho Web (apps/web) và
 * Mobile (apps/mobile). CẤM import React/DOM/IndexedDB/network ở đây.
 *
 * Cấu trúc mirror theo domain của apps/web (features, entities).
 */
export { newVocabId, newFolderId } from './ids';
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
} from './quiz/keymap';
export { applyScope, type ScopeSelection } from './vocab/scope-apply';
export { normalizeAnswer, gradeAnswer } from './quiz/grade';
export type {
  QuizType,
  QuizQuestion,
  GradedQuizItem,
  QuizResult,
} from './quiz/types';
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
} from './quiz/attempt';
export {
  selectFeedbackContent,
  type FeedbackVocab,
  type FeedbackChip,
  type FeedbackContent,
} from './quiz/feedback';
export { buildQuestions, type QuizMode } from './quiz/questions';
export { gradeSession, toCreateSessionInput } from './quiz/session';
export type { QuizAttemptInput, CreateQuizSessionInput } from './quiz/session';
export { orderQuestions } from './quiz/order';
export { selectQuizPool } from './quiz/pool';
export {
  DEFAULT_EASE_FACTOR,
  MIN_EASE_FACTOR,
  ratingToQuality,
  nextEaseFactor,
  isDue,
  review,
  type SrsState,
  type SrsReviewResult,
} from './srs/srs';
export type { FlashcardMode, FlashcardSummary } from './flashcard/types';
export {
  buildQueue,
  buildReviewAheadQueue,
  nextDueAt,
  summarize,
} from './flashcard/queue';
export {
  applyReview,
  persistReview,
  type ReviewPersistDeps,
} from './flashcard/review';
export {
  decideFlashcardAction,
  type FlashcardAction,
  type FlashcardKeyContext,
} from './flashcard/keymap';
export {
  selectFaceContent,
  type CardFace,
  type FrontFace,
  type BackFace,
} from './flashcard/face';
export {
  hasSrsProgress,
  selectResetTargets,
  resetSrsProgress,
  persistResetSrs,
  type ResetPersistDeps,
} from './flashcard/reset';
export { dedupeKey, findDuplicate } from './vocab/dedupe';
export { filterVocabularies, type VocabularyFilter } from './vocab/filter';
export {
  trimToNull,
  normalizeQuickAdd,
  type RawQuickAdd,
  type NormalizedQuickAdd,
} from './vocab/normalize';
export {
  paginate,
  toggleId,
  setMany,
  selectRange,
  pageState,
  sortVocabs,
  type Pagination,
  type VocabSort,
} from './vocab/list-utils';
export {
  classifyIncoming,
  linkVocabulary,
  type IncomingWord,
  type ClassifyResult,
  type ClassifyIncomingArgs,
} from './vocab/branch-dedupe';
export {
  planWordRemoval,
  type WordRemovalCounts,
  type WordRemovalPlan,
} from './vocab/word-removal';
export {
  decideQuickAddAction,
  type QuickAddAction,
} from './vocab/quick-add-action';
export {
  collectDescendantFolderIds,
  selectWordsInScope,
  type ScopeFolder,
} from './vocab/scope';
export { markTombstoned } from './vocab/tombstone';
export type {
  ColumnTarget,
  ParsedRow,
  NormalizedImport,
  RowStatus,
  DuplicateReason,
  PreviewRow,
  ImportSummary,
} from './vocab/import/types';
export {
  stripBom,
  detectDelimiter,
  parseCsv,
  parseDelimited,
  parseMarkdownTable,
  type DelimitedOptions,
} from './vocab/import/parse';
export {
  normalizeHeader,
  headerToTarget,
  detectHeaderMapping,
  defaultMappingByPosition,
  mapRowsToRecords,
  TEMPLATE_ORDER,
} from './vocab/import/columns';
export {
  MAX_IMPORT_ROWS,
  MAX_IMPORT_BYTES,
  byteLength,
  hasReplacementChar,
  clampRows,
  normalizeJlpt,
  buildPreview,
  type PreviewContext,
} from './vocab/import/validate';
export {
  TEMPLATE_HEADERS,
  buildTemplateCsv,
  buildTemplateMarkdown,
} from './vocab/import/template';
export { assembleImportVocabularies, assembleImportWrites } from './vocab/import/assemble';
export type { ImportWritePlan } from './vocab/import/assemble';
export {
  normalizeFolderName,
  isFolderNameTaken,
  findDuplicateSiblingIds,
  compareFolders,
  folderPath,
  rootFolderId,
  folderOptions,
  type FolderOption,
} from './folder/path';
export {
  ORDER_STEP,
  livingById,
  effectiveParentId,
  siblingsOf,
  buildTree,
  isAncestor,
  reparentAppend,
  reorderBefore,
  type FolderTreeNode,
  type FolderMovePatch,
} from './folder/tree';
export {
  planFolderCascade,
  type FolderCascadeCounts,
  type FolderCascadePlan,
} from './folder/cascade';
export {
  isNewer,
  selectDirty,
  maxUpdatedAt,
  latestIso,
  chunk,
  orderFoldersParentsFirst,
  highWaterMarkAfter,
  pickIncomingWinners,
  type SyncRecord,
} from './sync/engine';
