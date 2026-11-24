# Audit Giao diện & Chức năng — NihonGO (`momonihongo.app`)

> **Nguồn:** Thu thập trực tiếp từ ứng dụng web `https://momonihongo.app` (ngày 2026-11-24).
> **Mục đích:** Tài liệu tham chiếu gốc cho bộ Spec-Kit `specs/002-nihongo-app-clone/` nhằm tái tạo đầy đủ giao diện, luồng tương tác và chức năng của NihonGO.

---

## 1. Tổng quan Kiến trúc & Thương hiệu

- **Nền tảng quan sát được:** SPA xây dựng bằng React Native Web / Expo Web.
- **Ngôn ngữ giao diện:** Tiếng Việt; nội dung học tiếng Nhật (Kanji, Kana, Furigana ruby, Hán Việt).
- **Nhận diện thương hiệu:**
  - Logo **NihonGO**: chữ `Nihon` màu than đậm (`#1E1E1E`) + `GO` màu cam ấm (`#F48A34`).
  - Linh vật **Momo**: chú tanuki/gấu trúc đỏ quàng khăn kem, có biến thể theo từng kỹ năng (vẫy tay, đeo tai nghe, cầm micro, đọc sách, viết bàn học, mặc giáp samurai).

---

## 2. Hệ thống Thiết kế Giao diện (Design System)

### 2.1. Bảng màu & Bề mặt
- **Chế độ màu:** Light mode, nền gradient kem-đào dịu (`#FFFDF9` / `#FFF7EE` → `#FCECE3` / `#FFF4E6`).
- **Màu nhấn chính (Primary Accent):**
  - Cam quýt ấm: `#F48A34` / `#F58220` (nút chính, viền active, icon active).
  - Nền pill active: `#FFF3E6` / `#FDEBD6`.
  - Chữ active: `#EA7A1E`.
- **Chữ (Typography):**
  - Heading: Than đậm `#1E1E1E` / `#222222`.
  - Subtitle / Label: Xám dịu `#6E6E73` / `#8A8A8E`.
  - Font UI sans-serif hiện đại + font tiếng Nhật hỗ trợ Furigana (`<ruby>`) trên từng token.
- **Bề mặt (Surfaces):**
  - Card trắng tinh `#FFFFFF`, bo góc lớn (`20–24px`), đổ bóng ấm nhẹ, viền mảnh `#F0E6DC` / `#EFEFEF`.
- **Màu ngữ nghĩa (Semantic):**
  - Thành công / Chuỗi ngày / Đã xác thực: nền xanh bạc hà `#E8F5E9`, chữ `#2E7D32` / `#1B873F`.
  - Cảnh báo / Chưa xác thực / Đang tiến hành: nền đào nhạt `#FFF3E0`, chữ `#B45309`.
  - Trạng thái vô hiệu hóa (Disabled): `#FBD7B8` (nút) / `#EAEAEA` (nền xám nhạt).

### 2.2. Bố cục & Điều hướng Toàn cục
- **Khung nội dung:** Cột giữa căn giữa màn hình, `max-width: 860–960px` trên desktop.
- **Thanh Header trên cùng:**
  - Trang chủ (`/app`): Trái gồm icon Momo + chữ `NihonGO`; Phải gồm 2 chip trạng thái (`[N3]` cấp độ JLPT + `[60 phút/ngày]` mục tiêu ngày).
  - Trang con: Logo trên cùng + thanh tiêu đề phụ gồm nút quay lại tròn (`<`), tiêu đề `<h1>`, và cụm nút tiện ích bên phải (vd: công tắc `Furigana`, `Tạo bộ thẻ`, `Đóng`).
- **Thanh Điều hướng Dưới cùng (Floating Bottom Dock):**
  - Thanh pill trắng nổi căn giữa (`tablist "Điều hướng chính"`), 5 tab chính với icon + nhãn màu cam và chấm tròn cam bên dưới tab đang chọn:
    1. `Trang chủ` → `/app`
    2. `Luyện tập` → `/practice`
    3. `Tra cứu` → `/lookup`
    4. `Bài học` → `/lessons`
    5. `Cá nhân` → `/profile`
