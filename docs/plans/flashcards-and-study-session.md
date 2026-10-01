# Plan FC — Flashcards and study session

## Purpose and coverage
Deliver the selected Active Recall, Focus Recall, and non-scheduling Flashcard practice without silently invoking SRS. Covers LS-FR-006..007, 015..016 and system acceptance A2/A6/A7.

## Prerequisites
LL completion; trustworthy eligible metadata; approved session persistence/offline policy. Batch size, repeat cap and auto-advance remain open and must not be guessed.

## Ordered tasks
| ID | Task | Acceptance/evidence |
|---|---|---|
| FC-001 | Specify versioned card/view model and eligibility | Missing fields, template/provenance and empty-deck behavior reviewed |
| FC-002 | Specify session snapshot and deterministic order | Scope, ordered IDs, cursor, optional shuffle seed and resume semantics testable |
| FC-003 | Build setup/empty/loading/error states | Deck/filter selection and item count truthful; local/mock capability labeled |
| FC-004 | Build front/reveal/back interaction | One prompt; deliberate reveal; answer/metadata after reveal; no pre-reveal classification |
| FC-005 | Add Know/Review again/skip loop | Again returns only per approved rule; skip distinct; no SRS ReviewLog |
| FC-006 | Add pause/resume/restart/summary | Stable cursor/order; recovery does not duplicate classification; abandonment semantics explicit |
| FC-007 | Validate accessibility/responsive/privacy | Keyboard/AT/touch/zoom/reduced-motion; no raw answer/content telemetry unless approved |
| FC-008 | Run integration and regression suite | Deterministic fixtures, reload/offline/error, library mutation interaction and A2 evidence |

## Frontend/backend/data/testing considerations
Frontend integration order is setup → shell → reveal → classify → resume → summary. Backend is needed only if the approved persistence contract requires it. Session records keep minimum identifiers/version/cursor; they do not duplicate learning item truth. Test interruption at every transition and stale/deleted items.

## Completion gate
Session order/resume is reproducible, answer is inaccessible before reveal in UI behavior, classifications never alter SRS, all state variants recover truthfully, and FC-001..008 evidence passes. **Blocked** if session/offline semantics or metadata eligibility is unresolved.

## Current implementation evidence â€” 2026-09-29 continuation

**Current (Partial):** Backend now includes owner-scoped, versioned deck archive/delete/rebalance and guarded parent moves; published course-to-library save; study fetch/resume, Again requeue and latest-event undo; idempotent/concurrent SRS rating plus event pagination; quiz fetch/completion/retry-missed; and incremental progress writes with rebuild retained. React course, deck, study and quiz actions call these APIs, expose live status, keyboard controls, and optimistic rollback for deck mutations.

**Current validation evidence:** Backend typecheck/lint/build and four explicit non-DB test files (8 tests) pass; frontend TypeScript/build/lint pass. The refactor separates study schemas, repository, service, routes, API, hooks, states, and views. `TEST_DATABASE_URL` was not set, so database integration/migration checks were not rerun and are not claimed passed. This is not release completion: disposable-DB validation, browser/AT/zoom evidence, deployment-role grants, and privacy/retention/release gates remain.
