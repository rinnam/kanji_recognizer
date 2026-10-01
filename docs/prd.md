# PRD — Kanji Recognizer

> **Current:** owner đã xóa backend và frontend cũ; repository chưa có runtime UI, và lần triển khai gộp Stage 1–3 khởi tạo backend mới cho Platform + Library mà không chạm recognition. **Target/Proposed:** trải nghiệm nhận diện từ nét vẽ/ảnh và Learning System được giới hạn tại §18; React 19.3.0 + Vite 8.3.1 chỉ là Target frontend về sau, frontend chưa được tạo. **TBD/Open Decision:** mô hình recognition, dữ liệu, phạm vi ký tự, chỉ tiêu và kế hoạch phát hành.

## 1. Metadata

| Thuộc tính | Giá trị |
|---|---|
| Trạng thái tài liệu | Bản chuẩn hiện hành cho phạm vi repository |
| Phiên bản | 2.6 |
| Ngôn ngữ | Tiếng Việt |
| Chủ sở hữu / người phê duyệt | TBD/Open Decision |
| Nguồn bằng chứng | `frontend/src/**`, `frontend/package.json`, cây file repository |
| Cập nhật gần nhất | Theo commit chứa thay đổi này; không suy diễn ngày/owner |

Tài liệu áp dụng cấu trúc PRD theo thông lệ ngành; **không tuyên bố là mẫu chính thức của Google**.

### rule clean code:
Review and refactor the entire codebase according to the following 12 Clean Code rules:
Meaningful Naming
Single Responsibility
Avoid Magic Numbers and Strings
Keep Functions Small
Avoid Deep Nesting
Avoid Unnecessary Type Assertions
Minimize ESLint Rule Disabling
Separate Test Helpers from Test Cases
Deterministic Tests
Explicit Assertions
Readable Code Formatting
Clear Project Structure & Folder Organization

### Change log

| Phiên bản | Thay đổi |
|---|---|
| 2.6 | Ghi nhận Target đã chọn: React 19 + Vite, Node.js không chốt framework, deck/folder lồng nhau có drag/drop persistence, Active Recall/Flashcard SRS/Focus Recall/Typing Quiz, Web Speech API/TTS, và quick lookup Jisho/Mazii vẫn bị gate nguồn/license. |
| 2.5 | Hiệu chỉnh phạm vi: N3, 11 lesson × 80 từ và bốn trường từ vựng chỉ là fixture minh họa; course/lesson/item và metadata validation phải cấu hình được theo content profile/import policy. |
| 2.4 | Trước đây đã chuẩn hóa bốn trường và N3 11×80 thành Target cố định; nội dung này được hiệu chỉnh bởi 2.5. |
| 2.3 | Bổ sung Learning System được giới hạn rõ: thư viện/deck, flashcard, quiz, SRS/review và tiến độ; toàn bộ là Target/Proposed và không hàm ý backend đã sẵn sàng. |
| 2.2 | Thêm định hướng reuse-vs-redesign từ Kanji_Smart ở trạng thái Reference implementation — external, unverified; bổ sung scope, risk, open decision và gate Reference→Current. |
| 2.1 | Hiệu chỉnh Current theo source: lỗi undo, vòng đời state khi đổi tab, reset file input; chuẩn hóa endpoint đề xuất, persona, truy vết, pipeline/model và trạng thái accessibility/responsive. |
| 2.0 | Hiệu chỉnh theo repository: tách Current/Proposed/TBD; thay tuyên bố backend/model không có bằng yêu cầu truy vết. |
| 1.0 | Tài liệu cũ; có các khẳng định không được checkout hiện tại chứng minh. |

### Quyết định Full/Lite, ba phase và phase gate

- **Loại PRD: Full.** Lý do: phạm vi có discovery, UX, hợp đồng tích hợp, privacy/security, đo lường và launch gate; bản Lite không đủ để biểu diễn các phụ thuộc này.
- **Phase 1 — Define:** §§2–8 xác lập vấn đề, bằng chứng, persona, mục tiêu, NSM, giả thuyết, phạm vi và yêu cầu.
- **Phase 2 — Design:** §§9–12 mô tả flow, business rules, biên kỹ thuật, hợp đồng đề xuất, NFR, phụ thuộc và rủi ro.
- **Phase 3 — Deliver:** §§13–17 mô tả milestone hiện hữu, đo lường, launch/rollback, câu hỏi mở và truy vết.
- **Gate Define → Design:** **TBD/Open Decision**; chưa có bằng chứng phê duyệt persona, giả thuyết, NSM hoặc phạm vi.
- **Gate Design → Deliver:** **Blocked** bởi hợp đồng, privacy/security, model/service và tiêu chí kiểm chứng chưa được duyệt.
- **Gate Launch:** **Blocked**; không suy diễn phê duyệt từ tài liệu hay mã nguồn.

### Anchor và trạng thái bằng chứng

| Anchor | Trạng thái | Bằng chứng/điều kiện |
|---|---|---|
| Problem/Current | **Current** | `frontend/src/**`, `frontend/package.json`; chỉ chứng minh prototype/mock. |
| Persona/CUJ | **Unverified** | Chưa có nghiên cứu người dùng trong repository. |
| NSM/hypothesis | **TBD/Open Decision** | Chưa có analytics, baseline, target hoặc owner. |
| Requirements | **Current** với FR-001..FR-006; **Target/Proposed/Blocked/Unverified** theo từng dòng | Source và catalogue truy vết; không suy rộng từ mock. |
| API/model/data | **Target/Proposed** hoặc **TBD/Open Decision** | Không có backend/model/checkpoint/contract được duyệt trong checkout. |
| Launch | **Blocked** | Chưa đạt các gate và chưa có approval evidence. |

## 2. Bối cảnh và vấn đề

UI hiện cho phép nhập hình dạng một ký tự bằng canvas hoặc ảnh và xem danh sách ứng viên minh họa. Điều này chứng minh luồng tương tác, không chứng minh nhu cầu người dùng hay khả năng nhận diện. Vấn đề cần kiểm chứng: người dùng có cần tra ký tự từ hình dạng, và trải nghiệm nào giúp họ xác nhận ứng viên phù hợp mà không gây hiểu nhầm về độ chính xác.

## 3. Hiện trạng và trạng thái đích

| Khía cạnh | Current — bằng chứng repository | Target/Proposed |
|---|---|---|
| Client | React 19, TypeScript, Vite; `frontend/package.json` | Client tích hợp dịch vụ sau khi hợp đồng được duyệt. |
| Nhập liệu | Canvas logic 480×480; chỉnh nét, hoàn tác, xóa; chọn/kéo-thả ảnh | Xác thực đầu vào và phản hồi lỗi nhất quán. |
| Nhận diện | `mockRecognize` chờ 1,4 giây và trả hằng `MOCK_PREDICTIONS` | Dịch vụ nhận ảnh và trả ứng viên có thứ hạng. |
| Kết quả | UI idle/loading/error/success; chọn ứng viên | Dữ liệu thật, có khả năng giải thích nguồn và chất lượng. |
| Lịch sử | State trong phiên, tối đa 8 mục | Chính sách lưu giữ chỉ được thêm sau quyết định riêng tư. |
| Nền tảng | Responsive CSS; vùng upload thao tác bằng chuột/bàn phím | Đánh giá accessibility và thiết bị mục tiêu. |
| Backend/model/API/test/CI/analytics | Không có trong checkout | Thiết kế, triển khai và kiểm chứng riêng. |

### Định hướng reuse-vs-redesign

Kanji_Smart tại commit `dba80b70c19ec8ead3f734ab28d2fa1cf4e9cf89` có trạng thái **Reference implementation — external, unverified**; không phải Current. Phân tích kỹ thuật duy nhất nằm tại [reference implementation register](./reference-implementations/kanji-smart.md).

| Khu vực | Định hướng canonical |
|---|---|
| Cách tiếp cận AI training | **Reuse candidate:** học theo pipeline reference, chỉ sau gate Reference→Current; không mặc định model, class, JLPT, accuracy hay endpoint. |
| UI, design system, responsive, accessibility | **Redesign:** thiết kế theo chuẩn của project hiện tại, không sao chép UI reference. |
| Learning System | **Target/Proposed:** semantics, requirement và acceptance được định nghĩa tại §18; implementation, backend/persistence và các `LS-OD-*` vẫn Open/Blocked. |
| Ngắt/quản lý quảng cáo | **TBD/Open Decision:** người dùng muốn khác reference nhưng hành vi, quyền kiểm soát và policy chưa được định nghĩa. |

