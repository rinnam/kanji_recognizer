# Plan PA — Progress and analytics

## Purpose and coverage
Show truthful activity, recall, inventory, streak and forecast from committed events. Covers LS-FR-013, 015..017 and A5/A6/A7/A8.

## Prerequisites
Trustworthy versioned quiz/review/session events; LS-OD-07..09 and privacy/consent/retention decisions resolved; time-zone and freshness semantics approved. Targets/baselines/owners remain TBD.

## Ordered tasks
| ID | Task | Acceptance/evidence |
|---|---|---|
| PA-001 | Create metric dictionary | Formula, denominator, range, event source, exclusions, freshness and owner TBD marker |
| PA-002 | Approve event schemas and minimization | Version/dedupe key; no images, drawing, raw answers, deck names or character text by default |
| PA-003 | Build reconciliation fixtures | Activity, separate quiz/review accuracy, inventory, due forecast and streak across zones/DST |
| PA-004 | Implement aggregate/read boundary | Rebuild/reconcile from approved records; partial widget and stale-cache behavior |
| PA-005 | Build dashboard range and inventory states | No-data distinct from zero; loading/error/offline/freshness per widget |
| PA-006 | Build activity/recall/streak/forecast views | Neutral language; range/denominator visible; chart has table/text equivalent |
| PA-007 | Implement privacy controls | Consent where required, view/delete scope, retention and telemetry verification |
| PA-008 | Validate correctness/accessibility/operations | A5/A8 fixtures, AT/keyboard/zoom, aggregate monitoring and rebuild/rollback rehearsal |

## Cross-functional considerations
Frontend does not infer “mastered” or retention. Data jobs/queries and technology are not selected here. QA reconciles displayed values to event fixtures. Security restricts access and redacts telemetry. UX avoids punitive streak language and communicates unavailable/stale widgets.

## Completion gate
Every displayed number reconciles; review and quiz denominators stay separate; time zone/range/freshness are visible; no-data and partial states are truthful; accessible equivalents and deletion/consent evidence pass. **Blocked** until event and privacy semantics are approved.
