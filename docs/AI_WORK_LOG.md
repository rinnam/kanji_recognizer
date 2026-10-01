# AI Work Log

Canonical append-only handoff log for AI contributors. Read [`../AGENTS.md`](../AGENTS.md), the canonical [PRD](./prd.md), and the relevant [roadmap](./implementation-roadmap.md) or companion plan before working.

## Rules

- Keep this instructions/template section fixed. Add each new entry immediately below `## Entries`, newest first.
- Never edit, delete, reorder, or silently correct an older entry. Add a newer `Reverted` or corrective entry and reference the earlier timestamp.
- Status must be exactly `Completed`, `Partial`, `Blocked`, or `Reverted`, and must be supported by evidence.
- Separate **Current**, **Target**, and **Assumption** statements. This log complements, but never replaces, canonical PRD requirement status or roadmap/plan task status.
- Use ISO 8601 timestamps with timezone. Be truthful about branch, commit, push, validation failures, blockers, and uncommitted changes.

## Entry template

```markdown
### YYYY-MM-DDTHH:MM:SS+HH:MM — Short scope
- **Agent/tool:** Name/version if known; otherwise `Unknown`
- **Status:** Completed | Partial | Blocked | Reverted
- **Requirement/task IDs:** IDs or `None (governance/docs only)`
- **Scope:** One compact statement
- **Files changed:** Paths, or `None`
- **Current:** Verified repository state after this unit
- **Target:** Intended state relevant to remaining work, or `None`
- **Assumptions/decisions:** Explicit assumptions and decisions, or `None`
- **Validation/evidence:** Commands, results, and evidence links; never claim unrun checks
- **Git:** Branch; commit; push; working-tree state
- **Remaining work:** Exact unfinished/blocked items, or `None`
- **Next action:** One exact recommended action or command
```

## Entries

### 2026-10-01T09:21:00+07:00 — Dev content seed db/seeds/0001_dev_content.sql
- **Agent/tool:** Postman AI agent
- **Status:** Partial
- **Requirement/task IDs:** F0.3 (dev seed); supports LS Library browse/save
- **Scope:** Added the first idempotent development content seed so a fresh local DB has browsable/savable Library content (kanji + vocabulary + a starter course).
- **Files changed:** `db/seeds/0001_dev_content.sql` (new); `docs/AI_WORK_LOG.md` (this entry)
- **Current:** `db/seeds/0001_dev_content.sql` exists. It is a single-transaction, fully `ON CONFLICT DO NOTHING` seed with deterministic UUID keys: 2 content_profile, 26 content_item (20 kanji + 6 vocabulary, status `active`), 26 content_revision, 56 content_reading, 52 content_meaning, 9 content_example, 1 published learning_course, 2 course_lesson, 17 course_lesson_item, plus the LOCAL_OWNER_ID owner_scope and its library. Handles the DEFERRABLE INITIALLY DEFERRED content_item<->content_revision circular FK via one BEGIN/COMMIT with `SET CONSTRAINTS ALL DEFERRED`; satisfies the `sino_vietnamese => locale 'vi'` CHECK and the composite `(content_profile_key, kind)` FK.
- **Target:** `npm run db:seed:dev` runner (F0.3) applies `db/seeds/*.sql`; until it exists, apply with `psql -d kanji_recognizer -f db/seeds/0001_dev_content.sql`.
- **Assumptions/decisions:** Provenance is a placeholder (`source_ref='dev-fixture'`, `license_ref='CC0-1.0'`); this is NOT approved reference content (DG-02 stays gated). Owner-scoped transactional tables (deck/saved_item/card/session/review/quiz) are intentionally left to the app/user. Requires PostgreSQL 13+ for built-in `gen_random_uuid()`.
- **Validation/evidence:** None executed — the file was not applied to any database and not parsed by psql in this unit (no DB/credentials available here). The row counts above are read from the literal VALUES in the file, not from a live query.
- **Git:** Branch not checked; commit: none; push: none; working tree: new untracked `db/seeds/0001_dev_content.sql` plus this log edit.
- **Remaining work:** Apply the seed to a local DB and verify idempotency (run twice; counts unchanged) and that the Library lists the seeded kanji; implement the `db:seed:dev` runner if still missing.
- **Next action:** `psql -d kanji_recognizer -f db/seeds/0001_dev_content.sql`, then re-run once and confirm `SELECT kind, count(*) FROM content_item GROUP BY kind;` returns kanji 20 / vocabulary 6 on both runs.

