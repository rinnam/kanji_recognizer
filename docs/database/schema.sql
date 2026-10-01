-- =====================================================================
-- Kanji Nest — PostgreSQL schema (DDL)
-- Mục tiêu server: PostgreSQL 18.x (đã kiểm trên 18.4 x86_64-windows)
-- ---------------------------------------------------------------------
-- CÁCH CHẠY (KHÔNG hardcode mật khẩu ở đây):
--   1) Đặt biến môi trường DATABASE_URL trỏ tới DB `kanji_nest`, ví dụ (local dev):
--        DATABASE_URL=postgresql://postgres:<password>@localhost:5432/kanji_nest
--      (password đọc từ .env — .env PHẢI nằm trong .gitignore, không commit)
--   2) Tạo DB nếu chưa có:  psql "$DATABASE_URL_ADMIN" -c "CREATE DATABASE kanji_nest;"
--      (DATABASE_URL_ADMIN trỏ tới db quản trị, ví dụ .../postgres)
--   3) Áp schema:            psql "$DATABASE_URL" -f docs/database/schema.sql
-- ---------------------------------------------------------------------
-- Idempotent: dùng IF NOT EXISTS / guard, chạy lại nhiều lần an toàn.
-- Mọi bảng "đồng bộ local-first" đều có: updated_at (merge key) + deleted_at (tombstone).
-- Chi tiết mapping & merge: xem docs/database/schema.md và docs/adr/0001-two-way-smart-merge.md
-- =====================================================================

BEGIN;

-- Ép client encoding = UTF8 để psql đọc đúng comment tiếng Việt dù console đang ở
-- codepage khác (vd WIN1252). Có thể đặt thêm env PGCLIENTENCODING=UTF8 khi chạy.
SET client_encoding = 'UTF8';

-- gen_random_uuid() có sẵn từ PG13+; tạo pgcrypto cho chắc chắn & tương thích ngược.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- JLPT level dùng chung (N5..N1). DOMAIN không hỗ trợ IF NOT EXISTS → guard bằng DO.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'jlpt_level') THEN
    CREATE DOMAIN jlpt_level AS text CHECK (VALUE IN ('N1','N2','N3','N4','N5'));
  END IF;
END
$$;

