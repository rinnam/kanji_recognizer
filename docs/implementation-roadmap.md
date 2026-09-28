# Lộ trình triển khai toàn sản phẩm — Kanji Recognizer

> **Trạng thái:** kế hoạch Target/Proposed, không phải bằng chứng implementation. [PRD](./prd.md) là canonical; [Learning Experience UI Skill](./skills/learning-experience-ui-skill.md) là nguồn chỉ dẫn UI learning. Mô hình dữ liệu Target nằm tại [database design](./database-design.md), DDL tham chiếu tại [database schema](./database-schema.sql), và thứ tự triển khai có gate tại [Plan DB](./plans/database-implementation-plan.md). Không có ngày, owner, endpoint, schema hay công nghệ nào được kế hoạch này mặc nhiên phê duyệt; triển khai DB vẫn bị chặn bởi các `LS-OD-*` áp dụng.

## 1. Nguyên tắc lập kế hoạch

1. Giữ tách biệt **Current**, **Target/Proposed**, **Blocked**, giả định và quyết định mở.
2. Đi theo lát cắt dọc nhỏ, có demo thật và rollback được; contract trước integration.
3. Không gọi mock/local prototype là persistence, inference hay sync thật.
4. Privacy, accessibility, observability, migration và test là đầu ra của mỗi slice, không để cuối.
5. Chỉ chuyển trạng thái khi có evidence tái lập; build xanh không tự chứng minh UX, bảo mật hoặc correctness.
6. PRD quyết định *what/why*; roadmap và [các plan](./plans/) quyết định thứ tự/gate; không định nghĩa lại intent.

## 2. Phạm vi và truy vết

| Dòng giá trị | Requirement canonical | Plan chi tiết |
|---|---|---|
| Nền tảng/contract | FR-007..010; NFR-001..005; LS-FR-015..017 | [Platform](./plans/platform-foundation-and-contracts.md), [Quality/release](./plans/quality-security-and-release.md) |
| Recognition | FR-001..010; NFR-001..005 | [Recognition pipeline](./plans/recognition-pipeline.md) |
| Library + recognition-to-save | LS-FR-001..005, 015..017 | [Learning data/library](./plans/learning-data-and-library.md) |
| Flashcard | LS-FR-006..007, 015..016 | [Flashcards](./plans/flashcards-and-study-session.md) |
| Quiz | LS-FR-008..009, 015..016 | [Quiz](./plans/quiz-system.md) |
| SRS/review | LS-FR-010..012, 014..016 | [SRS](./plans/srs-review-engine.md) |
| Progress | LS-FR-013, 015..017 | [Progress](./plans/progress-and-analytics.md) |