## 4. Mục tiêu và ranh giới phạm vi

### Mục tiêu

- **G1:** Kiểm chứng luồng nhập một ký tự → yêu cầu nhận diện → xem/chọn ứng viên.
- **G2:** Thiết lập hợp đồng tích hợp có phiên bản, xác thực và lỗi rõ ràng trước khi triển khai dịch vụ.
- **G3:** Đo chất lượng tác vụ và chất lượng hệ thống bằng baseline/target được phê duyệt.
- **G4:** Không trình bày mock như kết quả mô hình thật.
- **G5 — Target/Proposed:** mở rộng candidate đã xác nhận thành vòng lặp học có giới hạn `lưu → luyện → review → xem tiến bộ`, theo LG-01..LG-05 và các gate ở §18; mục tiêu này chưa phải năng lực Current.

### Ranh giới phạm vi

**Won't Do** (ngoài định hướng của PRD này; đưa vào cần một quyết định phạm vi mới):

- Nhận diện chuỗi nhiều ký tự hoặc dịch văn bản.
- Biến sản phẩm thành từ điển tổng quát hoặc nền tảng cộng tác/xã hội.
- Dùng nội dung mock/prototype để công bố accuracy, latency, SLA hoặc năng lực model.

**Won't Have trong phạm vi hiện tại** (có thể xem xét sau gate mới, không phải cam kết):

- Lưu ảnh lâu dài hoặc persistence lịch sử nhận diện khi chưa có quyết định privacy/retention.
- Account, đồng bộ đa thiết bị hoặc bất kỳ mô hình identity/persistence cụ thể nào trước khi `LS-OD-01`, `LS-OD-06` và `LS-OD-08` được quyết định. Đây là lựa chọn mở của Learning System, không phải một `Won't Do` vĩnh viễn.
- Cam kết kiến trúc/thuật toán mô hình, bộ dữ liệu, số class hoặc phạm vi JLPT khi chưa có artifact/evidence.
- Deadline, launch date hoặc owner khi chưa được chỉ định.
- Triển khai Learning System trước các slice gate §18.4, contract persistence/privacy và open decision tương ứng; quảng cáo vẫn chưa có semantics, UX hay acceptance được duyệt.
- Sao chép UI, endpoint hoặc schema từ reference; coi kiến trúc model trong reference là quyết định của project.

Phân biệt: **Won't Do** loại khỏi định hướng hiện tại; **Won't Have** chỉ loại khỏi phạm vi/gate hiện tại. Learning System là **Target/Proposed** có điều kiện, còn recognition prototype là **Current**; không được dùng mục này để suy diễn rằng account, backend hoặc local persistence đã được chọn.

## 5. Nguyên tắc

1. **Bằng chứng trước tuyên bố:** Current phải truy về mã hoặc kiểm tra.
2. **Mock minh bạch:** dữ liệu demo phải được nhận diện là demo.
3. **Một tác vụ, trạng thái rõ:** luôn phân biệt chưa nhập, sẵn sàng, đang xử lý, thành công và lỗi.
4. **Privacy by design:** tối thiểu hóa dữ liệu; chưa lưu/persist trước khi có quyết định.
5. **Accessible by default:** không phụ thuộc riêng màu sắc, chuột hoặc màn hình rộng.

## 6. Persona tạm thời và CUJ

Chưa có nghiên cứu người dùng. Các persona sau là **Unverified**; bảng năm cột không khẳng định segment đã được xác nhận.

| Persona | Bối cảnh/tác vụ | Nhu cầu/kết quả mong muốn | Pain/rào cản cần kiểm chứng | Quyết định chi phối |
|---|---|---|---|---|
| **PER-1 — Người cần tra ký tự từ hình dạng** | Có hình dạng ký tự nhưng chưa biết cách nhập bằng text | Nhập nhanh và xác nhận ứng viên phù hợp | Tần suất, cách hiện tại, mức tin cậy và metadata cần thiết đều TBD | CUJ-01..CUJ-03; G1; FR-001..FR-006 |
| **PER-2 — Người dùng bàn phím/thiết bị cảm ứng** | Hoàn thành tác vụ với modality/viewport khác nhau | Không bị phụ thuộc chuột, màu sắc hoặc màn hình rộng | Chất lượng tương đương giữa draw/upload và chuẩn accessibility đều TBD | CUJ-01..CUJ-02; NFR-001, NFR-004 |
| **PER-3 — Kỹ sư tích hợp** | Kết nối client với dịch vụ tương lai | Contract có version, lỗi có cấu trúc và khả năng quan sát | Backend/contract/owner/SLO chưa tồn tại hoặc chưa duyệt | CUJ-04; G2; FR-007..FR-009; NFR-002..NFR-003 |

| CUJ | Mô tả | Persona | Story/decision mapping |
|---|---|---|---|
| **CUJ-01** | Vẽ một ký tự, sửa nét, gửi, xem và chọn ứng viên | PER-1, PER-2 | US-001..US-004; FR-001, FR-002, FR-004, FR-005 |
| **CUJ-02** | Chọn/kéo-thả ảnh, gỡ/thay ảnh, gửi và xử lý lỗi | PER-1, PER-2 | US-005, US-006; FR-003, FR-004 |
| **CUJ-03** | Xem lại kết quả gần đây trong phiên | PER-1 | US-007; FR-006 |
| **CUJ-04 (future)** | Client gọi dịch vụ thật và xử lý success/error an toàn | PER-3 | US-010..US-012; FR-007..FR-009 |

## 7. Khung chỉ số thành công

Không có analytics/baseline/target hiện tại. PRD chọn **đúng một NSM**; các đại lượng còn lại chỉ là guardrail/diagnostic và không phải NSM.

### North Star Metric (NSM) duy nhất — Target/Proposed

| Thành phần metric contract | Định nghĩa |
|---|---|
| Tên | **Tỷ lệ hoàn tất tác vụ tra ký tự có xác nhận** |
| Câu hỏi quyết định | Trải nghiệm có giúp người dùng đi từ input hợp lệ đến xác nhận một ứng viên hay không? |
| Numerator | Số tác vụ đủ điều kiện có sự kiện xác nhận ứng viên; sự kiện/cách xác nhận cuối cùng: **TBD/Open Decision**. |
| Denominator | Số tác vụ đủ điều kiện bắt đầu; session boundary, deduplication và điều kiện loại trừ: **TBD/Open Decision**. |
| Segment | Input mode và accessibility modality; taxonomy/consent: **TBD/Open Decision**. |
| Cửa sổ đo | **TBD/Open Decision**. |
| Baseline | **TBD/Open Decision**; chưa có analytics. |
| Target | **TBD/Open Decision**; không bịa ngưỡng. |
| Nguồn dữ liệu/owner | **TBD/Open Decision**; chỉ instrument sau privacy review. |
| Guardrail | Lỗi, latency, retry, abandonment, recognition quality và accessibility completion; định nghĩa/ngưỡng đều **TBD/Open Decision**. |

### 7. Giả thuyết có cấu trúc

| Giả thuyết | Đối tượng/vấn đề | Thay đổi/phạm vi trong | Kết quả quan sát | Ngoài phạm vi | Trạng thái |
|---|---|---|---|---|---|
| Nếu PER-1 có thể nhập một ký tự bằng vẽ hoặc ảnh và xác nhận trong danh sách ứng viên, tác vụ tra từ hình dạng sẽ khả dụng hơn cách hiện tại của họ. | PER-1; nhu cầu/tần suất/cách hiện tại chưa được xác minh | CUJ-01..CUJ-03 và UI prototype | NSM; quan sát usability định tính; baseline/target TBD | Không chứng minh model, accuracy, class/JLPT, PMF hay launch readiness | **Unverified** |
| Nếu mock được gắn nhãn rõ và mọi claim có trạng thái, người dùng/đội dự án sẽ ít nhầm demo với inference thật. | Người xem prototype và đội triển khai | G4, FR-010, US-013 | Comprehension check và production guard; tiêu chí TBD | Không lựa chọn model/API hay cam kết chất lượng | **Target/Proposed** |

