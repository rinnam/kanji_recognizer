# ADR 0005 — Đồng bộ toàn bộ thư viện cá nhân

- **Trạng thái:** Accepted — quyết định thiết kế cho Spec 001, ngày 2026-11-23.
- **Phạm vi:** Web và ứng dụng di động dùng chung bản web của Spec 001.

## Quyết định

Thay thế phần chọn bản ghi để truyền trong mục 3 của [ADR 0001](0001-two-way-smart-merge.md).
Mỗi lượt pull lấy toàn bộ dữ liệu thuộc owner, gồm tombstone. Push gửi các phiên bản cục bộ
đang chờ xác nhận. Client cũ vẫn có thể gọi API delta. Quy tắc LWW, phạm vi owner, ID,
tombstone và khoảng debounce trong ADR 0001 vẫn áp dụng.

Lý do là một từ sửa ngoại tuyến lúc 09:00 có thể tới server lúc 11:00, sau lượt pull
lúc 10:00 của điện thoại. Full pull phát hiện từ đó dù thời điểm sửa cũ hơn. Đổi lại,
lượng dữ liệu nhận mỗi lần tăng theo kích thước thư viện. Nếu cần delta trở lại, phải có
mốc theo thứ tự commit của server để bao phủ cả dữ liệu tới muộn và tombstone.

## Hai phiên bản có cùng thời điểm sửa

Với cùng owner, ID và updatedAt, server giữ nội dung đã lưu và bỏ qua push ngang thời điểm.
Khi pull, client nhận nguyên phiên bản server nếu bản ghi không còn lần sửa đang chờ.
Quy tắc áp dụng cho cả hai bản đang hoạt động và trường hợp sửa đối đầu với xóa.
Nếu còn phiên bản cục bộ chưa xác nhận, client giữ phiên bản đó để gửi lượt kế tiếp.
Kiểm tra trạng thái chờ và ghi kết quả merge phải diễn ra trong cùng giao dịch.
