# Plan DB — Database implementation

> **Status:** Target/Proposed gated plan with a **Current partial S0–S7 implementation** recorded below; production/release completion is not claimed. [PRD](../prd.md) owns product intent, [database design](../database-design.md) owns the logical model, and [reference SQL](../database-schema.sql) is non-operational. The PRD records selected Target portions of `LS-OD-02..05`; all remaining implementation, compliance, policy, and evidence gates stay Open/Blocked as listed below.

## 1. Scope and prerequisites

Covers recognition retention, identity/ownership, Library/decks/content, configurable reference-content/course import, flashcard/study sessions, SRS ledger/state, quiz, progress, outbox, privacy, sync readiness, migration, backup and recovery. LS-FR-018/019 require configurable metadata profiles/import policies and arbitrary course/lesson/item cardinality. N3 11×80/880 and the four-field vocabulary shape remain supported only as optional example fixtures; grammar remains a separately gated extension.

Entry prerequisites: PF-001/002 evidence, decision owner/process, reviewed data classification/threat model, repository contract, and approved gates for each slice. Never choose local/server/hybrid merely to unblock coding.

## 2. Decision gates

| Gate | Required decision/evidence | Blocks |
|---|---|---|
| DG-01 | LS-OD-01 identity + local/server/hybrid + mode migration | account/cloud/hybrid claims, cross-mode migration and production backup; does not block an explicitly scoped single-owner local Library Core contract |
| DG-02 | LS-OD-02 source/license/canonical key/editability, including the deferred Jisho/Mazii quick-lookup compliance gate and vocabulary/grammar | external lookup, unapproved seed/import and reference-content editing; does not block browsing/saving already sourced records with provenance |
| DG-03 | Remaining LS-OD-03 deck naming/global-delete policy; selected nested hierarchy uses depth 8 and child-first archive/delete | unresolved uniqueness and global item hard-delete only; selected create/update/hierarchy/reorder/child-first archive-delete behavior may proceed |
| DG-04 | Typing Quiz selected; LS-OD-04 normalization/accepted answers and grammar scope separately approved | quiz persistence |
| DG-05 | Anki-style SM-2 family selected; LS-OD-05 constants/steps/time boundary/limits/undo/version migration/golden fixtures | SRS writes |
| DG-06 | LS-OD-06 authority clock/offline/conflicts | offline queue/sync/SRS conflicts |
| DG-07 | LS-OD-07 active day/timezone change | streak aggregates |
| DG-08 | LS-OD-08 retention/export/delete/consent/region | production launch, telemetry, export, account-wide/global hard-delete and retention jobs; does not block privacy-minimized Library Core development/validation with no image/ink retention or unapproved telemetry |
| DG-09 | LS-OD-09 metric hierarchy | analytics publication |
| DG-10 | LS-OD-10 locales/translations/display | localized seed/quiz/content UI |

## 3. Ordered tasks

### Current implementation evidence (2026-09-29)

- **DB-002 — Partial:** tracked `db/migrations/0001_init.sql` is byte-identical to the ignored reference DDL (SHA-256 `56BC1698325675C8C0436E0FF7B6B5B93A1F285F8A9125C96AFABCC2E591FC4B`); the Node migration runner creates `schema_migrations`, verifies checksums, applies forward-only SQL, and provides a guarded baseline command. Automated evidence now proves a stored checksum mismatch fails closed and canonical DDL can be loaded then baselined in a disposable database.
- **Current partial S1–S7:** API boundaries cover sourced draft content import/search, policy-driven course publish, owner-scoped library/decks/saved cards, resumable study/practice events, versioned pure SRS rating, versioned reading quiz scoring, and progress rebuild. The React workspace exposes matching workflows; SRS now loads/resumes the server due queue and submits revealed 1–4 ratings.
- **Verified:** PostgreSQL `18.4`; backend strict type-check, ESLint, seven test files/18 tests, and build pass. Tests include disposable migration/checksum/baseline databases, normalized PostgreSQL catalog equivalence, concurrent two-connection deck cycle/depth rejection, cross-owner parent rejection, concurrent SRS replay protection, and incremental-vs-rebuild progress equality. Frontend ESLint and Vite production build pass. Temporary databases use the `kanji_recognizer_validation_*` prefix and are dropped by test cleanup; no destructive operation targeted `kanji_recognizer`.
- **Limitation / not yet verified:** PostgreSQL 18 `pg_dump`/`psql` binaries were not found on PATH or under `C:\Program Files\PostgreSQL`, so schema equivalence uses a reproducible Node/SQL catalog signature over columns, constraints, indexes, and triggers, excluding only `schema_migrations`; dump text, functions, privileges, owners, comments, and storage attributes are not compared. Rollback/restore rehearsal, complete browser/AT/zoom/drag-drop evidence, deployment-role grants, and production privacy/retention/release gates remain incomplete.

