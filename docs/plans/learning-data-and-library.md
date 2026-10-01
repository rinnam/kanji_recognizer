# Plan LL — Library Core and future Recognition → Save

## Purpose and coverage
Deliver **Library Core** independently: browse, search/filter, item detail, save through a supported non-recognition source, deck creation/update, nested hierarchy, ordering, and archive/delete under the approved contract. This covers LS-FR-001..004 and LS-FR-015..019. **Recognition and Recognition → Save remain required future/frozen scope:** LS-FR-005 is preserved unchanged and resumes only after Recognition integration is available; it is not an entry prerequisite for Library Core. UI follows the [Learning Experience UI Skill](../skills/learning-experience-ui-skill.md).

## Prerequisites
PF capability truthfulness and the minimal contract for the specific Library Core behavior being implemented are prerequisites. Open decisions are applied narrowly rather than as a blanket stop: LS-OD-01 blocks claims or implementation tied to an unchosen account/cloud/hybrid mode, not an explicitly scoped single-owner local contract; LS-OD-02 blocks unapproved external lookup, licensed seed/import, canonicalization, and editable-reference behavior, not browsing or saving already sourced records with provenance; LS-OD-03 blocks unresolved naming uniqueness and global item hard-delete, not the selected depth-8 hierarchy, move/reorder, or child-first deck archive/delete contract; LS-OD-08 blocks production launch, telemetry, export, account-wide hard-delete, and unresolved retention behavior, not privacy-minimized development/validation with no image/ink retention and no unapproved telemetry. Applicable LS-OD-06/10 gates remain scoped to offline conflict and locale/display behavior. Node.js is the Target backend runtime; local/remote/hybrid product deployment remains open. Use the Target [database design](../database-design.md) and [Plan DB](./database-implementation-plan.md) only within these explicit safe boundaries. Per LS-FR-018/019, vocabulary fields and course cardinality are policy-driven; N3 11×80/880 remains an optional fixture requiring approved source/license if used. Grammar remains separately gated.

## Library Core readiness assessment

These are planning-readiness states, not claims that implementation or release validation is complete.

| Library Core feature | Status | Exact reason |
|---|---|---|
| Browse library | **READY** | Existing owner-scoped library/read contract and sourced-record shape are sufficient; Recognition is irrelevant. Production identity, backup, and privacy launch gates still apply later. |
| Search/filter library | **READY** | Can query existing sourced records under the current minimal contract; no external lookup, new canonicalization policy, or Recognition result is required. |
| Save item through supported non-recognition source | **PARTIALLY_READY** | Repository/membership dedupe and provenance seams exist. It may proceed only for already sourced records with an accepted canonical reference; external Jisho/Mazii lookup, unapproved import, editing, and unresolved canonical-key expansion remain blocked by LS-OD-02. |
| Deck creation | **PARTIALLY_READY** | Trim/non-empty, owner scope, versioning, and hierarchy contract exist. A safe documented naming rule can proceed, but any product claim about duplicate-name uniqueness awaits the remaining LS-OD-03 decision. |
| Deck update | **PARTIALLY_READY** | Versioned rename/move contract exists; rename follows the same unresolved duplicate-name policy boundary, while supported parent/order updates can proceed. |
| Deck hierarchy | **READY** | Depth 8, same-owner/library parent, cycle prevention, and child-first lifecycle are selected Target contracts; Recognition and the remaining naming/global-delete questions are not prerequisites. |
| Deck ordering | **READY** | Stable sibling ordering, serialized reorder, optimistic versioning, and reload-consistency contract are defined; offline queued conflict behavior remains separately gated and need not block online/local core ordering. |
| Deck deletion/archive according to approved contract | **PARTIALLY_READY** | Child-first archive/soft-delete without deleting membership/history is defined and may proceed. Global item hard-delete, account-wide erasure, retention, backup expiration, and recovery guarantees remain blocked by LS-OD-03/08. |
| Recognition result | **BLOCKED — future/frozen** | Requires approved model/service, provenance, evaluation, privacy, and integration evidence from the Recognition roadmap. It is not a Library Core dependency. |
| Recognition → Save | **BLOCKED — future/frozen** | Requires a real confirmed Recognition result plus the stable Library save contract. LS-FR-005 is preserved for eventual integration and is excluded from the Library Core completion gate. |