### 2026-09-29T20:45:00+07:00 — Library audit/fix/localization final evidence handoff
- **Agent/tool:** Postman AI agent
- **Status:** Partial
- **Requirement/task IDs:** LS-FR-001..004, LS-FR-015..019; LL-S01, LL-S03..LL-S06; L1; FE-L1
- **Scope:** Finalized canonical roadmap/plan evidence for the six Library features and this audit/fix/localization batch; no product code was changed during this documentation unit.
- **Files changed:** This documentation unit: `docs/implementation-roadmap.md`, `docs/plans/learning-data-and-library.md`, `docs/frontend-implementation-plan.md`, `docs/AI_WORK_LOG.md`. Preserved batch evidence includes `backend/package.json`, `backend/src/**`, `backend/tests/**`, `db/**`, `frontend/package.json`, `frontend/package-lock.json`, `frontend/vite.config.ts`, `frontend/index.html`, `frontend/src/**`, and `frontend/tests/**`. Pre-existing dirty-tree Recognition prototype deletions (`frontend/src/components/DrawCanvas.tsx`, `InputPanel.tsx`, `ResultPanel.tsx`, `frontend/src/api.ts`, `frontend/src/mockData.ts`, `frontend/src/types.ts`, and related assets) are not attributed to this batch.
- **Current:** The final six-feature matrix records Implemented, Unit-tested, Integration-tested, Runtime-tested, Database-verified, Partial, and Blocked evidence without promoting incomplete UI evidence. Vite `/v1` proxy→Fastify→Kysely→PostgreSQL passed; backend start path is corrected to `dist/src/server.js`; frontend manifest/lock moved from `0.0.0` to `0.1.0` and backend is `0.1.0`. The UUID Save form was removed. Vietnamese localization, API error mapping, and accessibility improvements are present. Backend typecheck/lint/unit 22/22/build/guard 3/3/integration 5/5 and frontend typecheck/lint/tests 19/19/build passed; localization 7 tests and UTF-8 checks across 19 files passed. The disposable runtime database was removed. An early runtime harness mistakenly targeted the application database and created four uniquely identified validation deck rows; they were immediately removed in a guarded transaction and verified absent. No content or saved-item rows were created. This safety incident is recorded as a real failure in test targeting, not minimized as disposable testing.
  Recognition implemented: NO
  Recognition modified: NO
  Recognition API modified: NO
  Recognition → Save implemented: NO
  Recognition schema added: NO
  Recognition dependency added: NO
- **Target:** Attach an interactive browser and capture desktop/mobile/keyboard validation; provide an approved real eligible unsaved-content source before adding a primary Save UI.
- **Assumptions/decisions:** **Current:** no attached interactive browser/CDP was available, and no eligible unsaved-content source exists in inspected repository/runtime evidence. **Target:** close those two gaps without exposing internal IDs. **Assumption:** no approved source exists outside the inspected evidence. **Decision:** status remains Partial despite passing automated/runtime database checks; do not attribute or alter pre-existing Recognition deletions.
- **Validation/evidence:** Previously run batch checks: backend `npm run typecheck` PASS, `npm run lint` PASS, `npm run test:unit` PASS 22/22, `npm run build` PASS, `npm run test:guard` PASS 3/3, PostgreSQL integration PASS 5/5; frontend `npm run typecheck` PASS, `npm run lint` PASS, `npm test` PASS 19/19, `npm run build` PASS; localization PASS 7 tests; UTF-8 PASS 19 files; runtime Vite `/v1` proxy→Fastify→Kysely→PostgreSQL PASS. Browser **Partial**: no attached interactive browser/CDP. Documentation-only final checks: `git diff --check` PASS (only the pre-existing `docs/prd.md` LF→CRLF warning); UTF-8 structural verification found exactly one new `2026-09-29T20:45:00+07:00` entry, all six exact Recognition freeze lines in that entry, and one required final matrix plus one safety-incident statement in each of the three canonical plan files; final status/diff inspected.
- **Git:** Branch `main`, aligned with `origin/main` at inspected HEAD `898492d`; commit: none; push: none; reset/discard: none; heavily dirty working tree preserved, including pre-existing Recognition prototype deletions not attributable to this batch.
- **Remaining work:** Interactive browser desktop/mobile/keyboard validation remains Partial. Save primary UI is absent because there is no real eligible unsaved-content source; this source dependency is Blocked. No automated/runtime/database failure remains for the six-feature matrix.
- **Next action:** Attach an interactive browser to the running Vite/Fastify/PostgreSQL stack and record desktop/mobile/keyboard evidence; then identify and approve a real eligible unsaved-content source before implementing any primary Save action.