Kế hoạch kiểm chứng và evidence register nằm ở [product-discovery.md](./product-discovery.md); tài liệu đó không định nghĩa lại giả thuyết chuẩn.

## 8. Yêu cầu ưu tiên

Trạng thái: **Implemented (frontend)**, **Proposed**, **Blocked**, **Unverified**. P0/P1 là ưu tiên tương đối, không phải deadline.

| ID | P | Trạng thái | Yêu cầu | Tiêu chí chấp nhận tóm tắt |
|---|---:|---|---|---|
| FR-001 | P0 | Implemented (frontend) | Vẽ một ký tự trên canvas. | Pointer tạo nét; dữ liệu ảnh được cập nhật; có nét mới bật gửi. |
| FR-002 | P0 | Implemented (frontend); known bug | Chỉnh độ dày, hoàn tác một nét, xóa toàn bộ. | Range 4–36 px; **Current bug:** undo có thể làm mất hai nét/đưa canvas về giấy trắng nhưng `hasInk` vẫn `true`. **Target:** chỉ bỏ đúng nét gần nhất, đồng bộ `hasInk` với canvas và có kiểm thử hồi quy; clear đưa canvas về rỗng. |
| FR-003 | P0 | Implemented (frontend) | Chọn/kéo-thả ảnh và xem preview. | Click, Enter/Space hoặc drop mở/chọn ảnh; có thể gỡ ảnh. Kiểm tra định dạng nội dung: Unverified. |
| FR-004 | P0 | Implemented (frontend) | Quản lý trạng thái nhận diện. | UI có idle/loading/success/error; không gửi khi thiếu đầu vào hoặc đang loading. |
| FR-005 | P0 | Implemented (mock) | Hiển thị, sắp xếp và chọn ứng viên. | Mock được sort giảm dần theo `confidence`; chọn ứng viên cập nhật chi tiết. |
| FR-006 | P1 | Implemented (frontend) | Lịch sử trong phiên. | Thêm kết quả đầu tiên, mới nhất trước, tối đa 8; reload làm mất dữ liệu. |
| FR-007 | P0 | Proposed; Blocked | Gửi ảnh tới dịch vụ nhận diện. | Hợp đồng §10 được phê duyệt; không gọi mock; mọi trạng thái/lỗi được ánh xạ. |
| FR-008 | P0 | Proposed; Blocked | Dịch vụ trả danh sách ứng viên có thứ hạng. | Response đạt schema; thứ tự/range/confidence semantics được quyết định và kiểm thử. |
| FR-009 | P1 | Proposed; Blocked | Cung cấp metadata học tập. | Nguồn, bản quyền, nullability và locale được duyệt; UI xử lý thiếu trường. |
| FR-010 | P0 | Proposed | Phân biệt demo và dữ liệu thật. | Mọi môi trường mock hiển thị nhãn rõ; production gate chặn mock ngoài ý muốn. |
| NFR-001 | P0 | Unverified | Accessibility. | Điều hướng bàn phím, tên truy cập, focus, tương phản và thông báo động được audit theo chuẩn TBD. |
| NFR-002 | P0 | Proposed | Privacy và bảo mật đầu vào. | Chính sách dữ liệu, giới hạn, MIME/content validation, transport/auth được duyệt và test. |
| NFR-003 | P0 | Proposed | Reliability/observability. | Timeout, retry, correlation/error code, logs/metrics và SLO đều TBD trước launch. |
| NFR-004 | P1 | Partially implemented | Responsive. | UI có CSS responsive; ma trận viewport/thiết bị và pass criteria còn TBD. |
| NFR-005 | P0 | Unverified | Chất lượng build. | Build/lint pass; cần bổ sung chiến lược test và CI trước launch. |

Chi tiết và bằng chứng: [requirements-analysis.md](./requirements-analysis.md). PRD sở hữu requirement và acceptance criteria **cấp hệ thống** (bao gồm A1..A8 tại §18.15); [user-stories.md](./user-stories.md) sở hữu acceptance criteria **cấp story** theo Given/When/Then. Hai cấp liên kết truy vết nhưng không thay thế hoặc sao chép nhau.

### Ánh xạ MoSCoW

| Nhóm | ID hiện hữu | Lý do |
|---|---|---|
| **Must Have** | FR-001..FR-005, FR-007, FR-008, FR-010; NFR-001..NFR-003, NFR-005 | P0 hoặc gate bắt buộc để luồng cốt lõi, tích hợp và vận hành an toàn. Các mục Blocked/Unverified không được xem là hoàn tất. |
| **Should Have** | FR-006, FR-009, NFR-004 | Các mục P1 hỗ trợ lịch sử, metadata và responsive; vẫn cần quyết định/kiểm chứng tương ứng. |
| **Could Have** | Không có | Không tạo requirement mới để lấp nhóm. |
| **Won't Have** | Xem Scope exclusions §4 | Không gán ID requirement mới. |

**Deviation có chủ đích:** skill có thể dùng convention ID/MoSCoW khác, nhưng FR/NFR/US/CUJ/G/M là ID đã phát hành nên được giữ nguyên; MoSCoW là lớp ánh xạ, không đổi ID hay tạo requirement/milestone.

## 9. User flow, business rules và trạng thái

### User flow chuẩn

```text
Chọn mode draw hoặc upload
  → tạo/chọn input
  → kiểm tra readiness phía client
  → gửi
  → loading
  → success: xem/chọn candidate → thêm history phiên
     hoặc error: hiển thị lỗi → retry khi phù hợp
```

- **Input:** `draw` hoặc `upload`. **Current:** `DrawCanvas` render có điều kiện nên chuyển sang upload sẽ unmount canvas; quay lại draw khởi tạo giấy trắng và gọi `onChange(false, null)`, làm mất hình vẽ. State ảnh upload nằm ở `App` nên preview/file được giữ khi đổi tab. **Target/TBD:** chính sách giữ hay xóa state mỗi tab cần được duyệt và kiểm thử.
- **Readiness:** nút gửi chỉ khả dụng khi tab hiện tại có nét/preview và không loading.
- **Recognition:** `idle → loading → success | error`; retry gọi lại cùng hành động.
- **Result:** ứng viên đầu tiên được chọn mặc định; người dùng có thể chọn ứng viên khác.
- **History:** chỉ thêm sau success và chỉ tồn tại trong React state.
- **Empty/invalid:** frontend hiện dựa vào browser `accept="image/*"`; chưa xác thực nội dung, kích thước hay ảnh trống.

### Business rules

1. Một lượt chỉ dùng input của tab đang chọn; chính sách giữ/xóa input tab không hoạt động là **TBD/Open Decision**.
2. Không gửi khi input rỗng hoặc khi request đang loading.
3. **Current:** `mockRecognize` không đọc nội dung input; mọi kết quả phải được nhận diện là demo theo FR-010.
4. Candidate được sắp theo `confidence` giảm dần và candidate đầu được chọn mặc định; semantic/range của confidence là **TBD/Open Decision** cho dịch vụ thật.
5. Chỉ success mới thêm lịch sử; lịch sử là state trong phiên, mới nhất trước, tối đa 8 mục.
6. Validation phía browser không thay thế content validation phía dịch vụ; limit, auth, timeout, retry và retention là **TBD/Open Decision**.
7. Khi schema/metadata không đạt contract đã duyệt, client phải fail có kiểm soát; fallback không được bịa dữ liệu.
8. Chi tiết edge case/AC thuộc [user-stories.md](./user-stories.md) và [feature-specification.md](./feature-specification.md), được truy qua ID hiện hữu.

## 10. Hợp đồng API/data đề xuất — chưa triển khai

### Biên kỹ thuật

- **Current boundary:** browser React/TypeScript/Vite; input, object URL, mock call, result và history phiên ở client. Không có network request đang chạy.
- **Target/Proposed boundary:** client adapter ↔ hợp đồng dịch vụ versioned ↔ dịch vụ nhận diện/metadata; vị trí triển khai, model runtime, storage và observability là **TBD/Open Decision**.
- DTO hiện tại trong `frontend/src/types.ts` là view-model của mock, **không** phải schema backend canonical.
- PRD sở hữu trạng thái/biên hợp đồng đề xuất; đặc tả chi tiết chỉ tham chiếu, không biến ví dụ thành API Current.