## Open-decision impact matrix

| Decision | Affected feature | Blocking behavior | Non-blocking safe behavior | Existing minimal contract | Pre-implementation closure genuinely required? |
|---|---|---|---|---|---|
| **LS-OD-01** | Ownership/deployment for every durable Library mutation | Account/cloud/hybrid claims, cross-device identity, mode migration, production backup/restore | Explicit single-owner local development and validation with truthful capability labels | `owner_scope`/`owner_id` scoping, repository boundary, optimistic versions; no sync claim | **No** for scoped local Library Core; **Yes** before account/cloud/hybrid or production mode commitments |
| **LS-OD-02** | Browse/detail/save source, canonical dedupe, editable reference content | External Jisho/Mazii calls, unapproved seed/import, new canonical-key rules, reference-field editing | Browse/search/detail and save of already sourced, provenance-bearing records with partial-field fallbacks | Immutable content reference, provenance fields, unique library/content membership, idempotent retry | **No** for existing sourced records; **Yes** before affected lookup/import/edit/canonicalization behavior |
| **LS-OD-03** | Deck create/update/hierarchy and destructive actions | Final duplicate-name uniqueness and global item hard-delete | Trim/non-empty names under a documented provisional rule; depth-8 hierarchy; move/reorder; child-first deck archive/soft-delete preserving membership/history | Same-owner/library parent, cycle/depth rejection, stable ordering, optimistic version, archive-before-delete | **No** for selected deck core behavior; **Yes** before enforcing final uniqueness or global item deletion |
| **LS-OD-08** | Data retention/export/delete, telemetry, launch | Production launch, consent/age/region claims, export, account/global erasure, retention and backup-deletion guarantees, telemetry collection | Privacy-minimized development/validation; no image/ink retention; no unapproved telemetry; deck archive/soft-delete under the selected contract | Data classification boundary, owner scope, redacted logs, no image/ink copy in future handoff | **No** for privacy-minimized Library Core work; **Yes** before production launch or the listed privacy operations |

## Verified implementation matrix and minimal completion scope

### Evidence labels and scope guard

- **Current** means verified in the present working tree; it does not imply release approval. The tree is heavily dirty and unstaged, so every path below is evidence only and must be preserved/reviewed rather than attributed to this planning change.
- **Target** means the smallest remaining Library Core implementation needed to close the audited gaps. **Recognition and Recognition → Save are frozen:** do not modify recognition UI, API, schema, dependencies, tests, or connect recognition output to save in this scope.
- **Assumption** means not established by repository evidence. In particular, an approved external/content provider, licensed seed corpus, and a UI mechanism that resolves arbitrary user input to an existing `contentItemId` are unavailable. This limits what can be saved, but does **not** block UI/backend work against already sourced active content.
- **Safe deletion contract:** deck removal remains owner-scoped, optimistic-version guarded, child-first, and soft only. The current mutation sets both `archived_at` and `deleted_at`; it must not cascade to `saved_item` or `content_item`, invent hard deletion, or claim that content was erased. A separately reversible archive operation is not currently exposed.

### Final audit matrix (supersedes earlier validation-gap statements below)

**Current:** backend typecheck/lint/build passed; unit 22/22, database guard 3/3, and PostgreSQL integration 5/5 passed. Frontend typecheck/lint/build and tests 19/19 passed; seven localization tests and UTF-8 checks across 19 files passed. The runtime chain `Vite /v1 proxy → Fastify → Kysely → PostgreSQL` passed, then its disposable database was removed. The Vite `/v1` proxy targets Fastify on port 3000; backend `start` now uses the built `dist/src/server.js`; frontend/backend versions are `0.1.0`. Vietnamese localization covered `index.html` (5), `App.tsx` (16), `StatePanel.tsx` (27), `LibraryScreen.tsx` (68), `DeckTree.tsx` (91), `api.ts` (36), and `learning.ts` (14), while retaining Ink Desk, Kanji, JLPT, N1–N5, and API/HTTP/internal identifiers. API errors are mapped to user-facing Vietnamese; accessible names, tree semantics, expanded/current state, and live status handling were improved. The UUID Save form was removed rather than exposing an internal identifier.