- **Cụm Tiện ích Nổi góc dưới phải (Floating Utility Dock):**
  - Mở rộng: `?` (mở lại hướng dẫn spotlight của trang hiện tại), `Góp ý beta` (modal phản hồi), `Mời mình ly cà phê` (modal QR ủng hộ), `×` (thu gọn thành nút `⋯`).
- **Coachmark hướng dẫn theo từng trang:**
  - Modal spotlight nhiều bước (`Bước X/Y`, `×`, `Bỏ qua`, `Quay lại`, `Tiếp theo →` / `Mình hiểu rồi`, ghi chú `"Mở nút ? để xem lại hướng dẫn bất cứ lúc nào."`). Xuất hiện lần đầu tại `/lookup`, `/lessons`, `/flashcards`, `/games`, `/practice/listening`, `/practice/listening/:id`, `/practice/speaking`, `/practice/reading`, `/practice/writing`.

---

## 3. Bản đồ Route & Chi tiết Chức năng

### 3.1. Xác thực & Onboarding
1. **`/login` (`Đăng nhập · NihonGO`)**
   - Chuyển hướng tự động từ `/app` khi chưa đăng nhập (qua màn splash `Momo đang chuẩn bị…`).
   - Hỗ trợ đăng nhập bằng Email/Số điện thoại + Mật khẩu và Google OAuth.
2. **`/onboarding?returnTo=%2Fapp` & `/profile/learning`**
   - Stepper 3 bước: `Trình độ` → `Mục tiêu` → `Xác nhận`.
   - **Bước 1 (`Trình độ`):** 6 thẻ radio (`Mới bắt đầu`, `N5 · Sơ cấp`, `N4 · Cơ bản`, `N3 · Trung cấp`, `N2 · Trung cao cấp`, `N1 · Cao cấp`) + ghi chú tự đánh giá + `Tiếp tục →` + `Đăng xuất`.
   - **Bước 2 (`Mục tiêu`):** 5 thẻ mục tiêu (`Giao tiếp hằng ngày`, `Ôn thi JLPT`, `Du lịch Nhật Bản`, `Công việc`, `Văn hóa & sở thích`) + 5 chip thời lượng mỗi ngày (`5`, `10`, `15`, `30`, `60 phút`) + `Quay lại` / `Tiếp tục`.
   - **Bước 3 (`Xác nhận`):** Tóm tắt trình độ, mục tiêu, thời gian mỗi ngày + `Xác nhận và bắt đầu ✓`.
3. **Modal Chào mừng Free Beta (3 slide trên `/app`)**
   - Slide 1/3: Lời chào cá nhân hóa.
   - Slide 2/3: Lưới 4×2 giới thiệu 8 tính năng (`Nghe`, `Nói`, `Đọc`, `Viết`, `Tra cứu`, `Bài học`, `Flashcard`, `Game từ vựng`).
   - Slide 3/3: Hạn mức Free Beta (`1 video mới/ngày` ở Nghe, `2 phiên Nói Live/ngày` tối đa `4 phút/phiên`), lưu ý AI, ưu đãi góp ý beta + nút `Bắt đầu học →`.

### 3.2. Trang chủ (`/app` — `Trang chủ · NihonGO`)
- **Hero Greeting:** `"Chào <Tên>"`, `"Một chút tiếng Nhật, mỗi ngày."`, linh vật Momo vẫy tay.
- **Ô Tra cứu nhanh (`Tra cứu từ vựng`):** Input (`"Tra từ Nhật, kana, romaji hoặc tiếng Việt"`) + nút `Tìm từ` → điều hướng `/lookup?kind=words&q=...`.
- **Thẻ Mục tiêu hôm nay (`Mục tiêu hôm nay`):** Badge `%`, bộ đếm thời gian học thực tế (`MM:SS / 60 phút`), thanh tiến độ cam. Ghi nhận các khoảng thời gian hoạt động (`intervals`) vào localStorage key `study`.
- **Bản đồ nhiệt học tập năm (`Lịch học · Hoạt động trong năm`):**
  - Chọn năm (`<`, `2026`, `>`).
  - 3 ô KPI nền xanh bạc hà: `Ngày liên tiếp`, `Ngày đã học`, `Chuỗi dài nhất`.
  - Lưới lịch 52 tuần × 7 ngày (`T2, T4, T6, CN` × `Th1–Th12`).
