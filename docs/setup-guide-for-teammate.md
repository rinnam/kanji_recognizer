# Hướng dẫn cập nhật DB, `.env` & chạy dự án (dành cho đồng đội)

Tài liệu này tổng hợp **tất cả thay đổi về Database, biến môi trường (`.env`) và thư viện mới** trên nhánh `feat/interview-3d-and-kotoba-game` kể từ sau khi gộp code Shadowing/Handwriting. Làm đủ 5 bước dưới đây là chạy mượt toàn bộ tính năng (**Flashcard SRS, Quiz, Shadowing YouTube, Tra cứu Từ điển + Vẽ tay Kanji, Đấu trường Kotoba WebSocket, Phỏng vấn 3D cùng AI**).

---

## Bước 1 — Kéo code mới nhất

```bash
git fetch origin
git checkout feat/interview-3d-and-kotoba-game
git pull origin feat/interview-3d-and-kotoba-game
```

---

## Bước 2 — Cập nhật Database PostgreSQL (không mất dữ liệu cũ)

Mở **pgAdmin (Query Tool)** hoặc **`psql`** trên database `kanji_nest`, chạy nguyên đoạn SQL sau (đều có `IF NOT EXISTS` nên chạy lại nhiều lần vẫn an toàn):

```sql
-- 1. Thêm cột xác thực & phân quyền cho bảng users (Đăng nhập / Đăng ký / Phân tách không gian)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS display_name  TEXT NOT NULL DEFAULT 'Người dùng',
  ADD COLUMN IF NOT EXISTS role          TEXT NOT NULL DEFAULT 'user';

-- 2. Thêm 2 bảng lưu thư mục & danh sách video Shadowing YouTube
CREATE TABLE IF NOT EXISTS video_folders (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS listening_videos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  folder_id   UUID REFERENCES video_folders(id) ON DELETE SET NULL,
  youtube_id  TEXT NOT NULL,
  url         TEXT NOT NULL,
  title       TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);
```

*(Nếu cài mới hoàn toàn từ DB trắng, chỉ cần chạy file `docs/database/schema.sql` rồi chạy thêm đoạn `ALTER TABLE users` ở trên).*

---

## Bước 3 — Cập nhật file `backend/.env`

Mở file `backend/.env` (nếu chưa có thì copy từ `backend/.env.example`) và đảm bảo có đủ các dòng sau:

```env
NODE_ENV=development
HOST=127.0.0.1
PORT=3000
LOG_LEVEL=info
DATABASE_URL=postgresql://<USER>:<PASSWORD>@127.0.0.1:5432/kanji_nest
TEST_DATABASE_URL=postgresql://<USER>:<PASSWORD>@127.0.0.1:5432/kanji_nest_test
LOCAL_OWNER_ID=00000000-0000-4000-8000-000000000000
GEMINI_API_KEY=<DÁN_API_KEY_GEMINI_CỦA_BẠN_VÀO_ĐÂY>
```

> **Lưu ý quan trọng:**
> - **Cổng Backend mặc định là `3000`** (`PORT=3000`).
> - **`GEMINI_API_KEY`** dùng cho tính năng **Phỏng vấn 3D AI** (đọc CV PDF/ảnh, chấm điểm PREP/STAR & sửa lỗi Keigo). Lấy miễn phí tại `https://aistudio.google.com/app/apikey` (nếu chưa điền thì app vẫn chạy bình thường ở chế độ mẫu).
> - **Tuyệt đối không commit file `.env`** lên Git.

---

## Bước 4 — Cài các thư viện mới (Node + Python)

### 4.1. Cài package cho Backend & Mobile
```bash
cd backend
npm install

cd ../mobile
npm install
```
*(Gồm các thư viện mới: `@fastify/websocket`, `kuromoji` ở backend; `three`, `@types/three` ở mobile).*

### 4.2. Cài package Python (cho Shadowing YouTube & Chép lời Mic Offline 0 tốn token)
```bash
pip install youtube-transcript-api faster-whisper
```
- `youtube-transcript-api`: lấy phụ đề tiếng Nhật cho trang **Nghe & Shadowing**.
- `faster-whisper`: chép lời giọng nói tiếng Nhật **100% offline trên CPU** cho trang **Phỏng vấn 3D AI** *(lần đầu nói Mic sẽ tự tải model `base` ~140MB 1 lần duy nhất, các lần sau mất ~1–2 giây và không tốn quota Gemini)*.

---

## Bước 5 — Khởi chạy ứng dụng

Mở **2 cửa sổ terminal** tại thư mục gốc dự án:

**Terminal 1 — Chạy Backend (`http://localhost:3000`):**
```bash
cd backend
npm run dev
```

**Terminal 2 — Chạy Web / Mobile (`http://localhost:8081`):**
```bash
cd mobile
npm run web
```

Sau khi mở **`http://localhost:8081`**:
- Vào trang **Đăng ký** (`/register`) để tạo tài khoản mới và bắt đầu sử dụng (mỗi tài khoản có không gian Flashcard, SRS và thư mục riêng biệt).
- Kiểm tra nhanh Backend đang sống: mở `http://localhost:3000/health` → thấy `{"status":"ok","db":"up"}` là thành công!
