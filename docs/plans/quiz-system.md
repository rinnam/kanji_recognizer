# Plan QZ — Quiz system

## Purpose and coverage
Deliver the selected Typing Quiz for meaning and reading input with explainable, versioned, IME-safe scoring isolated from SRS. Covers LS-FR-008..009, 015..016 and A3/A6/A7.

## Prerequisites
LL completion; content/source quality accepted; LS-OD-04 resolved for MVP mode and accepted answers; locale implications from LS-OD-10 reviewed. Drawing-production quiz remains deferred.

## Ordered tasks
| ID | Task | Acceptance/evidence |
|---|---|---|
| QZ-001 | Approve quiz modes, eligibility and content QA | Scope and exclusions; no fabricated distractors/answers |
| QZ-002 | Specify versioned normalization/scoring | NFKC, trim, whitespace, kana equivalence plus approved romaji/okurigana/multi-answer policy |
| QZ-003 | Define attempt/session snapshot | Scope, ordered questions, answer version, timestamps and reproducible score |
| QZ-004 | Build setup and availability states | Deck/scope/count; empty/ineligible/partial/loading/error/offline truthfully represented |
| QZ-005 | Build question/submit/feedback | Explicit submit; answer locks; accepted variants and explanation shown; confidence unused |
| QZ-006 | Build summary and retry missed | New attempt created; original remains auditable; no SRS mutation |
| QZ-007 | Add keyboard/AT/mobile and safe recovery | Input shortcuts safe; focus/status predictable; unsubmitted answer preserved only when policy allows |
| QZ-008 | Validate scoring and integration | Golden normalization fixtures, content review, reload/error/offline, A3 and regression evidence |

## Privacy/security/data
Do not send raw answers in analytics by default. Validate answer lengths/encoding, authorize attempt access, version rule/content provenance, and define retention/deletion under LS-OD-08.

## Completion gate
Known fixtures score identically by version; feedback is explainable; retry creates a distinct attempt; quiz never rates SRS; all state and accessibility evidence passes. **Blocked** while accepted-answer normalization/content gates remain open; Typing Quiz selection alone does not make implementation Current.

## Current implementation evidence â€” 2026-09-29 continuation

**Current (Partial):** Backend now includes owner-scoped, versioned deck archive/delete/rebalance and guarded parent moves; published course-to-library save; study fetch/resume, Again requeue and latest-event undo; idempotent/concurrent SRS rating plus event pagination; quiz fetch/completion/retry-missed; and incremental progress writes with rebuild retained. React course, deck, study and quiz actions call these APIs, expose live status, keyboard controls, and optimistic rollback for deck mutations.

**Current validation evidence:** Backend typecheck/lint/build and four explicit non-DB test files (8 tests) pass; frontend TypeScript/build/lint pass. Quiz schemas, repository, service, routes, scoring, frontend API, hook, states, and view are separated. `TEST_DATABASE_URL` was not set, so database integration/migration checks were not rerun and are not claimed passed. This is not release completion: disposable-DB validation, browser/AT/zoom evidence, deployment-role grants, and privacy/retention/release gates remain.