### 2026-09-29T19:44:18+07:00 — KotoBase Library redesign and Features 4–6 handoff
- **Agent/tool:** Postman AI agent
- **Status:** Partial
- **Requirement/task IDs:** LS-FR-001..004, LS-FR-015..019; LL-S01, LL-S03..LL-S06; LL-005, LL-006; L1; FE-L1
- **Scope:** Finalized the canonical handoff for the KotoBase-inspired sticky Ink Desk shell and responsive two-pane real Library; Feature 4 known-content-ID save from manual/import/reference sources with optional deck, provenance, duplicate-safe behavior, active-content eligibility, notices/errors/reload; Feature 5 focused root/child create, rename, description edit, parent move, and expected-version conflict refresh; and Feature 6 confirmed owner/version-guarded child-first soft archive/delete with explicit no-cascade/content-preservation wording and refresh.
- **Files changed:** Product/test batch: `frontend/src/App.tsx`, `frontend/src/ProductShell.css`, `frontend/src/features/library/LibraryScreen.tsx`, `frontend/src/features/library/LibraryScreen.css`, `frontend/src/features/library/DeckTree.tsx`, `frontend/src/features/library/api.ts`, `frontend/src/features/library/types.ts`, `frontend/tests/App.test.tsx`, `frontend/tests/LibraryScreen.test.tsx`, `backend/src/services/library.service.ts`, `backend/src/repositories/library.repository.ts`, `backend/tests/unit/library.service.test.ts`. Canonical handoff edits: `docs/plans/learning-data-and-library.md`, `docs/implementation-roadmap.md`, `docs/AI_WORK_LOG.md`. No product source was modified during this documentation finalization.
- **Current:** The implementation and focused unit/component evidence for the UI redesign and Features 4–6 are present in the dirty working tree. Database safety was preserved: PostgreSQL integration was not run without an approved disposable URL and is **BLOCKED/NOT RUN** because `TEST_DATABASE_URL` is missing; it is not passed. The built shell served HTTP 200, but interactive CDP and live DB-backed persisted flows were blocked. Recognition implemented: NO
  Recognition modified: NO
  Recognition API modified: NO
  Recognition → Save implemented: NO
  Recognition schema added: NO
  Recognition dependency added: NO
- **Target:** Supply a disposable `TEST_DATABASE_URL` whose parsed database name ends exactly `_test`, run backend integration, then restore browser/CDP and complete desktop/mobile keyboard and persisted CRUD validation against approved seeded test data. Sibling drag/drop and keyboard-equivalent ordering remain outside this completed batch and keep L1 Partial.
- **Assumptions/decisions:** **Assumption:** the supplied batch summary and preserved dirty source/test files are the intended implementation set. **Decision:** keep the batch and L1 status Partial; treat external lookup, arbitrary input resolution, Recognition, hard delete, cascade deletion, and reversible archive/restore UX as out of scope. Save accepts only already sourced active content IDs; deck removal is owner-scoped, optimistic-version guarded, child-first, and soft, preserving saved/content records. No reset/discard, product-code edit, commit, or push was performed during finalization.
- **Validation/evidence:** Backend `npm run typecheck` PASS; `npm run lint` PASS; `npm run test:unit` PASS 22/22; `npm run build` PASS; guard suite PASS 3/3. Backend PostgreSQL integration **BLOCKED/NOT RUN: `TEST_DATABASE_URL` missing**. Frontend typecheck PASS; lint PASS; tests PASS 10/10; build PASS. Browser PARTIAL: built shell served HTTP 200; interactive CDP and live DB-backed flows blocked. `git diff --check` PASS with an LF→CRLF warning for `docs/prd.md`. Source/tests inspected include the save provenance/optional-deck request, duplicate-safe and active-content service behavior, create/edit/move expected-version payloads, conflict reload, child-first rejection, and content-preservation confirmation.
- **Git:** Branch `main`, aligned `origin/main` at initial audit (`898492d`); commit: none; push: none; heavily dirty unstaged tracked/untracked tree preserved. Final status/diff was inspected; unrelated history and changes were not reset, discarded, or attributed to this documentation unit.
- **Remaining work:** (1) PostgreSQL integration is **BLOCKED/NOT RUN** until a safe `TEST_DATABASE_URL` is supplied. (2) Full interactive browser/CDP validation is blocked; desktop/mobile keyboard, responsive/accessibility, and persisted create/update/move/archive/delete/save checks remain. (3) LL-S02 drag/drop and keyboard-equivalent ordering remain Target.
- **Next action:** Set a disposable `TEST_DATABASE_URL` whose parsed database name ends exactly `_test`, then run `cd backend && npm run test:integration`; after it passes, restore browser/CDP and exercise the approved seeded persisted CRUD matrix.

