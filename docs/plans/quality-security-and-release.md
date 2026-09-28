# Plan QR — Quality, security and release

## Purpose and coverage
Provide cross-cutting assurance for all FR-001..010, NFR-001..005 and LS-FR-001..017 without treating test execution as product readiness.

## Prerequisites
Selected release scope, contracts and decisions; evidence taxonomy from PF-006. This plan runs throughout delivery, with a final hardening gate.

## Ordered tasks
| ID | Task | Acceptance/evidence |
|---|---|---|
| QR-001 | Build release traceability matrix | Every included requirement → task → test/evidence; deferred item rationale |
| QR-002 | Define risk-based test matrix | Unit/golden/contract/integration/E2E/manual across browsers/devices and failure states |
| QR-003 | Automate deterministic quality gates | Clean install/build/lint/test plus scheduler/scoring/contract fixtures; results reproducible |
| QR-004 | Execute accessibility audit | Keyboard, screen reader, focus/status, contrast, 200% zoom, touch, orientation, reduced motion, canvas/chart alternatives |
| QR-005 | Execute security/privacy review | Threat model, authz, validation, replay/idempotency, secrets/log redaction, minimization, retention/deletion/consent |
| QR-006 | Validate performance/resilience | Approved criteria only; timeout/cancel/retry/offline/conflict/partial/dependency failure; no invented SLO |
| QR-007 | Rehearse migrations and data recovery | Forward/backward cases, backup/restore, deletion implications, event/scheduler version compatibility |
| QR-008 | Prepare operations and support | Health signals, redacted diagnostics, alert/incident/runbook responsibilities remain TBD until assigned |
| QR-009 | Rehearse staged rollout and rollback | Capability control, stop conditions, model/service/data/scheduler rollback; integrity preserved |
| QR-010 | Run release review and archive evidence | Defect disposition, approvals, Current/Target audit, release notes and reproducible evidence index |

## Required state and abuse coverage
Empty/loading/error/partial/offline/success; duplicate and late requests; malformed/untrusted input; concurrent mutation; stale cache/version; unauthorized object access; deletion during session; clock/DST; telemetry failure. Destructive actions require confirmation and outcome; no test evidence may contain prohibited user data.

## Stop/release gates
Stop on unexplained data loss/corruption, double rating/save, unauthorized access, privacy leakage, inaccessible critical journey, false success/readiness claim, unreproducible model/scheduler/scoring result, or rollback failure.

Complete only when QR-001..010 pass for included scope and the [roadmap release definition of done](../implementation-roadmap.md#10-release-definition-of-done) is satisfied. Open launch-affecting decisions prevent release; they are not waived by a green build.