> Endpoint, transport, authentication và giới hạn đều **TBD/Open Decision**. Ví dụ dưới đây là biên thiết kế để thảo luận, không phải API tồn tại hay canonical đã duyệt.

### Request đề xuất

`POST /api/kanji/recognize`, `multipart/form-data`, field `image`; hỗ trợ JSON data URL là quyết định TBD. Chỉ một ký tự mỗi request là giả định sản phẩm cần kiểm chứng.

### Response thành công đề xuất

```json
{
  "request_id": "string",
  "predictions": [
    {
      "kanji": "string",
      "confidence": 0.0,
      "reading_on": ["string"],
      "reading_kun": ["string"],
      "meaning_vi": "string",
      "jlpt": null,
      "strokes": null
    }
  ],
  "model_version": "string"
}
```

- `predictions`: mảng, thứ tự giảm dần; min/max item **TBD**.
- `kanji`, `confidence`: bắt buộc nếu semantic được duyệt; range/diễn giải confidence phải được tài liệu hóa.
- `reading_on`, `reading_kun`: mảng có thể rỗng.
- `meaning_vi`, `jlpt`, `strokes`: nullable/required cuối cùng **TBD**, phụ thuộc nguồn metadata.
- `request_id`, `model_version`: đề xuất cho truy vết; định dạng TBD.

### Lỗi đề xuất

```json
{
  "request_id": "string",
  "error": { "code": "INVALID_IMAGE", "message": "string", "retryable": false }
}
```

Taxonomy tối thiểu đề xuất: `INVALID_REQUEST`, `UNSUPPORTED_MEDIA_TYPE`, `IMAGE_TOO_LARGE`, `INVALID_IMAGE`, `TIMEOUT`, `RATE_LIMITED`, `SERVICE_UNAVAILABLE`, `INTERNAL_ERROR`. HTTP mapping, limit, timeout và retry policy: TBD.

## 11. NFR, accessibility, privacy và vòng đời dữ liệu

- **Accessibility:** tab semantics/focus behavior, canvas alternative, live announcements cho loading/error/result, target size và contrast cần audit; canvas vẽ tay có thể cần phương án upload tương đương.
- **Responsive:** kiểm thử viewport/zoom/orientation; breakpoint hiện hữu không đồng nghĩa đạt chuẩn.
- **Privacy:** ảnh/nét vẽ có thể là dữ liệu người dùng. Hiện chỉ xử lý trên client mock; object URL và state sống trong phiên. Với dịch vụ thật, mục đích, retention, vị trí xử lý, xóa, consent và quyền truy cập đều TBD.
- **Security:** không có control backend để xác minh. Cần threat model cho upload, validation theo nội dung, giới hạn tài nguyên, auth/rate limit nếu phù hợp, dependency review và log redaction.
- **Reliability/performance:** baseline, SLO, timeout, concurrency và budget đều TBD; không công bố số liệu trước khi đo.

## 12. Phụ thuộc và rủi ro

Phụ thuộc đề xuất: backend, artifact mô hình, mapping class, tập đánh giá, nguồn metadata có quyền sử dụng, hạ tầng vận hành và quan sát. Với reuse candidate còn cần reproduction report, dependency lock, artifact hash/provenance, license review và domain-fit evaluation; xem [reference analysis](./reference-implementations/kanji-smart.md).

| Rủi ro | Tác động | Giảm thiểu đề xuất |
|---|---|---|
| Mock bị hiểu là AI thật | Mất niềm tin | Nhãn demo; FR-010; gate production. |
| Chưa biết phạm vi ký tự/chất lượng | Không thể đặt kỳ vọng | Chốt dataset/evaluation protocol trước target. |
| Upload độc hại hoặc quá lớn | Bảo mật/ổn định | Validation nhiều lớp và limit sau threat model. |
| Metadata sai/không có quyền | Sai trải nghiệm/pháp lý | Xác minh nguồn, schema và license. |
| Canvas khó tiếp cận | Loại trừ người dùng | Duy trì upload tương đương; audit trợ năng. |
| Tài liệu lệch code | Tích hợp lỗi | Traceability và review cùng thay đổi contract. |
| Reference thiếu artifact/dependency và path không khớp | Không tái lập được pipeline | Giữ external/unverified; reproduction report và artifact provenance trước reuse. |
| README reference nói B0 nhưng source dùng B3 | Chọn model từ claim mâu thuẫn | Không chọn B3/B0 theo reference; benchmark và quyết định riêng. |
| Reference không có `LICENSE` được track dù README nói MIT | Rủi ro pháp lý | Xác minh license cho code/data/weight/metadata trước mọi reuse. |
| Domain fit chưa được chứng minh | Chất lượng lab không đại diện input thật | Evaluation protocol và ground truth phù hợp người dùng mục tiêu. |
| “Cơ chế học”/“ngắt quảng” mơ hồ | Scope hoặc UX bị diễn giải sai | Giữ Blocked/TBD và đóng câu hỏi ở §16 trước thiết kế/triển khai. |

### Gate Reference → Current

Một phần của Kanji_Smart chỉ được chuyển từ **Reference implementation — external, unverified** sang Current khi đồng thời có: (1) license/provenance hợp lệ cho code, data, mapping, checkpoint/weight và metadata; (2) reproduction từ nguồn hợp lệ với dependency, lệnh, hash và log; (3) artifact integrity và mapping/preprocessing versioned; (4) evaluation/domain fit với limitation được ghi nhận; (5) contract/privacy/security được duyệt mà không kế thừa ngầm endpoint reference; và (6) approval có owner. Thiếu bất kỳ điều kiện nào thì reuse vẫn **Blocked/Unverified**.

## 13. Milestone theo exit criteria

1. **M0 — Baseline tài liệu:** Current/Proposed tách rõ; link/ID nhất quán; build/lint được ghi nhận.
2. **M1 — Discovery:** giả thuyết ưu tiên có nghiên cứu; persona/CUJ được xác nhận hoặc sửa; metric có định nghĩa.
3. **M2 — Contract ready:** API/error/nullability/limits/privacy/security được quyết định; contract tests được thiết kế.
4. **M3 — Service validated:** có artifact và dịch vụ; evaluation reproducible; observability và failure tests đạt gate TBD.
5. **M4 — Integration ready:** bỏ mock ở chế độ target; E2E, accessibility, responsive và rollback rehearsal đạt.
6. **M5 — Launch decision:** owner phê duyệt metrics, risk acceptance, support/incident/rollback; ngày phát hành vẫn TBD.

## 14. Analytics đề xuất

Event: `input_started`, `input_cleared`, `image_selected`, `recognition_submitted`, `recognition_succeeded`, `recognition_failed`, `candidate_selected`, `retry_requested`. Thuộc tính tối thiểu: input mode, candidate rank, duration bucket, error code, client version. Không thu ảnh, nét vẽ, nội dung ký tự hoặc định danh người dùng trước privacy review. Schema, consent, retention và công cụ: TBD.

## 15. Launch và rollback gate

Launch chỉ được cân nhắc khi: không còn mock ngoài môi trường demo; contract/evaluation/security/privacy/accessibility/operations được phê duyệt; build/lint/test/CI đạt; dashboards/alerts và owner trực vận hành được xác định; metric threshold được điền. Rollback cần feature flag hoặc cơ chế vô hiệu hóa tích hợp, trạng thái client hữu ích khi service tắt, và rehearsal có bằng chứng. Cơ chế cụ thể: TBD.

## 16. Open questions và decision log

### Open questions

Không tự gán người hoặc ngày. `Owner = TBD/Open Decision` nghĩa là vai trò/người chịu trách nhiệm chưa được chỉ định; `Due Date = TBD/Open Decision` không phải deadline ngầm.