### 2026-09-29T18:59:58+07:00 — Final independent validation of three Library features
- **Agent/tool:** Postman AI agent
- **Status:** Partial
- **Requirement/task IDs:** LS-FR-001, LS-FR-003, LS-FR-004, LS-FR-015..019; LL-004, LL-005; L1; FE-L1
- **Scope:** Independently reviewed and validated Browse Library, Search/filter Library, and Deck hierarchy across the reported backend/frontend implementation, with particular attention to Kysely query semantics, cursor validation, owner isolation, active-record exclusions, DTOs, UI state/accessibility flows, and the Recognition freeze.
- **Files changed:** This validation unit changed `backend/src/validators/library.validators.ts`, `backend/tests/unit/library.validators.test.ts`, `docs/plans/learning-data-and-library.md`, and this single append-only `docs/AI_WORK_LOG.md` entry. All reported implementation files were inspected; unrelated dirty files were preserved.
- **Current:** Owner/library predicates and archived/deleted/status exclusions are present on browse, deck lookup, memberships, hierarchy updates, and deletes; cursor sort/value/id keyset behavior is deterministic; typed backend/frontend DTOs and loading/empty/error/offline/partial/conflict UI paths are present; create/move controls are keyboard-operable and the tree exposes roles/levels/selection. Saved-date cursors now require an ISO datetime, with regression coverage. **Recognition safety:** this unit made no Recognition implementation, UI, API, route, capability, schema, dependency, test, or Recognition→Save change; pre-existing dirty Recognition-adjacent deletions and `App.tsx` changes remain in the working tree and were not modified or attributed to this unit.
- **Target:** Run live PostgreSQL integration against a disposable database explicitly ending `_test`, then complete missing drag/drop ordering, browser/assistive-technology/zoom evidence, and broader archive/delete/reload/concurrency/rollback evidence before promoting LL-005, L1, or FE-L1 to completed/validated.
- **Assumptions/decisions:** **Assumption:** the reported implementation files and current uncommitted tree are the intended three-feature change set. **Decision:** kept canonical status Partial and added narrow evidence only; made no broad completion/release claim and did not run any command against an application database.
- **Validation/evidence:** Backend `npm run typecheck`, `npm run lint`, `npm run test:unit` (4 files, 18/18), `npm run build`, and `npm run test:guard` (3/3) passed after the cursor fix. Frontend `npm run typecheck`, `npm run lint`, `npm run test` (2 files, 11/11), and `npm run build` passed. `git diff --check` passed (only an existing LF→CRLF warning for `docs/prd.md`). PostgreSQL integration: **NOT RUN/BLOCKED** because `TEST_DATABASE_URL` is absent; live Kysely/PostgreSQL, persistence, concurrency, migration, and rollback behavior are not claimed.
- **Git:** Branch `main` tracking `origin/main`; commit: none; push: none; working tree dirty with extensive pre-existing tracked and untracked changes plus this unit's four files.
- **Remaining work:** Safe PostgreSQL integration; drag/drop/reorder UI and reload consistency; full accessibility/browser evidence; archive/delete frontend paths; migration/rollback and release gates. Existing unrelated/Recognition-adjacent dirty changes require owner review and remain untouched.
- **Next action:** Set `TEST_DATABASE_URL` to a disposable PostgreSQL database whose name explicitly ends `_test`, verify it is not `DATABASE_URL`, then run `cd backend && npm run test:integration`.

