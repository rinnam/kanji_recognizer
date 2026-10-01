# Plan PF — Platform foundation and contracts

> Target/Proposed plan. [PRD](../prd.md) is canonical; see [master roadmap](../implementation-roadmap.md). The Target logical data model and gated execution sequence are defined in [database design](../database-design.md) and [Plan DB](./database-implementation-plan.md); neither closes an `LS-OD-*` decision.

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

## Owner execution decision — merged Stage 1–3

- **Decision:** owner phê duyệt gộp Stage 1, 2 và 3 trong lần này. Backend/frontend cũ đã bị owner xóa, nên Stage 1 là khởi tạo backend mới, không phải `git mv`; không khôi phục hoặc tạo frontend và không chạm recognition.
- **Current stack (machine/install verified):** Node.js 24.14.1, npm 11.11.0; installed lockfile versions are Fastify 5.12.5, TypeScript 7.0.2, `pg` 8.23.0, Kysely 0.29.6, Zod 4.6.5 and Vitest 5.0.2. Strict TypeScript checking is the configured lint-equivalent because a compatible TypeScript-aware ESLint stack was not established. `psql` is not on PATH and `backend/.env` is absent, so PostgreSQL 18 and live DB behavior remain unverified.
- **Target frontend only:** React 19.3.0 và Vite 8.3.1; không có frontend Current và lần này không tạo frontend.
- **Architecture (latest owner decision; supersedes the prior proposal):** Fastify does not mandate a universal folder layout. This project uses the conventional layered flow `Route -> Controller -> Service -> Repository -> Kysely -> PostgreSQL` and `backend/src/{config,controllers,services,repositories,models,routes,middlewares,validators,types,utils,constants}`, plus `app.ts` and `server.ts`. `modules`, `bounded-context`, `domain`, and `use-cases` are forbidden for this implementation.
- **Compatibility:** vì implementation cũ đã bị xóa, không thể chứng minh exact behavior. Chỉ bảo toàn contract có bằng chứng trong tài liệu; đây là **Assumption** cho tới khi contract/runtime integration được xác minh.

## Current Stage 0 evidence — 2026-09-29

- **PF-001 — Partial:** [`code-structure-proposal.md`](./code-structure-proposal.md) records a line-counted BE/FE working-tree inventory, while `GET /v1/capabilities` and `frontend/src/capabilities.ts` now expose a tested Current/Target/Blocked runtime matrix. Independent validation confirmed platform health/capability endpoints, runtime-dependent Library availability, a separately observable frontend, recognition blocked without an approved model/contract, and learning labeled local/mock with durable learning unavailable. This closes the scoped capability-surface implementation evidence only; PF-001 remains Partial because the broader baseline has not received governance review and R0 has not passed.
- **PF-002 — Partial:** the corrected proposal records four owner decisions about approval of the target tree, transaction primitive, identity/bootstrap ownership, and idempotency placement. It preserves API compatibility and stack assumptions, the exact Stage 0–15 sequence, feature-organized frontend without a fixed subfolder template, and recognition as untouched/mocked outside capability read. It does not close any `LS-OD-*`, R0 gate, or Clean Code claim.
