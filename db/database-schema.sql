-- Kanji Recognizer reference schema
-- TARGET/PROPOSED ONLY. PostgreSQL-native reference DDL; no live DB or approved deployment implied.
-- UUIDs are application-generated. All *_at values are UTC timestamptz; JSON documents use jsonb.

CREATE TABLE owner_scope (
  id uuid PRIMARY KEY,
  kind varchar(16) NOT NULL CHECK (kind IN ('local','account','hybrid')),
  external_subject varchar(255) UNIQUE,
  locale varchar(35) NOT NULL DEFAULT 'ja-JP',
  timezone_id varchar(64) NOT NULL DEFAULT 'UTC',
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  version bigint NOT NULL DEFAULT 1 CHECK (version >= 1),
  deleted_at timestamptz,
  CHECK (updated_at >= created_at)
);

CREATE TABLE content_profile (
  profile_key varchar(100) PRIMARY KEY,
  item_kind varchar(16) CHECK (item_kind IN ('kanji','vocabulary','grammar')),
  validation_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text,
  UNIQUE (profile_key, item_kind),
  CHECK (length(trim(profile_key)) > 0),
  CHECK (jsonb_typeof(validation_rules) = 'object')
);

CREATE TABLE content_item (
  id uuid PRIMARY KEY,
  kind varchar(16) NOT NULL CHECK (kind IN ('kanji','vocabulary','grammar')),
  content_profile_key varchar(100),
  canonical_key varchar(500) NOT NULL,
  status varchar(16) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','deprecated')),
  source_ref text NOT NULL,
  license_ref text NOT NULL,
  current_revision_no integer NOT NULL CHECK (current_revision_no >= 1),
  jlpt_level smallint CHECK (jlpt_level BETWEEN 1 AND 5),
  stroke_count smallint CHECK (stroke_count > 0),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  UNIQUE (kind, canonical_key),
  FOREIGN KEY (content_profile_key, kind)
    REFERENCES content_profile(profile_key, item_kind) MATCH SIMPLE,
  CHECK (length(trim(canonical_key)) > 0),
  CHECK (updated_at >= created_at)
);

CREATE TABLE content_revision (
  item_id uuid NOT NULL REFERENCES content_item(id),
  revision_no integer NOT NULL CHECK (revision_no >= 1),
  schema_version integer NOT NULL CHECK (schema_version >= 1),
  payload_json jsonb NOT NULL,
  source_ref text NOT NULL,
  license_ref text NOT NULL,
  created_at timestamptz NOT NULL,
  PRIMARY KEY (item_id, revision_no)
);

ALTER TABLE content_item
  ADD CONSTRAINT fk_content_item_current_revision
  FOREIGN KEY (id, current_revision_no)
  REFERENCES content_revision(item_id, revision_no)
  DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE content_reading (
  id uuid PRIMARY KEY,
  item_id uuid NOT NULL REFERENCES content_item(id),
  reading text NOT NULL,
  script varchar(16) NOT NULL CHECK (script IN ('hiragana','katakana','romaji','other')),
  reading_kind varchar(16) NOT NULL DEFAULT 'other'
    CHECK (reading_kind IN ('on','kun','nanori','other')),
  position integer NOT NULL DEFAULT 0 CHECK (position >= 0),
  UNIQUE (item_id, reading, script, reading_kind),
  CHECK (length(trim(reading)) > 0)
);

CREATE TABLE content_meaning (
  id uuid PRIMARY KEY,
  item_id uuid NOT NULL REFERENCES content_item(id),
  locale varchar(35) NOT NULL,
  meaning_kind varchar(32) NOT NULL DEFAULT 'definition'
    CHECK (meaning_kind IN ('definition','sino_vietnamese')),
  meaning text NOT NULL,
  position integer NOT NULL DEFAULT 0 CHECK (position >= 0),
  UNIQUE (item_id, locale, meaning_kind, meaning),
  CHECK (length(trim(locale)) > 0),
  CHECK (length(trim(meaning)) > 0),
  CHECK (meaning_kind <> 'sino_vietnamese' OR lower(locale) = 'vi')
);

