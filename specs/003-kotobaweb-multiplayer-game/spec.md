# Feature Specification: Auth/Role & Game Đối Kháng Kiểu KotobaWeb

**Feature Branch**: `002-nihongo-app-clone` (hoặc tách nhánh `003-kotobaweb-multiplayer-game`)
**Created**: 2026-11-25
**Status**: Draft

---

## 1. Mục tiêu
1. **Xác thực & Phân quyền (`Auth & RBAC`):**
   - Hỗ trợ đăng ký, đăng nhập (`email + password`), JWT `access_token` + `refresh_token`, phân quyền `role` (`'user' | 'admin'`).
   - **Di trú dữ liệu hiện có:** Gán toàn bộ dữ liệu hiện tại trong PostgreSQL (`folders`, `vocabularies`, `video_folders`, `listening_videos`) cho tài khoản mặc định **`user1@gmail.com`** (mật khẩu ban đầu `luong123`, lưu hash `scrypt` có salt — không bao giờ lưu plain-text).
2. **Game Đối Kháng Real-time Kiểu KotobaWeb (`https://kotobaweb.com/kanjigame/create`):**
   - Tạo phòng (công khai hoặc riêng tư có mã mời), cấu hình nhiều bộ từ cùng lúc, chọn chế độ chơi và thi đấu đối kháng real-time qua WebSocket.

---

## 2. Cơ chế Game KotobaWeb (Clone 1-1)

### 2.1. Tạo phòng & Cấu hình (`/games/create` & `/games/:roomCode`)
- **Tên phòng & Chế độ riêng tư:** Công khai (hiện trên sảnh `/games`) hoặc Riêng tư (vào bằng mã phòng 6 ký tự / link mời).
- **Chọn bộ từ (Multi-deck):** Cho phép tick chọn **1 hoặc nhiều bộ từ cùng lúc** (JLPT `N5`, `N4`, `N3`, `N2`, `N1`, `Kana`, hoặc **Thư mục từ vựng của chính người chơi** trong DB).
- **Chế độ câu hỏi (`Game Mode`):**
  - `Reading` (Nhìn Kanji/Từ → gõ cách đọc Hiragana/Romaji nhanh nhất).
  - `Meaning` (Nhìn Kanji/Từ → gõ nghĩa tiếng Việt/Anh).
  - `Mixed` (Trộn Reading & Meaning).
- **Thông số trận đấu:**
  - `Score limit` (Điểm thắng: `10`, `20`, `30`, `50` điểm).
  - `Answer time limit` (Thời gian trả lời mỗi câu: `10s`, `15s`, `20s`, `30s`).
  - `Delay between questions` (Thời gian nghỉ giữa 2 câu: `2s`, `3s`, `5s`).
  - `Max players` (2–16 người chơi; cho phép chơi solo luyện tốc độ 1 người).
  - `Allow hints` (Bật/tắt gợi ý sau 50% thời gian).

### 2.2. Vòng lặp Trận đấu Real-time (WebSocket)
1. **Sảnh chờ (Lobby):** Hiện danh sách người chơi, badge `Chủ phòng`, nút `Sẵn sàng` / `Bắt đầu trận`.
2. **Phát câu hỏi:** Server bốc ngẫu nhiên 1 từ từ tập deck đã chọn, gửi đề + `deadlineMs` đồng bộ tới mọi client.
3. **Trả lời qua ô chat/gõ nhanh:**
   - Người chơi gõ đáp án (hỗ trợ **Romaji tự chuyển sang Hiragana** hoặc gõ trực tiếp Hiragana/Kanji/Tiếng Việt chuẩn hóa bỏ dấu tùy chọn).
   - **Ai trả lời đúng đầu tiên** ghi `+1` điểm (hiện thông báo xanh `"<Tên> trả lời đúng! (+1)"` + hiển thị đáp án đầy đủ: Kanji, Kana, Hán Việt, Nghĩa).
   - Trả lời sai hiện trong luồng chat (không bị loại, được gõ lại đến khi hết giờ).
   - Hết giờ không ai đúng → Server công bố đáp án, đếm ngược `delay` rồi qua câu mới.
4. **Kết thúc trận:** Khi có người đạt `Score limit` (hoặc hết bộ từ) → Hiện **Bảng xếp hạng (Podium Top 1–2–3)**, danh sách **Từ đã bỏ lỡ / trả lời sai** kèm nút **`+ Lưu vào Flashcard`**, và nút **`Chơi lại`**.

---

## 3. Nguồn Bộ Từ Gợi Ý Miễn Phí & Hợp Pháp cho Game

| Nguồn bộ từ | Nội dung & Quy mô | Giấy phép | Cách tích hợp |
|---|---|---|---|
| **Kho từ sẵn có trong DB của bạn** | 880 từ N3 + các thư mục cá nhân | Dữ liệu của bạn | Dùng trực tiếp qua bảng `vocabularies` + `folders` |
| **JMdict / EDICT (EDRDG)** | >200.000 mục từ Nhật–Anh kèm cách đọc Kana chuẩn | CC BY-SA 4.0 | Tải XML/JSON tại `edrdg.org`, lọc theo tag JLPT |
| **KANJIDIC2 (EDRDG)** | 13.000+ Kanji (Onyomi, Kunyomi, Grade, JLPT, tần suất) | CC BY-SA 4.0 | Tải tại `edrdg.org` cho mode đoán Kanji |
| **Tanos / Jonathan Waller JLPT Lists** | ~800 từ N5, ~700 N4, ~1.800 N3, ~1.800 N2, ~3.400 N1 | CC BY 3.0 | Import CSV vào bảng `game_decks` / `game_cards` |
| **Kotoba Discord Bot Open Decks** | Các bộ từ luyện tốc độ (JLPT, Kanken, Prefixes, Prefs) | MIT / Open (GitHub `mistval/kotoba`) | Tham khảo cấu trúc JSON deck & danh sách phân loại |

---

## 4. Yêu cầu Phi chức năng & Bảo mật
- **Mật khẩu:** Hash bằng `crypto.scrypt` + salt ngẫu nhiên 16 byte (tích hợp sẵn trong Node 24, không cần native build).
- **JWT Secret:** Đọc từ `JWT_SECRET` trong `backend/.env` (KHÔNG hardcode).
- **Chống gian lận (Server-authoritative):** Đáp án đúng chỉ giữ ở Backend; client chỉ nhận câu hỏi (không gửi `answer` xuống client trước khi kết thúc câu).
- **Phân quyền (`role`):**
  - `user`: Học cá nhân, tạo/chơi phòng game, quản lý thư mục/từ vựng của riêng mình.
  - `admin`: Toàn quyền quản trị bộ từ hệ thống (`game_decks`), xóa phòng vi phạm, quản lý user.
