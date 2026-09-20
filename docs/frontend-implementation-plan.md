# Kế hoạch triển khai frontend — Kanji Recognizer

> **Quyền ưu tiên:** [PRD sản phẩm](./prd.md) là nguồn chuẩn. Khi có mâu thuẫn, `docs/prd.md` được ưu tiên. Kế hoạch này chỉ tổ chức công việc frontend theo **FR-001..FR-010**, **NFR-001..NFR-005**, **US-001..US-013** và **M0..M5**; không tạo yêu cầu hay mốc sản phẩm mới.

## 1. Quy ước trạng thái

- **Not started:** chưa bắt đầu.
- **In progress:** đang thực hiện, chưa qua gate.
- **Blocked:** thiếu quyết định, contract hoặc dependency.
- **Ready for validation:** đã có thay đổi và bằng chứng để kiểm tra.
- **Validated:** đã qua gate áp dụng.
- **Deferred:** hoãn bằng quyết định được ghi nhận; không đồng nghĩa hoàn tất.

Không dùng phần trăm hoàn thành. Mỗi thay đổi trạng thái phải kèm bằng chứng hoặc lý do chặn.

## 2. Baseline, ràng buộc và phụ thuộc

### Baseline

React 19/TypeScript/Vite; canvas 480×480; brush 4–36; undo/clear; upload click/keyboard/drop/preview; state idle/loading/success/error; mock cố định sau 1.400 ms; candidate sort/chọn; history phiên tối đa 8. Không có network/backend/model/tests/CI/analytics.

### Ràng buộc

- Bảo toàn hành vi Current trước khi thay đổi; không gọi mock là inference thật.
- Không phát minh endpoint/schema; không nối service trước contract/backend được duyệt.
- Không đổi requirement chuẩn trong task frontend; thay đổi phạm vi phải đi qua PRD.
- Không log hoặc lưu ảnh ngoài chính sách được duyệt.
- Mỗi gate yêu cầu bằng chứng tái lập; build/lint đơn lẻ không chứng minh accessibility hay hành vi end-to-end.

### Bản đồ phụ thuộc

```text
FE-WS0 ──┬──> FE-WS1
         ├──> FE-WS2 ──┬──> FE-WS4 (Blocked: approved contract + backend)
         └──> FE-WS3 ──┘
FE-WS0/1/2/3/4 ───────> FE-WS5
```

## 3. Workstreams

| ID | Workstream | Requirement/story tham chiếu | Đầu ra và điều kiện hoàn tất |
|---|---|---|---|
| **FE-WS0** | Safeguard baseline | FR-001..FR-006, NFR-005; US-001..US-007 | Ghi fixture/hành vi baseline; bảo vệ state, sort, selection, history; không regression qua Gate B. |
| **FE-WS1** | Demo truthfulness | FR-010; US-013; G4 | Nhãn mock nhất quán; loại/giảm claim chưa xác minh; production mock guard; qua review nội dung và Gate C. |
| **FE-WS2** | Input lifecycle/validation | FR-001..FR-004; NFR-002, NFR-003; US-001..US-006 | Quy tắc lifecycle, object URL cleanup, validation/error UX, chống duplicate/race theo quyết định đã duyệt; qua Gate D. |
| **FE-WS3** | Accessibility/responsive | NFR-001, NFR-004; US-008, US-009 | Keyboard/focus/status/candidate/canvas alternative và ma trận viewport/zoom/touch có bằng chứng; qua Gate D. |
| **FE-WS4** | Integration seam | FR-007..FR-009; NFR-002, NFR-003; US-010..US-012 | Adapter + runtime validation + DTO/error mapping + cancel/timeout/retry theo contract. **Blocked** đến khi contract và backend được duyệt; qua Gate E. |
| **FE-WS5** | Automated quality/release evidence | NFR-005; các story bị tác động | Test pyramid phù hợp, CI gates, evidence index và release checklist; qua Gate F. |

## 4. Các pha và gate A–F

Các pha không hàm ý ngày, owner hoặc estimate. Không được bỏ gate chỉ vì thay đổi nhỏ; chỉ thu hẹp ma trận khi có lý do ghi nhận.

### Gate A — Canonical alignment

- Xác nhận PRD sản phẩm vẫn là chuẩn; phạm vi thay đổi truy được về requirement/story/mốc hiện hữu.
- Ghi quyết định mở, dependency và stop condition.
- **Exit:** không có requirement mới ẩn trong thiết kế frontend; link/ID hợp lệ.

### Gate B — Baseline safeguard

- Hoàn thành FE-WS0: đặc tả/test baseline cho draw, upload, state, mock, sort/selection và history.
- Ghi rõ claim EfficientNet-B3/250 Kanji/JLPT N5/N4 là unverified.
- **Exit:** hành vi Current có bằng chứng tái lập; regression quan trọng bị chặn.

### Gate C — Honest demo

- Hoàn thành FE-WS1; mock luôn được nhận biết là demo và không phụ thuộc input.
- Xác nhận cấu hình production không thể vô tình dùng mock.
- **Exit:** review nội dung + test mode guard đạt; FR-010/US-013 có bằng chứng.

### Gate D — Robust local UX

- Hoàn thành FE-WS2 và FE-WS3 theo các quyết định đã duyệt.
- Kiểm tra lifecycle/race/error, keyboard/screen reader, responsive/zoom/touch.
- **Exit:** ma trận áp dụng đạt; gap còn lại được chấp thuận rõ, không ẩn dưới nhãn Current.

### Gate E — Approved integration

