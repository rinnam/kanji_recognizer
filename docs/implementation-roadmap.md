# Lộ trình triển khai toàn sản phẩm — Kanji Recognizer

> **Trạng thái:** kế hoạch Target/Proposed, không phải bằng chứng implementation. [PRD](./prd.md) là canonical; [Learning Experience UI Skill](./skills/learning-experience-ui-skill.md) là nguồn chỉ dẫn UI learning. Mô hình dữ liệu Target nằm tại [database design](./database-design.md), DDL tham chiếu tại [database schema](./database-schema.sql), và thứ tự triển khai có gate tại [Plan DB](./plans/database-implementation-plan.md). Không có ngày, owner, endpoint, schema hay công nghệ nào được kế hoạch này mặc nhiên phê duyệt; triển khai DB vẫn bị chặn bởi các `LS-OD-*` áp dụng.

## 1. Nguyên tắc lập kế hoạch

1. Giữ tách biệt **Current**, **Target/Proposed**, **Blocked**, giả định và quyết định mở.
2. Đi theo lát cắt dọc nhỏ, có demo thật và rollback được; contract trước integration.
3. Không gọi mock/local prototype là persistence, inference hay sync thật.
4. Privacy, accessibility, observability, migration và test là đầu ra của mỗi slice, không để cuối.
5. Chỉ chuyển trạng thái khi có evidence tái lập; build xanh không tự chứng minh UX, bảo mật hoặc correctness.
6. PRD quyết định *what/why*; roadmap và [các plan](./plans/) quyết định thứ tự/gate; không định nghĩa lại intent.

## 2. Phạm vi và truy vết

| Dòng giá trị | Requirement canonical | Plan chi tiết |
|---|---|---|
| Nền tảng/contract | FR-007..010; NFR-001..005; LS-FR-015..017 | [Platform](./plans/platform-foundation-and-contracts.md), [Quality/release](./plans/quality-security-and-release.md) |
| Recognition (future/frozen) | FR-001..010; NFR-001..005 | [Recognition pipeline](./plans/recognition-pipeline.md) |
| Library Core | LS-FR-001..004, 015..019 | [Learning data/library](./plans/learning-data-and-library.md) |
| Recognition → Save (future/frozen integration) | LS-FR-005, 015..017 | [Learning data/library](./plans/learning-data-and-library.md); depends on Recognition integration and Library Core, but neither Recognition nor this handoff is a prerequisite for Library Core |
| Flashcard | LS-FR-006..007, 015..016 | [Flashcards](./plans/flashcards-and-study-session.md) |
| Quiz | LS-FR-008..009, 015..016 | [Quiz](./plans/quiz-system.md) |
| SRS/review | LS-FR-010..012, 014..016 | [SRS](./plans/srs-review-engine.md) |
| Progress | LS-FR-013, 015..017 | [Progress](./plans/progress-and-analytics.md) |

