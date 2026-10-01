import type {
  ColumnType,
  Generated,
  Insertable,
  Selectable,
  Updateable,
} from 'kysely';

/**
 * Kysely DB type cho toàn bộ 8 bảng của Kanji Nest.
 * Nguồn sự thật cột/kiểu: docs/database/schema.sql.
 *
 * Quy ước:
 * - timestamptz → ColumnType<Date, Date | string, Date | string> (pg trả về JS Date khi SELECT).
 * - numeric     → string (pg trả numeric dạng chuỗi để không mất độ chính xác).
 * - text[]      → string[].
 * - Generated<T> chỉ dùng ở cột CÓ default trong DB.
 * - jlpt domain → union 'N1'..'N5'.
 */

export type JlptLevel = 'N1' | 'N2' | 'N3' | 'N4' | 'N5';

/** timestamptz: SELECT trả Date; INSERT/UPDATE nhận Date hoặc chuỗi ISO. */
type Timestamptz = ColumnType<Date, Date | string, Date | string>;

/** timestamptz NOT NULL DEFAULT now() → optional khi insert. */
type TimestamptzDefault = ColumnType<Date, Date | string | undefined, Date | string>;

/** numeric: trả về string. */
type Numeric = ColumnType<string, string | number | undefined, string | number>;

// ---------------------------------------------------------------------------
// users
// ---------------------------------------------------------------------------
export interface UsersTable {
  id: Generated<string>; // uuid DEFAULT gen_random_uuid()
  email: string | null;
  created_at: TimestamptzDefault; // DEFAULT now()
}

// ---------------------------------------------------------------------------
// folders (map 1-1: LocalFolder) — bảng đồng bộ
// ---------------------------------------------------------------------------
export interface FoldersTable {
  id: string; // text PK, client-gen
  owner_id: string; // uuid
  name: string;
  parent_id: string | null;
  sort_order: number | null; // integer (LocalFolder.order)
  created_at: Timestamptz; // NOT NULL, client-provided
  updated_at: Timestamptz; // NOT NULL, merge key
  deleted_at: Timestamptz | null; // tombstone
  server_received_at: Generated<Date>; // NOT NULL DEFAULT now() + trigger
}

// ---------------------------------------------------------------------------
// vocabularies (map 1-1: LocalVocabulary) — bảng đồng bộ
// ---------------------------------------------------------------------------
export interface VocabulariesTable {
  id: string; // text PK, client-gen
  owner_id: string; // uuid
  word: string;
  meaning: string;
  reading: string | null;
  sino_vietnamese: string | null;
  example: string | null;
  example_meaning: string | null;
  note: string | null;
  tags: ColumnType<string[], string[] | undefined, string[]>; // text[] DEFAULT '{}'
  jlpt_level: JlptLevel | null;
  srs_interval: number | null;
  srs_repetition: number | null;
  srs_ease_factor: Numeric | null; // numeric(4,2) DEFAULT 2.50
  srs_next_review: Timestamptz | null;
  created_at: Timestamptz; // NOT NULL, client-provided
  updated_at: Timestamptz; // NOT NULL, merge key
  deleted_at: Timestamptz | null; // tombstone
  server_received_at: Generated<Date>; // NOT NULL DEFAULT now() + trigger
}

// ---------------------------------------------------------------------------
// vocabulary_folders (join N-N)
// ---------------------------------------------------------------------------
export interface VocabularyFoldersTable {
  vocabulary_id: string;
  folder_id: string;
}

// ---------------------------------------------------------------------------
// quiz_sessions / quiz_attempts (server-side analytics)
// ---------------------------------------------------------------------------
export interface QuizSessionsTable {
  id: Generated<string>; // uuid DEFAULT gen_random_uuid()
  owner_id: string;
  mode: Generated<string>; // DEFAULT 'typing'
  score: Generated<number>; // DEFAULT 0
  total: Generated<number>; // DEFAULT 0
  started_at: TimestamptzDefault; // DEFAULT now()
  finished_at: Timestamptz | null;
  created_at: TimestamptzDefault; // DEFAULT now()
}

export interface QuizAttemptsTable {
  id: Generated<string>; // uuid DEFAULT gen_random_uuid()
  session_id: string;
  vocabulary_id: string | null;
  prompt: string;
  user_answer: string | null;
  is_correct: Generated<boolean>; // DEFAULT false
  answered_at: TimestamptzDefault; // DEFAULT now()
}

// ---------------------------------------------------------------------------
// Kanji (GĐ3 — chỉ khai báo kiểu cho đầy đủ; KHÔNG có route/service/repo)
// ---------------------------------------------------------------------------
export interface KanjiEntriesTable {
  character: string; // text PK
  onyomi: ColumnType<string[], string[] | undefined, string[]>; // DEFAULT '{}'
  kunyomi: ColumnType<string[], string[] | undefined, string[]>; // DEFAULT '{}'
  meaning: string | null;
  jlpt_level: JlptLevel | null;
  stroke_count: number | null;
  source: string | null;
  created_at: TimestamptzDefault; // DEFAULT now()
  updated_at: TimestamptzDefault; // DEFAULT now() + trigger
}

export interface RecognitionResultsTable {
  id: Generated<string>; // uuid DEFAULT gen_random_uuid()
  owner_id: string;
  input_type: string;
  recognized_char: string | null;
  confidence: Numeric | null; // numeric(5,4)
  saved_vocab_id: string | null;
  created_at: TimestamptzDefault; // DEFAULT now()
}

// ---------------------------------------------------------------------------
// Database interface
// ---------------------------------------------------------------------------
export interface DB {
  users: UsersTable;
  folders: FoldersTable;
  vocabularies: VocabulariesTable;
  vocabulary_folders: VocabularyFoldersTable;
  quiz_sessions: QuizSessionsTable;
  quiz_attempts: QuizAttemptsTable;
  kanji_entries: KanjiEntriesTable;
  recognition_results: RecognitionResultsTable;
}

// ---------------------------------------------------------------------------
// Helper row types
// ---------------------------------------------------------------------------
export type FolderRow = Selectable<FoldersTable>;
export type NewFolderRow = Insertable<FoldersTable>;
export type FolderRowUpdate = Updateable<FoldersTable>;

export type VocabularyRow = Selectable<VocabulariesTable>;
export type NewVocabularyRow = Insertable<VocabulariesTable>;
export type VocabularyRowUpdate = Updateable<VocabulariesTable>;

export type QuizSessionRow = Selectable<QuizSessionsTable>;
export type NewQuizSessionRow = Insertable<QuizSessionsTable>;
export type QuizSessionRowUpdate = Updateable<QuizSessionsTable>;

export type QuizAttemptRow = Selectable<QuizAttemptsTable>;
export type NewQuizAttemptRow = Insertable<QuizAttemptsTable>;
export type QuizAttemptRowUpdate = Updateable<QuizAttemptsTable>;
