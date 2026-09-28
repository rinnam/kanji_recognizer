# Plan RP — Recognition pipeline

> Preserves the recognition plan [FE-WS0..5](../frontend-implementation-plan.md); it does not claim a real model/service exists.

## Purpose and requirements
Deliver a truthful, safe path from draw/upload through ranked candidates and confirmed selection. Covers FR-001..010 and NFR-001..005.

## Prerequisites
PF-001/005/006. Real integration additionally requires approved API/error/privacy contracts, backend readiness, model artifact provenance/reproducibility/domain-fit evidence and applicable PRD §16 decisions.

## Ordered tasks
| ID | Task | Main disciplines | Acceptance/evidence |
|---|---|---|---|
| RP-001 | Capture Current fixtures and known defects | FE/QA | Draw/upload/result/history baseline and undo defect reproduced |
| RP-002 | Make mock/demo status unambiguous | FE/UX/QA | FR-010 content/config checks; no production mock ambiguity |
| RP-003 | Correct input lifecycle and validation | FE/security/QA | Single-stroke undo, clear, file reset/object URL cleanup, duplicate/race/late-response tests |
| RP-004 | Complete accessible/responsive input and result states | FE/UX/QA | Keyboard/touch/AT/zoom matrix; canvas alternative; stable focus/status |
| RP-005 | Freeze proposed recognition contract through review | BE/FE/ML/security | Version, validation, error categories, cancellation, privacy and artifact compatibility approved; no invented endpoint |
| RP-006 | Establish reproducible model/service evidence | ML/data/ops/QA | Artifact lineage/license/integrity, fixed evaluation set, limitations and rollback candidate |
| RP-007 | Implement service boundary and mappings | FE/BE | Contract tests; malformed/empty/timeout/error/cancel paths; candidate order semantics |
| RP-008 | Validate end-to-end and operability | All | Real-service E2E, redacted observability, load/performance evidence against approved criteria, rollout/rollback rehearsal |

## Data/state/error handling
Image/ink lifecycle follows approved policy and is not copied into learning records. States include idle, invalid, loading, success, empty, partial/malformed, retryable/fatal, canceled and stale result. Candidate confidence is not correctness; user confirmation is required before save.

## Accessibility/privacy/testing
All essential flows work without drawing and without pointer-only interaction. Validate file content/limits, avoid image payloads in logs/analytics, and test race/idempotency. ML quality metrics, datasets and thresholds remain TBD until approved.

## Blockers and completion gate
RP-001..004 may proceed from Current evidence. RP-005..008 are **Blocked** without contract/model/privacy/backend gates. Complete when frontend Gates A–F applicable to recognition pass, FR/NFR traceability has evidence, and service/model rollback is demonstrated for any real integration.
