# Plan PF — Platform foundation and contracts

> Target/Proposed plan. [PRD](../prd.md) is canonical; see [master roadmap](../implementation-roadmap.md).

## Purpose and coverage
Create the decision, contract, state and evidence seams that let recognition and learning ship without invented infrastructure. Covers FR-007..010, NFR-001..005 and LS-FR-015..017 cross-cutting.

## Prerequisites
Canonical baseline; repository inventory; PRD [Open questions](../prd.md#16-open-questions--decision-log) and [Learning unresolved decisions](../prd.md#1817-unresolved-decisions). No backend, identity, storage, API or technology is assumed.

## Ordered tasks
| ID | Task | Output/evidence | Dependency |
|---|---|---|---|
| PF-001 | Record Current/Target/Blocked baseline and capability matrix | Reviewed matrix linked to source/evidence | None |
| PF-002 | Create decision register and stop conditions | Each PRD/LS-OD dependency mapped to slice; unresolved stays open | PF-001 |
| PF-003 | Define conceptual boundaries and contract review checklist | Recognition, repository, scheduler, events and deletion boundaries; examples/version/error/idempotency rules | PF-002 |
| PF-004 | Define data classification/provenance inventory | Image/ink, metadata, library, behavioral events, identifiers; allowed purpose/retention TBD marked | PF-002 |
| PF-005 | Define shared UI state and capability model | loading/empty/partial/error/offline/success, freshness and truthful disabled states | PF-001 |
| PF-006 | Define test/evidence taxonomy | Unit/golden/contract/integration/E2E/manual/a11y/security/migration evidence template | PF-003 |
| PF-007 | Review operability and change safety | Versioning, migration, observability, rollout/rollback questions and runbook skeleton | PF-003..006 |

## Discipline considerations
- **Frontend/UX:** view models cannot imply persistence; focus/live status and responsive variants accompany each state.
- **Backend/data:** contracts remain proposals until approved; validate boundaries, authorization, concurrency, provenance and deletion.
- **ML:** artifact lineage, reproducibility, domain fit and model/contract compatibility gate recognition.
- **QA:** fixed fixtures, negative paths and evidence naming are established before feature coding.
- **Security/privacy/ops:** threat model, minimization, redaction, retention, backup deletion, telemetry and incident paths are gated decisions.

## State, errors, accessibility and privacy
Every capability exposes availability and freshness. Retry is idempotent by contract. No prohibited payload in logs/evidence. Keyboard, AT, zoom and reduced-motion expectations derive from NFR-001 and PRD §18.12; target/audit evidence remains unverified until run.

## Acceptance and completion gate
- Every downstream task can name its contract and decision prerequisites.
- No placeholder endpoint/schema/technology is presented as settled.
- Cross-cutting state and evidence templates cover success and failure.
- Privacy/security/operations questions have explicit launch stop conditions.

**Blocked by:** missing governance/approvers may prevent approval, but PF-001/002 inventory is unblocked. **Complete when:** PF-001..007 outputs are reviewed and R0 exit gate in the roadmap passes.