| Feature | Code | Unit test | Integration | Runtime FE→BE→DB | UI | Status |
|---|---|---|---|---|---|---|
| Browse Library | Implemented | Passed | Passed | Passed | Component passed; interactive viewport pending | **Partial** |
| Search/filter | Implemented | Passed | Passed | Passed | Component passed | **Integration-tested / Runtime-tested** |
| Deck hierarchy | Implemented | Passed | Passed | Passed | Tree UI passed | **Integration-tested / Runtime-tested** |
| Save item | Backend implemented; UUID form removed | Passed | Passed | Passed | **Blocked:** primary UI absent because there is no real eligible unsaved-content source | **Partial / Blocked UI source** |
| Create/update deck | Implemented, including move/conflict/reload | Passed | Passed | Passed | Component passed | **Integration-tested / Runtime-tested** |
| Archive/delete deck | Implemented child-first; saved/content preserved | Passed | Passed | Passed | Component passed | **Integration-tested / Runtime-tested / Database-verified** |

All six features are **Implemented** at the code boundary shown and **Unit-tested**. PostgreSQL integration 5/5 establishes **Integration-tested** and **Database-verified** evidence; the proxy-chain run establishes **Runtime-tested** evidence. **Partial:** interactive browser desktop/mobile/keyboard validation remains incomplete because no interactive browser/CDP session was attached. **Blocked:** Save primary UI cannot truthfully be exposed until a real eligible unsaved-content source exists. This does not change the passed backend, integration, runtime, or database evidence.

**Validation safety incident:** an early runtime harness mistakenly targeted the application database and created four uniquely identified validation deck rows. They were immediately removed in a guarded transaction and verified absent. No content or saved-item rows were created. This was a real validation-safety failure, not a disposable-database run; subsequent runtime/integration validation used a disposable database that was removed.

**Target:** attach an interactive browser and record desktop/mobile/keyboard evidence; separately provide an approved real eligible unsaved-content source before adding a primary Save action. **Assumption:** no such source exists outside the inspected evidence. Recognition and Recognition → Save remain frozen.

### Earlier detailed implementation inventory