-- ---------------------------------------------------------------------
-- users: scoping phía server (local-first client KHÔNG có field này).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text UNIQUE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- folders  (map 1-1: interface LocalFolder)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS folders (
  id          text PRIMARY KEY,                               -- LocalFolder.id ('folder_<ts>_<rand>', client-gen)
  owner_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        text NOT NULL,                                  -- LocalFolder.name
  parent_id   text REFERENCES folders(id) ON DELETE SET NULL, -- LocalFolder.parentId (NULL = gốc)
  sort_order  integer,                                        -- LocalFolder.order ("order" là từ khóa SQL)
  created_at  timestamptz NOT NULL,                           -- LocalFolder.createdAt
  updated_at  timestamptz NOT NULL,                           -- LocalFolder.updatedAt (MERGE KEY — LWW)
  deleted_at  timestamptz                                     -- tombstone (NULL = còn sống)
);
CREATE INDEX IF NOT EXISTS idx_folders_owner_updated ON folders(owner_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders(parent_id);

-- ---------------------------------------------------------------------
-- vocabularies  (map 1-1: interface LocalVocabulary; trừ folderIds → bảng nối)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vocabularies (
  id               text PRIMARY KEY,                          -- LocalVocabulary.id ('vocab_<ts>_<rand>')
  owner_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  word             text NOT NULL,                             -- word
  meaning          text NOT NULL,                             -- meaning
  reading          text,                                      -- reading?
  sino_vietnamese  text,                                      -- sinoVietnamese?
  example          text,                                      -- example?
  example_meaning  text,                                      -- exampleMeaning?
  note             text,                                      -- note?
  tags             text[] NOT NULL DEFAULT '{}',              -- tags: string[]
  jlpt_level       jlpt_level,                                -- jlptLevel?
  -- Anki SM-2 SRS (xem docs/reference/kotobase-feature-audit.md §2)
  srs_interval     integer,                                   -- srsInterval? (ngày)
  srs_repetition   integer,                                   -- srsRepetition?
  srs_ease_factor  numeric(4,2) DEFAULT 2.50,                 -- srsEaseFactor? (mặc định 2.5, sàn 1.3)
  srs_next_review  timestamptz,                               -- srsNextReview?
  created_at       timestamptz NOT NULL,                      -- createdAt
  updated_at       timestamptz NOT NULL,                      -- updatedAt (MERGE KEY — LWW)
  deleted_at       timestamptz,                               -- tombstone
  CONSTRAINT chk_ease_factor_min CHECK (srs_ease_factor IS NULL OR srs_ease_factor >= 1.30)
);
CREATE INDEX IF NOT EXISTS idx_vocab_owner_updated ON vocabularies(owner_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_vocab_next_review   ON vocabularies(owner_id, srs_next_review);
CREATE INDEX IF NOT EXISTS idx_vocab_tags          ON vocabularies USING gin(tags);
-- Quick Add chống trùng: không cho 2 từ sống trùng (word, reading) trong cùng owner.
CREATE UNIQUE INDEX IF NOT EXISTS uq_vocab_owner_word_reading
  ON vocabularies(owner_id, word, coalesce(reading, ''))
  WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------
-- vocabulary_folders  (map: LocalVocabulary.folderIds[] — quan hệ N-N)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vocabulary_folders (
  vocabulary_id text NOT NULL REFERENCES vocabularies(id) ON DELETE CASCADE,
  folder_id     text NOT NULL REFERENCES folders(id)      ON DELETE CASCADE,
  PRIMARY KEY (vocabulary_id, folder_id)
);
CREATE INDEX IF NOT EXISTS idx_vf_folder ON vocabulary_folders(folder_id);

-- ---------------------------------------------------------------------
-- quiz_sessions / quiz_attempts  (server-side analytics; KHÔNG local-first)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quiz_sessions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode        text NOT NULL DEFAULT 'typing',                -- 'typing' | ... (mở rộng GĐ2)
  score       integer NOT NULL DEFAULT 0,
  total       integer NOT NULL DEFAULT 0,
  started_at  timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_owner ON quiz_sessions(owner_id, started_at);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    uuid NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
  vocabulary_id text REFERENCES vocabularies(id) ON DELETE SET NULL,
  prompt        text NOT NULL,
  user_answer   text,
  is_correct    boolean NOT NULL DEFAULT false,
  answered_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_session ON quiz_attempts(session_id);

-- ---------------------------------------------------------------------
-- Kanji (Giai đoạn 3 — thiết kế trước, chưa triển khai tính năng)
--   kanji_entries: cache từ điển Kanji (on/kun, JLPT, số nét, nghĩa, nguồn)
--   recognition_results: kết quả nhận diện (vẽ tay/ảnh), có thể lưu vào thư viện
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS kanji_entries (
  character    text PRIMARY KEY,                              -- 1 ký tự Kanji
  onyomi       text[] NOT NULL DEFAULT '{}',
  kunyomi      text[] NOT NULL DEFAULT '{}',
  meaning      text,
  jlpt_level   jlpt_level,
  stroke_count integer,
  source       text,                                         -- 'kanjidic2' | 'jmdict' | 'mazii' | ...
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recognition_results (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  input_type      text NOT NULL,                             -- 'draw' | 'image'
  recognized_char text,
  confidence      numeric(5,4),
  saved_vocab_id  text REFERENCES vocabularies(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_recognition_owner ON recognition_results(owner_id, created_at);

-- ---------------------------------------------------------------------
-- Trigger: tự set updated_at = now() cho các bảng SERVER-MANAGED.
-- LƯU Ý: KHÔNG áp cho folders/vocabularies vì chúng là bảng ĐỒNG BỘ —
-- updated_at do CLIENT gửi lên để merge LWW (nếu server tự ghi đè sẽ phá merge).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_kanji_updated ON kanji_entries;
CREATE TRIGGER trg_kanji_updated
  BEFORE UPDATE ON kanji_entries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- server_received_at: dấu thời gian SERVER nhận bản ghi (chống lệch đồng hồ
-- client khi merge — ADR 0001). Thêm idempotent cho cả DB mới lẫn DB đã có.
-- Server tự đóng dấu qua trigger; KHÔNG dùng làm merge key (merge key vẫn là updated_at).
-- ---------------------------------------------------------------------
ALTER TABLE folders      ADD COLUMN IF NOT EXISTS server_received_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE vocabularies ADD COLUMN IF NOT EXISTS server_received_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION set_server_received_at() RETURNS trigger AS $$
BEGIN
  NEW.server_received_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_folders_srv_recv ON folders;
CREATE TRIGGER trg_folders_srv_recv
  BEFORE INSERT OR UPDATE ON folders
  FOR EACH ROW EXECUTE FUNCTION set_server_received_at();

DROP TRIGGER IF EXISTS trg_vocab_srv_recv ON vocabularies;
CREATE TRIGGER trg_vocab_srv_recv
  BEFORE INSERT OR UPDATE ON vocabularies
  FOR EACH ROW EXECUTE FUNCTION set_server_received_at();

COMMIT;
