# Feature Specification: NihonGO Full App Clone (`momonihongo.app`)

**Feature Branch**: `002-nihongo-app-clone`

**Created**: 2026-11-24

**Status**: Draft

**Input**: User description: "Cào dữ liệu từ giao diện và chức năng của ứng dụng NihonGO (https://momonihongo.app/app), bổ sung vào các file spec và spec-kit để AI triển khai bản clone đầy đủ."

**Reference Audit**: [nihongo-app-audit.md](../../docs/reference/nihongo-app-audit.md) · [ui-design-system.md](./ui-design-system.md) · [data-model.md](./data-model.md)

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Onboarding nhanh & Trang chủ Theo dõi Tiến độ (Priority: P1)

Ứng dụng hoạt động ở chế độ **1 người dùng duy nhất (single-user, không cần đăng nhập/auth)**. Ở lần mở đầu tiên, người học đi qua quy trình thiết lập 3 bước (`Trình độ` → `Mục tiêu` → `Xác nhận`) rồi vào thẳng Trang chủ (`/app`). Tại Trang chủ, người học thấy lời chào cá nhân hóa cùng linh vật Momo, ô tra cứu từ vựng nhanh, thẻ tiến độ mục tiêu hằng ngày đếm thời gian học thực tế, bản đồ nhiệt hoạt động 52 tuần (heatmap + streak), thẻ ôn tập flashcard hôm nay, thử thách 5 câu/ngày và lưới 4 kỹ năng.

**Why this priority**: Đây là khung xương toàn bộ ứng dụng (Onboarding + Navigation Shell + Dashboard + Study Timer). Triển khai xong US1 đã có một sản phẩm hoạt động hoàn chỉnh về điều hướng và theo dõi thói quen học.

**Independent Test**: Có thể kiểm thử độc lập bằng cách mở app lần đầu, đi qua 3 bước `/onboarding`, kiểm tra `/app` hiển thị đúng trình độ/mục tiêu, thanh tiến độ ngày tăng theo thời gian hoạt động, heatmap hiển thị đúng năm hiện tại và 5 tab điều hướng dưới cùng chuyển trang mượt mà.

**Acceptance Scenarios**:

1. **Given** người dùng mở ứng dụng lần đầu (chưa có `learning_profile` cục bộ), **When** app khởi động, **Then** hệ thống mở `/onboarding` với 3 bước `Trình độ` (`Mới bắt đầu`, `N5–N1`), `Mục tiêu` (5 mục tiêu + 5 mức phút/ngày), `Xác nhận`.
2. **Given** người dùng đã hoàn tất onboarding, **When** mở lại ứng dụng, **Then** vào thẳng `/app` mà không cần đăng nhập.
3. **Given** người dùng đang ở `/app`, **When** người dùng hoạt động trên ứng dụng, **Then** thẻ `Mục tiêu hôm nay` tự động ghi nhận khoảng thời gian (`intervals`) vào bộ nhớ cục bộ (`study`), cập nhật `%` và thanh tiến độ.
4. **Given** người dùng bấm ô tìm kiếm nhanh trên `/app` và nhập từ khóa, **When** nhấn `Tìm từ`, **Then** điều hướng tới `/lookup?kind=words&q=<keyword>`.

---

### User Story 2 - Tra cứu Từ điển (Từ vựng, Hán tự, Viết tay & Video) (Priority: P1)

Người học vào mục `Tra cứu` (`/lookup`) để tìm từ tiếng Nhật (Kanji, Kana, Romaji hoặc tiếng Việt) hoặc vẽ chữ Hán bằng bảng viết tay. Kết quả hiển thị theo 3 tab: `Từ vựng` (nghĩa theo từ loại, cách đọc, phân tích Kanji cấu thành, từ liên quan phân trang), `Hán tự` (Hán Việt, Kunyomi, Onyomi, số nét, bộ thủ, tần suất, thứ tự nét viết, từ ghép) và `Video` (các đoạn video YouTube có phụ đề khớp từ khóa kèm mốc thời gian).