| Feature | Backend | Frontend | API | DB | Tests | Status |
|---|---|---|---|---|---|---|
| Browse Library | **Current:** owner-scoped active deck/item query and cursor pagination in `backend/src/services/library.service.ts` and `backend/src/repositories/library.repository.ts`. | **Current:** persisted list, load-more, loading/empty/error/offline/partial states in `frontend/src/features/library/LibraryScreen.tsx`. | **Current:** `GET /v1/library` in `backend/src/routes/library.routes.ts`; typed client in `frontend/src/features/library/api.ts`. | **Current:** `library`, `saved_item`, content joins, active-state predicates in `db/migrations/0001_init.sql`. | **Current:** service/query validator and screen coverage in `backend/tests/unit/library.service.test.ts`, `backend/tests/unit/library.validators.test.ts`, and `frontend/tests/LibraryScreen.test.tsx`; live DB coverage remains limited. | **Current — implemented; validation incomplete** |
| Search/filter | **Current:** saved-record query supports `q`, kind, JLPT, deck, deterministic sort/cursor in repository/validators. | **Current:** search, kind, JLPT, deck, sort, reset controls in `LibraryScreen.tsx`. | **Current:** query contract on `GET /v1/library`; no external lookup. | **Current:** filters active `saved_item`/`content_item` and active deck membership. | **Current:** validator and Japanese-query UI tests; integration combinations are missing. | **Current — implemented for saved records** |
| Deck hierarchy | **Current:** same-library parent checks, cycle/depth validation, and version conflicts in `library.service.ts` and `backend/src/utils/deck-hierarchy.ts`. | **Current:** recursive ARIA tree plus root/child create and parent move in `frontend/src/features/library/DeckTree.tsx`. | **Current:** hierarchy changes use `POST /v1/library/decks`, `PATCH /v1/library/decks/:deckId`, and rebalance contract. | **Current:** self-referencing `deck.parent_id`; active reads exclude archived/deleted decks. | **Current:** `backend/tests/unit/deck-hierarchy.test.ts`, service tests, screen tests, and a guarded PostgreSQL lifecycle test. | **Current — implemented; broader a11y/concurrency evidence pending** |
| Deck ordering | **Current:** transactional rebalance validates all active placements and optimistic library version in `library.service.ts`; persistence in repository. | **Current:** stable sort display only. **Target:** sibling drag/drop plus keyboard reorder, pending/conflict rollback, and reload consistency. | **Current:** `PUT /v1/library/decks/rebalance`. | **Current:** `deck.sort_position` and library version support persistence. | **Target:** add service/integration and frontend reorder/conflict/reload tests. | **Partial — backend contract exists; frontend missing** |
| Save item | **Current:** transactional provenance-aware saved-item/membership dedupe for manual/import/reference; requires existing `contentItemId`. | **Target:** add a non-recognition save sheet/action for already sourced active content, deck selection/create, pending/error/conflict/success, and provenance disclosure. | **Current:** `POST /v1/library/items`. | **Current:** active saved-item uniqueness and membership primary key in `db/migrations/0001_init.sql`; no content ingestion/resolution flow is established. | **Target:** add route/service/PostgreSQL idempotency, rollback, invalid item/deck, and frontend save-state tests. | **Partial — backend exists; frontend/source-resolution gap** |
| Create deck | **Current:** root/child creation, hierarchy validation, next sibling position. | **Current:** basic root/child create form in `DeckTree.tsx`. **Target:** redesign validation, focus restoration, description handling, and consistent async feedback. | **Current:** `POST /v1/library/decks`. | **Current:** owner/library/parent/name/position fields in `deck`. | **Current:** unknown-parent and UI child-create coverage; **Target:** add validation, depth boundary, rollback and DB coverage. | **Current — basic implementation; UX/test gaps** |
| Update deck | **Current:** versioned name/description/parent patch with hierarchy validation. | **Current:** parent move only. **Target:** focused rename/description editor with cancel, validation, conflict reload, and focus restoration. | **Current:** `PATCH /v1/library/decks/:deckId`. | **Current:** mutable name/description/parent plus `version`. | **Current:** move/version request is covered in frontend; **Target:** rename/description and stale-version backend/integration tests. | **Partial — edit UI missing** |
| Archive deck | **Current:** repository lifecycle mutation writes `archived_at` together with `deleted_at`; there is no archive-only service operation. | **Target/Assumption:** expose archive only if product semantics require a reversible archive; otherwise label the existing action as removal, not archive. No archive UI exists. | **Current:** no independent archive endpoint; `DELETE` performs the combined soft lifecycle transition. | **Current:** `archived_at` and invariant `deleted_at IS NULL OR archived_at IS NOT NULL`. | **Target:** prove active-query exclusion and saved/content preservation; archive-only restore behavior is out of scope until approved. | **Partial — lifecycle storage exists; separate archive unresolved** |
| Delete deck | **Current:** owner/version-guarded child-first soft removal in `library.service.ts`/repository; active children cause `409`. | **Target:** destructive confirmation with exact non-cascade copy, pending/error/conflict states, and deterministic focus return; no delete UI exists. | **Current:** `DELETE /v1/library/decks/:deckId?expectedVersion=...`. | **Current:** sets deck `archived_at` + `deleted_at`; because no row is hard-deleted, the membership FK cascade is not triggered and membership/saved/content rows remain. | **Current:** child-first service and guarded PostgreSQL lifecycle tests. **Target:** add stale-version, owner isolation, membership/content preservation, rollback, and frontend confirmation tests. | **Partial — backend safe soft delete; frontend/evidence missing** |

### Minimal implementation tasks (product code not part of this documentation change)