CREATE TABLE content_example (
  id uuid PRIMARY KEY,
  item_id uuid NOT NULL REFERENCES content_item(id),
  japanese_text text NOT NULL,
  translation text,
  translation_locale varchar(35),
  source_ref text NOT NULL,
  license_ref text NOT NULL,
  position integer NOT NULL DEFAULT 0 CHECK (position >= 0),
  UNIQUE (item_id, position),
  CHECK (length(trim(japanese_text)) > 0),
  CHECK (length(trim(source_ref)) > 0),
  CHECK (length(trim(license_ref)) > 0),
  CHECK ((translation IS NULL) = (translation_locale IS NULL)),
  CHECK (translation IS NULL OR length(trim(translation)) > 0),
  CHECK (translation_locale IS NULL OR length(trim(translation_locale)) > 0)
);

CREATE TABLE learning_course (
  id uuid PRIMARY KEY,
  course_key varchar(100) NOT NULL UNIQUE,
  title varchar(200) NOT NULL,
  jlpt_level smallint CHECK (jlpt_level BETWEEN 1 AND 5),
  content_profile_key varchar(100),
  validation_policy jsonb NOT NULL DEFAULT '{}'::jsonb,
  status varchar(16) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  source_ref text NOT NULL,
  license_ref text NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  published_at timestamptz,
  version bigint NOT NULL DEFAULT 1 CHECK (version >= 1),
  CHECK (length(trim(course_key)) > 0),
  CHECK (length(trim(title)) > 0),
  CHECK (jsonb_typeof(validation_policy) = 'object'),
  CHECK ((status = 'published') = (published_at IS NOT NULL)),
  CHECK (published_at IS NULL OR published_at >= created_at),
  CHECK (updated_at >= created_at)
);

CREATE TABLE course_lesson (
  id uuid PRIMARY KEY,
  course_id uuid NOT NULL REFERENCES learning_course(id) ON DELETE CASCADE,
  lesson_no integer NOT NULL CHECK (lesson_no > 0),
  title varchar(200) NOT NULL,
  UNIQUE (course_id, lesson_no),
  UNIQUE (id, course_id),
  CHECK (length(trim(title)) > 0)
);

CREATE TABLE course_lesson_item (
  lesson_id uuid NOT NULL,
  course_id uuid NOT NULL,
  content_item_id uuid NOT NULL REFERENCES content_item(id),
  item_position integer NOT NULL CHECK (item_position > 0),
  PRIMARY KEY (lesson_id, item_position),
  UNIQUE (course_id, content_item_id),
  FOREIGN KEY (lesson_id, course_id)
    REFERENCES course_lesson(id, course_id) ON DELETE CASCADE
);

CREATE TABLE library (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL UNIQUE REFERENCES owner_scope(id),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  version bigint NOT NULL DEFAULT 1 CHECK (version >= 1),
  UNIQUE (id, owner_id),
  CHECK (updated_at >= created_at)
);

CREATE TABLE deck (
  id uuid PRIMARY KEY,
  library_id uuid NOT NULL,
  owner_id uuid NOT NULL REFERENCES owner_scope(id),
  parent_id uuid REFERENCES deck(id) ON DELETE RESTRICT,
  sort_position bigint NOT NULL DEFAULT 1024,
  name varchar(200) NOT NULL,
  description text,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  archived_at timestamptz,
  deleted_at timestamptz,
  version bigint NOT NULL DEFAULT 1 CHECK (version >= 1),
  UNIQUE (id, owner_id),
  FOREIGN KEY (library_id, owner_id) REFERENCES library(id, owner_id),
  CHECK (parent_id IS NULL OR parent_id <> id),
  CHECK (length(trim(name)) > 0),
  CHECK (deleted_at IS NULL OR archived_at IS NOT NULL),
  CHECK (updated_at >= created_at)
);

CREATE TABLE saved_item (
  id uuid PRIMARY KEY,
  library_id uuid NOT NULL,
  owner_id uuid NOT NULL REFERENCES owner_scope(id),
  content_item_id uuid NOT NULL REFERENCES content_item(id),
  source_kind varchar(16) NOT NULL CHECK (source_kind IN ('recognition','import','manual','reference')),
  source_ref text,
  created_at timestamptz NOT NULL,
  archived_at timestamptz,
  deleted_at timestamptz,
  version bigint NOT NULL DEFAULT 1 CHECK (version >= 1),
  UNIQUE (id, owner_id),
  FOREIGN KEY (library_id, owner_id) REFERENCES library(id, owner_id)
);