| ID | Task | Dependencies/gates | Requirement/story mapping | Required evidence |
|---|---|---|---|---|
| DB-001 | Ratify ADR for persistence mode, owner boundary, engine compatibility and stop conditions | PF-002, DG-01 | NFR-002..005; LS-FR-015..017; LUS-015..017 | Approved ADR; rejected alternatives; no implied endpoint/cloud |
| DB-002 | Establish schema/migration harness and version table | DB-001 | NFR-002..005; LS-FR-016 | Empty→latest, one-step upgrade, checksum, rollback rehearsal on chosen engine(s) |
| DB-003 | Ratify normalized content model/provenance and configurable content profiles/import policies for kanji and vocabulary; separately gate grammar | DG-02/DG-10 | LS-FR-004/005/017/018; LUS-004/005 | Canonical key fixtures; profile-specific required/optional metadata tests; license and Unicode/localization tests |
| DB-004 | Implement owner/library/nested-deck/saved-item schema and invariants | DB-001..003, DG-03 | LS-FR-001..005,015..017; LUS-001..005 | Valid nest/reorder; cross-library parent/cycle/depth rejection; per-library lock + optimistic version; child-first archive/delete; FK/unique/check tests |
| DB-005 | Define repository interfaces, authorization and optimistic concurrency | DB-004 | NFR-003/004; LS-FR-001..005/015/016 | Contract tests: owner isolation, stale version, partial/failure states |
| DB-006 | Build versioned reference import/publish pipeline for content and course hierarchy | DB-003 | LS-FR-004/005/018/019; LUS-004/005 | Manifest/checksum/provenance/license; transactional validators driven by selected profile/course policy, including optional N3 11×80 fixture; arbitrary/non-uniform course fixture; idempotent rerun, rollback, data-quality report |
| DB-007 | Implement privacy-safe recognition metadata persistence only if approved | DB-001, DG-08 | FR-001..010; NFR-002..005; LS-FR-005/017 | Prove no image/ink column/payload, TTL purge, redacted audit/log |
| DB-008 | Implement atomic deck/content membership mutations | DB-004/005, DG-03 | LS-FR-001..005; LUS-001..005; A1 | Double-submit/retry yields one membership; conflict/refetch; transaction fault injection |
| DB-009 | Persist deterministic flashcard session snapshots and practice ledger | DB-004/005, approved session/offline policy | LS-FR-006/007/015/016; LUS-006/007; A2 | Stable order/cursor/resume; stale item; classify vs SRS isolation |
| DB-010 | Implement immutable review ledger + SRS projection transaction | DB-005/009, DG-05/DG-06 | LS-FR-010..012/014..016; LUS-010..012/014; A4/A6/A7 | Golden clock fixtures; duplicate ID; stale version; replay==state; rollback preserves ledger |
| DB-011 | Persist quiz attempt/question/response snapshots and pinned scoring | DB-003/005, DG-04/DG-10 | LS-FR-008/009/015/016; LUS-008/009; A3 | Recompute score; IME/Unicode fixtures; retry creates child attempt; no SRS mutation |
| DB-012 | Build rebuildable progress aggregates and metric dictionary | DB-009..011, DG-07/DG-09 | LS-FR-013/015..017; LUS-013; A5/A8 | Event-to-widget reconciliation, no-data vs zero, DST/timezone fixtures, rebuild |
| DB-013 | Implement minimal analytics outbox and projector idempotency | DB-005/009..012, DG-08/DG-09 | NFR-004/005; LS-FR-013/017 | Same-transaction outbox, duplicate consume, stuck-event alert; payload privacy inspection |
| DB-014 | Implement export/deletion workflows and auditable completion | DB-004..013, DG-08 | NFR-002..005; LS-FR-017; LUS-017; A8 | Export schema/version/checksum; deletion across primary/cache/outbox/analytics; backup caveat proof |
| DB-015 | Implement sync only if hybrid/server mode is approved | DB-005/010/014, DG-01/DG-06/DG-08 | LS-FR-002/006/012/015..017; A6/A7 | Offline queue, tombstones, multi-device conflicts, immutable event merge, no SRS LWW |
| DB-016 | Validate indexes, query budgets and scale assumptions | DB-004..015 as applicable | NFR-004/005; LS-NFR-001..applicable | Representative EXPLAIN/query timings, write amplification, growth forecast; measured thresholds approved |
| DB-017 | Rehearse backup/restore and disaster recovery | DB-002/014/016, DG-01/DG-08 | NFR-002..005; LS-FR-017 | Isolated restore, checksums/FK/reconciliation, measured RPO/RTO vs approved targets |
| DB-018 | Run migration, repository, property, integration, privacy and security suite | All implemented tasks | FR-001..010; NFR-001..005; LS-FR-001..017; LUS-001..017 | CI artifacts, mutation/concurrency/failure tests, no unresolved critical issue |
| DB-019 | Controlled rollout and rollback | DB-018; relevant gates closed | Applicable FR/NFR/LS-FR/LUS | Feature/capability truthfulness, staged monitoring, stop-write trigger, rollback with ledger intact |
| DB-020 | Close evidence and operational handoff | DB-019 | All shipped scope | Runbooks, ownership, dashboards, decision links, schema/design parity and post-rollout reconciliation |