### 2026-09-29T18:38:25+07:00 ΓÇö Independently validate Library Core dependency correction
- **Agent/tool:** Postman AI agent
- **Status:** Completed
- **Requirement/task IDs:** LS-FR-001..005; LS-FR-015..019; LS-OD-01/02/03/08; L1; L1R; FE-L1; FE-L2; DG-01/02/03/08
- **Scope:** Independently validated the documentation-only dependency correction across the master roadmap, Library plan, database plan, and frontend plan; no additional correction defect was found, so this unit changed only the append-only handoff log.
- **Files changed:** Correction change set validated: `docs/implementation-roadmap.md`, `docs/plans/learning-data-and-library.md`, `docs/plans/database-implementation-plan.md`, `docs/frontend-implementation-plan.md`; this validation/handoff unit changed only `docs/AI_WORK_LOG.md`. No source, database, migration, or Recognition implementation file was changed by this unit.
- **Current:** The four scoped plans consistently keep Recognition and Recognition ΓåÆ Save required but future/frozen and exclude both from Library Core prerequisites. Planning readiness is READY for browse, search/filter, deck hierarchy, and deck ordering; PARTIALLY_READY for supported non-recognition save, deck creation, deck update, and deck archive/delete under the approved contract; Recognition result and Recognition ΓåÆ Save remain BLOCKED ΓÇö future/frozen. LS-OD-01/02/03/08 impacts are behavior-specific and retain production, compliance, destructive-action, retention, and release blockers; readiness labels do not claim implementation or release validation.
- **Target:** Implement and validate independent Library Core only within each documented minimal behavior-specific contract; resume Recognition and Recognition ΓåÆ Save only after the model/service, provenance, evaluation, privacy, and integration gates pass.
- **Assumptions/decisions:** Assumption: the pre-existing scoped documentation diffs are the dependency-correction change set requested for independent validation. Decision: no scoped prose edit was necessary; planning readiness was not promoted to implementation, production, or release readiness. No application tests were run.
- **Validation/evidence:** Reviewed `AGENTS.md`, the fixed template and entries structure in `docs/AI_WORK_LOG.md`, `docs/prd.md`, repository status/recent commits, and complete diffs for all four scoped plans. Focused PowerShell text/content checks confirmed the dependency direction, exact readiness sets, future/frozen Recognition status, and concrete LS-OD-01/02/03/08 boundaries. `git diff --check -- docs/implementation-roadmap.md docs/plans/learning-data-and-library.md docs/plans/database-implementation-plan.md docs/frontend-implementation-plan.md` passed with no output. Application tests: not run by constraint.
- **Git:** Branch `main` tracking `origin/main`; HEAD `898492d`; commit: none; push: none; working tree dirty with extensive pre-existing tracked/untracked changes, including the four validated docs and `docs/AI_WORK_LOG.md`.
- **Remaining work:** Recognition result and Recognition ΓåÆ Save remain required but blocked/frozen pending approved model/service, provenance, evaluation, privacy, and integration evidence. Production/release readiness remains blocked by the documented identity/deployment, source/license/canonicalization, deck naming/global-delete, retention/export/delete/consent/region, migration/integration, and release evidence gates.
- **Next action:** Review and approve the behavior-specific Library Core contract boundaries, then implement/validate one independent Library Core slice without enabling Recognition or Recognition ΓåÆ Save.
### 2026-09-29T18:16:59+07:00 — Independently validate truthful capability and local learning surfaces
- **Agent/tool:** Postman AI agent
- **Status:** Completed
- **Requirement/task IDs:** PF-001; FE-WS1; FE-L0; FR-010; US-013; LS-FR-015..016
- **Scope:** Independently reviewed and validated the three-feature capability matrix, recognition unavailable-state UX, and local/mock learning shell; corrected one backend observability overclaim and recorded narrowly scoped canonical evidence.
- **Files changed:** `backend/src/routes/system.routes.ts`; `backend/tests/unit/app.test.ts`; `docs/frontend-implementation-plan.md`; `docs/plans/platform-foundation-and-contracts.md`; `docs/AI_WORK_LOG.md`. Validated implementation files: `frontend/src/App.tsx`, `frontend/src/capabilities.ts`, `frontend/src/learning.ts`, `frontend/src/components/StatePanel.tsx`, `frontend/src/components/StatusTag.tsx`, `frontend/tests/App.test.tsx`.
- **Current:** Recognition is explicitly unavailable with its action disabled and no fabricated candidate/confidence output; learning views and ready/loading/empty/partial/error/offline states are explicitly local/mock with no persistence or sync claim; backend capability output now reports the separate frontend learning runtime as unobservable (`available: null`) instead of claiming it is running. PF-001 remains Partial; FE-WS1 scoped unavailable-state UX and FE-L0 are Ready for validation, not broadly Validated.
- **Target:** Governance review and remaining PF/R0 gates; FE-WS1 production-mode guard/content gate; FE-L0 browser, accessibility, responsive/zoom/touch, freshness, and routing evidence; approved model/inference contract before recognition integration; approved contracts before durable learning.
- **Assumptions/decisions:** Treated source plus automated tests as Current implementation evidence, not runtime deployment or UX/a11y evidence. Preserved recognition and durable-learning blockers and did not promote broad stage, release, database, persistence, scheduling, or analytics claims.
- **Validation/evidence:** Backend `npm run typecheck && npm run lint && npm run test:unit && npm run build` passed (3 files, 8 tests). Frontend `npm run typecheck && npm run lint && npm run test && npm run build` passed (1 file, 7 tests; Vite 8.3.1, 21 modules). Focused source/test review verified disabled recognition/no confidence output, all four learning destinations, all six UI states, and Current/Target/Blocked capability labeling. `git diff --check` passed with only the existing `docs/prd.md` LF→CRLF warning.
- **Git:** Branch `main` tracking `origin/main`; commit: none; push: none; working tree dirty with pre-existing modified/deleted/untracked changes plus the five files changed by this validation/handoff.
- **Remaining work:** None for this final independent validation/handoff scope. The broader gates listed under Target remain open and were not claimed complete.
- **Next action:** Review the scoped diff, then run browser/a11y/responsive evidence collection before considering FE-WS1 or FE-L0 fully Validated.