Cross-cutting LS-FR-015..017 are verified in every applicable slice and at release. Canonical details remain in [PRD §18](./prd.md#18-learning-system--targetproposed-bounded).

### 2.1 Explicit Learning System traceability

| Requirement | Primary plan/slice |
|---|---|
| LS-FR-001 | LL / L1 deck lifecycle |
| LS-FR-002 | LL / L1 membership and idempotent save |
| LS-FR-003 | LL / L1 library query/filter/sort |
| LS-FR-004 | LL / L1 item detail and partial metadata |
| LS-FR-005 | LL / L1 recognition-to-save |
| LS-FR-006 | FC / L2 flashcard snapshot/reveal/resume |
| LS-FR-007 | FC / L2 practice classification isolated from SRS |
| LS-FR-008 | QZ / L3 quiz modes/session/summary |
| LS-FR-009 | QZ / L3 scoring and explainable feedback |
| LS-FR-010 | SR / L4 due queue |
| LS-FR-011 | SR / L4 reveal/rating/scheduler preview |
| LS-FR-012 | SR / L4 resume/idempotency/conflict |
| LS-FR-013 | PA / L5 progress semantics |
| LS-FR-014 | SR / L4 suspend/reset/audit preservation |
| LS-FR-015 | Every learning plan + QR state/error matrix |
| LS-FR-016 | Every learning plan + PF capability truthfulness |
| LS-FR-017 | LL and PA data controls + QR privacy release gate |

## 3. Dependency graph

```text
R0 Foundations/contracts
 ├─> R1 Recognition baseline ─> R2 Recognition integration ─┐
 └─> L0 Learning state prototypes                          ├─> L1 Persistence/library
                                                           └─> recognition-to-save
L1 ─> L2 Flashcards ─┐
 └───────────────────┼─> L3 Quiz
L1 + scheduler decisions ─> L4 SRS/review ─> L5 Progress
All slices ─────────────────────────────────> H1 Hardening ─> REL Release
```

L0 may proceed with explicit mock/local labels; L1+ cannot claim durable behavior until identity/storage/privacy contracts pass. Recognition integration remains independently blocked by its service/model gates.

## 4. Ordered delivery slices and gates

| Slice | Entry gate | Cross-functional deliverables | Exit gate/evidence |
|---|---|---|---|
| **R0 — Foundations and decisions** | Canonical docs identified; Current baseline recorded | FE: app shell seams/state boundaries; BE/data: proposed contracts and invariants, not fabricated implementation; QA: test/evidence conventions; UX: IA/state inventory; security/ops: data classes, threat/telemetry/deployment questions | Decision log identifies unresolved items and stop conditions; contract examples/versioning and test strategy reviewed; no false Current claim |
| **R1 — Recognition safety** | R0 conventions; Current prototype reproducible | FE: FE-WS0..3; QA/UX: baseline, lifecycle, responsive/a11y evidence; security: input/privacy review | Gates A–D in [frontend plan](./frontend-implementation-plan.md); mock truthfulness proven |
| **R2 — Recognition service slice** | Approved recognition contract, backend/model reproducibility, provenance and privacy gates | FE adapter; BE inference boundary/error mapping; data/ML artifact lineage and evaluation; QA contract/E2E; ops observability/rollback | FE Gate E; fixed fixtures and real-service evidence; model/service rollback rehearsed. Otherwise **Blocked** |
| **L0 — Learning foundations/prototypes (LS0)** | R0; research scope and applicable LS-OD items recorded | UX/FE: IA, view models, complete state prototypes under UI skill; data/BE: conceptual invariants/contracts; QA: usability/a11y plan | Prototype is labeled local/mock; no fake persistence; LS1 decisions and evidence gaps explicit |
| **L1 — Persistence, library, save (LS1)** | LS-OD-01..03 and applicable LS-OD-06/08 resolved; persistence/repository, metadata/provenance, migration and deletion contracts approved | FE library/detail/save/deck flow; BE/data idempotent mutations and dedupe; QA A1/A6/A8; security authorization/deletion; ops migration/backup/restore plan | LS-FR-001..005, 015..017 evidence; reload consistency, duplicate retry, partial/offline recovery and rollback demonstrated |
| **L2 — Flashcards (LS2a)** | L1 stable; eligible metadata and session persistence policy | FE session setup/reveal/classification/resume; BE/data only if approved contract requires; QA deterministic order/resume and A2; UX/a11y keyboard/screen-reader path | LS-FR-006..007, 015..016 pass; no SRS ReviewLog from practice |
| **L3 — Quiz (LS2b)** | L1; LS-OD-04 resolved; normalization/content provenance approved | FE setup/question/feedback/summary/retry; domain scoring rule/version; data content QA; QA A3 | LS-FR-008..009, 015..016 pass; reproducible scoring; quiz does not mutate SRS |
| **L4 — SRS/review (LS3a)** | L1; LS-OD-05/06 and clock/time-zone/offline/migration decisions resolved | Pure scheduler; atomic/idempotent rating; due queue/session UI; audit log; concurrency/DST/offline tests; operational migration | LS-FR-010..012, 014..016 and A4/A6/A7 pass; golden fixtures and duplicate/conflict evidence |
| **L5 — Progress (LS3b)** | Versioned event semantics; L3/L4 events trustworthy; LS-OD-07..09 and privacy decisions resolved | FE dashboard/no-data/table alternatives; data reconciliation/aggregates; QA A5/A8; security consent/minimization; ops freshness monitoring | LS-FR-013, 015..017 pass; metrics reconcile from fixtures; freshness/range/denominator shown |
| **H1 — Hardening/release** | Intended release slices exited; deferred scope documented | All disciplines close critical defects, performance/a11y/security/privacy checks, runbooks, migration and rollback rehearsal | [Quality plan](./plans/quality-security-and-release.md) completion gate and release DoD below |

## 5. First unblocked work

Select **R0** first: inventory decisions, contracts, data classes, state matrices and evidence conventions. In parallel, **R1** tasks that preserve Current behavior and require no invented service contract may proceed. **L0** prototype work is allowed only with mock/local labels. R2 and L1+ remain blocked until their explicit gates close.

## 6. Decision and blocker gates

| Gate | Must be decided/evidenced before |
|---|---|
| Identity/storage/sync and migration (`LS-OD-01`) | L1 durable implementation |
| Canonical item, metadata source/license/dedupe (`LS-OD-02`) | L1 save/detail and L2/L3 content |
| Deck/delete/archive policy (`LS-OD-03`) | Destructive library actions |
| Quiz mode and accepted-answer normalization (`LS-OD-04`) | L3 scoring implementation |
| Scheduler/day/limits/undo (`LS-OD-05`) | L4 |
| Time authority/offline/conflict (`LS-OD-06`) | L1 queued mutations and L4 ratings |
| Streak/time-zone (`LS-OD-07`) | L5 |
| Retention/export/deletion/consent/region (`LS-OD-08`) | L1 data handling and launch |
| Learning metric role (`LS-OD-09`) | L5 instrumentation/launch claims |
| Locale/display (`LS-OD-10`) | Any irreversible content/UI contract |
| Recognition API/model/data/provenance/SLO open decisions in PRD §16 | R2 |

An open decision is not an implementation assumption. Record selected option, rejected alternatives, approver and evidence when governance is established; owner/date remain TBD until assigned.

## 7. Migration, rollout and rollback

- Every persisted shape, scheduler rule and event contract is versioned; migration supports rehearsal on representative non-sensitive fixtures and documents forward/backward compatibility.
- Roll out by capability flag or equivalent approved control; the mechanism is TBD. Never expose navigation to unavailable destructive or mutation flows.
- Observe technical health and correctness separately from product metrics; thresholds/SLOs remain open until approved.
- Rollback order: stop new writes if integrity is uncertain, preserve append-only/audit evidence, restore compatible reader/service, reconcile pending operations, communicate freshness/availability truthfully.
- Model rollback keeps contract compatibility and artifact provenance. Scheduler rollback never silently recomputes committed history.
- Data rollback/restore and deletion obligations must coexist; backup retention behavior requires privacy approval.

## 8. Evidence package per slice

Required as applicable: requirement-to-test matrix; reviewed decision records; contract/schema examples and compatibility tests; unit/golden/property tests; integration/E2E results; keyboard/screen-reader/zoom/responsive report; security/privacy review; migration dry-run; observability screenshots/query output with redaction; usability findings; defect disposition; rollout/rollback rehearsal; updated Current/Target status. Evidence location and retention mechanism are TBD, but links must be reproducible and contain no prohibited data.

## 9. Risks

Primary risks are false readiness, recognition/model uncertainty, metadata/license errors, duplicate or lost writes, scheduler/time-zone defects, misleading progress, inaccessible canvas/charts, privacy leakage, offline conflict and scope expansion. Mitigate through gates above, pure/versioned domain rules, idempotency, provenance, explicit state UX, minimization, alternatives to visual interaction and stop-the-line on integrity/privacy/a11y failures.

## 10. Release definition of done

A release is done only when:

- selected scope and exclusions are named; all included FR/NFR/LS-FR map to passing evidence;
- no critical/high unresolved correctness, accessibility, security, privacy or data-integrity issue remains under the approved policy;
- Current claims match deployed behavior; mock/local/partial capabilities remain labeled;
- migrations, backup/restore where applicable, rollout and rollback are rehearsed;
- authorization, deletion/retention, telemetry minimization and consent/legal-basis decisions are approved;
- operational health, alert response and support/runbook paths are tested without inventing SLOs;
- cross-browser/device, keyboard, screen-reader, 200% zoom, reduced-motion and failure-state evidence exists for critical journeys;
- recognition quality/service evidence and learning reconciliation/scheduler evidence pass for included slices;
- open decisions that affect released behavior are closed; remaining ones are explicitly deferred and non-blocking;
- documentation, evidence index and release notes are updated, with no source status falsely promoted.