**Why this priority**: Tra cứu là công cụ lõi được tái sử dụng xuyên suốt các màn hình khác (Nghe, Đọc, Bài học) dưới dạng popup tra từ nhanh.

**Independent Test**: Tìm kiếm từ `"日本"` trên `/lookup` và kiểm tra cả 3 tab `Từ vựng`, `Hán tự`, `Video`, cũng như mở modal `Viết tay`, vẽ nét và chọn ký tự gợi ý.

**Acceptance Scenarios**:

1. **Given** người dùng ở `/lookup` chưa nhập từ khóa, **When** trang hiển thị, **Then** hiện danh sách `Lịch sử tra cứu`.
2. **Given** người dùng tìm kiếm `"日本"` ở tab `Từ vựng`, **When** kết quả trả về, **Then** hiển thị danh sách cách đọc Kana, các nghĩa đánh số kèm POS, khối `Hán tự trong 日本` bấm được để chuyển sang tab `Hán tự`, và danh sách `Từ vựng liên quan` có phân trang.
3. **Given** người dùng bấm nút `Viết tay`, **When** vẽ ký tự lên canvas, **Then** hiển thị 5 ứng viên Kanji để bấm tra cứu trực tiếp và có nút `Xóa nét`.

---

### User Story 3 - Bài học Từ vựng theo JLPT & Hệ thống Flashcard SRS (Priority: P1)

Người học duyệt thư viện `Bài học` (`/lessons`) phân loại theo cấp độ `N5–N1` và từ loại (`Danh từ`, `Động từ`, `Tính từ`, `Katakana`, `Trạng từ & liên từ`), xem chi tiết từng bài học (hỗ trợ bật/tắt `Ẩn nghĩa để tự ôn`, phát âm TTS, đánh dấu yêu thích, xem ví dụ & từ liên quan). Từ bài học hoặc mục `Flashcard` (`/flashcards`), người học xem lịch ôn 30 ngày, tạo bộ thẻ cá nhân (`Từng thẻ` hoặc `Nhập hàng loạt`) và vào phiên học SRS (`/flashcards/sessions/:uuid`) với 4 mức đánh giá (`Chưa nhớ`, `Mơ hồ`, `Nhớ`, `Rất nhớ`).

**Why this priority**: Học từ vựng có cấu trúc + ôn tập lặp lại ngắt quãng (SRS) là vòng lặp học tập trung tâm của ứng dụng.

**Independent Test**: Mở `/lessons?level=N3`, vào 1 bài học, bật `Ẩn nghĩa để tự ôn`, chuyển sang phiên Flashcard SRS, lật thẻ bằng Space/click và chấm 4 mức SRS để kiểm tra cập nhật số thẻ `Đến hạn hôm nay` / `Đã ôn hôm nay`.

**Acceptance Scenarios**:

1. **Given** người dùng ở `/lessons`, **When** chọn cấp độ `N5`..`N1`, **Then** lưới 3 cột hiển thị danh sách bài học tương ứng kèm số từ vựng mỗi bài.
2. **Given** người dùng đang xem chi tiết bài học `/lessons/:id`, **When** bật `Ẩn nghĩa để tự ôn`, **Then** toàn bộ nghĩa tiếng Việt bị ẩn và thay bằng nút `"Nhấn để xem nghĩa"` trên từng thẻ.
3. **Given** người dùng đang ở `/flashcards/sessions/:uuid`, **When** nhấn `Space` hoặc chạm vào thẻ, **Then** thẻ lật sang mặt sau hiển thị Kana, nghĩa tiếng Việt, nút TTS, sao yêu thích và 4 nút đánh giá SRS kèm khoảng thời gian dự kiến.
4. **Given** người dùng vào `/flashcards/new`, **When** chọn chế độ `Từng thẻ` hoặc `Nhập hàng loạt` và nhấn `Lưu bộ thẻ`, **Then** bộ thẻ mới xuất hiện trong tab `Của tôi`.

---

### User Story 4 - Luyện 4 Kỹ năng Chuyên sâu (Nghe, Nói, Đọc, Viết) (Priority: P2)

