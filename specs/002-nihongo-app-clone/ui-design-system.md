# UI Design System & Screen Blueprint — NihonGO Clone

> Tài liệu chuẩn hóa giao diện để AI triển khai UI giống 1-1 với `https://momonihongo.app`.

---

## 1. Design Tokens (CSS Variables đề xuất)

```css
:root {
  /* Backgrounds */
  --bg-gradient-start: #FFFDF9;
  --bg-gradient-mid: #FFF7EE;
  --bg-gradient-end: #FCECE3;
  --surface-card: #FFFFFF;
  --surface-subtle: #FFF9F2;

  /* Brand & Accent */
  --accent-primary: #F48A34;
  --accent-primary-hover: #EA7A1E;
  --accent-soft-bg: #FFF3E6;
  --accent-pill-bg: #FDEBD6;
  --accent-disabled: #FBD7B8;

  /* Text */
  --text-primary: #1E1E1E;
  --text-secondary: #6E6E73;
  --text-muted: #8A8A8E;

  /* Borders & Shadows */
  --border-warm: #F0E6DC;
  --border-light: #EFEFEF;
  --shadow-card: 0 4px 20px rgba(180, 120, 70, 0.06);
  --shadow-dock: 0 8px 30px rgba(30, 30, 30, 0.10);

  /* Semantic */
  --success-bg: #E8F5E9;
  --success-text: #1B873F;
  --warning-bg: #FFF3E0;
  --warning-text: #B45309;

  /* Radii & Spacing */
  --radius-card: 22px;
  --radius-pill: 9999px;
  --radius-button: 14px;
  --container-max-width: 920px;
}
```

---

## 2. Khung Bố cục Chung (App Shell)

1. **Nền toàn trang:** Gradient ấm từ `#FFFDF9` → `#FCECE3`, cố định toàn viewport.
2. **Container chính:** Căn giữa (`max-width: 920px`), padding dưới tối thiểu `96px` để không bị che bởi Bottom Dock.
3. **Top Header:**
   - **Trang chủ (`/app`):** Trái: Logo `Momo` + `Nihon` (`#1E1E1E`) + `GO` (`#F48A34`). Phải: 2 pill `[N3]` và `[60 phút/ngày]`.
   - **Trang con:** Hàng 1: Logo. Hàng 2: Nút tròn `<` (Back), `<h1>` tiêu đề trang, cụm nút hành động phải (tùy trang).
4. **Floating Bottom Navigation Dock:**
   - Cố định đáy màn hình (`bottom: 16px`), căn giữa, nền trắng `#FFFFFF`, bo tròn pill (`9999px`), bóng `--shadow-dock`.
   - 5 tab: `Trang chủ` (`/app`), `Luyện tập` (`/practice`), `Tra cứu` (`/lookup`), `Bài học` (`/lessons`), `Cá nhân` (`/profile`).
   - Trạng thái active: icon + text `#F48A34` + chấm tròn `4px` màu `#F48A34` ngay dưới chữ.
5. **Floating Utility Dock (góc dưới phải):**
   - Nút `?` (mở coachmark của route hiện tại), `Góp ý beta`, `Mời mình ly cà phê`, `×` (thu gọn thành nút `⋯`).
6. **Spotlight Coachmark Modal:**
   - Overlay tối mờ làm nổi bật khu vực mục tiêu + thẻ trắng hiển thị `Bước X/Y`, tiêu đề, mô tả ngắn, thanh nút `Bỏ qua`, `Quay lại`, `Tiếp theo →` / `Mình hiểu rồi`, dòng chú thích `"Mở nút ? để xem lại hướng dẫn bất cứ lúc nào."`.

---

## 3. Bản thiết kế Chi tiết Từng Màn hình

