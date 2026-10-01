# Plan SR — SRS and review engine

## Purpose and coverage
Deliver deterministic due scheduling, review sessions and card controls. Covers LS-FR-010..012, 014..016 and A4/A6/A7.

## Prerequisites
LL completion; the selected versioned Anki-style SM-2 family contract fully specified and validated; authority clock, day/DST semantics, interval/ease constants, learning/relearning steps, limits, undo/bury/leech policy, offline/conflict, scheduler migration and golden fixtures approved under remaining LS-OD-05/06 gates. This selection does not claim exact Anki parity. The immutable-ledger/current-state split in the Target [database design](../database-design.md) and DB-010 in [Plan DB](./database-implementation-plan.md) are reference inputs, not Current implementation.

## Ordered tasks
| ID | Task | Acceptance/evidence |
|---|---|---|
| SR-001 | Freeze scheduler rule specification/version | Inputs/outputs/invariants and unresolved features explicitly excluded |
| SR-002 | Implement pure scheduler with golden fixtures | Every phase/rating, clamp/rounding, boundary and preview uses same function |
| SR-003 | Define atomic rating transaction and audit log | reviewId idempotency, expected state version, before/after, conflict/refetch tests |
| SR-004 | Implement due-queue query/order/limits | Fixed-clock tests: relearning/learning before review, then new under approved limit |
| SR-005 | Build review setup/card/reveal/rating UI | Ratings only after reveal; interval previews exact; keyboard 1–4 guarded in inputs |
| SR-006 | Build resume and conflict/offline recovery | Committed ratings not repeated; safe disable or approved queue; freshness explicit |
| SR-007 | Add suspend/reset and conditional undo | Confirmed effects; ReviewLog retained; undo omitted/disabled unless policy approved |
| SR-008 | Validate time-zone/DST/concurrency/migration | Property/golden/integration tests and old-version replay/reconciliation evidence |
| SR-009 | Operationalize rollout/rollback | Scheduler flag/control TBD, monitoring, stop writes on integrity risk, rollback without history rewrite |

## Cross-functional considerations
FE never estimates previews. BE/data enforce authorization, atomicity and append-only audit. QA uses injected clocks, duplicate delivery and concurrent clients. Security checks replay/tampering. Accessibility covers reveal, shortcuts, live announcements and focus. No image/ink enters review logs.

## Completion gate
A4 passes for every rating/phase; duplicate/conflict cannot double-apply; queue ordering and resume are deterministic; migration/rollback are rehearsed; state/error/a11y matrices pass. Until prerequisites close, implementation is **Blocked**, not approximated client-side.

## Current implementation evidence â€” 2026-09-29 continuation

**Current (Partial):** Backend provides deterministic due ordering, versioned/idempotent rating, event pagination, and concurrent conflict protection. React SRS now loads/resumes the server due queue, requires reveal before rating, submits Again/Hard/Good/Easy as 1–4, supports keyboard 1–4, and reloads after conflicts.

**Current validation evidence:** Backend typecheck/lint/build and four explicit non-DB test files (8 tests), including deterministic scheduler tests, pass; frontend TypeScript/build/lint pass. SRS schemas, repository, service, routes, scheduler, frontend review hook, states, and view are separated. `TEST_DATABASE_URL` was not set, so concurrent persistence and migration checks were not rerun and are not claimed passed. This is not release completion: approved scheduler constants/time policy, disposable-DB validation, browser/AT/zoom evidence, offline/conflict UX, migration rollback, deployment-role grants, and privacy/release gates remain.