CREATE TABLE deck_membership (
  deck_id uuid NOT NULL,
  saved_item_id uuid NOT NULL,
  owner_id uuid NOT NULL REFERENCES owner_scope(id),
  added_at timestamptz NOT NULL,
  source_context jsonb,
  PRIMARY KEY (deck_id, saved_item_id),
  FOREIGN KEY (deck_id, owner_id) REFERENCES deck(id, owner_id) ON DELETE CASCADE,
  FOREIGN KEY (saved_item_id, owner_id) REFERENCES saved_item(id, owner_id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX uq_saved_item_active_content
  ON saved_item(library_id, content_item_id) WHERE deleted_at IS NULL;

CREATE TABLE recognition_run (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES owner_scope(id),
  input_kind varchar(16) NOT NULL CHECK (input_kind IN ('drawing','image')),
  status varchar(16) NOT NULL CHECK (status IN ('pending','succeeded','failed','cancelled')),
  input_fingerprint text,
  input_retained boolean NOT NULL DEFAULT false CHECK (input_retained = false),
  model_version text,
  request_id text,
  error_code text,
  started_at timestamptz NOT NULL,
  completed_at timestamptz,
  expires_at timestamptz,
  UNIQUE (owner_id, request_id),
  CHECK (completed_at IS NULL OR completed_at >= started_at)
);

CREATE TABLE recognition_candidate (
  run_id uuid NOT NULL REFERENCES recognition_run(id) ON DELETE CASCADE,
  rank integer NOT NULL CHECK (rank > 0),
  content_item_id uuid REFERENCES content_item(id),
  display_text text NOT NULL,
  confidence decimal(7,6),
  selected_at timestamptz,
  PRIMARY KEY (run_id, rank),
  CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1))
);

CREATE TABLE card (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES owner_scope(id),
  saved_item_id uuid NOT NULL,
  template_key varchar(100) NOT NULL,
  template_version integer NOT NULL CHECK (template_version >= 1),
  prompt_revision_no integer NOT NULL CHECK (prompt_revision_no >= 1),
  answer_revision_no integer NOT NULL CHECK (answer_revision_no >= 1),
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  deleted_at timestamptz,
  version bigint NOT NULL DEFAULT 1 CHECK (version >= 1),
  UNIQUE (id, owner_id),
  UNIQUE (saved_item_id, template_key, template_version),
  FOREIGN KEY (saved_item_id, owner_id) REFERENCES saved_item(id, owner_id),
  CHECK (updated_at >= created_at)
);

CREATE TABLE study_session (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES owner_scope(id),
  kind varchar(16) NOT NULL CHECK (kind IN ('flashcard','review')),
  status varchar(16) NOT NULL CHECK (status IN ('active','paused','completed','abandoned')),
  scope_json jsonb NOT NULL,
  order_seed text,
  snapshot_version integer NOT NULL DEFAULT 1 CHECK (snapshot_version >= 1),
  cursor integer NOT NULL DEFAULT 0 CHECK (cursor >= 0),
  total_items integer NOT NULL DEFAULT 0 CHECK (total_items >= 0),
  started_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  completed_at timestamptz,
  version bigint NOT NULL DEFAULT 1 CHECK (version >= 1),
  UNIQUE (id, owner_id),
  CHECK (cursor <= total_items),
  CHECK (updated_at >= started_at),
  CHECK (completed_at IS NULL OR completed_at >= started_at)
);

CREATE TABLE session_item (
  session_id uuid NOT NULL,
  ordinal integer NOT NULL CHECK (ordinal >= 0),
  card_id uuid NOT NULL,
  owner_id uuid NOT NULL REFERENCES owner_scope(id),
  pass_no integer NOT NULL DEFAULT 1 CHECK (pass_no >= 1),
  content_revision_no integer NOT NULL CHECK (content_revision_no >= 1),
  template_version integer NOT NULL CHECK (template_version >= 1),
  PRIMARY KEY (session_id, ordinal),
  UNIQUE (session_id, card_id, pass_no),
  FOREIGN KEY (session_id, owner_id) REFERENCES study_session(id, owner_id) ON DELETE CASCADE,
  FOREIGN KEY (card_id, owner_id) REFERENCES card(id, owner_id)
);