Người học truy cập `Luyện tập` (`/practice`) hoặc từ Trang chủ để luyện 4 kỹ năng:
- **Nghe (`/practice/listening`):** Xem video YouTube có sẵn hoặc tự nhập link YouTube (≤ 20 phút), luyện theo 2 chế độ `Shadowing` và `Nghe chép chính tả`, bấm từng từ trên phụ đề có Furigana để tra từ điển & lưu vào flashcard, xem bản dịch song ngữ và chỉnh tốc độ/lặp đoạn.
- **Nói (`/practice/speaking`):** Chọn tình huống hội thoại AI lọc theo chủ đề & JLPT, chọn chế độ `Nói có gợi ý` (ý tưởng → từ vựng → câu mẫu) hoặc `Tự nói`, tùy chọn lưu âm thanh để nghe lại.
- **Đọc (`/practice/reading`):** Lọc bài đọc theo JLPT & dạng bài (`Đoản văn`, `Trung văn`, `Trường văn`, `Tìm thông tin`, `Hiểu quan điểm`, `Tổng hợp`, `Theo chủ đề`), bật/tắt Furigana, bấm từng từ để tra từ/lưu flashcard, bấm câu để xem phân tích cấu trúc, làm câu hỏi trắc nghiệm A–D và xem tab `Phân tích` / `Tips đọc hiểu`.
- **Viết (`/practice/writing`):** Chọn đề bài theo JLPT/chủ đề hoặc `Viết tự do`, soạn thảo trên giấy ô vuông **Genkouyoushi** (hỗ trợ chuyển viết ngang `yokogaki` ↔ viết dọc `tategaki`), xem tiêu chí chấm 100 điểm (4 tiêu chí × 25đ), tự động lưu nháp và nộp bài để AI chấm điểm.

**Why this priority**: Mở rộng từ học từ vựng đơn lẻ sang luyện đủ 4 kỹ năng ngôn ngữ thực chiến, tạo giá trị khác biệt của NihonGO.

**Independent Test**: Mỗi kỹ năng (`/practice/listening`, `/practice/speaking`, `/practice/reading`, `/practice/writing`) có thể kiểm thử độc lập từ màn hình thư viện tới màn hình thực hành chi tiết.

**Acceptance Scenarios**:

1. **Given** người dùng ở `/practice/listening/:uuid`, **When** bấm vào một từ trên phụ đề, **Then** mở modal `Từ điển` ngay tại chỗ với nút `+ Lưu vào flashcard` và `☆ Yêu thích`.
2. **Given** người dùng ở `/practice/reading/:id`, **When** bật/tắt công tắc `Furigana`, **Then** toàn bộ ruby annotation trên văn bản bật/tắt tương ứng; chọn đáp án A–D và nhấn `Nộp bài` để xem kết quả.
3. **Given** người dùng ở `/practice/writing`, **When** nhấn `Chuyển sang viết dọc`, **Then** lưới giấy `Genkouyoushi` chuyển sang bố cục dọc (`tategaki`) và vẫn đếm số ký tự chính xác.
4. **Given** người dùng ở `/practice/speaking/scenarios/:uuid`, **When** chọn `Nói có gợi ý` và nhấn `Bắt đầu trò chuyện`, **Then** phiên hội thoại AI khởi chạy với gợi ý từng bước.

---

### User Story 5 - Kho Game Từ vựng (Đấu máy & Multiplayer) (Priority: P3)

Người học vào `/games` để chơi 3 game từ vựng: `Công thành Momo` (1v1 / đấu máy với hệ thống 100 HP, 3 phút / 60 câu, phím tắt `1–4`, kỹ năng `Q` Mưa tên, `E` Khiên, combo 3/5/10, ôn từ sai), `Giành mic` (2–8 người) và `Đối kháng từ vựng` (2–8 người). Người dùng có thể đấu với bot (`/games/bot`), tạo phòng mã 6 ký tự (`/games/:roomCode`) hoặc nhập mã tham gia phòng.

