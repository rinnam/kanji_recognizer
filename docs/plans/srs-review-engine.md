# Plan SR — SRS and review engine

## Purpose and coverage
Deliver deterministic due scheduling, review sessions and card controls. Covers LS-FR-010..012, 014..016 and A4/A6/A7.

## Prerequisites
LL completion; scheduler defaults validated; LS-OD-05/06 resolved; authority clock, day/DST semantics, limits, undo policy, offline/conflict, scheduler migration and version policy approved.

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