| Câu hỏi | Owner | Due Date | Status |
|---|---|---|---|
| Ai là người dùng ưu tiên, tác vụ/cách thay thế thường gặp và persona/CUJ nào được xác nhận? | TBD/Open Decision | TBD/Open Decision | Open |
| Phạm vi ký tự, ngôn ngữ metadata, nguồn dữ liệu, quyền sử dụng và evaluation protocol là gì? | TBD/Open Decision | TBD/Open Decision | Open |
| Input/API format, endpoint/version, limit, timeout, authentication, retry và retention là gì? | TBD/Open Decision | TBD/Open Decision | Open; integration **Blocked** |
| Confidence có được hiển thị không; semantic, calibration và cách diễn giải là gì? | TBD/Open Decision | TBD/Open Decision | Open |
| NSM contract, baseline/target, analytics consent và data owner là gì? | TBD/Open Decision | TBD/Open Decision | Open |
| Chuẩn accessibility, browser/device support, SLO và launch gate evidence là gì? | TBD/Open Decision | TBD/Open Decision | Open |
| “Cơ chế học” nghĩa là lesson progression, spaced repetition, quiz/review, feedback sau nhận diện hay một cơ chế khác; flow và acceptance là gì? | TBD/Open Decision | TBD/Open Decision | Open; implementation **Blocked** |
| “Ngắt/quản lý quảng cáo” nghĩa là tần suất/vị trí, quyền skip/tắt, không gián đoạn phiên học, subscription/consent hay policy khác? | TBD/Open Decision | TBD/Open Decision | Open; implementation **Blocked** |
| Phần nào của pipeline reference được phép reuse; ai xác minh reproduction, license, artifact provenance và domain fit? | TBD/Open Decision | TBD/Open Decision | Open; reuse **Blocked** |
| Ai sở hữu/phê duyệt PRD, phase gate, vận hành, rollback; launch channel là gì? | TBD/Open Decision | TBD/Open Decision | Open; approval **Unverified** |

### Decision log

| Quyết định | Trạng thái | Lý do/bằng chứng |
|---|---|---|
| PRD là nguồn sự thật | Accepted | Giảm trùng lặp và lệch thuật ngữ. |
| Gọi sản phẩm hiện tại là prototype/mock | Accepted | `api.ts` và `mockData.ts`. |
| Không khẳng định model/backend/class/JLPT | Accepted | Không có artifact tương ứng trong checkout. |
| Hợp đồng §10 chỉ là Proposed | Accepted | Chưa có API triển khai. |
| Kanji_Smart chỉ là Reference implementation — external, unverified | Accepted | Commit cố định có pipeline tham khảo nhưng thiếu artifact, license và reproduction evidence; endpoint/model không canonical. |
| UI là redesign; AI pipeline là reuse candidate; Learning System là Target/Proposed theo §18; quảng cáo vẫn TBD | Accepted | Learning semantics/acceptance đã được đặc tả nhưng readiness vẫn Blocked/Open; quảng cáo chưa được diễn giải. |
| Các quyết định sản phẩm/kỹ thuật còn lại | Open | Cần evidence và owner. |

## 17. Truy vết

| Mục tiêu/CUJ | Yêu cầu | Stories | Đặc tả |
|---|---|---|---|
| G1, CUJ-01 | FR-001, FR-002, FR-004, FR-005 | US-001–US-004 | UI state machine, input/result specs |
| G1, CUJ-02 | FR-003, FR-004 | US-005, US-006 | Upload/validation taxonomy |
| G1, CUJ-03 | FR-006 | US-007 | Session history |
| G2, CUJ-04 | FR-007–FR-009 | US-010–US-012 | Proposed API contract |
| G3 | NFR-001, NFR-004–005 | US-008, US-009 | Accessibility/responsive/quality |
| G4 | FR-010 | US-013 | Nhãn demo/minh bạch mock |

Xem catalogue đầy đủ tại [requirements-analysis.md](./requirements-analysis.md) và story tại [user-stories.md](./user-stories.md). Phạm vi và thứ tự triển khai frontend được diễn giải tại [PRD frontend](./frontend-prd.md) và [kế hoạch triển khai frontend](./frontend-implementation-plan.md); tài liệu này vẫn là nguồn chuẩn và được ưu tiên.

## 18. Learning System — Target/Proposed, bounded

> **Ranh giới trạng thái:** Toàn bộ §18 là đặc tả sản phẩm **Target/Proposed**. Repository hiện không chứng minh account, persistence, backend, scheduler, analytics hay đồng bộ. Không được gọi các năng lực dưới đây là Current trước khi có implementation và evidence. Chi tiết UI thuộc [Learning Experience UI Skill](./skills/learning-experience-ui-skill.md).

### 18.1 Nguồn cảm hứng và phép biến đổi