| Route | Thành phần UI bắt buộc |
|---|---|
| `/login` | Card đăng nhập căn giữa, form Email/SĐT + Mật khẩu, nút đăng nhập Google OAuth, linh vật Momo. |
| `/onboarding`, `/profile/learning` | Stepper 3 bước (`Trình độ` → `Mục tiêu` → `Xác nhận`), danh sách radio card có viền cam khi chọn, 5 chip phút/ngày (`5/10/15/30/60`). |
| `/app` | Hero greeting + Momo; Ô tìm kiếm nhanh; Card `Mục tiêu hôm nay` (`%` + `MM:SS / X phút` + progress bar); Card `Lịch học` (year switcher + 3 ô KPI xanh bạc hà + heatmap 52×7); 2 card ngang (`Ôn tập hôm nay`, `Thử thách hôm nay`); Nút `Bài học từ vựng`; Lưới 2×2 `Luyện kỹ năng` + nút `Game từ vựng`; Banner `HỌC CÙNG MOMO`. |
| `/plan` | Tóm tắt lộ trình hiện tại (trình độ, mục tiêu, thời lượng), nút `Chỉnh sửa kế hoạch` và `Về trang chủ`. |
| `/practice` | Hàng 3 pill `Từ vựng` (`Bài học từ vựng`, `Flashcard`, `Game từ vựng`) + lưới 2×2 `Kỹ năng` (`Nghe`, `Nói`, `Đọc`, `Viết`). |
| `/lookup` | Thanh tìm kiếm + nút `Viết tay` (modal canvas + `Xóa nét` + 5 ứng viên) + 3 tab (`Từ vựng`, `Hán tự`, `Video`) + `Lịch sử tra cứu`. |
| `/lessons` | Header (`Flashcard`, `Tra cứu nhanh`), 5 chip `N5–N1` kèm số bài, lưới 3 cột bài học. |
| `/lessons/:id` | Toggle `Ẩn nghĩa để tự ôn`, danh sách thẻ từ (`#STT`, Kanji, Kana, `☆`, TTS, nghĩa, Hán Việt, accordion `Ví dụ & liên quan`). |
| `/flashcards` | Card `Hôm nay` (đến hạn, đã ôn, lịch 30 ngày), tab (`Có sẵn`, `Của tôi`, `Yêu thích`), lọc JLPT, danh sách bộ thẻ phân trang, nút `Tạo bộ thẻ`. |
| `/flashcards/new` | Input `Tên bộ thẻ`, tab `Từng thẻ` / `Nhập hàng loạt`, nút `Lưu bộ thẻ`. |
| `/flashcards/sessions/:uuid` | Thanh đếm tiến độ, thẻ lật 3D/fade (Space/click), mặt sau có TTS + `☆`, 4 nút SRS (`Chưa nhớ`, `Mơ hồ`, `Nhớ`, `Rất nhớ`) kèm khoảng thời gian động. |
| `/games` | 3 card game (`Công thành Momo`, `Giành mic`, `Đối kháng từ vựng`), nút `Tạo phòng`, `Đấu máy với Momo`, form `Tham gia phòng`. |
| `/games/bot` | Banner núi Phú Sĩ & 2 thành trì Momo, `Kỷ lục`, chọn độ khó (`Dễ/Vừa/Khó`), `Trình độ`, `Nguồn từ`, `Xuất quân`, `Ôn từ sai`, modal `Cách chơi`. |
| `/games/:roomCode` | Mã phòng 6 ký tự + `Mời bạn`, danh sách người chơi (`1/8`), cấu hình phòng, `Sẵn sàng` / `Bắt đầu trận` / `Rời phòng`. |
| `/practice/listening` | Tab `Tất cả video` / `Video của tôi`, form nhập link YouTube, lưới 2 cột video. |
| `/practice/listening/:uuid` | Nhúng YouTube, tab `Shadowing` / `Nghe chép chính tả`, toggle `Ẩn phụ đề`, phụ đề tách token có Furigana (bấm mở modal `Từ điển`), thanh điều khiển dưới (`Phụ đề`, `Bản dịch`, `Câu hỏi AI`, điều hướng đoạn, `••• Tuỳ chọn shadowing`). |
| `/practice/speaking` | CTA `Cuộc trò chuyện mới`, danh sách `Hội thoại gần đây`. |
| `/practice/speaking/new` | Lọc `Chủ đề`, `Trình độ`, tìm kiếm, lưới tình huống. |
| `/practice/speaking/scenarios/:uuid` | Mục tiêu tình huống, `Vai AI`, chọn `Nói có gợi ý` / `Tự nói`, checkbox `Lưu âm thanh để nghe lại`, `Bắt đầu trò chuyện`. |
| `/practice/reading` | Tìm kiếm + `Bộ lọc` thu gọn (JLPT + 7 dạng bài), danh sách bài đọc phân trang. |
| `/practice/reading/:id` | Toggle `Furigana`, văn bản tách token bấm tra từ & bấm câu xem cấu trúc, 3 tab dưới (`Câu hỏi`, `Phân tích`, `Tips đọc hiểu`). |
| `/practice/writing` | 3 tab (`Bài tập`, `Bản nháp`, `Đã nộp`), lọc JLPT/chủ đề, `Viết tự do`, trình soạn thảo giấy `Genkouyoushi` (ngang ↔ dọc), bộ đếm ký tự, đồng hồ, rubric 100 điểm. |
| `/profile` | Avatar chữ cái đầu + 4 card (`Thông tin cá nhân`, `Bảo vệ tài khoản`, `Thiết lập học tập`, `Phiên đăng nhập`). |
