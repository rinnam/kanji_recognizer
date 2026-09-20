# PRD frontend — Kanji Recognizer

> **Quyền ưu tiên:** [PRD sản phẩm](./prd.md) là nguồn chuẩn. Nếu tài liệu này mâu thuẫn với PRD sản phẩm về mục tiêu, phạm vi, yêu cầu, CUJ, story, mốc hoặc hợp đồng, `docs/prd.md` được ưu tiên. Tài liệu này chỉ diễn giải phạm vi frontend và không tạo yêu cầu sản phẩm mới.

## 1. Metadata và phạm vi bằng chứng

| Thuộc tính | Giá trị |
|---|---|
| Trạng thái | Bản đề xuất frontend đã đối chiếu source; chưa phải phê duyệt phát hành |
| Phạm vi | `frontend/src/**`, `frontend/package.json`, cấu trúc repository và bộ tài liệu hiện có |
| Trạng thái dùng trong tài liệu | **Current**, **Target/Proposed**, **Blocked**, **TBD/Open Decision**, **Unverified** |
| Không phải bằng chứng | Nội dung quảng bá trên UI, dữ liệu mock và kiểu view-model không chứng minh model/API thực |

- **Current:** có bằng chứng trong checkout.
- **Target/Proposed:** hành vi mong muốn, chưa được xem là đã triển khai.
- **Blocked:** chưa thể hoàn tất vì phụ thuộc chưa tồn tại hoặc chưa được duyệt.
- **TBD/Open Decision:** cần quyết định có thẩm quyền.
- **Unverified:** có dấu hiệu triển khai nhưng chưa có kiểm thử/audit đủ để xác nhận.

## 2. Baseline đã kiểm chứng

| Năng lực | Current |
|---|---|
| Nền tảng | React 19, TypeScript, Vite. |
| Vẽ | Canvas logic 480×480; brush 4–36 px; undo và clear. |
| Upload | Mở bằng click hoặc bàn phím, kéo-thả, preview và gỡ ảnh. |
| State kết quả | `idle`, `loading`, `success`, `error`. |
| Nhận diện | Mock cố định trả sau 1.400 ms; không đọc nội dung ảnh và không gọi mạng. |
| Kết quả | Candidate được sort giảm dần và có thể chọn để xem chi tiết. |
| Lịch sử | State dễ mất khi reload, giới hạn 8 mục gần nhất. |
| Khoảng trống | Không có backend, model/checkpoint, API mạng, automated tests, CI hoặc analytics. |

**Unverified UI claims:** các nội dung “EfficientNet-B3”, “250 Kanji” và “JLPT N5/N4” chưa được artifact trong repository chứng minh. Chúng phải được xem là nội dung prototype, không phải năng lực sản phẩm. Tài liệu này không chỉnh sửa UI.

## 3. Phạm vi frontend

### Trong phạm vi

- Bảo toàn và làm rõ luồng nhập một ký tự bằng vẽ hoặc ảnh.
- Quản lý vòng đời input, state nhận diện, candidate selection và lịch sử phiên.
- Trình bày demo trung thực, không khiến mock bị hiểu là inference thật.
- Hoàn thiện accessibility/responsive theo yêu cầu chuẩn đã có.
- Chuẩn bị seam tích hợp qua adapter sau khi contract được duyệt.
- Tạo bằng chứng chất lượng tự động cho hành vi frontend.

### Ngoài phạm vi

- Chọn kiến trúc model, tập dữ liệu, số class, phạm vi JLPT hoặc tuyên bố accuracy.
- Sáng tạo endpoint, schema, auth, timeout, retry hoặc SLO khi chưa được duyệt.
- Xây backend, dịch vụ metadata/từ điển, analytics hay persistence lịch sử.
- Thay đổi mục tiêu, CUJ, yêu cầu hoặc mốc chuẩn trong PRD sản phẩm.

## 4. Persona, CUJ và ánh xạ yêu cầu

Persona và hành trình không được định nghĩa lại tại đây. Dùng trực tiếp **CUJ-01..CUJ-04** và **US-001..US-013** trong [PRD sản phẩm](./prd.md) và [user stories](./user-stories.md).

| Nhu cầu UX frontend | Yêu cầu chuẩn duy nhất | Story tham chiếu |
|---|---|---|
| Vẽ, sửa nét và gửi input | FR-001, FR-002, FR-004 | US-001, US-002, US-003 |
| Upload, preview, gỡ và phục hồi lỗi | FR-003, FR-004 | US-005, US-006 |
| Xem/sort/chọn candidate | FR-005 | US-004 |
| Lịch sử phiên tối đa 8 | FR-006 | US-007 |
| Bàn phím/công nghệ hỗ trợ và responsive | NFR-001, NFR-004 | US-008, US-009 |
| Tích hợp dịch vụ thật | FR-007, FR-008, FR-009; NFR-002, NFR-003 | US-010, US-011, US-012 |
| Minh bạch demo và bằng chứng chất lượng | FR-010, NFR-005 | US-013 |

## 5. State, invariant và edge case

### State và invariant

- Input mode chỉ là `draw | upload`; chuyển tab không được suy diễn là đã xóa dữ liệu tab kia.
- Recognition state chỉ là `idle | loading | success | error`.
- Submit chỉ khả dụng khi tab hiện hành có input hợp lệ theo quy tắc đã duyệt và không ở `loading`.
- Một submit đang chạy không được tạo submit lặp; kết quả phải gắn với input đã gửi.
- Success phải có candidate hợp lệ trước khi chọn mặc định; candidate hiển thị theo thứ tự confidence giảm dần.
- History chỉ lưu trong phiên, prepend kết quả mới và giữ tối đa 8 mục; không được mô tả là persistence.
- Mock và service thật phải có cấu hình phân biệt rõ; production không được vô tình dùng mock.