- **2 Thẻ hành động song song:**
  - `Ôn tập hôm nay`: Hiển thị bộ thẻ đang học & số thẻ còn lại (vd: `"Bạn còn 17 thẻ chưa học · Unit 01 – 名詞A – Bài 1"` + `"Tiếp tục flashcard"`), hoặc CTA `"Chọn bộ thẻ đầu tiên"` → `/flashcards`.
  - `Thử thách hôm nay`: Mini-quiz tối đa 5 câu/ngày (mở khóa khi đã học bộ thẻ có ≥ 4 nghĩa khác nhau).
- **Thanh truy cập nhanh:** Nút `Bài học từ vựng` → `/lessons`.
- **Lưới Luyện kỹ năng (`Luyện kỹ năng`):** Tiêu đề kèm nút `Game từ vựng` + lưới 2×2 card minh họa Momo (`Nghe`, `Nói`, `Đọc`, `Viết`).
- **Banner Lộ trình (`HỌC CÙNG MOMO`):** Điều hướng tới `/plan` (`Kế hoạch học tập`) hiển thị trình độ/mục tiêu/thời lượng + `Chỉnh sửa kế hoạch` & `Về trang chủ`.

### 3.3. Trung tâm Luyện tập (`/practice`)
- **Hàng `Từ vựng`:** 3 thẻ pill (`Bài học từ vựng` → `/lessons`, `Flashcard` → `/flashcards`, `Game từ vựng` → `/games`).
- **Lưới `Kỹ năng` (2×2):** `Nghe`, `Nói`, `Đọc`, `Viết`.

### 3.4. Tra cứu Từ điển (`/lookup`)
- **Thanh tìm kiếm:** Ô nhập `q`, nút `Viết tay` (modal canvas vẽ chữ Kanji viết tay `"Vùng viết tay tiếng Nhật"`, nút `Xóa nét`, 5 nút gợi ý ký tự ứng viên), 3 tab con: `Từ vựng`, `Hán tự`, `Video`.
- **Trạng thái rỗng:** `Lịch sử tra cứu`.
- **Tab `Từ vựng` (`/lookup?kind=words&q=...`):**
  - Từ gốc + danh sách cách đọc Kana.
  - Nghĩa đánh số kèm từ loại (POS), định nghĩa tiếng Việt, cách đọc theo từng nghĩa.
  - `Hán tự trong <từ>`: Các ô Kanji bấm được (Kanji + Onyomi + Hán Việt).
  - `Từ vựng liên quan tới <từ>`: Danh sách phân trang (`Trang trước` / `1/N` / `Trang sau`).
- **Tab `Hán tự` (`/lookup?kind=kanji&q=...`):**
  - Ký tự lớn, Hán Việt, `Kunyomi`, `Onyomi`, `Số nét`, `Bộ thủ`, `Tần suất`, `Thứ tự nét viết`, `Từ chứa <kanji>`, và thanh chuyển nhanh khi truy vấn nhiều Kanji.
- **Tab `Video` (`/lookup?kind=videos&q=...`):**
  - `"Ví dụ trong video"` (clip YouTube/TEDx khớp từ khóa), trình phát nhúng (`Đoạn 1/20`), phụ đề tiếng Nhật có mốc thời gian, nút `"Xem đoạn này"`.

### 3.5. Bài học Từ vựng (`/lessons` & `/lessons/:id`)
- **Thư viện (`/lessons?level=N3`):**
  - Nút header: `Flashcard`, `Tra cứu nhanh`.
  - 5 bộ lọc JLPT kèm tổng số bài: `N5 (50 bài)`, `N4 (31 bài)`, `N3 (66 bài)`, `N2 (89 bài)`, `N1 (48 bài)`.
  - Lưới 3 cột thẻ bài học theo nhóm từ loại (`Danh từ`, `Động từ`, `Tính từ`, `Từ Katakana`, `Trạng từ & liên từ`).
