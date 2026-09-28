# Báo cáo audit PRD theo prd-skill

> **Snapshot / non-canonical.** Phụ lục này ghi lại kết quả tại thời điểm audit; không phải nguồn requirement, status hay contract hiện hành. Xem [PRD](../prd.md) và [ownership map](../README.md#ownership-map).

> **Phạm vi recursive:** toàn bộ 23 file `docs/**/*.md`, gồm chính báo cáo này tại `docs/documentation-audits/prd-skill-audit.md`. Claim **Current** được đối chiếu read-only với source; báo cáo dùng heading/link ổn định thay vì line range dễ trôi.

## Kết quả checklist

| Quy tắc | Kết quả | Bằng chứng ổn định | Điều kiện duy trì |
|---|---|---|---|
| PRD là nguồn chuẩn | **Đạt** | [Metadata và phase](../prd.md#1-metadata), [baseline](../prd.md#3-hiện-trạng-và-trạng-thái-đích), [ownership map](../README.md#ownership-map) | Tài liệu vai trò không được định nghĩa lại product intent/status. |
| Full/Lite, Define/Design/Deliver và gate | **Đạt** | [Quyết định Full/Lite, ba phase và phase gate](../prd.md#quyết-định-fulllite-ba-phase-và-phase-gate) | Approval chưa có evidence tiếp tục là TBD/Blocked. |
| Current có source hoặc Unverified | **Đạt** | [Baseline](../prd.md#3-hiện-trạng-và-trạng-thái-đích), [technical boundaries](../prd.md#10-hợp-đồng-apidata-đề-xuất--chưa-triển-khai) | UI/mock không tự chứng minh model, backend hay production readiness. |
| Mục tiêu và ranh giới phạm vi | **Đạt** | [Mục tiêu và ranh giới phạm vi](../prd.md#4-mục-tiêu-và-ranh-giới-phạm-vi), [Learning goals/non-goals](../prd.md#182-problemopportunity-goals-và-non-goals) | Recognition là Current; Learning System là Target/Proposed có gate. |
| Persona/CUJ/JTBD | **Đạt** | [Recognition persona/CUJ](../prd.md#6-persona-tạm-thời-và-cuj), [Learning personas/JTBD](../prd.md#183-personas-và-jtbd--unverified) | Persona vẫn Unverified đến khi có research evidence. |
| NSM và metric semantics | **Đạt** | [North Star Metric](../prd.md#7-north-star-metric-và-metric-contract), [Learning progress semantics](../prd.md#189-progress-streak-và-semantics) | Baseline/target/window/owner và LS-OD-09 vẫn mở. |
| Requirement và acceptance ownership | **Đạt** | [Recognition requirements](../prd.md#8-yêu-cầu-ưu-tiên), [Learning requirements](../prd.md#186-functional-requirements), [system acceptance](../prd.md#1815-acceptance-criteria-cấp-hệ-thống), [story acceptance](../user-stories.md) | PRD sở hữu system-level AC; user stories sở hữu Given/When/Then cấp story. |
| ID families và traceability | **Đạt** | FR/NFR/US/CUJ/G/M; LS-FR-001..017, LS-OD-01..10, LG-01..05, LP-1..4, LUS-001..017; không có family LS-NFR riêng trong canonical PRD, các NFR-001..005 áp dụng xuyên scope; PF/RP/LL/FC/SR/QZ/PA/QR và FE task IDs trong [roadmap/plans](../implementation-roadmap.md) | Không đổi ID đã phát hành; mọi reference phải có definition. |
| Learning identity/persistence không bị quyết định ngầm | **Đạt** | [Scope và release slices](../prd.md#184-scope-và-release-slices), [unresolved decisions](../prd.md#1817-unresolved-decisions) | Local-only, account/cloud và hybrid vẫn là lựa chọn mở của LS-OD-01. |
| API/model/reference không bị nâng trạng thái | **Đạt** | [API proposal](../prd.md#10-hợp-đồng-apidata-đề-xuất--chưa-triển-khai), [Kanji_Smart analysis](../reference-implementations/kanji-smart.md) | LICENSE/provenance và B0/B3 vẫn unresolved; không suy diễn architecture. |
| Plans và UI docs nhất quán | **Đạt** | [Master roadmap](../implementation-roadmap.md), [frontend plan](../frontend-implementation-plan.md), [Ink Desk](../kanji-recognizer-ui-direction.md), [Learning UI skill](../skills/learning-experience-ui-skill.md) | Plans tổ chức delivery, không tạo product decision hay status Current. |

## Bằng chứng đối chiếu source read-only

- `frontend/src/api.ts`: `mockRecognize` bỏ qua input, trả `MOCK_PREDICTIONS` sau 1.400 ms; route chỉ nằm trong comment TODO.
- `frontend/src/App.tsx`, `components/DrawCanvas.tsx`, `components/InputPanel.tsx`, `components/ResultPanel.tsx`: xác nhận state, draw/upload, candidate selection và history phiên.
- `frontend/src/types.ts`: kiểu hiện tại phục vụ view-model/mock; không phải contract backend đã duyệt.
- `frontend/package.json`: xác nhận React 19, TypeScript và Vite.
- Không dùng source làm nơi ghi sửa; không sửa comment/type.

## Kiểm tra tự động

| Kiểm tra | Kết quả |
|---|---|
| Enumeration và UTF-8 strict | **Đạt:** 23/23 file `docs/**/*.md` decode strict UTF-8. |
| BOM/U+FFFD/mojibake/control | **Đạt sau repair:** không BOM, U+FFFD, control bất hợp lệ hoặc signature mojibake phổ biến; hai file Ink Desk được phục hồi Unicode theo ngữ nghĩa. |
| ID definitions/references | **Đạt:** recognition FR/NFR/US/CUJ/G/M; learning LS-FR/LS-OD/LG/LP/LUS (không có LS-NFR canonical riêng); roadmap/plan task families đều được kiểm tra coverage/uniqueness. |
| Learning story coverage | **Đạt:** LS-FR-001..LS-FR-017 đều có story cùng số LUS-001..LUS-017 và Given/When/Then. |
| Internal file links và heading anchors | **Đạt:** không phát hiện đích file hoặc anchor tương đối bị thiếu. |
| Markdown structure | **Đạt:** fence cân bằng; heading hợp lệ; bảng có separator và số cột nhất quán theo kiểm tra cấu trúc. |
| Diff hygiene | **Đạt:** `git diff --check` sạch; thay đổi của unit này chỉ là Markdown/governance, không sửa product source/Postman artifact. |

## Finding còn mở

1. Owner/approver, phase-gate approval, persona ưu tiên, NSM baseline/target/window, contract/API, privacy/security, model/data/class/JLPT, accessibility target, SLO và launch plan đều **TBD/Open Decision** hoặc **Blocked/Unverified**.
2. `LS-OD-01..LS-OD-10` vẫn mở; đặc biệt chưa chọn local-only, account/cloud hay hybrid, cũng chưa chọn backend/persistence/sync model.
3. [Kanji_Smart reference analysis](../reference-implementations/kanji-smart.md) vẫn ghi đúng rằng LICENSE/provenance và mâu thuẫn EfficientNet-B0/B3 chưa được giải quyết.

## File thay đổi bởi phiên repair/audit

Danh sách chính xác nằm trong entry mới nhất của [AI Work Log](../AI_WORK_LOG.md) và `git diff --name-only`; báo cáo không lặp snapshot đường dẫn dễ lỗi thời.
