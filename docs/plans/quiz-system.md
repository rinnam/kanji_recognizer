# Plan QZ — Quiz system

## Purpose and coverage
Deliver meaning recall and reading input with explainable, versioned scoring isolated from SRS. Covers LS-FR-008..009, 015..016 and A3/A6/A7.

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
Known fixtures score identically by version; feedback is explainable; retry creates a distinct attempt; quiz never rates SRS; all state and accessibility evidence passes. **Blocked** while mode/normalization/content decisions are open.