**Why this priority**: Tăng tính giải trí và động lực ôn từ vựng sau khi các tính năng học cốt lõi đã ổn định.

**Independent Test**: Vào `/games/bot`, chọn độ khó + trình độ + nguồn từ, nhấn `Xuất quân`, trả lời câu hỏi bằng phím `1–4`, kiểm tra trừ HP/tăng combo và ghi nhận từ sai vào `Ôn từ sai`.

**Acceptance Scenarios**:

1. **Given** người dùng ở `/games`, **When** nhấn `Tạo phòng`, **Then** hệ thống tạo phòng mới với mã 6 ký tự tại `/games/:roomCode` cho phép cấu hình chế độ, trình độ, nguồn từ và thời gian mỗi câu (`8/9/10 giây`).
2. **Given** người dùng đang chơi `Công thành Momo` tại `/games/bot`, **When** đạt chuỗi combo 3, 5, 10, **Then** kích hoạt triệu hồi Momo chiến binh / tinh nhuệ / thần tướng; khi đủ 100 năng lượng có thể dùng `Q` hoặc `E`.

---

### User Story 6 - Hồ sơ Cá nhân, Tiện ích Nổi & Coachmark Hướng dẫn (Priority: P3)

Người học quản lý thông tin tại `/profile` (xem họ tên, trạng thái xác thực email/SĐT, chỉnh sửa trình độ & mục tiêu qua `/profile/learning`, đăng xuất), xem lại kế hoạch học tại `/plan`, và sử dụng cụm tiện ích nổi góc dưới phải (`?` xem lại coachmark của từng trang, `Góp ý beta`, `Mời mình ly cà phê`, thu gọn `×` ↔ `⋯`).

**Why this priority**: Hoàn thiện trải nghiệm sản phẩm, hỗ trợ người dùng mới làm quen và quản lý tài khoản.

**Independent Test**: Mở `/profile`, kiểm tra 4 thẻ thông tin, điều hướng tới `/profile/learning` cập nhật mục tiêu ngày, và bấm nút `?` ở góc dưới phải để mở lại coachmark.

**Acceptance Scenarios**:

1. **Given** người dùng truy cập một trang chức năng lần đầu, **When** trang tải xong, **Then** hiển thị coachmark spotlight từng bước (`Bước X/Y`, `Bỏ qua`, `Tiếp theo →`, `Mình hiểu rồi`).
2. **Given** người dùng ở `/profile`, **When** nhấn `Chỉnh sửa trình độ và mục tiêu`, **Then** mở lại luồng 3 bước tại `/profile/learning` và cập nhật chip hiển thị trên header `/app`.

---

### Edge Cases

