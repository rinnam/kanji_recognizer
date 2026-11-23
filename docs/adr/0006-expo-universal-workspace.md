# ADR 0006 — Workspace dùng chung trên Expo

- **Trạng thái:** Accepted theo quyết định của chủ dự án ngày 2026-11-23.

Ứng dụng đích dùng Expo Router và React Native cho web, Android và iOS. Giao diện
Vite trong `frontend/` là chuẩn về bố cục, nhãn, màu và hành vi. Tách các hợp đồng
dữ liệu, quy tắc học tập và token dùng chung. Chuyển từng phần giao diện sang thành
phần dùng được trên ba nền tảng. Lưu trữ và các khả năng của thiết bị nằm sau adapter.

Quyết định này thay thế đề xuất đóng gói web bằng Capacitor cho Spec 001. Bản Vite
tiếp tục phục vụ đến khi bản Expo đạt tiêu chí nghiệm thu. Giữ quy tắc bảo toàn dữ
liệu và đồng bộ theo ADR 0001 và ADR 0005.
