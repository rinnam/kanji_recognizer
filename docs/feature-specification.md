# Đặc tả tính năng frontend

> Requirement và acceptance criteria cấp hệ thống: [PRD](./prd.md). API success/error contract canonical: [PRD §10](./prd.md#10-hợp-đồng-apidata-đề-xuất--chưa-triển-khai). Journey thuộc [UI flow](./ui-flow-design.md); acceptance criteria cấp story theo Given/When/Then thuộc [user stories](./user-stories.md).

## 1. Frontend boundary hiện tại

```text
App.tsx
 ├─ InputPanel.tsx ── DrawCanvas.tsx
 ├─ mockRecognize() ── MOCK_PREDICTIONS
 └─ ResultPanel.tsx + history state
```

Không có network request. `mockRecognize` bỏ qua input, chờ 1.400 ms và trả fixture cố định. Component hiện tiêu thụ view-model trong `types.ts`; kiểu này không phải backend contract.

## 2. Frontend responsibility boundary

Frontend chịu trách nhiệm:

- quản lý input mode, lifecycle của canvas/file/preview và recognition UI state;
- chặn submit không hợp lệ hoặc trùng khi đang loading;
- giữ adapter giữa component và nguồn nhận diện;
- runtime-validate DTO trước khi map sang view-model;
- map lỗi dịch vụ sang UX an toàn, không rò payload;
- hủy/bỏ qua response stale theo policy được duyệt;
- giữ mock/service mode minh bạch và ngăn mock trong production;
- tạo evidence accessibility, responsive và regression cho phạm vi frontend.

Frontend không tự chọn model/dataset, sáng tạo endpoint/schema, quyết định auth/SLO/retention, xây backend/metadata service hoặc thay đổi mục tiêu/CUJ/requirement.

## 3. Lifecycle và invariant cần adapter bảo vệ

| Concern | Current evidence | Frontend implication |
|---|---|---|
| Đổi tab | Upload unmount canvas nên hình vẽ mất; file state ở `App` được giữ | Chốt policy giữ/xóa mỗi input mode và test transition; xem journey trong [UI flow](./ui-flow-design.md) |
| Undo | Snapshot tối đa 30; có bug bỏ quá một nét và lệch `hasInk` | Sửa theo US-002, đồng bộ state từ canvas và có regression test |
| File input | Gỡ preview/file chưa reset native input | Reset input để chọn lại cùng file; test US-005 |
| Object URL | Tạo preview nhưng chưa revoke | Revoke khi thay/gỡ/unmount; không revoke URL còn hiển thị |
| Submit | Chọn source theo tab; mock không đọc input | Adapter nhận input đã chuẩn hóa; guard loading/invalid và correlation cho request |
| Result/history | Sort/select ở client; history tối đa 8, session-only | Map field nullable an toàn; không persist nếu chưa có quyết định |
| Stale response | Chưa có cancel/correlation policy | Dùng abort/request token và chỉ commit response còn hiệu lực |

## 4. Adapter và mapping

Giữ interface component-facing ổn định, tách khỏi transport DTO:

```text
UI input -> normalize/validate -> recognition adapter -> transport/mock
response -> runtime schema validation -> DTO mapper -> view-model -> UI
error -> taxonomy mapper -> safe message + retryability
```

- Method/path, payload, success fields và error envelope không lặp tại đây; dùng [PRD §10](./prd.md#10-hợp-đồng-apidata-đề-xuất--chưa-triển-khai).
- `request_id`/correlation, version và unknown fields phải được adapter xử lý theo contract đã duyệt.
- Thiếu metadata nullable không được làm UI crash; không biến confidence thành phần trăm nếu semantics/range chưa được duyệt.
- Unknown/malformed response phải fail closed thành lỗi schema có thể quan sát, không render dữ liệu một phần như thành công.

## 5. Validation implications

Validation nhiều lớp, không xem `accept="image/*"` là kiểm tra bảo mật:

1. UI: presence, trạng thái loading, hướng dẫn sớm.
2. Client adapter: loại/kích thước/dimension/decoding theo policy đã duyệt.
3. Server: xác thực nội dung và giới hạn độc lập theo PRD/NFR.
4. Mapping: schema, nullability, range và unknown error code.

Thông báo frontend phải an toàn, actionable và chỉ cho retry khi contract đánh dấu retryable. Timeout, auth, rate limit, unsupported/invalid input và service unavailable dùng taxonomy canonical ở PRD §10, không định nghĩa schema song song.

## 6. Accessibility và responsive implications

- Upload hiện có click/Enter/Space và một số ARIA; toàn luồng vẫn **Unverified**.
- Adapter/state layer phải cung cấp trạng thái loading/error/success cho live announcement và giữ focus hợp lý khi transition.
- Candidate selection cần semantics chọn được; canvas cần alternative path; validation/error không chỉ truyền đạt bằng màu.
- Test matrix viewport/zoom/touch/keyboard/screen reader là quyết định/gate, không tự đặt target mới tại đây.

## 7. Demo truthfulness và production guard

- Fixture phải được gắn nhãn demo và không được mô tả là inference theo input.
- Claim EfficientNet-B3, 250 Kanji, JLPT N5/N4 là **Unverified**.
- Build/config production phải fail hoặc loại mock adapter theo cơ chế có test.

## 8. Proposed AI boundary và data flow

Biên này là **Target/Proposed**, không phải backend implementation và không kế thừa endpoint/schema của reference:

```text
frontend input -> local normalization/validation -> recognition adapter
  -> approved versioned contract -> AI service boundary
  -> runtime DTO validation -> mapper -> frontend view-model/state
```

- Component chỉ phụ thuộc adapter/view-model; transport, model và training artifact ở ngoài frontend boundary.
- Adapter chỉ được nối sau khi gate reproducibility, artifact integrity, license/provenance và contract trong [PRD](./prd.md) đạt.
- Mapping/checkpoint/preprocessing phải có version/provenance tương thích, nhưng cách backend thực hiện không thuộc tài liệu này.
- Kanji_Smart chỉ là **Reference implementation — external, unverified**; xem [phân tích kỹ thuật duy nhất](./reference-implementations/kanji-smart.md). Không copy endpoint hay toàn schema reference vào frontend contract.

## 9. Decisions/dependencies còn mở

Policy đổi tab; input limits; stale/cancel behavior; contract/version/auth; timeout/retry; metadata/nullability; accessibility target; viewport matrix; production mock guard; reproducibility/license/artifact/domain fit của reuse candidate. Trạng thái và owner canonical theo [PRD §16](./prd.md#16-open-questions-và-decision-log); công việc triển khai theo [frontend implementation plan](./frontend-implementation-plan.md).
