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
| [Reference database schema](./database-schema.sql) | DDL Target/Proposed portable khớp mô hình logic | Migration hoặc live database |
| [Master implementation roadmap](./implementation-roadmap.md) | Thứ tự cross-functional, dependency/gate, rollout/rollback, evidence và release DoD | Requirement canonical hoặc quyết định công nghệ/owner/date |
| [Database implementation plan](./plans/database-implementation-plan.md) | DB-001..020, gate, evidence, rollout/rollback và Definition of Done | Trạng thái implementation hoặc lựa chọn LS-OD |
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