### 2026-09-29T17:39:15+07:00 — Attempt real application DB deck CRUD verification
- **Agent/tool:** Postman AI agent
- **Status:** Blocked
- **Requirement/task IDs:** LS-FR-001; LL-005
- **Scope:** Inspected the deck Route→Controller→Service→Repository→PostgreSQL path and attempted a uniquely marked manual create/update/delete verification against the configured real application database with exact cleanup guards.
- **Files changed:** `docs/AI_WORK_LOG.md` only; the temporary CRUD script was deleted.
- **Current:** The configured `LOCAL_OWNER_ID` has no active `owner_scope` row and no corresponding `library` row in the configured application database, so the run stopped before any POST/PATCH/DELETE. A final read-only check found zero `__ai_crud_test_%` deck rows; no application data was mutated.
- **Target:** Run POST `/v1/library/decks`, GET `/v1/library`, PATCH `/v1/library/decks/:deckId`, GET, DELETE `/v1/library/decks/:deckId`, and final GET/DB cleanup verification after the configured local owner and library correspond to an existing approved scope.
- **Assumptions/decisions:** Did not call the API because `ensureLibrary` would create owner/library prerequisite rows, which the requested safety boundary forbids. Did not select or expose another existing owner, and did not run migration, baseline, reset, drop, or truncate.
- **Validation/evidence:** Guarded runtime loaded `backend/.env` without printing secrets and returned `BLOCKED_PREREQUISITE` before mutation. Follow-up read-only query returned `configuredOwnerExists=false`, `configuredLibraryExists=false`, and `markerRows=0`. Backend route and persistence code inspection confirmed create 201, update 200 with optimistic `expectedVersion`, soft delete 204, owner scoping, and child-first deletion rules.
- **Git:** Branch `main`; commit: none; push: none; working tree remains dirty with pre-existing changes plus this append-only log entry; no product code changed.
- **Remaining work:** Configure `LOCAL_OWNER_ID` to an approved existing owner that already has a library, then rerun the guarded CRUD script; alternatively obtain explicit permission to create the missing local owner/library prerequisites.
- **Next action:** Update only the local ignored configuration to reference an approved existing owner/library, then repeat the real-DB guarded deck CRUD check.

### 2026-09-29T17:32:00+07:00 — Configure and verify local PostgreSQL connection
- **Agent/tool:** Postman AI agent
- **Status:** Partial
- **Requirement/task IDs:** DB-002; merged Stage 2 follow-up
- **Scope:** Created the ignored local backend environment configuration, updated npm scripts to load it, and verified a read-only connection to the existing application database without applying or changing schema.
- **Files changed:** `backend/.env` (local and Git-ignored; secret values intentionally omitted from this log); `backend/package.json`; `docs/AI_WORK_LOG.md`.
- **Current:** `npm run db:status` connects successfully and reports 31 existing public tables; migration tracking is empty. The existing schema and data were not modified.
- **Target:** Establish a separate database ending in `_test` before running integration tests; decide whether the existing application schema should be baselined only after explicit review.
- **Assumptions/decisions:** Local credentials remain only in the ignored environment file and are never recorded in documentation or command output. No baseline or migration was executed.
- **Validation/evidence:** `git check-ignore -q backend/.env` passed; `npm run db:status` returned 31 public tables and zero tracked migrations; `npm run typecheck` and `npm run build` passed.
- **Git:** Branch `main`; commit: none; push: none; working tree remains dirty with pre-existing changes plus `backend/package.json` and this log entry; `backend/.env` is ignored.
- **Remaining work:** Integration and concurrency tests require a dedicated safe `TEST_DATABASE_URL` whose database name ends in `_test`; application DB baseline remains undecided.
- **Next action:** Create the dedicated test database/configuration, then run `npm run test:integration`; do not run integration cleanup against the application database.

### 2026-09-29T17:24:49+07:00 — Create empty frontend directory tree
- **Agent/tool:** Postman AI agent
- **Status:** Completed
- **Requirement/task IDs:** None (filesystem scaffolding only)
- **Scope:** Created only the requested physical `frontend/` directory architecture; no code, dependencies, configuration, placeholder files, recognition folders, backend changes, or database changes were made.
- **Files changed:** `docs/AI_WORK_LOG.md` only; 37 empty directories exist under `frontend/` but are untracked by Git because they contain no files.
- **Current:** The requested `frontend/public`, `frontend/src/**`, and `frontend/tests/{unit,integration,e2e}` directory tree exists physically and exactly; `frontend/` contains zero files, so no frontend implementation or configuration exists.
- **Target:** None.
- **Assumptions/decisions:** Preserved empty directories only on the local filesystem and did not add `.gitkeep`, as required; pre-existing working-tree changes were not modified except this append-only log entry.
- **Validation/evidence:** PowerShell enumerated the requested relative paths and `Get-ChildItem frontend -Force -Recurse`; result: `DirectoryCount=37`, `FileCount=0`, `MissingCount=0`, `ExtraCount=0`. The listing included every requested directory and no recognition directory.
- **Git:** Branch `main`; commit: none; push: none; working tree remains dirty with pre-existing modified/deleted/untracked paths, while empty frontend directories themselves are not represented by Git; this entry modifies `docs/AI_WORK_LOG.md`.
- **Remaining work:** None for this request; frontend implementation/configuration remains intentionally absent.
- **Next action:** When implementation is explicitly authorized, create frontend files/configuration inside this physical tree; until then, leave it empty.