CREATE TABLE practice_event (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES owner_scope(id),
  session_id uuid NOT NULL,
  card_id uuid NOT NULL,
  classification varchar(16) NOT NULL CHECK (classification IN ('know','again','skip')),
  occurred_at timestamptz NOT NULL,
  idempotency_key varchar(255) NOT NULL,
  UNIQUE (owner_id, idempotency_key),
  FOREIGN KEY (session_id, owner_id) REFERENCES study_session(id, owner_id),
  FOREIGN KEY (card_id, owner_id) REFERENCES card(id, owner_id)
);

CREATE TABLE srs_state (
  card_id uuid PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES owner_scope(id),
  phase varchar(16) NOT NULL DEFAULT 'new' CHECK (phase IN ('new','learning','review','relearning')),
  suspended boolean NOT NULL DEFAULT false,
  due_at timestamptz,
  step_index integer CHECK (step_index IS NULL OR step_index >= 0),
  interval_days integer NOT NULL DEFAULT 0 CHECK (interval_days >= 0),
  ease_milli integer NOT NULL DEFAULT 2500 CHECK (ease_milli > 0),
  lapses integer NOT NULL DEFAULT 0 CHECK (lapses >= 0),
  last_reviewed_at timestamptz,
  scheduler_version varchar(100) NOT NULL,
  version bigint NOT NULL DEFAULT 1 CHECK (version >= 1),
  FOREIGN KEY (card_id, owner_id) REFERENCES card(id, owner_id)
);

CREATE TABLE review_event (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES owner_scope(id),
  card_id uuid NOT NULL,
  session_id uuid,
  occurred_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL,
  timezone_id varchar(64) NOT NULL,
  local_date date NOT NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 4),
  scheduler_version varchar(100) NOT NULL,
  state_version_before bigint NOT NULL CHECK (state_version_before >= 1),
  state_version_after bigint NOT NULL CHECK (state_version_after >= 2),
  before_state_json jsonb NOT NULL,
  after_state_json jsonb NOT NULL,
  device_id text,
  UNIQUE (card_id, state_version_before),
  CHECK (state_version_after = state_version_before + 1)
);

CREATE TABLE quiz_attempt (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES owner_scope(id),
  parent_attempt_id uuid REFERENCES quiz_attempt(id),
  mode varchar(32) NOT NULL CHECK (mode IN ('meaning','reading','grammar_cloze','grammar_order','grammar_context')),
  status varchar(16) NOT NULL CHECK (status IN ('active','completed','abandoned')),
  scope_json jsonb NOT NULL,
  normalization_version varchar(100) NOT NULL,
  scoring_version varchar(100) NOT NULL,
  snapshot_version integer NOT NULL DEFAULT 1 CHECK (snapshot_version >= 1),
  started_at timestamptz NOT NULL,
  completed_at timestamptz,
  score_correct integer NOT NULL DEFAULT 0 CHECK (score_correct >= 0),
  score_total integer NOT NULL DEFAULT 0 CHECK (score_total >= 0),
  version bigint NOT NULL DEFAULT 1 CHECK (version >= 1),
  CHECK (score_correct <= score_total),
  CHECK (completed_at IS NULL OR completed_at >= started_at)
);

CREATE TABLE quiz_question (
  attempt_id uuid NOT NULL REFERENCES quiz_attempt(id) ON DELETE CASCADE,
  ordinal integer NOT NULL CHECK (ordinal >= 0),
  content_item_id uuid NOT NULL REFERENCES content_item(id),
  content_revision_no integer NOT NULL CHECK (content_revision_no >= 1),
  prompt_json jsonb NOT NULL,
  accepted_answers_json jsonb NOT NULL,
  explanation_json jsonb NOT NULL,
  PRIMARY KEY (attempt_id, ordinal)
);