`LS-NFR-*` numbering is not currently established in the canonical PRD; DB-016 must map any future IDs rather than inventing them. Existing applicable nonfunctional requirements remain `NFR-001..005` and cross-cutting `LS-FR-015..017`.

## 3.1 Reference-schema review evidence

- **Current:** Review 2026-09-28 and the subsequent vocabulary/N3 design update changed only the non-operational PostgreSQL reference: normalized meaning kinds/examples, course hierarchy/order constraints, publish-boundary contracts, composite owner FKs, partial uniqueness, review-version dedupe, queryable projections, JSONB, FK indexes and narrow `updated_at` triggers. No DB task is implemented.
- **Target:** DB-001..020 remain unimplemented/gated; this review is design evidence only and does not close a task.
- DB-002 must execute empty→latest on supported PostgreSQL and add migration fixtures. DB-003/006 must prove every emitted recognition label resolves to a versioned content item and atomically refresh normalized projections. DB-010 must test skewed/offline timestamps, duplicate `(card_id, state_version_before)`, and compensating undo only if DG-05 approves it. DB-012 must fixture timezone changes without assuming the current daily-progress key defines streak policy. DB-014 must prove owner tombstone/external-subject clearing and retention behavior after DG-08.

## 4. Testing strategy

- **DDL/static:** execute empty→latest on PostgreSQL 18; verify unique object names, FK dependency/targets, checks, migration checksums, exact catalog counts, profile-kind mismatch rejection, uneven lesson cardinality acceptance, and published timestamp enforcement. Other engines are future/out of scope and require separate evidence.
- **Repository/unit:** owner scope, nullability, canonical dedupe, optimistic version, idempotency hash mismatch.
- **Property/golden:** scheduler replay, normalization, Unicode, time/DST, aggregate reconciliation.
- **Integration:** each transaction faulted before/after every write; retries; concurrent devices; delete/export.
- **Migration:** realistic old fixtures, expand/backfill/contract, downgrade/forward-fix, backup restore.
- **Security/privacy:** authorization matrix, injection/size limits, redaction, no raw recognition input or raw-answer analytics.
- **Performance:** measured dataset sizes, due queue/library search/event append/projector backlog; index plans retained as evidence.
- **E2E:** recognition→save→practice→quiz→review→progress; vocabulary/grammar only after requirement/content gates.