KotoBase công khai mô tả thư mục lồng nhau, focus recall, flashcard thường/tiến độ/SRS với bốn mức Again–Hard–Good–Easy, typing quiz, kanji dictionary và dashboard. Kanji Recognizer chọn **Target/Proposed** gồm thư mục Kanji/vocabulary nhiều tầng có drag/drop persistence, Active Recall, Flashcard SRS, Focus Recall, Typing Quiz và vòng lặp review, đồng thời giữ visual Ink Desk và handoff trực tiếp từ kết quả nhận diện. Không sao chép wording, layout, artwork, token hay source code. Nguồn tham khảo: [KotoBase README](https://github.com/Vcoch27/kotobase/blob/main/README.md), [DESIGN](https://github.com/Vcoch27/kotobase/blob/main/DESIGN.md), source/previews công khai tại commit cây `303832123de78f20bbfb28ec86d6d8818b6d96a2` khi khảo sát; hành vi reference vẫn **external, unverified** cho project này.

### 18.2 Problem/opportunity, goals và non-goals

**Vấn đề/cơ hội.** Luồng nhận diện kết thúc sau khi người dùng xác nhận ứng viên; kiến thức vừa tìm được không có đường lưu, luyện nhớ hoặc đo tiến bộ. Một vòng lặp `nhận diện → xác nhận → lưu → luyện → review đúng hạn → xem tiến bộ` có thể biến lookup rời rạc thành học tập có chủ đích; nhu cầu và tác động vẫn cần discovery.

**Goals Target/Proposed**

- **LG-01:** cho phép lưu ký tự đã xác nhận vào thư viện/deck mà không nhập lại metadata.
- **LG-02:** hỗ trợ active recall bằng flashcard và quiz có feedback rõ.
- **LG-03:** lập lịch review có thể giải thích, ổn định và kiểm thử được.
- **LG-04:** thể hiện tiến độ từ event thực, không biến streak/điểm thành áp lực hoặc claim “đã thành thạo”.
- **LG-05:** bảo toàn quyền kiểm soát dữ liệu, accessibility và recovery khi offline/lỗi.

**Non-goals cho release slices ở §18.4:** course/lesson ngoài mô hình configurable tại LS-FR-019; social leaderboard; quảng cáo; AI tạo mnemonic; handwriting grading theo thứ tự nét; import/export hay chia sẻ deck; cộng tác; cam kết đồng bộ đa thiết bị; thay đổi recognition model/API. Các mục có thể được quyết định sau nhưng không nằm trong requirement hiện tại.

### 18.3 Personas và JTBD — Unverified

| Persona | JTBD | Bối cảnh | Kết quả mong muốn | Evidence |
|---|---|---|---|---|
| **LP-1 Shape-first learner** | Khi vừa nhận diện được một kanji lạ, tôi muốn lưu đúng mục vào nhóm học để có thể nhớ lại sau. | Đi từ `PER-1`; lookup từ vẽ/ảnh. | Không nhập lại; biết đã lưu ở đâu. | Unverified |
| **LP-2 Self-directed reviewer** | Khi có ít thời gian, tôi muốn ôn đúng các mục đến hạn và biết bước tiếp theo. | Phiên ngắn, gián đoạn, có thể mobile. | Queue hữu hạn, resume được, lịch kế tiếp rõ. | Unverified |
| **LP-3 Progress-conscious learner** | Khi duy trì học, tôi muốn xem xu hướng chính xác mà không bị streak gây tội lỗi. | Cần phản hồi tuần/tháng. | Phân biệt activity, recall và forecast. | Unverified |
| **LP-4 Access-diverse learner** | Khi dùng bàn phím, touch, zoom hoặc AT, tôi muốn hoàn tất mọi mode thiết yếu. | Mở rộng `PER-2`. | Không phụ thuộc hover, màu, gesture hoặc vẽ. | Unverified |

### 18.4 Scope và release slices

Identity và persistence là **khả năng cần quyết định**, không phải kiến trúc đã chọn. `LS-OD-01` có thể dẫn đến local-only, account/cloud hoặc hybrid; `LS-OD-06` và `LS-OD-08` tiếp tục chặn các claim về sync, conflict, retention và deletion. Prototype local ở LS0 chỉ là evidence UX và không đóng bất kỳ quyết định nào.

| Slice | Phạm vi | Điều kiện vào/ra |
|---|---|---|
| **LS0 — Contract & prototype** | IA, view-model, local prototype states, usability; không tuyên bố persistence thật. | Ghi rõ các quyết định identity/storage/privacy còn mở và có user research tối thiểu; UI gắn nhãn giả lập. Không cần chọn account/backend chỉ để thử nghiệm UX. |
| **LS1 — Library & handoff** | Tạo/đổi tên/xóa deck; lưu/bỏ mục; detail; dedupe; recognition-to-save. | Có repository/persistence contract phù hợp với mô hình identity đã được duyệt, migration và error recovery; implementation có thể local hoặc remote nhưng vẫn **TBD** cho đến khi `LS-OD-01` được đóng. |
| **LS2 — Practice** | Flashcard self-rating không lập lịch; quiz meaning/reading; session summary. | Có item metadata/source đủ tin cậy; scoring/normalization được duyệt. |
| **LS3 — SRS & Progress** | Due queue, scheduler §18.8, review log, streak và dashboard. | Clock/time-zone/idempotency/privacy/analytics contract, migration và scheduler tests qua gate. |

Slice là thứ tự phụ thuộc, không phải deadline hay cam kết backend.

### 18.5 Domain model và invariants

| Entity | Trường khái niệm tối thiểu | Invariant |
|---|---|---|
| **Library** | `ownerRef`, `createdAt`, preferences | Một library logic cho mỗi scope người dùng; identity model TBD. |
| **Deck** | `deckId`, `parentId?`, `sortPosition`, `name`, `description?`, `createdAt`, `updatedAt`, `archivedAt?` | Cây tối đa 8 tầng; cùng library/owner; không cycle; thứ tự sibling `(sortPosition, deckId)`; archive không xóa review history. |
| **LearningItem** | `itemId`, `character`, `readings[]`, `meanings[]`, `sourceRef`, `metadataVersion`, `createdAt` | Identity canonical/dedupe key TBD; metadata thiếu vẫn render an toàn; source/provenance bắt buộc. |
| **DeckMembership** | `deckId`, `itemId`, `addedAt`, `sourceContext?` | Một membership cho mỗi cặp; một item có thể thuộc nhiều deck. |
| **Card** | `cardId`, `itemId`, `template`, `prompt`, `answer`, `enabled` | Card là cách hỏi, không nhân bản item; template versioned. |
| **SrsState** | `cardId`, `phase`, `dueAt`, `stepIndex?`, `intervalDays`, `ease`, `lapses`, `lastReviewedAt?`, `schedulerVersion` | Một state hiện hành/card; update atomic và idempotent theo `reviewId`. |
| **ReviewLog** | `reviewId`, `cardId`, `occurredAt`, `rating`, before/after snapshot, `sessionId` | Append-only; không chứa ảnh nhận diện. |
| **QuizAttempt** | `attemptId`, `mode`, `scope`, answers[], score, timestamps | Score tái tính được từ version + normalization rule. |
| **StudySession** | `sessionId`, `kind`, ordered card IDs, cursor, started/completedAt | Resume không đổi ngầm thứ tự; bỏ qua không phải rating. |

**Lifecycle:** item `active → archived → deleted`; card `new → learning → review → relearning → suspended`. Xóa deck chỉ xóa membership sau confirm; xóa item toàn cục phải nêu ảnh hưởng card/log và theo policy TBD. “Learned/mastered” không là trạng thái tuyệt đối; UI dùng trạng thái scheduler và performance quan sát được.

### 18.6 Functional requirements

| ID | Requirement Target/Proposed | Priority | Verification summary |
|---|---|---|---|
| **LS-FR-001** | Tạo, đổi tên, lồng tối đa 8 tầng, kéo-thả/reorder bền vững, archive/xóa deck và hiển thị count chính xác. | Must LS1 | CRUD; valid move/reorder; cross-library/cycle/depth rejection; lifecycle/confirm/error tests. |
| **LS-FR-002** | Lưu/bỏ một LearningItem vào một hoặc nhiều deck; dedupe membership và phản hồi idempotent. | Must LS1 | Double-submit không tạo bản sao; saved state khớp reload. |
| **LS-FR-003** | Tìm, lọc, sắp xếp thư viện theo text/deck/study state/due; reset filter rõ. | Should LS1 | Query/state/empty/no-results/keyboard tests. |
| **LS-FR-004** | Hiển thị detail với kanji, meaning, âm Hán Việt, On/Kun, JLPT, số nét, provenance và trạng thái deck/SRS; field thiếu không crash. TTS tiếng Nhật dùng Web Speech API/TTS khi capability có sẵn và phải có control/fallback minh bạch. | Must LS1 | Partial-data, locale/reading mapping, speech capability/fallback tests. |
| **LS-FR-005** | Từ candidate đã xác nhận, mở save sheet mang theo immutable candidate/item reference và source `recognition`; người dùng chọn/tạo deck rồi lưu. | Must LS1 | AC §18.15 A1. |
| **LS-FR-006** | Flashcard tạo snapshot thứ tự, front/back, reveal trước rating, shuffle tùy chọn và resume. | Must LS2 | AC A2; deterministic seed khi test. |
| **LS-FR-007** | Flashcard practice cho phép `Know/Review again` nhưng không đổi SRS; bỏ qua được ghi riêng. | Must LS2 | Không tạo ReviewLog SRS. |
| **LS-FR-008** | Typing Quiz hỗ trợ `meaning recall` và `reading input`; chọn deck/scope, số câu, summary và retry missed. | Must LS2 | AC A3; IME-safe normalization versioned. |
| **LS-FR-009** | Quiz chấm sau submit; không dùng confidence nhận diện làm correctness. | Must LS2 | Correct/incorrect/accepted variants có explanation. |
| **LS-FR-010** | Review queue lấy card `dueAt <= effectiveNow`, ưu tiên relearning/learning trước review rồi new theo limit TBD. | Must LS3 | Clock-fixed ordering tests. |
| **LS-FR-011** | Chỉ sau reveal mới nhận `Again/Hard/Good/Easy`; update theo §18.8 và hiển thị preview interval. | Must LS3 | AC A4; idempotency/concurrency tests. |
| **LS-FR-012** | Review session resume được; rating đã commit không lặp; `Undo last rating` chỉ nếu policy §18.8 cho phép. | Must LS3 | Reload/offline/duplicate request tests. |
| **LS-FR-013** | Progress hiển thị activity, accuracy, reviewed/due/new/learning/review counts, streak và forecast với range/time zone. | Must LS3 | AC A5; reconcile từ event/log. |
| **LS-FR-014** | Cho phép suspend/reset card với confirm và giải thích tác động; không xóa ReviewLog. | Should LS3 | State transition/audit tests. |
| **LS-FR-015** | Mọi màn hình có empty/loading/error/offline/partial/success và retry an toàn. | Must | Matrix §18.11. |
| **LS-FR-016** | Khi capability phụ thuộc backend chưa có, UI không giả thành công; prototype phải ghi rõ local/mock. | Must | Content + integration gate. |
| **LS-FR-017** | Người dùng có thể xem/xóa dữ liệu học theo scope policy đã duyệt; export là open decision. | Must trước launch | Privacy acceptance và deletion verification. |
| **LS-FR-018** | Metadata vocabulary là optional ở mô hình chung; content profile/import policy được chọn mới quyết định trường nào bắt buộc, locale/script, số lượng tối thiểu và provenance/license. | Must content import | Fixture theo từng profile chứng minh rule cấu hình được; thiếu field chỉ fail khi policy tương ứng yêu cầu; UI vẫn render partial data an toàn. |
| **LS-FR-019** | Hỗ trợ course → lesson → item với số lượng và loại content tùy ý; thứ tự ổn định và publish validation lấy từ cấu hình course/import policy, không từ N3 hoặc cardinality hardcode. | Must content import | Test course không đều và profile khác nhau; `JLPT N3 Core` 11×80/880 được giữ như fixture minh họa tùy chọn, không phải contract sản phẩm toàn cục. |

### 18.6A Quick lookup and speech boundaries

- **Target:** automatic quick lookup concepts may surface Jisho/Mazii entry points from confirmed Kanji/vocabulary context; no network call, scraping, endpoint, cache, or imported data is approved or implemented.
- The user's deferred source/licensing decision remains a hard compliance gate: verify terms, attribution, provenance, redistribution/cache limits, privacy, rate limits, and failure behavior before integration. Missing approval disables the capability without weakening provenance/license boundaries.
- Japanese pronunciation uses Web Speech API/TTS as a capability-gated Target. UI selects an available Japanese voice when possible, exposes play/stop and unavailable/error states, and never treats speech output as canonical reading data.
### 18.7 Session và quiz rules

**Flashcard practice:** scope là deck/filter snapshot; mặc định giữ thứ tự thư viện, shuffle tạo thứ tự cố định trong session; front hiển thị prompt duy nhất, back hiển thị answer + metadata; không có rating trước reveal; `Know`/`Review again` chỉ phân loại trong session, mục “again” quay lại sau khi các mục chưa xem đã đi qua một lần; tối đa lượt lặp, batch size và auto-advance là **TBD/Open Decision**; thoát lưu cursor nếu persistence tồn tại.

**Quiz modes:**

1. **Meaning recall:** kanji → chọn hoặc nhập meaning; MVP lựa chọn cụ thể là open decision vì distractor quality cần dữ liệu.
2. **Reading input:** kanji/vocabulary → nhập reading; normalize Unicode NFKC, trim, normalize whitespace và hiragana/katakana equivalence theo rule version; romaji acceptance, okurigana và nhiều đáp án là **TBD**.
3. **Recognition production/drawing quiz:** deferred; canvas recognition quality chưa đủ để dùng làm scoring ground truth.

Mỗi câu có một submit rõ; sau submit khóa answer, hiển thị đáp án chấp nhận được và lý do; retry missed tạo attempt mới, không sửa lịch SRS. Quiz và SRS là hai hệ riêng ở LS2/LS3; quiz score không tự động rating card.

### 18.8 Versioned Anki-style SM-2 family contract

Target chọn họ thuật toán Anki-style SM-2 deterministic và versioned; đây không phải tuyên bố exact Anki parity. `effectiveNow` do authority clock quyết định (**TBD: client hay server**). `dueAt` là timestamp UTC; ngày/streak render theo IANA time zone đã lưu.

**Defaults đề xuất:** `ease=2.50`, min `1.30`, max `3.00`; learning steps `[10 phút, 1 ngày]`; relearning `[10 phút]`; graduating interval `3 ngày`; easy interval `5 ngày`; fuzz **không dùng trong v1** để test/giải thích được. Các giá trị cần product validation trước LS3.

| Rating | Nghĩa người dùng | New/Learning | Review | Relearning |
|---|---|---|---|---|
| **Again** | Không nhớ/đáp án sai. | Về step 0, due +10 phút. | `lapses+1`, phase relearning, interval giữ để audit, due +10 phút, ease −0.20. | Về step 0, due +10 phút. |
| **Hard** | Nhớ với khó khăn đáng kể. | Lặp step hiện tại; due = max(10 phút, 1.5× khoảng step trước). | interval = max(previous+1, round(previous×1.20)); ease −0.15. | Lặp step; due +1 ngày sau step ngắn. |
| **Good** | Nhớ đúng với nỗ lực bình thường. | Tiến step; hết steps → review, 3 ngày. | interval = max(previous+1, round(previous×ease)). | Hết relearning → review, max(1, round(previous×0.70)) ngày. |
| **Easy** | Nhớ ngay, chắc chắn. | Graduate → review, 5 ngày. | interval = max(previous+1, round(previous×ease×1.30)); ease +0.15. | Graduate → review, max(3, round(previous×0.85)) ngày; ease +0.05. |

Clamp ease sau update. `dueAt = effectiveNow + interval`; interval ngày theo calendar hay 24 giờ là **TBD**, phải test DST. Preview interval dùng chính scheduler, không ước lượng UI. Queue mới chỉ đưa card `new` sau due cards; daily new/review limits TBD. Rating gửi `reviewId`, expected state version và scheduler version; conflict phải refetch, không double-apply. Undo, bury siblings, leech/suspend threshold, same-day cutoff và migration khi đổi scheduler là unresolved decisions.

### 18.9 Progress, streak và semantics

- **Activity:** `reviewsCompleted`, `quizQuestionsAnswered`, `practiceCardsViewed`, phân biệt theo ngày/range.
- **Recall:** `reviewSuccessRate = ratings(Hard|Good|Easy) / all committed ratings`; quiz accuracy riêng; không gộp hai mẫu số.
- **Inventory:** unique active items, cards theo `new/learning/review/relearning/suspended`, due now và forecast 7 ngày.
- **Consistency:** active day là ngày địa phương có ít nhất một committed SRS rating **hoặc** một quiz attempt completed; practice reveal đơn thuần không tính. Current streak gồm các ngày liên tục kết thúc ở hôm nay; nếu hôm nay chưa active nhưng hôm qua có, streak vẫn hiển thị “có thể tiếp tục hôm nay”, không reset sớm. Longest streak tính từ event history.
- **Time zone:** IANA zone snapshot trên event; đổi zone không rewrite lịch sử mặc định. Grace period, streak freeze và goal threshold không có trong v1.
- **Language:** dùng “đã ôn”, “đến hạn”, “độ chính xác quan sát được”; không dùng “mastered” hoặc dự đoán retention khi chưa có model/evidence.

Metric phải nêu range, denominator, freshness và empty state; biểu đồ có bảng/tóm tắt text tương đương. Target/baseline/owner cho learning metrics đều **TBD/Open Decision**.

### 18.10 Recognition-to-save workflow

```text
recognition success → chọn/xác nhận candidate → Save to library
→ resolve canonical item/dedupe → chọn deck hoặc tạo deck
→ save pending → success: saved state + link to item
                 → conflict: show existing memberships
                 → offline/retryable: keep explicit pending draft only if policy permits
                 → fatal: preserve selection and explain recovery
```

Chỉ candidate người dùng chọn được lưu; top candidate không tự lưu. Payload không cần ảnh gốc; chỉ `candidateRef/itemRef`, metadata version và source context tối thiểu. Nếu chưa có canonical item service, save bị blocked, không tự tạo metadata “thật” từ fixture. Đổi candidate sau mở sheet phải không làm đổi item đang chuẩn bị lưu. Save trùng là success idempotent và hiển thị deck hiện có.

### 18.11 State matrix

| Surface | Empty | Loading | Error/partial | Offline |
|---|---|---|---|---|
| Library | Hướng dẫn nhận diện/lưu hoặc tạo deck. | Skeleton giữ cấu trúc; không fake count. | Inline retry; partial metadata có nhãn. | Hiển thị snapshot freshness; mutation theo policy queue TBD. |
| Detail/save | Không selection → quay lại result/library. | Khóa duplicate submit, có progress name. | Giữ deck selection; conflict có recovery. | Không nói “đã lưu” trước commit; draft/pending phân biệt. |
| Flashcard/Quiz | Deck rỗng/no eligible items, CTA quản lý library. | Chuẩn bị snapshot/session. | Resume/restart; giữ answer chưa submit nếu an toàn. | Cho local session chỉ nếu data đủ; sync state rõ. |
| Review | “Đã xong hôm nay” khác “chưa có card”. | Queue count và card skeleton không nhảy layout. | Rating conflict/refetch; không double-apply. | Chỉ commit local nếu sync/idempotency đã duyệt; nếu không disable rating có giải thích. |
| Progress | No activity có hướng dẫn, không chart 0 gây hiểu nhầm. | Giữ range/filter. | Widget lỗi độc lập; timestamp freshness. | Dùng aggregate cache có nhãn hoặc unavailable. |

Mọi retry phải idempotent; destructive action cần confirm, progress và outcome; loading/error được announce nhưng không cướp focus liên tục.

### 18.12 Accessibility và responsive baseline

- Đáp ứng WCAG 2.2 AA là target; evidence/audit vẫn Unverified.
- Tất cả thao tác dùng keyboard: tab hợp lý; `Space/Enter` reveal; `1–4` rating chỉ sau reveal; shortcut không kích hoạt khi focus trong input và luôn có button tương đương.
- Focus sau route/modal/rating theo policy dự đoán được; dialog trap/restore focus; live region announce câu, answer state, save/rating result không lặp.
- Kanji có language metadata phù hợp; reading/meaning không bị screen reader nối mơ hồ; furigana/ruby có fallback text.
- Không dùng màu/animation/gesture duy nhất để truyền state; touch target tối thiểu 44×44 CSS px; hỗ trợ 200% zoom, portrait/landscape và reduced motion.
- Mobile dùng task-first single column + action bar an toàn; desktop có sidebar tùy không được che luồng chính. Không yêu cầu swipe; chart có text/table equivalent.

### 18.13 Data, privacy và security

- **Data classes:** library/deck/note (user content); review/quiz/session events (behavioral); recognition source context; optional account identifiers. Ảnh/nét vẽ không được sao chép vào learning data mặc định.
- **Minimization:** analytics không gửi answer text, image, drawing, readings/meaning tùy chỉnh hoặc stable user ID nếu không cần; pseudonymous/session identifiers và consent/legal basis là TBD.
- **Control:** xem, xóa item/deck/history và account-level deletion cần policy rõ; retention, backup deletion, export/portability, age/region requirements, encryption, auth và cloud/local storage đều **TBD/Open Decision**.
- **Integrity:** authorize mọi membership/state mutation; validate IDs/text/limits; append-only review audit; chống replay/double rating; không tin client timestamp cho scheduler nếu threat model yêu cầu server authority.
- Offline cache phải nêu thiết bị dùng chung, logout cleanup, encryption và conflict policy trước LS3.

### 18.14 Analytics/events — Proposed, consent-gated

| Event | Khi phát | Thuộc tính cho phép tối thiểu |
|---|---|---|
| `learning_save_started/completed/failed` | Mở/kết thúc save | source type, deck count, dedupe, error category; không image/character text mặc định |
| `deck_created/archived` | Mutation thành công | entry surface; không deck name |
| `study_session_started/completed/abandoned` | Lifecycle | kind, scope type, item count, duration bucket |
| `flashcard_revealed/classified` | Reveal/practice choice | template, ordinal, choice |
| `quiz_answer_submitted` | Submit | mode, correctness, latency bucket, normalization version; không raw answer |
| `srs_rating_committed` | Commit thành công | rating, phase before/after, interval buckets, scheduler version |
| `review_queue_viewed/completed` | Queue lifecycle | due/new counts, completed count |
| `progress_viewed` | Dashboard render | range, widget availability, freshness bucket |
| `learning_offline_conflict` | Sync conflict | operation type, resolution; không payload |

Events có schema/version, dedupe key và QA; failed attempt không được tính completed. Product metric proposal: recognition→save conversion, first-practice activation, due-review completion và returning active days; target/window/owner TBD, không thay NSM hiện tại trước decision log.

### 18.15 Acceptance criteria cấp hệ thống

Các tiêu chí A1..A8 là gate chấp nhận xuyên hệ thống do PRD sở hữu. Chúng xác định kết quả tích hợp/release, không thay cho kịch bản **Given/When/Then cấp story** trong [user-stories.md](./user-stories.md); mỗi learning story phải truy được tới requirement `LS-FR-*`, các `NFR-*` áp dụng và các `LS-OD-*` còn mở.

- **A1 — Save/dedupe (`LS-FR-002/005`):** Given candidate đã chọn, when lưu vào hai deck và retry cùng mutation, then một item/mỗi membership tồn tại, success chỉ rõ deck; ảnh/nét không nằm trong record.
- **A2 — Flashcard (`LS-FR-006/007`):** Given session snapshot, when reveal rồi phân loại, then thứ tự/resume ổn định, “Review again” quay lại theo rule và không tạo SRS rating.
- **A3 — Quiz (`LS-FR-008/009`):** Given reading input, when submit, then normalization version áp dụng nhất quán, answer khóa, feedback giải thích và retry missed tạo attempt mới.
- **A4 — SRS (`LS-FR-010..012`):** Given fixed clock/state, when mỗi rating commit, then before/after/due khớp §18.8; duplicate `reviewId` không áp dụng lần hai; rating không có trước reveal.
- **A5 — Progress (`LS-FR-013`):** Given known event fixture/time zone, when đổi range, then counts, denominator, streak và forecast tái lập; no-data khác zero và chart có text equivalent.
- **A6 — Resilience (`LS-FR-015/016`):** Given offline/timeout/conflict, when mutation không được xác nhận, then UI không báo success, giữ context hợp lý và cung cấp retry/refetch idempotent.
- **A7 — Accessibility:** keyboard-only và screen reader hoàn tất save, flashcard, quiz, review, progress; focus/status/labels/zoom/reduced-motion qua ma trận được duyệt.
- **A8 — Privacy (`LS-FR-017`):** telemetry sample không chứa prohibited payload; delete theo scope tạo outcome kiểm chứng được theo retention policy đã duyệt.

### 18.16 Dependencies, risks và mitigations

| Dependency/risk | Trạng thái | Mitigation/gate |
|---|---|---|
| Identity, persistence, sync/backend chưa có | Blocked/TBD | Chọn local/account model và contract trước LS1; không giả readiness. |
| Metadata source/license/canonical dedupe | Blocked/TBD | Provenance, version, nullability và reconciliation contract. |
| Recognition có thể sai | Current mock / Target unverified | User confirm bắt buộc; edit/remove; không tự lưu top candidate. |
| Scheduler/time zone/concurrency gây mất lịch | Proposed | Pure-function golden tests, authority clock, idempotency, migrations và audit log. |
| Quiz distractor/normalization gây chấm sai | Proposed | Version rules, accepted answers, explainability, content QA. |
| Streak/gamification gây áp lực | Proposed | Neutral copy, no punishment/leaderboard, opt-out visibility TBD. |
| Offline conflict/data loss | TBD | Capability gate, explicit freshness/pending, deterministic resolution. |
| Scope creep từ KotoBase | Controlled | Chỉ mechanics được ghi; visual/data model là original; non-goals enforced. |
| Accessibility của canvas/chart | Unverified | Alternative input và non-visual summary; audit trước launch. |

### 18.17 Unresolved decisions

| ID | Quyết định cần chốt | Owner | Due | Status |
|---|---|---|---|---|
| **LS-OD-01** | Account/cloud, local-only hay hybrid; migration giữa các mode? | TBD | TBD | Open |
| **LS-OD-02** | Quick lookup concept cho Jisho/Mazii đã chọn làm Target, nhưng source/API/terms/license, canonical key và editable fields? | TBD | TBD | **Deferred compliance gate**; không có terms approval hay call implementation |
| **LS-OD-03** | Nested hierarchy/drag-drop, depth 8 và child-first archive/delete đã chọn; deck naming uniqueness và item global delete? | TBD | TBD | Partially resolved Target; remaining policy Open |
| **LS-OD-04** | Typing Quiz đã chọn; accepted reading/meaning, romaji/okurigana và normalization rules? | TBD | TBD | Partially resolved Target; scoring rules Open |
| **LS-OD-05** | Versioned Anki-style SM-2 family và rating meanings đã chọn; constants, steps, day boundary, limits, undo/bury/leech, migration và golden fixtures? | TBD | TBD | Partially resolved Target; exact parity not claimed |
| **LS-OD-06** | Time authority, offline mutation queue và conflict resolution? | TBD | TBD | Open |
| **LS-OD-07** | Active-day definition có tính quiz; streak time-zone change policy? | TBD | TBD | Open |
| **LS-OD-08** | Retention/export/deletion/consent/age-region requirements? | TBD | TBD | Open |
| **LS-OD-09** | Learning NSM có thay NSM recognition hay là secondary metric? | TBD | TBD | Open |
| **LS-OD-10** | Supported locales, translations và reading display preferences? | TBD | TBD | Open |

### 18.18 Learning traceability

| Goal/JTBD | Requirements | Acceptance |
|---|---|---|
| LG-01; LP-1 | LS-FR-001..005 | A1, A6, A8 |
| LG-02; LP-2 | LS-FR-006..009 | A2, A3, A7 |
| LG-03; LP-2 | LS-FR-010..012, 014 | A4, A6, A7 |
| LG-04; LP-3 | LS-FR-013 | A5, A8 |
| LG-05; LP-4 | LS-FR-015..017 | A6..A8 |
