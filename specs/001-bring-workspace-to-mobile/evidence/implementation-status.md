# Trạng thái triển khai Spec 001

- T001–T002 hoàn thành. Web có sáu ảnh tham chiếu và bộ dữ liệu mẫu. Capacitor 8.6.2 đã được cài và khóa phiên bản.
- T003–T005: Đã thêm kiểm thử cho bản ghi đến muộn, sửa khi push đang chạy, xung đột timestamp, lỗi pull hoặc ghi, và retry sau gián đoạn. Đã bỏ reset khi khởi động và chuyển nút làm mới sang đồng bộ an toàn. Còn kiểm tra tích hợp provider với cả hai trạng thái cờ cũ và chạy thử đồng bộ hai thiết bị.
- T006–T008: Đã tạo hai dự án Capacitor và chép asset từ cùng bản build Vite bằng `npx cap sync`. Chưa có kết quả build ký, cài đặt, xác minh kết nối từ origin thật hoặc chạy ứng dụng trên thiết bị. Windows chưa có Android SDK tại vị trí mặc định và ADB không thấy thiết bị. iOS cần máy macOS với Xcode.
- T016: Đã hiển thị trạng thái chờ lần đồng bộ đầu và đọc mốc lần đồng bộ từ IndexedDB khi mở app. Chờ nghiệm thu khả năng truy cập và hành vi trên thiết bị thật.
- T009–T015, T017–T019 và T021: Chờ đối chiếu trên thiết bị, gồm thao tác hỗ trợ tiếp cận và diễn tập khôi phục.
- T020: Đã chạy build và typecheck frontend, bộ test frontend, test unit backend và kiểm tra lệnh `cap sync`. Còn cập nhật kết quả build và cài trên thiết bị.