### 2026-09-29T16:56:27+07:00 — Corrected merged Stage 1–3 layered backend
- **Agent/tool:** Postman AI agent
- **Status:** Partial
- **Requirement/task IDs:** PF-001..007; DB-002; LL-001..006; LS-FR-001..004
- **Scope:** Corrected the 2026-09-29T16:29:56+07:00 architecture record and implemented Platform + Library with the latest owner-mandated conventional layers; frontend and recognition remain out of scope.
- **Files changed:** `backend/**`; `docs/implementation-roadmap.md`; `docs/plans/platform-foundation-and-contracts.md`; `docs/plans/code-structure-proposal.md`; `docs/AI_WORK_LOG.md`. Other working-tree changes pre-existed this unit; `db/migrations/0001_init.sql` was read only.
- **Current:** `backend/` is an independent Node/Fastify/TypeScript project using `Route -> Controller -> Service -> Repository -> Kysely -> PostgreSQL`; Library supports owner-scoped get/save/deck create-update-rebalance-delete, hierarchy cycle/depth checks, optimistic versions, transactional mutations, local-owner/library resolution, health/capabilities, guarded DB baseline/status, and safe test-DB checks. No forbidden architecture folder or frontend exists; recognition is only reported unavailable. `backend/.env` is absent and ignored.
- **Target:** Validate the existing DDL and Library behavior against a disposable PostgreSQL database whose name ends `_test`; keep recognition and frontend deferred.
- **Assumptions/decisions:** `/v1` Library paths are the documented implementation assumption because the old runtime was deleted. This project layout is the owner’s decision, not a universal Fastify layout. Baseline requires an explicit flag and required existing tables; it never replays `0001_init.sql`. The prior work-log claim that bounded contexts/use cases were Current is superseded by this entry.
- **Validation/evidence:** Node 24.14.1/npm 11.11.0; lockfile installs Fastify 5.12.5, TypeScript 7.0.2, `pg` 8.23.0, Kysely 0.29.6, Zod 4.6.5, Vitest 5.0.2. `npm run typecheck`, `npm run lint`, `npm run build`, 8 unit tests, and 3 DB guard tests pass. App injection proves health and truthful unavailable capabilities without DB. `npm audit` reports one low-severity transitive `esbuild` advisory with no effective automatic fix. Live integration was not run because `backend/.env`/safe `TEST_DATABASE_URL` is absent and `psql` is not on PATH. Tree check found no `modules`, `bounded-context`, `domain`, or `use-cases`; migration diff is empty.
- **Git:** Branch `main`; commit: none (HEAD `898492d`); push: none; working tree remains dirty with this backend plus pre-existing documentation changes, frontend deletions, and untracked archives/database files.
- **Remaining work:** Live PostgreSQL 18 schema/Library integration, migration equivalence, and concurrency evidence remain blocked pending user-created local configuration with a dedicated `_test` database. The low-severity transitive development-server advisory remains upstream/unresolved.
- **Next action:** Create `backend/.env` locally from `.env.example` with safe local values and a distinct database ending `_test`, then run `npm run test:integration`; never point it at application data.

### 2026-09-29T16:29:56+07:00 — Merged Stage 1–3 backend Platform and Library
- **Agent/tool:** Postman AI agent
- **Status:** Partial
- **Requirement/task IDs:** PF-001..007; DB-002; LL-001..006; LS-FR-001..004
- **Scope:** Recorded the owner-approved merged Stage 1–3 decision, initialized a new Fastify backend, added safe migration/baseline infrastructure, and implemented owner-scoped Library use cases without restoring frontend or touching recognition.
- **Files changed:** `backend/**`; `docs/prd.md`; `docs/database-design.md`; `docs/plans/{platform-foundation-and-contracts,database-implementation-plan,learning-data-and-library,code-structure-proposal}.md`; `docs/AI_WORK_LOG.md`. Pre-existing changes/deletions outside this list were not modified; `db/migrations/0001_init.sql` was read only.
- **Current:** Backend uses bounded contexts/use cases with thin routes and SQL in use cases; Platform includes env, pool/Kysely, transaction, errors, idempotency and guarded migration/baseline. Library includes get/save/create/update/rebalance/delete and pure hierarchy logic. Backend/frontend old source was already deleted; frontend remains absent and recognition was not created or changed. `backend/.env` is absent and ignored; `.env.example` contains placeholders only.
- **Target:** PostgreSQL 18 runtime validation, migration/schema equivalence, and concurrent Library integration on a disposable database ending `_test`; React 19.3.0/Vite 8.3.1 remain frontend-only future Target.
- **Assumptions/decisions:** Owner merged Stage 1–3 and approved new initialization instead of `git mv`. Exact old behavior cannot be preserved because old source is absent; documentary contracts are the best available compatibility evidence. Fastify plugin/encapsulation does not impose service/repository layers. `typescript-eslint@8.71.0` rejects TypeScript 7 (`<6.1.0`), so lint is strict TypeScript structural checking rather than an incompatible parser stack.
- **Validation/evidence:** Machine: Node 24.14.1/npm 11.11.0; registry/install: Fastify 5.12.5, TypeScript 7.0.2, pg 8.23.0, Kysely 0.29.6, Zod 4.6.5, Vitest 5.0.2; npm metadata licenses MIT/Apache-2.0; install reported 0 vulnerabilities. `npm run typecheck`, `npm run lint`, `npm run build` pass; `npm test` passes 2 files/6 tests. `npm run test:integration` safely skips 1 guarded test because `TEST_DATABASE_URL` is absent. Guard rejects equality with `DATABASE_URL` and DB names not ending `_test`. No DB connection, drop, truncate, reset, or application-schema mutation was attempted. Migration SHA-256 remains `56BC1698325675C8C0436E0FF7B6B5B93A1F285F8A9125C96AFABCC2E591FC4B`; `psql` unavailable on PATH.
- **Git:** Branch `main` tracking `origin/main`; Commit: none; Push: none; working tree already dirty with documentation changes, untracked `db/`, and owner-created frontend deletions; this unit adds untracked `backend/` and edits the listed existing docs.
- **Remaining work:** DB runtime/migration/baseline/schema-equivalence and two-connection integration remain blocked by missing safe `TEST_DATABASE_URL`; release/privacy/rollback gates remain open. Stage 2/3 are not fully Completed.
- **Next action:** Provision a disposable PostgreSQL database whose name ends `_test`, set `TEST_DATABASE_URL` separately from `DATABASE_URL`, then run `cd backend && npm run test:integration`; never point it at the application database.

