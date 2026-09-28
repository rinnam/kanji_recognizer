# Plan DB — Database implementation

> **Status:** Target/Proposed gated plan; no application code, migration or live database exists because of this document. [PRD](../prd.md) owns product intent, [database design](../database-design.md) owns the logical model, and [reference SQL](../database-schema.sql) is non-operational. `LS-OD-01..10` remain Open unless the PRD records approval.

## 1. Scope and prerequisites

Covers recognition retention, identity/ownership, Library/decks/content, N3 vocabulary/course import, flashcard/study sessions, SRS ledger/state, quiz, progress, outbox, privacy, sync readiness, migration, backup and recovery. Vocabulary four-field coverage and the N3 11×80 course are canonical **Target/Proposed** requirements LS-FR-018/019, not Current implementation; grammar remains a separately gated extension.

Entry prerequisites: PF-001/002 evidence, decision owner/process, reviewed data classification/threat model, repository contract, and approved gates for each slice. Never choose local/server/hybrid merely to unblock coding.

## 2. Decision gates

| Gate | Required decision/evidence | Blocks |
|---|---|---|
| DG-01 | LS-OD-01 identity + local/server/hybrid + mode migration | durable setup, repositories, backup |
| DG-02 | LS-OD-02 source/license/canonical key/editability, including vocabulary/grammar | seed/import/content CRUD |
| DG-03 | LS-OD-03 deck uniqueness/archive/global delete | Library mutations |
| DG-04 | LS-OD-04 quiz mode/normalization/accepted answers; grammar scope separately approved | quiz persistence |
| DG-05 | LS-OD-05 scheduler/time boundary/limits/undo/version migration | SRS writes |
| DG-06 | LS-OD-06 authority clock/offline/conflicts | offline queue/sync/SRS conflicts |
| DG-07 | LS-OD-07 active day/timezone change | streak aggregates |
| DG-08 | LS-OD-08 retention/export/delete/consent/region | production data/telemetry/privacy jobs |
| DG-09 | LS-OD-09 metric hierarchy | analytics publication |
| DG-10 | LS-OD-10 locales/translations/display | localized seed/quiz/content UI |

## 3. Ordered tasks

| ID | Task | Dependencies/gates | Requirement/story mapping | Required evidence |
|---|---|---|---|---|
| DB-001 | Ratify ADR for persistence mode, owner boundary, engine compatibility and stop conditions | PF-002, DG-01 | NFR-002..005; LS-FR-015..017; LUS-015..017 | Approved ADR; rejected alternatives; no implied endpoint/cloud |
| DB-002 | Establish schema/migration harness and version table | DB-001 | NFR-002..005; LS-FR-016 | Empty→latest, one-step upgrade, checksum, rollback rehearsal on chosen engine(s) |
| DB-003 | Ratify normalized content model/provenance for kanji and vocabulary; separately gate grammar | DG-02/DG-10 | LS-FR-004/005/017/018; LUS-004/005 | Canonical key fixtures; four-component vocabulary publish failures; license and Unicode/localization tests |
| DB-004 | Implement owner/library/deck/saved-item schema and invariants | DB-001..003, DG-03 | LS-FR-001..005,015..017; LUS-001..005 | FK/unique/check tests; archive/delete impact matrix |
| DB-005 | Define repository interfaces, authorization and optimistic concurrency | DB-004 | NFR-003/004; LS-FR-001..005/015/016 | Contract tests: owner isolation, stale version, partial/failure states |
| DB-006 | Build versioned reference import/publish pipeline for content and course hierarchy | DB-003 | LS-FR-004/005/018/019; LUS-004/005 | Manifest/checksum/provenance/license; transactional vocabulary and N3 11×80 validators; idempotent rerun, rollback, data-quality report |
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

- **DDL/static:** parse chosen dialect, unique object names, FK dependency/targets, checks, migration checksums, SQLite compatibility fixture.
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
