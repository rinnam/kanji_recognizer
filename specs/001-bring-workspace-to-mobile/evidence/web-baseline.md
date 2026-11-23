# Mốc đối chiếu giao diện web

Microsoft Edge, viewport 390 × 844 CSS px. Dùng build Vite và dữ liệu tổng hợp từ
`frontend/tests/fixtures/mobile-workspace.ts` trong profile cô lập. Bài chụp mô phỏng
phản hồi pull của máy chủ. Các yêu cầu API khác bị chặn.

| Tab | Sáng | Tối | Hành vi dùng để đối chiếu |
| --- | --- | --- | --- |
| Tổng quan | [Ảnh](web-baseline/light-overview.png) | [Ảnh](web-baseline/dark-overview.png) | Mở bảng từ và lọc theo thư mục. Từ đã xóa không xuất hiện. |
| Flashcard | [Ảnh](web-baseline/light-flashcard.png) | [Ảnh](web-baseline/dark-flashcard.png) | Giữ cây thư mục, phạm vi học và ba chế độ hiện có. |
| Quiz | [Ảnh](web-baseline/light-quiz.png) | [Ảnh](web-baseline/dark-quiz.png) | Giữ phạm vi học, luồng bắt đầu và nhập câu trả lời. |

Các ảnh xác nhận giao diện web tham chiếu. Android và iOS cần đối chiếu trên thiết bị thật.