## 5. Rollout and rollback

Roll out by bounded context behind truthful capability state: reference read → Library → practice → quiz → SRS → progress/outbox → optional sync. Dual-write/backfill only with reconciliation and bounded duration. Stop writes on owner-isolation, ledger/state divergence, duplicate review application, migration checksum, deletion, or restore failure. Rollback disables new writers/readers without deleting immutable events; schema contraction waits until old binaries/readers are retired.

## 6. Definition of Done

A DB task is complete only when: its decision gates are linked and closed; Current/Target claims are accurate; migrations are reversible or forward-fix documented; invariants have automated tests; owner authorization/privacy and failure paths pass; observability has no sensitive payload; performance is measured; rollback/restore evidence exists when applicable; design/schema/repository remain one-to-one; roadmap/task evidence is updated. Open decisions remain **Blocked**, never approximated.

The overall plan is complete only after DB-001..020 applicable tasks have reproducible evidence, all shipped requirements/stories trace to tests, privacy deletion and restore are rehearsed, and unresolved vocabulary/grammar product scope has either canonical requirements or remains excluded.

## Merged Stage 1–3 backend evidence — 2026-09-29

**Current (Partial):** Backend mới có migration runner forward-only với checksum, từ chối chạy `0001_init.sql` khi đã có application tables, và baseline chỉ ghi `schema_migrations` sau khi xác minh năm bảng cùng 19 cột fingerprint Library bắt buộc; baseline không sửa application schema. `db/migrations/0001_init.sql` không bị sửa và giữ SHA-256 `56BC1698325675C8C0436E0FF7B6B5B93A1F285F8A9125C96AFABCC2E591FC4B`. Pool/Kysely, transaction, error và idempotency primitive đã có nội dung thật. `.env.example` chỉ chứa placeholder; `backend/.env` không được tạo và được ignore.

**Current validation evidence:** Node 24.14.1/npm 11.11.0; `npm install` cài đúng Fastify 5.12.5, TypeScript 7.0.2, `pg` 8.23.0, Kysely 0.29.6, Zod 4.6.5, Vitest 5.0.2, toàn bộ license MIT/Apache-2.0 theo npm metadata và không có vulnerability được báo. `npm run typecheck`, `npm run lint` (strict TypeScript structural lint do `typescript-eslint@8.71.0` giới hạn TypeScript `<6.1.0`), `npm run build`, 6 unit/smoke tests đều pass. Integration guard từ chối URL trùng application DB hoặc database name không kết thúc `_test`; do không có `backend/.env`/`TEST_DATABASE_URL`, 1 integration test được skip, không kết nối application DB và không có destructive DB action. PostgreSQL 18 vẫn là Target/local claim do `psql` không có trên PATH.

**Blocked/next:** runtime migration/baseline, schema equivalence và concurrency trên PostgreSQL chưa được xác minh. Chỉ khi có disposable `TEST_DATABASE_URL` kết thúc `_test` và khác `DATABASE_URL`, chạy `cd backend && npm run test:integration`; không dùng application DB.

## Current implementation evidence â€” 2026-09-29 continuation

**Current (Partial):** Backend now includes owner-scoped, versioned deck archive/delete/rebalance and guarded parent moves; published course-to-library save; study fetch/resume, Again requeue and latest-event undo; idempotent/concurrent SRS rating plus event pagination; quiz fetch/completion/retry-missed; and incremental progress writes with rebuild retained. React course, deck, study and quiz actions call these APIs, expose live status, keyboard controls, and optimistic rollback for deck mutations.

**Current validation evidence:** Backend typecheck/lint/build and four explicit non-DB test files (8 tests) pass; frontend TypeScript/build/lint pass. Repository/service/route separation and the absence of SQL/database execution in nine route files were verified structurally. `TEST_DATABASE_URL` was not set, so database integration and migration checks were deliberately not rerun against the application database and are not claimed passed. This is not release completion: a verified disposable database, migration/schema equivalence, concurrency/constraint coverage, rollback/restore, deployment-role grants, and privacy/retention/release gates remain.