CREATE TABLE quiz_response (
  attempt_id uuid NOT NULL,
  question_ordinal integer NOT NULL,
  answer_text text,
  normalized_answer text,
  outcome varchar(16) NOT NULL CHECK (outcome IN ('correct','incorrect','skipped')),
  submitted_at timestamptz NOT NULL,
  scoring_detail_json jsonb NOT NULL,
  PRIMARY KEY (attempt_id, question_ordinal),
  FOREIGN KEY (attempt_id, question_ordinal)
    REFERENCES quiz_question(attempt_id, ordinal) ON DELETE CASCADE
);

CREATE TABLE daily_progress (
  owner_id uuid NOT NULL REFERENCES owner_scope(id),
  local_date date NOT NULL,
  timezone_id varchar(64) NOT NULL,
  practice_count integer NOT NULL DEFAULT 0 CHECK (practice_count >= 0),
  review_count integer NOT NULL DEFAULT 0 CHECK (review_count >= 0),
  review_correct integer NOT NULL DEFAULT 0 CHECK (review_correct >= 0),
  quiz_count integer NOT NULL DEFAULT 0 CHECK (quiz_count >= 0),
  quiz_correct integer NOT NULL DEFAULT 0 CHECK (quiz_correct >= 0),
  activity_count integer NOT NULL DEFAULT 0 CHECK (activity_count >= 0),
  source_watermark text NOT NULL,
  recomputed_at timestamptz NOT NULL,
  version bigint NOT NULL DEFAULT 1 CHECK (version >= 1),
  PRIMARY KEY (owner_id, local_date, timezone_id),
  CHECK (review_correct <= review_count),
  CHECK (quiz_correct <= quiz_count)
);

CREATE TABLE metric_snapshot (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES owner_scope(id),
  metric_key varchar(100) NOT NULL,
  range_start date NOT NULL,
  range_end date NOT NULL,
  value_json jsonb NOT NULL,
  formula_version varchar(100) NOT NULL,
  source_watermark text NOT NULL,
  computed_at timestamptz NOT NULL,
  UNIQUE (owner_id, metric_key, range_start, range_end, formula_version),
  CHECK (range_end >= range_start)
);

CREATE TABLE idempotency_record (
  owner_id uuid NOT NULL REFERENCES owner_scope(id),
  idempotency_key varchar(255) NOT NULL,
  operation varchar(100) NOT NULL,
  request_hash varchar(255) NOT NULL,
  status varchar(16) NOT NULL CHECK (status IN ('started','committed','failed')),
  response_ref text,
  created_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (owner_id, idempotency_key, operation),
  CHECK (expires_at > created_at)
);

CREATE TABLE outbox_event (
  id uuid PRIMARY KEY,
  owner_id uuid REFERENCES owner_scope(id),
  aggregate_type varchar(100) NOT NULL,
  aggregate_id uuid NOT NULL,
  event_type varchar(100) NOT NULL,
  payload_json jsonb NOT NULL,
  schema_version integer NOT NULL CHECK (schema_version >= 1),
  occurred_at timestamptz NOT NULL,
  published_at timestamptz,
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0)
);

CREATE TABLE deletion_request (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES owner_scope(id),
  scope varchar(32) NOT NULL CHECK (scope IN ('recognition','learning','analytics','account_all')),
  status varchar(16) NOT NULL CHECK (status IN ('requested','processing','completed','failed','cancelled')),
  requested_at timestamptz NOT NULL,
  completed_at timestamptz,
  error_code text,
  CHECK (completed_at IS NULL OR completed_at >= requested_at)
);

CREATE TABLE audit_event (
  id uuid PRIMARY KEY,
  owner_id uuid REFERENCES owner_scope(id),
  actor_ref text,
  action varchar(100) NOT NULL,
  subject_type varchar(100) NOT NULL,
  subject_id uuid,
  correlation_id text,
  detail_json jsonb NOT NULL,
  occurred_at timestamptz NOT NULL
);

CREATE UNIQUE INDEX uq_recognition_candidate_selected
  ON recognition_candidate(run_id) WHERE selected_at IS NOT NULL;