Cross-cutting LS-FR-015..017 are verified in every applicable slice and at release. Canonical details remain in [PRD §18](./prd.md#18-learning-system--targetproposed-bounded).

### 2.1 Explicit Learning System traceability

| Requirement | Primary plan/slice |
|---|---|
| LS-FR-001 | LL / L1 deck lifecycle |
| LS-FR-002 | LL / L1 membership and idempotent save |
| LS-FR-003 | LL / L1 library query/filter/sort |
| LS-FR-004 | LL / L1 item detail and partial metadata |
| LS-FR-005 | LL / L1R Recognition → Save (future/frozen; requires R2 + L1 Core) |
| LS-FR-006 | FC / L2 flashcard snapshot/reveal/resume |
| LS-FR-007 | FC / L2 practice classification isolated from SRS |
| LS-FR-008 | QZ / L3 quiz modes/session/summary |
| LS-FR-009 | QZ / L3 scoring and explainable feedback |
| LS-FR-010 | SR / L4 due queue |
| LS-FR-011 | SR / L4 reveal/rating/scheduler preview |
| LS-FR-012 | SR / L4 resume/idempotency/conflict |
| LS-FR-013 | PA / L5 progress semantics |
| LS-FR-014 | SR / L4 suspend/reset/audit preservation |
| LS-FR-015 | Every learning plan + QR state/error matrix |
| LS-FR-016 | Every learning plan + PF capability truthfulness |
| LS-FR-017 | LL and PA data controls + QR privacy release gate |

## 3. Dependency graph

```text
R0 Foundations/contracts ─> L0 Learning state prototypes ─> L1 Library Core
R0 Foundations/contracts ─> R1 Recognition baseline ─> R2 Recognition integration (future/frozen)
L1 Library Core + R2 Recognition integration ─> Recognition → Save (future/frozen)
L1 ─> L2 Flashcards ─┐
 └───────────────────┼─> L3 Quiz
L1 + scheduler decisions ─> L4 SRS/review ─> L5 Progress
All intended release slices ─────────────────> H1 Hardening ─> REL Release
```

Library Core does not depend on R1, R2, a recognition result, or Recognition → Save. It may proceed under a documented minimal local/single-owner, sourced-content, privacy-minimized contract while broader product-mode decisions remain open. Recognition requirements are not removed or weakened: R1/R2 and LS-FR-005 remain future/frozen until their model/service/provenance/privacy gates pass, after which the handoff integrates into the already-stable Library Core save contract.

## 4. Ordered delivery slices and gates

### Current delivery evidence (2026-09-29)

- **S0–S7 — Partial:** Backend learning capabilities are separated into feature-owned schema/repository/service/thin-route layers for content, courses, library, study, SRS, quiz, and progress, with cross-cutting database/error/idempotency support isolated. Frontend code is separated into app, recognition, learning feature, and shared API/type boundaries; the former monolithic learning API and large shell/views were decomposed.
- **Current validation:** backend `npm run typecheck`, `npm run lint`, `npm run build`, and four explicit non-DB Vitest files (8 tests) passed; frontend `npx tsc -b --pretty false`, `npm run build` (47 modules), and `npm run lint` passed. Structural searches found zero lint/TypeScript suppressions, broad `as any`/`as unknown` casts, stale `learningApi` files/references, direct `response.json()` calls in integration tests, or SQL/database execution in nine route files.
- **Current Clean Code review:** all 12 requested rules have positive structural evidence through feature naming/boundaries, thin routes, shared constants/helpers, typed parsing, deterministic explicit unit tests, formatting/lint success, and reorganized unit/integration/support tests. **Residual limitation:** `backend/src/modules/learning/library/repository.ts` remains 253 lines and merits later decomposition; passing static checks do not prove runtime database, browser, accessibility, security, privacy, or release correctness.
- **L1 Library audit/fix/localization batch — Partial:** **Current:** backend typecheck/lint/build passed, unit tests passed 22/22, database guard tests passed 3/3, and PostgreSQL integration passed 5/5. Frontend typecheck/lint/build passed and tests passed 19/19, including seven localization tests and UTF-8 checks across 19 files. The runtime chain `Vite /v1 proxy → Fastify → Kysely → PostgreSQL` passed against a disposable database, which was removed afterward. The Vite proxy targets `http://localhost:3000`; backend `start` was corrected to `dist/src/server.js`; frontend/backend package versions are `0.1.0`. Vietnamese localization, API error mapping, and accessible names/roles/live-state improvements are present. The arbitrary UUID Save form was removed.
- **Current safety incident (do not minimize):** an early runtime harness mistakenly targeted the application database and created four uniquely identified validation deck rows. They were immediately removed in a guarded transaction and verified absent. No content or saved-item rows were created. Later integration/runtime evidence used the disposable database.
- **Target:** interactive browser validation on desktop/mobile and keyboard remains **Partial** because no interactive browser/CDP session was attached. Save primary UI remains absent because there is no real eligible unsaved-content source; this is the exact source gap, not a backend or database failure. **Assumption:** no approved source exists elsewhere outside the inspected repository/runtime evidence. Recognition and Recognition → Save remain frozen and were not implemented or modified.

#### Final six-feature evidence matrix

| Feature | Code | Unit test | Integration | Runtime FE→BE→DB | UI | Status |
|---|---|---|---|---|---|---|
| Browse Library | Implemented | Passed | Passed | Passed | Component passed; interactive viewport pending | **Partial** |
| Search/filter | Implemented | Passed | Passed | Passed | Component passed | **Integration-tested / Runtime-tested** |
| Deck hierarchy | Implemented | Passed | Passed | Passed | Tree UI passed | **Integration-tested / Runtime-tested** |
| Save item | Backend implemented; UUID form removed | Passed | Passed | Passed | **Blocked:** no primary action without a real eligible unsaved-content source | **Partial / Blocked UI source** |
| Create/update deck | Implemented, including move/conflict/reload | Passed | Passed | Passed | Component passed | **Integration-tested / Runtime-tested** |
| Archive/delete deck | Implemented child-first; saved/content preserved | Passed | Passed | Passed | Component passed | **Integration-tested / Runtime-tested / Database-verified** |

All six rows are **Implemented** at their stated code boundary and **Unit-tested**. PostgreSQL integration 5/5 provides **Integration-tested** and **Database-verified** evidence; the proxy-chain run provides **Runtime-tested** evidence. Neither automated UI tests nor runtime HTTP evidence promotes interactive desktop/mobile/keyboard validation to complete.

| Slice | Entry gate | Cross-functional deliverables | Exit gate/evidence |
|---|---|---|---|
| **R0 — Foundations and decisions** | Canonical docs identified; Current baseline recorded | FE: app shell seams/state boundaries; BE/data: proposed contracts and invariants, not fabricated implementation; QA: test/evidence conventions; UX: IA/state inventory; security/ops: data classes, threat/telemetry/deployment questions | Decision log identifies unresolved items and stop conditions; contract examples/versioning and test strategy reviewed; no false Current claim |
| **R1 — Recognition safety** | R0 conventions; Current prototype reproducible | FE: FE-WS0..3; QA/UX: baseline, lifecycle, responsive/a11y evidence; security: input/privacy review | Gates A–D in [frontend plan](./frontend-implementation-plan.md); mock truthfulness proven |
| **R2 — Recognition service slice** | Approved recognition contract, backend/model reproducibility, provenance and privacy gates | FE adapter; BE inference boundary/error mapping; data/ML artifact lineage and evaluation; QA contract/E2E; ops observability/rollback | FE Gate E; fixed fixtures and real-service evidence; model/service rollback rehearsed. Otherwise **Blocked** |
| **L0 — Learning foundations/prototypes (LS0)** | R0; research scope and applicable LS-OD items recorded | UX/FE: IA, view models, complete state prototypes under UI skill; data/BE: conceptual invariants/contracts; QA: usability/a11y plan | Prototype is labeled local/mock; no fake persistence; LS1 decisions and evidence gaps explicit |
| **L1 — Library Core (LS1 core)** | PF capability truthfulness plus the minimal contract for each behavior; open decisions apply only to affected behavior per §6 and [Plan LL](./plans/learning-data-and-library.md). Recognition/R1/R2/LS-FR-005 are not prerequisites | FE browse/search/filter, non-recognition save, nested tree/detail/drag-drop + keyboard move; BE/data idempotent mutations, per-library serialized reorder and dedupe; QA hierarchy integrity and applicable A6/A8; security owner scope; ops scoped migration/rollback | LS-FR-001..004, 015..019 evidence for the selected core boundary; nesting/reorder reload consistency, duplicate retry, partial/error recovery and rollback demonstrated. Does not claim Recognition → Save |
| **L1R — Recognition → Save (future/frozen)** | L1 Library Core save contract stable **and** R2 Recognition integration exited; LS-FR-005 provenance/privacy requirements satisfied | Immutable confirmed candidate/item handoff, deck select/create, retained retry context, no image/ink copy | LS-FR-005 and A1 evidence. This slice remains required but cannot block L1 Library Core |
| **L2 — Flashcards (LS2a)** | L1 stable; eligible metadata and session persistence policy | FE session setup/reveal/classification/resume; BE/data only if approved contract requires; QA deterministic order/resume and A2; UX/a11y keyboard/screen-reader path | LS-FR-006..007, 015..016 pass; no SRS ReviewLog from practice |
| **L3 — Quiz (LS2b)** | L1; LS-OD-04 resolved; normalization/content provenance approved | FE setup/question/feedback/summary/retry; domain scoring rule/version; data content QA; QA A3 | LS-FR-008..009, 015..016 pass; reproducible scoring; quiz does not mutate SRS |
| **L4 — SRS/review (LS3a)** | L1; LS-OD-05/06 and clock/time-zone/offline/migration decisions resolved | Pure scheduler; atomic/idempotent rating; due queue/session UI; audit log; concurrency/DST/offline tests; operational migration | LS-FR-010..012, 014..016 and A4/A6/A7 pass; golden fixtures and duplicate/conflict evidence |
| **L5 — Progress (LS3b)** | Versioned event semantics; L3/L4 events trustworthy; LS-OD-07..09 and privacy decisions resolved | FE dashboard/no-data/table alternatives; data reconciliation/aggregates; QA A5/A8; security consent/minimization; ops freshness monitoring | LS-FR-013, 015..017 pass; metrics reconcile from fixtures; freshness/range/denominator shown |
| **H1 — Hardening/release** | Intended release slices exited; deferred scope documented | All disciplines close critical defects, performance/a11y/security/privacy checks, runbooks, migration and rollback rehearsal | [Quality plan](./plans/quality-security-and-release.md) completion gate and release DoD below |

## 5. First unblocked work

Select **R0** first: inventory decisions, contracts, data classes, state matrices and evidence conventions. In parallel, **R1** tasks that preserve Current behavior and require no invented service contract may proceed. **L0** prototype work is allowed only with mock/local labels. R2 and L1+ remain blocked until their explicit gates close.

## 6. Decision and blocker gates

| Gate | Must be decided/evidenced before |
|---|---|
| Identity/storage/sync and migration (`LS-OD-01`) | Account/cloud/hybrid claims, mode migration and production backup; not scoped single-owner local Library Core |
| Canonical item, metadata source/license/dedupe (`LS-OD-02`) | External lookup, seed/import, reference editing and new canonicalization; not browse/save of already sourced provenance-bearing records |
| Remaining deck naming/global-delete policy (`LS-OD-03`); nested/depth/child-first behavior is selected Target | Final duplicate-name enforcement and global item hard-delete; not selected hierarchy/reorder or child-first deck archive/soft-delete |
| Typing Quiz accepted-answer normalization (`LS-OD-04`) | L3 scoring implementation |
| Anki-style SM-2 constants/day/limits/undo/golden fixtures (`LS-OD-05`) | L4 |
| Time authority/offline/conflict (`LS-OD-06`) | L1 queued mutations and L4 ratings |
| Streak/time-zone (`LS-OD-07`) | L5 |
| Retention/export/deletion/consent/region (`LS-OD-08`) | Production launch, telemetry, export, account/global erasure and retention jobs; not privacy-minimized Library Core development/validation |
| Learning metric role (`LS-OD-09`) | L5 instrumentation/launch claims |
| Locale/display (`LS-OD-10`) | Any irreversible content/UI contract |
| Recognition API/model/data/provenance/SLO open decisions in PRD §16 | R2 |

An open decision is not an implementation assumption. Record selected option, rejected alternatives, approver and evidence when governance is established; owner/date remain TBD until assigned.

## 7. Migration, rollout and rollback

- Every persisted shape, scheduler rule and event contract is versioned; migration supports rehearsal on representative non-sensitive fixtures and documents forward/backward compatibility.
- Roll out by capability flag or equivalent approved control; the mechanism is TBD. Never expose navigation to unavailable destructive or mutation flows.
- Observe technical health and correctness separately from product metrics; thresholds/SLOs remain open until approved.
- Rollback order: stop new writes if integrity is uncertain, preserve append-only/audit evidence, restore compatible reader/service, reconcile pending operations, communicate freshness/availability truthfully.
- Model rollback keeps contract compatibility and artifact provenance. Scheduler rollback never silently recomputes committed history.
- Data rollback/restore and deletion obligations must coexist; backup retention behavior requires privacy approval.

## 8. Evidence package per slice

Required as applicable: requirement-to-test matrix; reviewed decision records; contract/schema examples and compatibility tests; unit/golden/property tests; integration/E2E results; keyboard/screen-reader/zoom/responsive report; security/privacy review; migration dry-run; observability screenshots/query output with redaction; usability findings; defect disposition; rollout/rollback rehearsal; updated Current/Target status. Evidence location and retention mechanism are TBD, but links must be reproducible and contain no prohibited data.

## 9. Risks

Primary risks are false readiness, recognition/model uncertainty, metadata/license errors, duplicate or lost writes, scheduler/time-zone defects, misleading progress, inaccessible canvas/charts, privacy leakage, offline conflict and scope expansion. Mitigate through gates above, pure/versioned domain rules, idempotency, provenance, explicit state UX, minimization, alternatives to visual interaction and stop-the-line on integrity/privacy/a11y failures.

## 10. Release definition of done

A release is done only when:

- selected scope and exclusions are named; all included FR/NFR/LS-FR map to passing evidence;
- no critical/high unresolved correctness, accessibility, security, privacy or data-integrity issue remains under the approved policy;
- Current claims match deployed behavior; mock/local/partial capabilities remain labeled;
- migrations, backup/restore where applicable, rollout and rollback are rehearsed;
- authorization, deletion/retention, telemetry minimization and consent/legal-basis decisions are approved;
- operational health, alert response and support/runbook paths are tested without inventing SLOs;
- cross-browser/device, keyboard, screen-reader, 200% zoom, reduced-motion and failure-state evidence exists for critical journeys;
- recognition quality/service evidence and learning reconciliation/scheduler evidence pass for included slices;
- open decisions that affect released behavior are closed; remaining ones are explicitly deferred and non-blocking;
- documentation, evidence index and release notes are updated, with no source status falsely promoted.

## Current merged Stage 1–3 backend evidence — 2026-09-29

**Current (Partial):** Backend foundation and the Library slice now exist in the owner-selected layered architecture. Implemented routes are `GET /v1/library`, `POST /v1/library/items`, `POST /v1/library/decks`, `PATCH /v1/library/decks/:deckId`, `PUT /v1/library/decks/rebalance`, and `DELETE /v1/library/decks/:deckId`; this `/v1` path is an explicit implementation assumption because no approved prior runtime survived. Health/capabilities remain available without a DB through app injection, and recognition is truthfully unavailable/deferred.

**Evidence:** install lockfile pins Fastify 5.12.5, TypeScript 7.0.2, `pg` 8.23.0, Kysely 0.29.6, Zod 4.6.5 and Vitest 5.0.2. Typecheck and build pass; hierarchy/service/app unit tests pass; the integration guard refuses `DATABASE_URL` equality and non-`_test` names. `backend/.env` is absent and `psql` is not on PATH, so live PostgreSQL integration remains blocked and no application data or migration was touched.

## Historical implementation evidence — superseded/unverified continuation

**Current (Partial):** The local learning vertical slices now include guarded migration/baseline handling, owner-scoped deck concurrency controls, API-backed study/SRS/quiz flows, and event-derived progress reconciliation. React SRS loads/resumes the due queue and submits revealed server-authoritative ratings.

**Evidence:** Backend typecheck/lint/build and seven files/18 tests pass on PostgreSQL 18, including disposable checksum/baseline/catalog comparison, two-connection deck cycle/depth, owner isolation, concurrent SRS replay, and incremental-vs-rebuild progress. Frontend lint/build pass. PostgreSQL 18 CLI tools were unavailable, so catalog equivalence—not normalized `pg_dump` text—is documented. Release remains blocked by rollback/restore, deployment-role, browser/accessibility, privacy/retention, operational, and approval gates.