| ID | Scoped task | Exact change / non-scope | Acceptance evidence |
|---|---|---|---|
| LL-S01 | Library UI redesign baseline | Refine the existing Library screen and deck panel using the current stack; preserve browse/filter behavior and all explicit async/partial states. Do not touch Recognition or introduce an external provider. | Keyboard and focus walkthrough; 320 px through desktop layout, 200% zoom, reduced motion, screen-reader names/status; existing frontend tests remain green. |
| LL-S02 | Complete ordering UI | Add sibling drag/drop and a keyboard-equivalent reorder that calls the existing rebalance API with library version; rollback/reload on failure or `409`. | Reorder persists after reload; invalid/cross-tree/depth moves are rejected; deterministic component tests cover success, conflict, and rollback. |
| LL-S03 | Add non-recognition save UI | Save only a selected, already sourced active `contentItemId`; support deck pick/create and provenance, pending, duplicate retry, error, and committed success. | No success before server commit; duplicate save/membership is idempotent; failure retains selection/context; no image/ink or recognition dependency. |
| LL-S04 | Complete deck management UI | Add rename/description editing and delete confirmation; retain existing create/move. Describe delete as child-first soft deck removal that preserves saved/content records. Do not add hard delete, cascade content deletion, or restore/archive UX without a decision. | Empty/trim/length validation, cancel/focus return, stale-version conflict reload, child-first error, and preserved items are covered. |
| LL-S05 | Close backend contract gaps | Keep existing routes and stack; harden only missing owner/version/transaction behavior and response/error consistency discovered by tests. Do not add content-provider ingestion or Recognition routes. | Unit/route/integration evidence covers owner isolation, invalid IDs, idempotent save, stale versions, rebalance rollback, and deletion preservation. |
| LL-S06 | Add focused test evidence | Extend backend unit/guard tests, guarded PostgreSQL integration, and frontend component tests for LL-S02..LL-S05. Browser/manual accessibility evidence remains explicit rather than inferred from unit tests. | All commands below pass; integration runs only against an explicitly disposable database whose name ends in `_test`; results and remaining manual gaps are recorded in the next work-log entry. |

### Batch implementation status (2026-09-29)

- **LL-S01 — Current, implemented; validation incomplete:** the KotoBase-inspired responsive two-pane Library, sticky Ink Desk header, accessible deck tree, search/filter/results, and removal of developer-preview dominance/fake flows are present. Component tests and build pass; full interactive desktop/mobile keyboard, zoom, assistive-technology, and persisted browser validation remain blocked.
- **LL-S02 — Target, not completed by this batch:** sibling drag/drop and keyboard-equivalent reorder UI remain to be implemented and validated; the existing create/move flow does not satisfy ordering completion.
- **LL-S03 / LL-006 — Current, implemented within the bounded non-Recognition contract; validation incomplete:** known active `contentItemId` save supports manual/import/reference provenance, optional deck membership, duplicate-safe behavior, eligibility errors, notices, and reload. Unit/component evidence passes; PostgreSQL integration is **BLOCKED/NOT RUN** because `TEST_DATABASE_URL` is missing.
- **LL-S04 / LL-005 deck lifecycle subset — Current, implemented; validation incomplete:** focused root/child create, rename, description edit, parent move, expected-version conflict refresh, and confirmed owner/version-guarded child-first soft archive/delete are present with explicit no-cascade/content-preservation wording. Drag/drop ordering remains Target. PostgreSQL integration and complete persisted browser CRUD evidence remain blocked.
- **LL-S05 — Current, implemented for discovered save/deck gaps; validation incomplete:** active-content eligibility, owner/version guards, duplicate-safe save, and child-first deletion checks are covered by service/repository code and unit tests. Live transaction and persistence behavior is not promoted to passed without the guarded database run.
- **LL-S06 — Partial:** backend typecheck, lint, unit (22/22), build, and guard (3/3), plus frontend typecheck, lint, tests (10/10), and build passed. The built shell returned HTTP 200. Database integration is **BLOCKED/NOT RUN** due missing `TEST_DATABASE_URL`; interactive CDP and live DB-backed browser flows were blocked.
- **Database safety — Current:** no database integration command was run without an approved disposable URL. The next run must use `TEST_DATABASE_URL` whose parsed database name ends exactly `_test`; no application database result is claimed.
- **Recognition freeze — Current:** this batch did not implement or modify Recognition or connect it to save. LL-007 and LS-FR-005 remain blocked/future/frozen.

### Acceptance boundaries