- Người dùng đóng tab hoặc chuyển sang tab khác khi bộ đếm `Mục tiêu hôm nay` đang chạy: hệ thống chỉ cộng khoảng thời gian foreground (`intervals`) và đồng bộ khi quay lại, không cộng thời gian ngủ đông.
- Người dùng chưa học bộ thẻ nào có ≥ 4 nghĩa khác nhau: thẻ `Thử thách hôm nay` trên `/app` hiển thị trạng thái khóa kèm hướng dẫn học flashcard trước.
- Người dùng nhập URL YouTube dài quá 20 phút hoặc vượt hạn mức ngày (nếu bật quota): hiển thị thông báo lỗi rõ ràng, không tạo bản ghi lỗi.
- Người dùng tra từ không có kết quả ở tab `Từ vựng` / `Hán tự` / `Video`: hiển thị trạng thái rỗng thân thiện và gợi ý kiểm tra chính tả hoặc dùng `Viết tay`.
- Mất kết nối mạng khi đang làm bài viết hoặc học flashcard: dữ liệu nháp (`Bản nháp`) và tiến độ học cục bộ (`study`, phiên flashcard) được lưu local và đồng bộ lại khi có mạng.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001 (Single-User & Onboarding):** Ứng dụng hoạt động ở chế độ 1 người dùng duy nhất (không có màn `/login`, không yêu cầu xác thực/token). Lần mở đầu tiên chạy stepper 3 bước `/onboarding` lưu `learning_profile` cục bộ; các lần sau vào thẳng `/app`.
- **FR-002 (Navigation & Design System):** Hệ thống PHẢI triển khai giao diện Light mode nền kem-đào ấm (`#FFFDF9` → `#FCECE3`), màu nhấn cam `#F48A34`, thanh điều hướng nổi 5 tab dưới cùng (`Trang chủ`, `Luyện tập`, `Tra cứu`, `Bài học`, `Cá nhân`), header ngữ cảnh và cụm tiện ích nổi góc dưới phải (`?`, `Góp ý beta`, `Ủng hộ`, thu gọn).
- **FR-003 (Study Progress & Heatmap):** Hệ thống PHẢI theo dõi thời gian học hằng ngày theo `intervals` (theo múi giờ người dùng), hiển thị thanh tiến độ `Mục tiêu hôm nay`, 3 chỉ số KPI (`Ngày liên tiếp`, `Ngày đã học`, `Chuỗi dài nhất`) và lịch nhiệt 52 tuần × 7 ngày theo từng năm.
- **FR-004 (Dictionary & Handwriting):** Hệ thống PHẢI cung cấp trang `/lookup` với 3 tab (`Từ vựng`, `Hán tự`, `Video`), lịch sử tra cứu, và modal canvas `Viết tay` nhận diện Kanji trả về 5 ứng viên.
- **FR-005 (Vocabulary Lessons):** Hệ thống PHẢI cung cấp thư viện bài học phân theo `N5–N1` và từ loại tại `/lessons` và `/lessons/:id`, hỗ trợ `Ẩn nghĩa để tự ôn`, phát âm TTS, đánh dấu yêu thích, hiển thị Hán Việt và ví dụ/từ liên quan.
- **FR-006 (Flashcards & SRS):** Hệ thống PHẢI cung cấp quản lý bộ thẻ (`Có sẵn`, `Của tôi`, `Yêu thích`), tạo bộ thẻ (`Từng thẻ`, `Nhập hàng loạt`), dự báo lịch ôn 30 ngày, và phiên học SRS 4 mức (`Chưa nhớ`, `Mơ hồ`, `Nhớ`, `Rất nhớ`) với khoảng thời gian động và phím tắt `Space`.
- **FR-007 (Listening & Shadowing):** Hệ thống PHẢI cung cấp `/practice/listening` hỗ trợ phát video YouTube, import URL YouTube (≤ 20 phút), chế độ `Shadowing` & `Nghe chép chính tả`, phụ đề tách token có Furigana bấm tra từ/lưu flashcard, bản dịch song ngữ và điều khiển lặp đoạn/tốc độ.
- **FR-008 (Speaking with AI):** Hệ thống PHẢI cung cấp `/practice/speaking` với thư viện tình huống lọc theo chủ đề & JLPT, 2 chế độ (`Nói có gợi ý` / `Tự nói`), tùy chọn lưu âm thanh nghe lại và lịch sử hội thoại gần đây.
- **FR-009 (Reading Comprehension):** Hệ thống PHẢI cung cấp `/practice/reading` với bộ lọc JLPT & 7 dạng bài, trình đọc bật/tắt Furigana, tra từ & phân tích từng câu trực tiếp trên văn bản, bài tập trắc nghiệm A–D và 3 tab (`Câu hỏi`, `Phân tích`, `Tips đọc hiểu`).
- **FR-010 (Writing & Genkouyoushi):** Hệ thống PHẢI cung cấp `/practice/writing` với thư viện đề `N5–N1` + `Viết tự do`, quản lý `Bản nháp` / `Đã nộp`, giấy ô vuông `Genkouyoushi` chuyển đổi ngang (`yokogaki`) ↔ dọc (`tategaki`), bộ đếm ký tự, đồng hồ làm bài và tiêu chí chấm 100 điểm.
- **FR-011 (Vocabulary Games):** Hệ thống PHẢI cung cấp `/games` với 3 trò chơi (`Công thành Momo`, `Giành mic`, `Đối kháng từ vựng`), chế độ đấu máy `/games/bot` (có phím tắt, combo, ôn từ sai) và phòng chờ multiplayer mã 6 ký tự `/games/:roomCode`.
- **FR-012 (Profile & Coachmarks):** Hệ thống PHẢI cung cấp `/profile`, `/profile/learning`, `/plan` và hệ thống coachmark hướng dẫn nhiều bước cho từng màn hình chức năng.

