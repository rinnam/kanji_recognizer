# User stories và tiêu chí chấp nhận

> Persona/CUJ là tạm thời cho đến khi có nghiên cứu. Requirement chuẩn nằm trong [PRD](./prd.md#8-yêu-cầu-ưu-tiên).

## PER-1 — Người cần tra ký tự từ hình dạng · CUJ-01

### US-001 — Vẽ một ký tự
**Liên kết:** FR-001

- **Given** tab Vẽ tay đang mở và canvas rỗng, **When** người dùng vẽ bằng pointer, **Then** nét xuất hiện và hành động Nhận diện trở nên khả dụng.
- **Given** canvas chưa có nét, **When** người dùng xem hành động Nhận diện, **Then** hành động bị vô hiệu hóa.

### US-002 — Sửa đầu vào vẽ
**Liên kết:** FR-002

- **Current bug:** với nhiều nét, Hoàn tác có thể làm mất hai nét/đưa canvas về giấy trắng trong khi `hasInk` vẫn `true`.
- **Target:** **Given** đã có nhiều nét, **When** chọn Hoàn tác, **Then** chỉ nét gần nhất bị bỏ, phần còn lại được giữ và `hasInk` phản ánh đúng nội dung canvas; phải có kiểm thử hồi quy.
- **Given** có nét, **When** chọn Xóa, **Then** canvas trở về giấy trống và không thể gửi.
- **Given** thanh độ dày, **When** thay giá trị, **Then** nét mới dùng kích thước hiển thị trong khoảng 4–36 px.

### US-003 — Nhận phản hồi theo trạng thái
**Liên kết:** FR-004

- **Given** có đầu vào, **When** gửi, **Then** UI chuyển sang loading và chặn gửi lặp.
- **Given** xử lý thành công, **When** response được nhận, **Then** UI chuyển success.
- **Given** xử lý ném lỗi, **When** lỗi được bắt, **Then** UI hiển thị error và hành động Thử lại.

### US-004 — Xem và chọn ứng viên
**Liên kết:** FR-005

- **Given** danh sách mock thành công, **When** hiển thị, **Then** ứng viên được sort confidence giảm dần và phần tử đầu được chọn.
- **Given** nhiều ứng viên, **When** chọn một hàng khác, **Then** thẻ chi tiết chuyển sang ứng viên đó.
- **Current caveat:** kết quả là dữ liệu cố định, không phụ thuộc nét vẽ/ảnh.

## PER-1 · CUJ-02 — Ảnh tải lên

### US-005 — Chọn, kéo-thả, thay hoặc gỡ ảnh
**Liên kết:** FR-003

- **Given** tab Tải ảnh, **When** click hoặc nhấn Enter/Space trên dropzone, **Then** file picker được mở.
- **Given** file được chọn/drop, **When** client tạo object URL, **Then** preview và nút gỡ hiển thị.
- **Current bug:** **Given** có preview, **When** gỡ ảnh, **Then** preview và `fileObj` bị xóa, hành động gửi bị khóa, nhưng `fileInputRef.value` không được reset nên chọn lại cùng file có thể không phát sinh `change`.
- **Target:** gỡ ảnh phải reset cả preview, `fileObj` và giá trị file input; cần kiểm thử chọn lại cùng file.
- **Unverified:** loại nội dung, kích thước và ảnh hợp lệ chưa được kiểm tra thực chất.

### US-006 — Hiểu và phục hồi lỗi
**Liên kết:** FR-004, NFR-003

- **Given** xử lý thất bại, **When** UI chuyển error, **Then** có thông báo và nút Thử lại.
- **Target/Proposed:** **Given** lỗi dịch vụ có code, **When** client nhận lỗi, **Then** thông báo phù hợp, không rò dữ liệu và chỉ retry khi `retryable=true`.

## PER-1 · CUJ-03 — Lịch sử

### US-007 — Xem kết quả gần đây trong phiên
**Liên kết:** FR-006

- **Given** một lượt success, **When** lịch sử cập nhật, **Then** top candidate được thêm đầu danh sách cùng thumbnail/thời gian hiện tại.
- **Given** hơn 8 lượt, **When** thêm lượt mới, **Then** chỉ 8 mục mới nhất còn lại.
- **Given** reload trang, **When** ứng dụng khởi tạo lại, **Then** lịch sử mất; đây là Current behavior, không phải persistence.

## PER-2 — Người dùng bàn phím/thiết bị đa dạng

### US-008 — Hoàn tất bằng bàn phím và công nghệ hỗ trợ
**Liên kết:** NFR-001

- **Given** chỉ dùng bàn phím, **When** đi qua tab/upload/actions/candidates, **Then** thứ tự focus, tên và trạng thái đều hiểu được. **Status: Unverified.**
- **Given** trạng thái loading/error/success đổi, **When** dùng screen reader, **Then** thay đổi quan trọng được thông báo. **Status: Proposed; live region chưa được xác minh.**
- **Given** không thể vẽ canvas, **When** cần nhập liệu, **Then** upload là con đường tương đương. Chất lượng tương đương: TBD.

### US-009 — Hoàn tất trên viewport hỗ trợ
**Liên kết:** NFR-004

- **Given** viewport/zoom trong ma trận hỗ trợ TBD, **When** hoàn tất CUJ-01/02, **Then** không mất nội dung hoặc action và không có scroll ngang ngoài ý muốn. **Status: Unverified.**

## PER-3 — Kỹ sư tích hợp · CUJ-04 (future service)

### US-010 — Gửi request thật
**Liên kết:** FR-007, NFR-003

- **Given** contract được phê duyệt và service sẵn sàng, **When** submit ảnh, **Then** client gọi endpoint cấu hình, xử lý timeout/cancel và không gọi mock.
- **Given** service unavailable, **When** nhận lỗi retryable, **Then** client cho phép retry an toàn và không nhân đôi side effect.

### US-011 — Nhận ứng viên có truy vết
**Liên kết:** FR-008, NFR-003

- **Given** response thành công, **When** validate schema, **Then** có `request_id`, `model_version`, predictions đúng thứ tự và field bắt buộc.
- **Given** schema sai/empty ngoài contract, **When** client xử lý, **Then** chuyển lỗi có kiểm soát thay vì render dữ liệu không an toàn.

### US-012 — Metadata, quyền riêng tư và an toàn
**Liên kết:** FR-009, NFR-002

- **Given** metadata thiếu/null theo contract, **When** render, **Then** UI dùng fallback, không crash và không bịa giá trị.
- **Given** ảnh được gửi, **When** xử lý, **Then** retention/access/logging tuân theo chính sách đã duyệt. Chính sách hiện TBD.

### US-013 — Không nhầm mock với production
**Liên kết:** FR-010

- **Given** app ở mock mode, **When** người dùng xem kết quả, **Then** nhãn demo hiển thị rõ.
- **Given** build production, **When** cấu hình vẫn trỏ mock, **Then** launch gate/build check phải thất bại. Cơ chế: Proposed.

Phạm vi UX frontend được tổng hợp tại [PRD frontend](./frontend-prd.md); thứ tự thực hiện nằm trong [kế hoạch frontend](./frontend-implementation-plan.md). Các story và PRD sản phẩm vẫn là nguồn chuẩn.