1. Browse/search continue to operate only on persisted, active, owner-scoped records and never silently query an external provider.
2. Hierarchy supports the selected depth/cycle rules; ordering and all mutations survive reload and resolve version conflicts without false success.
3. Save accepts only an existing active `contentItemId`, preserves provenance, and is transactionally idempotent for saved items and deck membership.
4. Create/update/delete UI is keyboard operable and exposes loading, error, conflict, and completion states. Rename/description are editable; deletion requires explicit confirmation.
5. Deck deletion is child-first soft lifecycle only and does not delete saved items or content. No cascade or hard-delete semantics may be invented.
6. The unresolved external/content-source and licensing limitation is reported as a bounded input limitation, not used to block work on already sourced records.
7. Recognition remains future/frozen and the scoped diff contains no Recognition product-code, contract, schema, dependency, or test changes.

### Validation commands for the implementation phase

Run from the indicated package/repository directory and record exact results; these commands are acceptance requirements, not claims that this documentation-only task ran them.

```text
backend: npm run typecheck
backend: npm run lint
backend: npm run test:unit
backend: npm run test:guard
backend: npm run build
backend integration: set TEST_DATABASE_URL to a disposable PostgreSQL database whose name ends in _test, then run the package integration-test command
frontend: npm run typecheck
frontend: npm run lint
frontend: npm test
frontend: npm run build
repository root: git diff --check
repository root: git status --short --branch
```

## Ordered tasks
| ID | Task | Acceptance/evidence |
|---|---|---|
| LL-001 | Validate domain invariants and lifecycle | Library/deck/item/membership conceptual model reviewed; archive/delete impact explicit |
| LL-002 | Approve repository and mutation contracts | Version/nullability/errors/idempotency/concurrency/auth/deletion examples and contract tests |
| LL-003 | Prepare versioned storage migration and rollback | Dry-run on fixtures; compatibility, backup/restore and deletion implications recorded |
| LL-003A | Implement reference-content publish boundary | Enforce only metadata/cardinality rules declared by the selected content profile/import policy; accept partial metadata and arbitrary/non-uniform course structures when policy allows; retain N3 11×80/880 as an optional fixture; prove transaction rollback and idempotent import |
| LL-004 | Implement library/deck read states | Search/filter/sort/reset, counts, empty/loading/partial/error/offline/freshness and keyboard evidence |
| LL-005 | Implement nested deck mutations and drag/drop persistence | Trim/empty validation; valid nest/move/reorder; keyboard alternative; optimistic version conflict; cross-library/cycle/depth rejection; child-first archive/delete; reload consistency |
| LL-006 | Implement item detail and membership mutation from supported non-recognition sources | Partial metadata safe; provenance visible; multi-deck and duplicate retry idempotent |
| LL-007 | **Future/frozen:** implement Recognition → Save handoff | Requires available Recognition integration; immutable confirmed candidate/item reference; deck select/create; context retained on failure; no image/ink copied. Not part of Library Core entry/exit gate |
| LL-008 | Implement user data view/delete controls | Scope and irreversible effects match approved policy; auditable outcome without leaking content |
| LL-009 | Cross-functional validation and rollout | A1/A6/A7/A8, migration/rollback, auth and observability evidence |

## Discipline considerations
- **FE/UX:** shell → library list → deck/detail → save sheet; no success before commit; destructive dialogs restore focus.
- **BE/data:** canonical dedupe, unique membership, atomic tree move/reorder under per-library lock, optimistic versioning, provenance, safe partial records and migration.
- **QA:** valid nesting/reorder, concurrent move, cross-library parent, cycle, depth 8/9, child-first archive/delete, double-submit/reload/offline/partial matrices.
- **Security/privacy/ops:** object authorization, input limits, shared-device cache, retention/backup deletion, redacted logs and recovery runbook.

## Completion gates

- **Library Core:** LS-FR-001..004 and applicable LS-FR-015..019 map to passing tests within the documented safe boundary; persisted state survives reload under the scoped model; supported non-recognition save is idempotent; hierarchy/order and approved deck archive/delete behavior are verifiable; rollback passes. Recognition and LS-FR-005 are explicitly excluded from this gate.
- **Future Recognition → Save:** after Recognition integration exits its own gates, LS-FR-005/A1 must prove immutable confirmed-candidate handoff, idempotent save, retained failure context, and no image/ink copy. Until then it remains **Blocked/future/frozen**, without changing Library Core readiness.

