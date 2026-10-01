# Bộ tài liệu Kanji Recognizer

## Trạng thái và baseline

Nguồn sự thật sản phẩm là [PRD](./prd.md). Baseline Current/Target được định nghĩa duy nhất tại [PRD §3](./prd.md#3-hiện-trạng-và-trạng-thái-đích); các tài liệu còn lại chỉ bổ sung bằng chứng hoặc góc nhìn theo vai trò.

AI contributors must follow [`AGENTS.md`](../AGENTS.md) and append every coherent completed unit/handoff to the canonical [AI Work Log](./AI_WORK_LOG.md). The log complements, not replaces, canonical requirement and plan task statuses.

## Ownership map

| Tài liệu | Sở hữu nội dung | Không sở hữu |
|---|---|---|
| [PRD](./prd.md) | Problem, mục tiêu, scope, requirement/status, metric, contract đề xuất, milestone, decision và acceptance criteria cấp hệ thống | Chi tiết nghiên cứu, AC Given/When/Then cấp story, UX flow hoặc task frontend |
| [Product discovery](./product-discovery.md) | Evidence, phương pháp nghiên cứu, bias và decision log discovery | Problem/metric/hypothesis canonical |
| [Kanji_Smart reference analysis](./reference-implementations/kanji-smart.md) | Provenance, pipeline, reuse/redesign/TBD matrix, mismatch, artifact/license risk và gate Reference→Current | Current baseline, product scope, requirement hoặc canonical API/model decision |
| [Requirements analysis](./requirements-analysis.md) | Evidence, traceability, dependency và gap | Requirement wording hoặc acceptance criteria |
| [User stories](./user-stories.md) | Recognition và Learning System stories cùng acceptance criteria cấp story theo Given/When/Then | Product target, system-level acceptance hoặc contract |
| [UI flow design](./ui-flow-design.md) | Màn hình, journey, transition và recovery UX của recognition hiện hữu | Implementation internals hoặc acceptance criteria |
| [Documentation audit](./documentation-audits/prd-skill-audit.md) | Snapshot kiểm tra recursive docs, encoding, liên kết và coverage ID | Requirement/status/contract canonical |
| [Ink Desk UI direction](./kanji-recognizer-ui-direction.md) | Định hướng thị giác và component cho recognition workbench | Learning rules hoặc implementation evidence |
| [Learning Experience UI Skill](./skills/learning-experience-ui-skill.md) | Chỉ dẫn tái sử dụng cho Library, save/detail, Flashcard, Quiz, Review/SRS, Progress và recognition handoff | Requirement canonical, backend readiness hoặc status Current |
| [Feature specification](./feature-specification.md) | Frontend adapter, lifecycle, validation/mapping implications | Product target hoặc API schema canonical |
| [Database design](./database-design.md) | Mô hình dữ liệu logic, invariant, ownership, lifecycle, privacy, sync alternatives và decision gates | Engine/account/backend/persistence đã được duyệt |
| [Reference database schema](./database-schema.sql) | DDL Target/Proposed PostgreSQL-native khớp mô hình logic | Migration hoặc live database |
| [Master implementation roadmap](./implementation-roadmap.md) | Thứ tự cross-functional, dependency/gate, rollout/rollback, evidence và release DoD | Requirement canonical hoặc quyết định công nghệ/owner/date |
| [Database implementation plan](./plans/database-implementation-plan.md) | DB-001..020, gate, evidence, rollout/rollback và Definition of Done | Trạng thái implementation hoặc lựa chọn LS-OD |
| [KotoBase UI adoption plan](./plans/kotobase-ui-adoption.md) | Nghiên cứu layout/flow/feature và kế hoạch UI Target/Proposed độc lập | Product code, quyết định backend, quyền tái sử dụng artifact ngoài |
| [Companion implementation plans](./plans/) | Task ID ổn định, dependency, acceptance và completion gate theo workstream | Trạng thái Current hoặc quyết định sản phẩm canonical |
| [Frontend implementation plan](./frontend-implementation-plan.md) | FE-WS0..FE-WS5 recognition và FE-L0..FE-L6 learning, gate/task/evidence | Baseline, milestone hoặc open decision canonical |
| [Frontend README](../frontend/README.md) | Cách chạy và phát triển prototype | Yêu cầu sản phẩm |

Owner cá nhân, người phê duyệt và nhịp rà soát vẫn là **TBD/Open Decision**.

## Thứ tự đọc

1. [PRD](./prd.md)
2. [Product discovery](./product-discovery.md)
3. [Kanji_Smart reference analysis](./reference-implementations/kanji-smart.md)
4. [Requirements analysis](./requirements-analysis.md)
5. [User stories](./user-stories.md)
6. [UI flow design](./ui-flow-design.md)
7. [Ink Desk UI direction](./kanji-recognizer-ui-direction.md)
8. [Learning Experience UI Skill](./skills/learning-experience-ui-skill.md)
9. [Feature specification](./feature-specification.md)
10. [Master implementation roadmap](./implementation-roadmap.md)
11. Companion plans: [platform foundation/contracts](./plans/platform-foundation-and-contracts.md), [recognition pipeline](./plans/recognition-pipeline.md), [learning data/library](./plans/learning-data-and-library.md), [flashcards](./plans/flashcards-and-study-session.md), [SRS/review](./plans/srs-review-engine.md), [quiz](./plans/quiz-system.md), [progress/analytics](./plans/progress-and-analytics.md), [quality/security/release](./plans/quality-security-and-release.md)
12. [Frontend implementation plan](./frontend-implementation-plan.md)
13. [Frontend README](../frontend/README.md)

[Frontend PRD](./frontend-prd.md) chỉ là **legacy redirect** để giữ inbound links. [Audit PRD](./documentation-audits/prd-skill-audit.md) là phụ lục snapshot, không canonical.

## Chú giải trạng thái

| Nhãn | Ý nghĩa |
|---|---|
| **Current** | Được kiểm chứng trong mã nguồn hiện có. |
| **Target/Proposed** | Hướng đích hoặc hợp đồng đề xuất; chưa phải năng lực đang chạy. |
| **TBD/Open Decision** | Chưa đủ bằng chứng hoặc cần quyết định. |
| **Blocked** | Phụ thuộc thành phần chưa tồn tại. |
| **Unverified** | Chưa có kiểm thử/bằng chứng để xác nhận. |
| **Reference implementation — external, unverified** | Nguồn ngoài dùng để nghiên cứu; không phải Current và không tự động là quyết định project. |

## Quy tắc cập nhật

- Cập nhật định nghĩa canonical ở PRD trước; tài liệu vai trò liên kết thay vì sao chép.
- Mọi tuyên bố Current phải truy được tới source hoặc bằng chứng kiểm tra.
- Không đổi Proposed thành Current trước khi có mã, kiểm thử và bằng chứng vận hành.
- Không đổi các ID đã phát hành FR/NFR/US/CUJ/G/M, LS-FR/LS-OD/LG/LP/LUS hoặc plan-task IDs (PF/RP/LL/FC/SR/QZ/PA/QR/FE); thay đổi contract phải đồng bộ PRD, story, plan, feature spec, catalogue và kiểu frontend liên quan trong cùng thay đổi.

## Engineering operating standards

Bộ `docs/engineering/` là lớp **implementation/runtime contract** được thêm để biến PRD thành coding workflow có bằng chứng. Các tài liệu này đặc biệt bắt buộc khi làm CRUD/Library và khi backend dùng PostgreSQL thật.

- [Engineering Standards README](./engineering/README.md)
- [01 — AI Coding Playbook](./engineering/01-ai-coding-playbook.md) — DoD, vertical slice, mock policy, DB permissions, F0 foundation.
- [02 — Backend Standards](./engineering/02-backend-standards.md) — Route → Controller → Service → Repository → Kysely → PostgreSQL, error contract, integration test.
- [03 — Frontend Standards](./engineering/03-frontend-standards.md) — feature boundary, API adapter, state, mock policy, UI error mapping.
- [04 — Environment & Database Runbook](./engineering/04-env-database-runbook.md) — PostgreSQL, Vite proxy và quy trình chẩn đoán 502.
- [05 — Library API Contract](./engineering/05-library-api-contract.md) — contract thực thi cho `/v1/library`.

**Không được coi unit test với repository giả là bằng chứng feature chạy thật.** Evidence tối thiểu phải gồm API smoke trên DB dev và xác nhận dữ liệu trong PostgreSQL; browser verification được ghi riêng nếu có UI.

## Coding-agent operating skills

Các tài liệu sau là **bắt buộc khi AI triển khai feature**:

- [Coding Operating Contract](./coding-operating-contract.md) — luật vertical-slice, evidence và chống mock.
- [PRD Coding Skill](./skills/prd-coding-skill.md) — chuyển nghiệp vụ thành contract/acceptance trước khi code.
- [Backend Coding Skill](./skills/backend-coding-skill.md) — API thật + PostgreSQL thật + diagnosis 502.
- [Frontend UI Coding Skill](./skills/frontend-ui-coding-skill.md) — feature boundary, API adapter, state và UI DoD.

### Thứ tự bắt buộc khi nhận một coding task
`PRD → Coding Operating Contract → Engineering Playbook → Backend/Frontend Standards → implement → API test → DB verify → UI verify → evidence update`.

`PRD Skill → Coding Operating Contract → UI/BE Skill → implement → API test → DB verify → UI verify → evidence update`.

**Anti-pattern bị cấm:** dùng mock data để che API/DB failure, coi HTTP 502 là empty state, hoặc tuyên bố feature completed chỉ vì frontend render được.