- **Chi tiết bài học (`/lessons/:id`):**
  - Header: Quay lại, tên bài, nút `Flashcard`, phụ đề cấp độ & số từ, công tắc `Ẩn nghĩa để tự ôn` (ẩn toàn bộ nghĩa và hiện nút `"Nhấn để xem nghĩa"` trên từng thẻ).
  - Trường dữ liệu thẻ từ: `#STT`, `Kanji`, `Kana`, sao yêu thích (`☆`), nút phát âm TTS, nghĩa tiếng Việt, `Hán Việt`, mục mở rộng `Ví dụ & liên quan (N)`.

### 3.6. Flashcard & SRS (`/flashcards`, `/flashcards/new`, `/flashcards/sessions/:uuid`)
- **Trang chọn bộ thẻ (`/flashcards`):**
  - Thẻ `Hôm nay`: `Đến hạn hôm nay`, `Đã ôn hôm nay`, xem trước `Lịch ôn tập` + modal dự báo `30 ngày`.
  - `Chọn bộ thẻ`: 3 tab (`Có sẵn`, `Của tôi`, `Yêu thích`), lọc JLPT (`N5–N1`), danh sách phân trang, nút `Tạo bộ thẻ`.
- **Tạo bộ thẻ (`/flashcards/new`):**
  - `Tên bộ thẻ`, 2 chế độ nhập: `Từng thẻ` và `Nhập hàng loạt`, nút `Lưu bộ thẻ`.
- **Phiên học (`/flashcards/sessions/:uuid`):**
  - Bộ đếm `Đến hạn hôm nay`, `Đã ôn hôm nay`, tên bộ thẻ, tiến độ `1 / N`.
  - Mặt trước: Kanji lớn + `"Chạm hoặc nhấn Space để lật"`.
  - Mặt sau: Kanji + Kana + Nghĩa tiếng Việt + nút phát âm TTS + sao yêu thích.
  - 4 nút đánh giá SRS/FSRS kèm khoảng thời gian động: `Chưa nhớ` (`1–2 phút`), `Mơ hồ` (`6 phút`), `Nhớ` (`10–11 phút`), `Rất nhớ` (`8 ngày`).
  - Nút `Kết thúc phiên học`.

### 3.7. Kho Game Từ vựng (`/games`, `/games/bot`, `/games/:roomCode`)
- **Hub (`/games`):**
  - 3 chế độ: `Công thành Momo` (1v1 / đấu máy), `Giành mic` (2–8 người, giọng nói), `Đối kháng từ vựng` (2–8 người, tốc độ).
  - Hành động: `Tạo phòng` (mã phòng 6 ký tự), `Đấu máy với Momo` (`/games/bot`), `Tham gia phòng` (nhập mã).
- **Phòng chờ Multiplayer (`/games/:roomCode`):**
  - Mã phòng + `Mời bạn`, danh sách người chơi (`1/8`), chọn chế độ game, `Trình độ` (`N5–N1`), `Nguồn từ` (`Kho từ NihonGO` / `Bài học`), `Thời gian mỗi câu` (`8/9/10 giây`), `Áp dụng`, `Sẵn sàng`, `Bắt đầu trận`, `Rời phòng`.
- **Đấu máy (`/games/bot` — `Công thành Momo`):**
  - Minh họa núi Phú Sĩ + 2 thành trì Momo samurai, `Kỷ lục`, độ khó (`Dễ`, `Vừa`, `Khó`), `Trình độ` (`N5–N1`), `Nguồn từ`, `Xuất quân`, `Ôn từ sai`, modal `Cách chơi` (`100 HP`, tối đa `3 phút` / `60 câu`, `4 dạng câu hỏi`, phím tắt `1–4`, `Q` Mưa tên, `E` Khiên 5s khi đủ 100 năng lượng, `Esc` tạm dừng, mốc Combo 3/5/10).

### 3.8. Bốn Kỹ năng Chuyên sâu (`/practice/*`)
1. **Nghe (`Luyện nghe & Shadowing` — `/practice/listening`, `/practice/listening/:uuid`):**
   - Thư viện: Tab `Tất cả video`, `Video của tôi`, nhập URL YouTube (tối đa 20 phút, hạn mức 1 video mới/ngày), lưới 2 cột video chọn lọc.
   - Trình học: Nhúng YouTube, chuyển chế độ `Shadowing` / `Nghe chép chính tả`, công tắc `Ẩn phụ đề`, phụ đề tách token có Furigana (bấm từng từ mở modal `Từ điển` + `+ Lưu vào flashcard` + `☆ Yêu thích`), thanh điều khiển dưới (`Phụ đề` toàn văn song ngữ, `Bản dịch`, `Câu hỏi AI`, `Ví dụ trước` / `Nghe lại` / `Ví dụ tiếp`, `••• Tuỳ chọn shadowing`: `Nghe liên tục`, `Từng đoạn`, tốc độ `1×`, `Lặp đoạn`).