## Merged Stage 1–3 implementation decision

**Decision:** owner yêu cầu triển khai Platform + Library cùng lần này trên backend mới; source frontend và backend cũ đã bị xóa trước tác vụ. Library phải bám đúng `owner_scope`, `library`, `deck`, `saved_item`, `deck_membership` của `db/migrations/0001_init.sql`, mọi query owner-scoped, mutation tree dùng transaction + per-library advisory lock + optimistic version. Route chỉ parse/map/dispatch; SQL nằm trực tiếp trong các use case có ý nghĩa (`get-library`, `save-item`, `create-deck`, `update-deck`, `rebalance-decks`, `delete-deck`), không dựng tầng service/repository cố định. Runtime DB/concurrency evidence vẫn **Blocked** nếu không có `backend/.env`/`TEST_DATABASE_URL` an toàn; unit test hierarchy và non-DB app smoke vẫn phải chạy.

## Merged Stage 1–3 implementation evidence — 2026-09-29

**Current (Partial):** Backend mới triển khai route mỏng và các use case `get-library`, `save-item`, `create-deck`, `update-deck`, `rebalance-decks`, `delete-deck`, cùng pure `deck-hierarchy`. Query/mutation đều scope bằng `owner_id`; tree mutations dùng transaction, per-library PostgreSQL advisory lock và optimistic version. Save dedupe dựa trên unique schema, membership conflict no-op và idempotency record. Không có frontend hoặc recognition path nào được tạo/chạm.

**Validation:** strict typecheck/structural lint/build pass; 4 hierarchy tests (depth 8, depth 9, cycle, subtree depth) và 2 app smoke/capability tests pass. Integration test có safety guard nhưng skip vì thiếu safe `TEST_DATABASE_URL`; do đó persistence, concurrent two-connection behavior và migration runtime vẫn **Blocked**, không claim LL/Stage 3 Completed. Exact behavior cũ không thể chứng minh vì source cũ đã bị owner xóa; contract được bảo toàn theo tài liệu là **Assumption**.

## Current implementation evidence â€” 2026-09-29 continuation

**Current (Partial):** Backend includes owner-scoped, versioned deck mutations and guarded parent moves. Two-connection tests now cover serialized cycle prevention, depth-nine rejection, and cross-owner parent rejection; the React library remains API-backed with optimistic rollback.

**Current validation evidence:** Backend typecheck/lint/build and four explicit non-DB test files (8 tests) pass; frontend TypeScript/build/lint pass. Library schemas, repository, service, routes, frontend API, tree, and view are separated; nine route files contain no SQL/database execution. `TEST_DATABASE_URL` was not set, so deck concurrency and migration/integration checks were not rerun and are not claimed passed. This is not release completion: disposable-DB validation, drag/drop and full browser/AT/zoom evidence, deployment-role grants, rollback/restore, and privacy/retention/release gates remain.

## Final independent validation evidence — 2026-09-29

**Current (Partial):** Browse Library, Search/filter Library, and the create/move hierarchy path have independent static/unit/build evidence across the owner-scoped repository/service/API and React screen. Review verified active-content and active saved-item/deck exclusions, typed DTOs, sort-bound cursor validation, partial/offline/error UI states, and keyboard-operable create/move controls. Saved-date cursor parsing was tightened to require an ISO datetime and covered by a regression test. Recognition and Recognition → Save were not modified by this validation unit.

**Validation/blockers:** Backend typecheck, structural lint, 18 unit tests, build, and all 3 database-safety guard tests pass; frontend typecheck, lint, 11 tests, and build pass; `git diff --check` passes. PostgreSQL integration was deliberately **NOT RUN/BLOCKED** because `TEST_DATABASE_URL` is absent, so live Kysely/PostgreSQL semantics, persistence/reload, concurrency/advisory locking, migration/rollback, and full LL-005 completion are not claimed. Drag/drop ordering, automated accessibility scanning, manual browser/AT/zoom evidence, and archive/delete frontend flows also remain outside the three validated UI paths.