CREATE INDEX idx_deck_tree_order ON deck(library_id, parent_id, sort_position, id);
CREATE INDEX idx_deck_owner_lifecycle ON deck(owner_id, archived_at, updated_at);
CREATE INDEX idx_saved_item_content ON saved_item(content_item_id);
CREATE INDEX idx_saved_item_owner_lifecycle ON saved_item(owner_id, deleted_at, created_at);
CREATE INDEX idx_membership_saved_item ON deck_membership(saved_item_id);
CREATE INDEX idx_content_reading_lookup ON content_reading(reading);
CREATE INDEX idx_content_reading_item_script ON content_reading(item_id, script, position);
CREATE INDEX idx_content_kanji_filter ON content_item(jlpt_level, stroke_count) WHERE kind = 'kanji';
CREATE INDEX idx_content_meaning_lookup ON content_meaning(locale, meaning_kind, meaning);
CREATE INDEX idx_content_meaning_item_kind ON content_meaning(item_id, locale, meaning_kind, position);
CREATE INDEX idx_content_example_item ON content_example(item_id, position);
CREATE INDEX idx_course_lesson_course_order ON course_lesson(course_id, lesson_no);
CREATE INDEX idx_course_lesson_item_content ON course_lesson_item(content_item_id);
CREATE INDEX idx_recognition_owner_time ON recognition_run(owner_id, started_at);
CREATE INDEX idx_recognition_expiry ON recognition_run(expires_at);
CREATE INDEX idx_card_owner_enabled ON card(owner_id, enabled);
CREATE INDEX idx_session_owner_status ON study_session(owner_id, status, updated_at);
CREATE INDEX idx_session_item_card ON session_item(card_id);
CREATE INDEX idx_practice_owner_time ON practice_event(owner_id, occurred_at);
CREATE INDEX idx_practice_session ON practice_event(session_id);
CREATE INDEX idx_srs_due ON srs_state(owner_id, phase, due_at) WHERE suspended = false;
CREATE INDEX idx_review_owner_time ON review_event(owner_id, occurred_at);
CREATE INDEX idx_review_card_time ON review_event(card_id, occurred_at);
CREATE INDEX idx_quiz_owner_status ON quiz_attempt(owner_id, status, started_at);
CREATE INDEX idx_outbox_pending ON outbox_event(published_at, occurred_at);
CREATE INDEX idx_deletion_status ON deletion_request(status, requested_at);
CREATE INDEX idx_audit_owner_time ON audit_event(owner_id, occurred_at);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := clock_timestamp();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_deck_tree()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  parent_library_id uuid;
  parent_owner_id uuid;
  parent_archived_at timestamptz;
  parent_deleted_at timestamptz;
  ancestor_depth integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.library_id::text, 0));
  IF NEW.parent_id IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.parent_id IS DISTINCT FROM OLD.parent_id OR NEW.library_id IS DISTINCT FROM OLD.library_id OR NEW.owner_id IS DISTINCT FROM OLD.owner_id) THEN
    SELECT library_id, owner_id, archived_at, deleted_at
      INTO parent_library_id, parent_owner_id, parent_archived_at, parent_deleted_at
      FROM deck WHERE id = NEW.parent_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'deck parent % does not exist', NEW.parent_id USING ERRCODE = '23503';
    END IF;
    IF parent_library_id <> NEW.library_id OR parent_owner_id <> NEW.owner_id THEN
      RAISE EXCEPTION 'deck parent must belong to the same library and owner' USING ERRCODE = '23514';
    END IF;
    IF parent_archived_at IS NOT NULL OR parent_deleted_at IS NOT NULL THEN
      RAISE EXCEPTION 'deck parent must be active' USING ERRCODE = '23514';
    END IF;
    WITH RECURSIVE ancestors AS (
      SELECT d.id, d.parent_id, 1 AS depth FROM deck d WHERE d.id = NEW.parent_id
      UNION ALL
      SELECT d.id, d.parent_id, a.depth + 1 FROM deck d JOIN ancestors a ON d.id = a.parent_id WHERE a.depth <= 8
    ) SELECT max(depth) INTO ancestor_depth FROM ancestors;
    IF EXISTS (
      WITH RECURSIVE ancestors AS (
        SELECT d.id, d.parent_id FROM deck d WHERE d.id = NEW.parent_id
        UNION ALL
        SELECT d.id, d.parent_id FROM deck d JOIN ancestors a ON d.id = a.parent_id
      ) SELECT 1 FROM ancestors WHERE id = NEW.id
    ) THEN
      RAISE EXCEPTION 'deck hierarchy cycle is not allowed' USING ERRCODE = '23514';
    END IF;
    IF ancestor_depth >= 8 THEN
      RAISE EXCEPTION 'deck hierarchy exceeds maximum depth 8' USING ERRCODE = '23514';
    END IF;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.archived_at IS DISTINCT FROM OLD.archived_at AND NEW.archived_at IS NOT NULL THEN
    IF EXISTS (
      WITH RECURSIVE descendants AS (
        SELECT d.id, d.archived_at, d.deleted_at FROM deck d WHERE d.parent_id = NEW.id
        UNION ALL
        SELECT d.id, d.archived_at, d.deleted_at FROM deck d JOIN descendants x ON d.parent_id = x.id
      ) SELECT 1 FROM descendants WHERE archived_at IS NULL AND deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'archive descendants before their parent deck' USING ERRCODE = '23514';
    END IF;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.deleted_at IS DISTINCT FROM OLD.deleted_at AND NEW.deleted_at IS NOT NULL THEN
    IF EXISTS (
      WITH RECURSIVE descendants AS (
        SELECT d.id, d.deleted_at FROM deck d WHERE d.parent_id = NEW.id
        UNION ALL
        SELECT d.id, d.deleted_at FROM deck d JOIN descendants x ON d.parent_id = x.id
      ) SELECT 1 FROM descendants WHERE deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'soft-delete descendants before their parent deck' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_deck_tree_integrity
BEFORE INSERT OR UPDATE OF parent_id, library_id, owner_id, archived_at, deleted_at ON deck
FOR EACH ROW EXECUTE FUNCTION enforce_deck_tree();

CREATE TRIGGER trg_owner_scope_updated_at
BEFORE UPDATE ON owner_scope
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_content_item_updated_at
BEFORE UPDATE ON content_item
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_learning_course_updated_at
BEFORE UPDATE ON learning_course
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_library_updated_at
BEFORE UPDATE ON library
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_deck_updated_at
BEFORE UPDATE ON deck
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_card_updated_at
BEFORE UPDATE ON card
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_study_session_updated_at
BEFORE UPDATE ON study_session
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Required publish/import and transaction checks that are intentionally not triggers:
-- 1. Apply only rules declared by the selected content_profile/import policy; normalized
--    reading, meaning and example rows are optional when no policy requires them.
-- 2. Course validation_policy may constrain item kinds, distinctness or cardinality; arbitrary
--    and non-uniform courses are valid by default. jlpt-n3-core 11 x 80 / 880 and its four-field
--    profile remain an optional fixture; generic validators must not branch on that key or values.
-- Publication locks, validates and changes status atomically; child-count triggers stay omitted.

-- Deck sibling order is (sort_position, id). Repository reorder transactions take the same
-- per-library advisory lock, use expected version, assign sparse positions, and may rebalance
-- all siblings atomically; duplicate positions are valid and deterministically tie-break by id.

-- Operational invariants intentionally enforced above the reference DDL:
-- 1. Repository roles must deny UPDATE/DELETE on review_event and terminal session/quiz snapshots;
--    append-only behavior is a privilege/repository contract, not a CHECK constraint.
-- 2. A rating transaction atomically inserts review_event and advances srs_state. The
--    UNIQUE (card_id, state_version_before) key makes retry/replay of one prior state fail.
-- 3. Client timestamps are evidence only. Scheduler ordering and conflict decisions use the
--    approved authority clock and explicit clock-skew policy (LS-OD-05/06).
-- 4. An account_all deletion tombstones owner_scope and clears external_subject first; physical
--    cascading/purge waits for the retention, backup, and audit decision in LS-OD-08.
-- 5. The transactional content publisher validates content_example coverage and provenance per
--    selected item kind/profile; the generic schema permits missing examples unless policy requires them.