### Edge case cần quyết định/kiểm chứng

- Canvas rỗng, nét cực ngắn, nhiều pointer, resize/zoom và lỗi xuất ảnh.
- File không phải ảnh, MIME giả, file quá lớn, ảnh hỏng, thay/gỡ liên tục và object URL cần revoke.
- Đổi tab/input trong khi loading; response cũ đến muộn; retry sau khi input đổi; stale result.
- Response rỗng, confidence bất thường, candidate trùng, metadata thiếu/null và text quá dài.
- Reload làm mất history; viewport hẹp, zoom cao, landscape, touch và bàn phím-only.

## 6. Nội dung demo trung thực

- Mọi kết quả mock phải có nhãn demo rõ, nhất quán ở trạng thái loading, kết quả và lịch sử liên quan.
- Không dùng từ ngữ khiến người dùng suy ra model thật, coverage, JLPT, accuracy hoặc latency đã đo.
- Candidate cố định phải được mô tả là fixture minh họa, không phụ thuộc input.
- Không biến các claim chưa xác minh “EfficientNet-B3”, “250 Kanji”, “JLPT N5/N4” thành tiêu chí chấp nhận.
- Việc sửa copy UI là thay đổi source riêng, thuộc FR-010/US-013, cần review và bằng chứng riêng.

## 7. Accessibility và responsive

- **Current:** upload có click/Enter/Space; một số semantics/ARIA và CSS responsive tồn tại.
- **Unverified:** chưa có audit hoặc ma trận test; chưa xác nhận focus tabs, thông báo live state, semantics candidate, canvas alternative, contrast, zoom, screen reader, touch và viewport.
- **Target/Proposed:** đáp ứng NFR-001 và NFR-004 với ma trận thiết bị/viewport/zoom và bằng chứng test được duyệt; không tự đặt chuẩn mới trong tài liệu này.

## 8. Biên tích hợp đề xuất

Giữ một adapter frontend (vị trí hiện tại là `frontend/src/api.ts`) giữa component và nguồn nhận diện. Component chỉ tiêu thụ view-model; adapter chịu trách nhiệm gọi transport, validate runtime, ánh xạ DTO/error, timeout/cancel và mock/service mode.

**Blocked:** chưa được hiện thực service thật cho đến khi contract và backend được phê duyệt. Tài liệu này cố ý **không nêu endpoint**. Mọi method/path, payload, response, auth, version, limit, error taxonomy và policy retry/timeout là TBD theo PRD chuẩn.

## 9. Rủi ro, phụ thuộc và quyết định mở

| Mục | Trạng thái |
|---|---|
| UI khiến mock bị hiểu là model thật | Rủi ro cao; xử lý theo FR-010/US-013. |
| Upload thiếu validation và quản lý object URL | Target/Proposed; phụ thuộc chính sách NFR-002. |
| Race/stale result khi input đổi | TBD/Open Decision về hành vi hủy/bỏ response. |
| Accessibility/responsive chưa audit | Unverified; phụ thuộc ma trận kiểm thử được duyệt. |
| Contract, backend, metadata và error taxonomy | Blocked/TBD; không phát minh tại frontend. |
| Test/CI/release evidence | Chưa tồn tại; phụ thuộc NFR-005 và gate phát hành. |
| Analytics/telemetry và quyền riêng tư | Ngoài baseline; chỉ thêm sau quyết định chuẩn. |

Quyết định mở tối thiểu: quy tắc input hợp lệ; stale-result behavior; giới hạn upload; accessibility target; ma trận viewport; contract/version/auth; timeout/cancel/retry; metadata/nullability; production mock guard; tiêu chí release.

## 10. Truy vết

- Mục tiêu chuẩn: **G1..G4** trong [PRD](./prd.md).
- Hành trình chuẩn: **CUJ-01..CUJ-04**.
- Yêu cầu chuẩn: **FR-001..FR-010**, **NFR-001..NFR-005**.
- Story chuẩn: **US-001..US-013** trong [user stories](./user-stories.md).
- Mốc chuẩn: **M0..M5**; kế hoạch frontend chỉ tham chiếu tại [frontend implementation plan](./frontend-implementation-plan.md).
- Bằng chứng chi tiết: [requirements analysis](./requirements-analysis.md) và [feature specification](./feature-specification.md).

## 11. Tiêu chí chấp nhận tài liệu

- Nêu rõ quyền ưu tiên của `docs/prd.md` và không tạo requirement/milestone sản phẩm mới.
- Phân biệt Current, Target/Proposed, Blocked, TBD/Open Decision và Unverified.
- Baseline khớp source; claim UI chưa xác minh được gọi tên rõ.
- Mọi yêu cầu UX chỉ ánh xạ tới FR-001..FR-010, NFR-001..NFR-005 và US-001..US-013.
- Biên tích hợp dùng adapter, không phát minh endpoint/contract.
- Có state/invariant/edge case, demo truthfulness, accessibility/responsive, rủi ro, phụ thuộc và truy vết.
- Link tương đối, ID chuẩn, UTF-8 và kiểm tra Markdown/repository đều hợp lệ.