### Key Entities

Chi tiết schema xem tại [data-model.md](./data-model.md). Các thực thể cốt lõi:
- **UserProfile & LearningSettings:** Thông tin tài khoản, trạng thái xác thực email/SĐT, trình độ JLPT, mục tiêu chính, mục tiêu phút/ngày.
- **DailyStudyProgress:** Tiến độ học theo ngày (`date`, `goal_seconds`, `seconds`, `intervals`, `timezone`, `completed`).
- **VocabEntry & KanjiEntry:** Từ vựng (Kanji, Kana, Hán Việt, nghĩa theo POS, ví dụ, từ liên quan) và Hán tự (Kunyomi, Onyomi, số nét, bộ thủ, tần suất, thứ tự nét).
- **Lesson & FlashcardDeck / FlashcardCard / SRSState:** Bài học theo JLPT, bộ thẻ hệ thống/cá nhân, trạng thái lập lịch SRS 4 mức.
- **ListeningVideo, SpeakingScenario, ReadingPassage, WritingPrompt & Draft:** Nội dung và tiến độ luyện 4 kỹ năng.
- **GameRoom & GameMatch:** Phòng chơi multiplayer và lịch sử/kỷ lục đấu máy.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001:** 100% các route chính của NihonGO (`/login`, `/onboarding`, `/app`, `/plan`, `/practice`, `/lookup`, `/lessons`, `/lessons/:id`, `/flashcards`, `/flashcards/new`, `/flashcards/sessions/:uuid`, `/games`, `/games/bot`, `/games/:roomCode`, `/practice/listening`, `/practice/speaking`, `/practice/reading`, `/practice/writing`, `/profile`, `/profile/learning`) hoạt động đầy đủ luồng người dùng.
- **SC-002:** Hệ thống thiết kế UI (màu sắc, bo góc, bố cục cột giữa, bottom dock 5 tab, floating utility dock, coachmark) khớp 1-1 với tài liệu [ui-design-system.md](./ui-design-system.md).
- **SC-003:** Người dùng mới hoàn tất onboarding và bắt đầu phiên học flashcard hoặc bài học đầu tiên trong dưới 2 phút.
- **SC-004:** Tra cứu từ điển (bao gồm bấm từ trên phụ đề Nghe và văn bản Đọc) phản hồi trong dưới 300ms với dữ liệu nội bộ và lưu được vào bộ thẻ flashcard chỉ với 1 lần bấm.
- **SC-005:** Toàn bộ tiến độ học hằng ngày (`study`) và bản nháp bài viết được lưu cục bộ bền vững, không mất dữ liệu khi tải lại trang.

---

## Assumptions

- Ứng dụng được triển khai trên kiến trúc sẵn có của repo `kanji_recognizer` (React 19 + Vite + TypeScript 6 ở frontend; Node + Fastify + Kysely + PostgreSQL 18 ở backend; giữ nguyên mô hình local-first + sync).
- Dữ liệu từ điển (JMdict/KanjiVG), bộ bài học từ vựng (JLPT N5–N1), video mẫu và bài đọc mẫu sẽ được seed từ nguồn dữ liệu mở hoặc dữ liệu chủ sở hữu cung cấp.
- Các tính năng AI (hội thoại Nói Live, chấm bài Viết, câu hỏi AI trong Nghe) tích hợp qua API LLM cấu hình bằng biến môi trường (`.env`), không hardcode khóa bí mật.
- Hạn mức Free Beta (1 video Nghe mới/ngày, 2 phiên Nói Live/ngày) có thể cấu hình qua feature flag phía server.