- Chỉ mở khi contract/version/auth/limits/errors và backend testable đã được phê duyệt.
- Hoàn thành FE-WS4 mà không để component phụ thuộc transport DTO.
- **Exit:** contract/integration tests đạt; privacy/error/cancel/timeout/retry evidence đầy đủ. Nếu dependency thiếu, trạng thái vẫn **Blocked**.

### Gate F — Release evidence

- Hoàn thành FE-WS5; chạy toàn bộ validation matrix áp dụng trong môi trường sạch.
- Liên kết evidence với requirement/story và mốc chuẩn liên quan.
- **Exit:** không còn stop condition; quyết định mở ảnh hưởng release đã đóng hoặc được chấp thuận; release checklist được phê duyệt.

## 5. Mẫu task

```markdown
### <Task ID> — <Tên ngắn>
- Workstream: FE-WS<n>
- Status: Not started | In progress | Blocked | Ready for validation | Validated | Deferred
- Canonical references: FR-...; NFR-...; US-...; M...
- Current evidence:
- Intended change / non-scope:
- Dependencies and decisions:
- Acceptance checks:
- Validation evidence:
- Risks / rollback:
- Stop condition:
```

Task ID nội bộ không được mang dạng FR/NFR/US/M để tránh bị hiểu là requirement/mốc sản phẩm.

## 6. Ma trận validation

| Khu vực | Kiểm tra tối thiểu | Bằng chứng | Gate |
|---|---|---|---|
| Canonical/truy vết | Link tương đối, ID FR/NFR/US/M, không ID lạ | Link/ID report | A, F |
| Static quality | TypeScript build, lint, format/diff hygiene | Log lệnh + commit/change set | B–F |
| Draw | Empty/ink, brush 4–36, undo/clear, pointer/resize | Component/integration tests | B, D |
| Upload | Click/keyboard/drop, preview/remove/replace, invalid file, URL cleanup | Tests + manual edge-case record | B, D |
| State/concurrency | idle/loading/success/error, duplicate submit, retry, stale/late response | Deterministic tests | B, D, E |
| Result/history | Sort, selection, empty/malformed data, cap 8, reload volatility | Tests | B, E |
| Demo truthfulness | Mock label/copy/config guard; no unverified production claim | Snapshot/content review + config test | C, F |
| Accessibility | Keyboard, focus, names/roles/states, live announcements, contrast, zoom, canvas alternative | Automated scan + manual audit | D, F |
| Responsive | Viewport/orientation/touch/zoom matrix được duyệt | Screenshots/test report | D, F |
| Integration | Adapter, runtime schema, DTO mapping, error/cancel/timeout/retry, contract compatibility | Contract/integration tests | E |
| Privacy/security | File limits/content policy, redaction, no unintended persistence/logging | Security checklist/tests | D, E, F |
| Release | Clean install/build/lint/test/CI và artifact provenance | CI run + release checklist | F |

## 7. Giao thức thay đổi

1. Gắn task với requirement/story/mốc chuẩn hiện hữu.
2. Nếu thay đổi mục tiêu, scope, acceptance hoặc contract: dừng frontend task; đề xuất cập nhật `docs/prd.md` và tài liệu truy vết trước.
3. Ghi Current evidence trước khi sửa; giới hạn file và non-scope.
4. Thực hiện thay đổi nhỏ, reviewable; không trộn refactor không liên quan.
5. Chạy validation theo ma trận và lưu evidence có thể tái lập.
6. Cập nhật trạng thái chỉ sau gate; gap phải là Blocked/Deferred/Unverified, không ghi “done”.
7. Khi rollback, khôi phục mode an toàn và không làm mất bằng chứng/decision log.

## 8. Stop conditions

Dừng hoặc giữ **Blocked** khi xảy ra một trong các điều kiện:

- Không truy được thay đổi về FR-001..FR-010, NFR-001..NFR-005 hoặc US-001..US-013.
- Cần phát minh endpoint, schema, auth, model, dataset, coverage, metric hoặc SLO.
- Contract/backend chưa duyệt nhưng task yêu cầu gọi service thật.
- Chưa quyết định cách xử lý dữ liệu ảnh, validation, retention/logging hoặc privacy.
- Baseline/regression test thất bại; race tạo kết quả sai input; mock có thể lọt production.
- Accessibility/responsive critical path không dùng được theo ma trận đã duyệt.
- CI/evidence không tái lập hoặc release còn claim chưa xác minh.

## 9. Quyết định mở

- Input hợp lệ, giới hạn file/kích thước và thông báo lỗi.
- Hành vi khi đổi input/tab trong loading; cancel, stale result và retry.
- Accessibility standard và ma trận browser/device/viewport/zoom.
- Mock/service configuration và production guard.
- Contract/version/auth, DTO/nullability, metadata source, error taxonomy, timeout/retry.
- Test framework, CI policy, artifact retention và release approval.
- Analytics/telemetry có cần thiết hay không; consent/redaction/retention nếu có.

## 10. Liên kết mốc chuẩn

Kế hoạch không định nghĩa lại mốc. Khi lập task, tham chiếu **M0..M5** theo [PRD](./prd.md), cùng requirement/story tương ứng. Trình tự gate A–F là cơ chế kiểm soát frontend, không phải milestone sản phẩm và không suy ra lịch hoặc cam kết phát hành.

Tài liệu phạm vi bổ trợ: [frontend PRD](./frontend-prd.md). Bằng chứng hiện trạng: [requirements analysis](./requirements-analysis.md), [feature specification](./feature-specification.md), [user stories](./user-stories.md).