2. **Nói (`Luyện nói - Hội thoại cùng AI` — `/practice/speaking`, `/practice/speaking/new`, `/practice/speaking/scenarios/:uuid`):**
   - Trang chính: `Cuộc trò chuyện mới` + `Hội thoại gần đây` (nghe lại âm thanh đã lưu).
   - Chọn tình huống: Lọc `Chủ đề` (`Tất cả`, `Đời sống`, `Ăn uống`, `Du lịch`, `Công việc`), `Trình độ` (`Mọi trình độ`, `Mới bắt đầu`, `N5–N1`), tìm kiếm, 8 tình huống mẫu.
   - Cấu hình phiên: Mục tiêu tình huống, `Vai AI`, chế độ `Nói có gợi ý` (gợi ý tăng dần: ý tưởng → từ vựng → câu mẫu) vs `Tự nói`, tùy chọn `Lưu âm thanh để nghe lại` (giọng AI `Aoi`), `Bắt đầu trò chuyện`.
3. **Đọc (`Thư viện bài đọc` & `Luyện đọc` — `/practice/reading`, `/practice/reading/:id`):**
   - Thư viện: Tìm kiếm + `Bộ lọc` thu gọn (`Trình độ JLPT`: `Tất cả`, `N5–N1`; `Dạng bài`: `Đoản văn`, `Trung văn`, `Trường văn`, `Tìm thông tin`, `Hiểu quan điểm`, `Tổng hợp`, `Theo chủ đề`).
   - Trình đọc: Công tắc `Furigana`, văn bản tách token bấm tra từ (`+ Lưu vào flashcard`, `☆ Yêu thích`), nút phân tích cấu trúc từng câu, link nguồn bài đọc.
   - 3 tab phân tích dưới: `Câu hỏi` (trắc nghiệm A–D + `Nộp bài`), `Phân tích` (`Câu đang chọn`, `Ý chính`, `Mạch bài đọc`, `Từ vựng quan trọng`, `Ngữ pháp quan trọng`), `Tips đọc hiểu`.
4. **Viết (`Luyện viết` — `/practice/writing`):**
   - Thư viện đề: 3 tab (`Bài tập`, `Bản nháp`, `Đã nộp`), tìm kiếm, chip `N5–N1`, chip chủ đề (`Đời sống`, `Học tập`, `Công việc`, `Xã hội`), `Viết tự do` (`自由作文`).
   - Trình soạn thảo: `Đề bài & gợi ý` (dàn ý ①②③ + mẫu ngữ pháp gợi ý), `Đổi đề`, `Tiêu chí chấm bài` 100 điểm (`Đáp ứng đề bài 25đ`, `Tổ chức và liên kết 25đ`, `Ngữ pháp 25đ`, `Từ vựng và chính tả 25đ`), đồng hồ `Thời gian làm bài`, tự lưu nháp + `Lưu nháp` + `Nộp bài` (chấm AI & so sánh phiên bản).
   - Giấy ô vuông **Genkouyoushi (`Giấy làm bài`)**: Đếm ký tự trực tiếp, công tắc `Chuyển sang viết dọc` (chuyển đổi giữa viết ngang `yokogaki` và viết dọc `tategaki`).

### 3.9. Cá nhân (`/profile`)
- Avatar chữ cái đầu + 4 thẻ xếp dọc:
  1. `Thông tin cá nhân` (Họ tên, Email + badge xác thực, SĐT + badge xác thực).
  2. `Bảo vệ tài khoản` (`Xác thực số điện thoại`).
  3. `Thiết lập học tập` (Trình độ, Mục tiêu, Thời gian/ngày + nút `Chỉnh sửa trình độ và mục tiêu` → `/profile/learning`).
  4. `Phiên đăng nhập` (`Đăng xuất`).
