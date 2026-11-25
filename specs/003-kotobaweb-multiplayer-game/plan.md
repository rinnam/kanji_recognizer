# Implementation Plan: Auth/Role & KotobaWeb Multiplayer Game

**Spec**: [spec.md](./spec.md)

---

## 1. Cập nhật Database PostgreSQL (`docs/database/schema.sql`)

1. **Mở rộng bảng `users`:**
   ```sql
   ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash text;
   ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name text;
   ALTER TABLE users ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin'));
   ```
2. **Di trú dữ liệu hiện tại sang `user1@gmail.com`:**
   - Tạo (hoặc cập nhật) user `user1@gmail.com` với `password_hash = scrypt('luong123')`, `role = 'admin'` (hoặc `'user'`), `display_name = 'Võ Gia Lượng'`.
   - Gán `owner_id` của toàn bộ `folders` và `vocabularies` hiện có sang `user1@gmail.com` (đảm bảo giữ nguyên 100% 880 từ + 12 thư mục).
3. **Thêm bảng cho KotobaWeb Game:**
   - `game_decks (id, slug, title, category, jlpt_level, card_count, is_public, created_at)`
   - `game_cards (id, deck_id, prompt_kanji, readings text[], meanings text[], sino_vietnamese)`
   - `game_matches (id, room_code, host_user_id, mode, score_limit, winner_user_id, players_json, finished_at)`

---

## 2. Backend (`backend/` — Fastify 5 + `@fastify/websocket`)

1. **Auth & RBAC (`src/routes/auth.routes.ts`, `src/services/auth.service.ts`, `src/middlewares/auth.middleware.ts`):**
   - `POST /api/auth/register` (tạo user mới, mặc định `role = 'user'`)
   - `POST /api/auth/login` (kiểm tra `email` + `scrypt` password → trả `access_token`, `user`)
   - `GET /api/auth/me` (trả thông tin user từ Bearer token)
   - Middleware `requireAuth` và `requireRole('admin')` gắn vào các route `sync`, `folders`, `vocabularies`, `games`.
2. **Real-time Game Engine (`src/services/game-room.service.ts`, `src/routes/game.routes.ts`):**
   - Cài `@fastify/websocket` vào `backend/`.
   - Quản lý phòng trong RAM (`Map<roomCode, GameRoomState>`):
     - Sự kiện WebSocket Client → Server: `join_room`, `start_game`, `submit_answer`, `send_chat`, `skip_question`, `update_settings`.
     - Sự kiện WebSocket Server → Client: `room_state`, `question_start` (không kèm đáp án!), `chat_message`, `answer_correct`, `question_timeout`, `game_over`.
   - Bộ chuẩn hóa đáp án (`normalizeAnswer`): chuyển Romaji → Hiragana (vd `shushoku` → `しゅうしょく`), hỗ trợ khớp Hiragana/Katakana/Kanji và nghĩa tiếng Việt.

---

## 3. Cross-Platform UI (`mobile/` — Web + iOS/Android)

1. **Auth Flow:**
   - Thêm `mobile/app/login.tsx` và `mobile/app/register.tsx` (dùng đúng giao diện kem-đào NihonGO).
   - Lưu JWT token trong `AsyncStorage` (`auth`), tự động đính kèm header `Authorization: Bearer <token>` trong `library-source.ts` và `shadowing-api.ts`.
   - Nút `Đăng xuất` trong `mobile/app/(tabs)/profile.tsx`.
2. **KotobaWeb Game Screens (`mobile/app/games/`):**
   - **`/games/index.tsx`:** Sảnh danh sách phòng công khai đang mở + nút `Tạo phòng` + ô nhập mã phòng 6 ký tự.
   - **`/games/create.tsx`:** Trang tạo phòng giống `kotobaweb.com/kanjigame/create` (chọn nhiều bộ từ JLPT / Thư mục cá nhân, chọn chế độ `Reading / Meaning / Mixed`, `Score limit`, `Time limit`, `Delay`).
   - **`/games/[roomCode].tsx`:** Màn hình thi đấu real-time (Cột trái: Bảng xếp hạng điểm trực tiếp; Giữa: Thẻ câu hỏi lớn + thanh đếm ngược + ô gõ đáp án nhanh; Phải: Luồng chat & lịch sử đáp án).

---

## 4. Lộ trình Triển khai (4 Phase)

- **Phase 1 — Auth, Role & Di trú `user1@gmail.com`:** Migration DB + script seed `user1@gmail.com` / `luong123` + API Auth + màn `/login` & `/register`.
- **Phase 2 — Seed Bộ từ Game (JLPT N5–N1 + Thư mục cá nhân):** Tạo bảng `game_decks` / `game_cards` + import bộ từ JLPT chuẩn.
- **Phase 3 — Backend WebSocket Game Engine:** Cài `@fastify/websocket`, xây `game-room.service.ts` + bộ chuyển Romaji→Hiragana + chấm điểm server-side.
- **Phase 4 — Giao diện KotobaWeb (`mobile/app/games/*`):** Xây sảnh phòng, trang tạo phòng đa deck và phòng đấu real-time chạy mượt trên cả Web & Mobile.