### 2026-09-29T13:21:00+07:00 — Final Stage 0 documentation verification
- **Agent/tool:** Postman AI agent
- **Status:** Completed
- **Requirement/task IDs:** Stage 0 documentation verification
- **Scope:** Independently revalidated the corrected Stage 0 proposal and closed the pending verification noted in the preceding corrective entry; no product code was changed.
- **Files changed:** `docs/AI_WORK_LOG.md` only for this verification handoff.
- **Current:** The proposal contains eight flat backend contexts, the exact Stage 0–15 sequence, four owner questions, and no `backend/src/contexts/` wrapper.
- **Target:** Owner review and decisions before Stage 1; no Stage 1 work has started.
- **Assumptions/decisions:** Product checks remain intentionally unrun because Stage 0 changed documentation only.
- **Validation/evidence:** `git diff --check` passed with only the pre-existing `docs/prd.md` LF→CRLF warning; the UTF-8 Node assertion passed with `flat contexts=8, stages=0..15, questions=4`; scoped Git status shows the proposal untracked and the tracker/log modified. An earlier PowerShell assertion failed because it searched fully repeated context paths rather than the compact tree notation; no proposal defect was indicated, and the corrected assertion passed.
- **Git:** Branch `main`; Commit: none; Push: none; working tree remains dirty with substantial pre-existing changes.
- **Remaining work:** Owner approval of the four questions in `docs/plans/code-structure-proposal.md` §9.
- **Next action:** Record owner answers to §9 before beginning Stage 1.

### 2026-09-29T13:17:20+07:00 — Correct Stage 0 structure proposal
- **Agent/tool:** Postman AI agent
- **Status:** Completed
- **Requirement/task IDs:** PF-001 Partial; PF-002 Partial; Stage 0 corrective documentation only
- **Scope:** Corrected the noncompliant Stage 0 proposal and its foundation tracker without changing product code; this entry corrects the prior `2026-09-29T13:10:00+07:00` proposal entry, which remains append-only below.
- **Files changed:** `docs/plans/code-structure-proposal.md`; `docs/plans/platform-foundation-and-contracts.md`; `docs/AI_WORK_LOG.md`.
- **Current:** The accurate line-counted BE/FE inventory remains. The corrected proposal now specifies eight flat contexts directly under `backend/src/`, meaningful use-case/query files without mandatory layer templates, Stage 1 move-only semantics, the exact Stage 0–15 order, feature-organized frontend, and recognition untouched/mocked outside capability read.
- **Target:** Owner reviews the flat target tree and four unresolved placement/ownership choices before Stage 1; later stages make routes thin and keep SQL in same-context use-case/query files.
- **Assumptions/decisions:** Fixed requirements are not reopened: no `src/contexts`, no fixed backend/frontend template, Courses remains its own flat context, no recognition stage. Open choices are limited to target-tree approval, transaction primitive, identity/bootstrap ownership, and idempotency placement.
- **Validation/evidence:** Encoding-safe Node documentation check passed: all 8 required flat contexts; zero forbidden target paths/templates; exact stages 0–15; exactly 4 questions; Stage 1 mapping, thin-route/SQL, and recognition rules present. `git diff --check -- docs/plans/code-structure-proposal.md docs/plans/platform-foundation-and-contracts.md docs/AI_WORK_LOG.md` passed before this append; re-run after append is the next validation. Product build/tests were not run because this was docs-only.
- **Git:** Branch `main`; Commit: none; Push: none; working tree remains dirty with substantial pre-existing changes; only the three documentation paths listed above were edited by this corrective unit.
- **Remaining work:** Owner approval/questions only; no documentation correction remains if final diff validation passes.
- **Next action:** Review `docs/plans/code-structure-proposal.md` §§4–6 and §9, then approve the tree/choices before Stage 1.
