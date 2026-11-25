# Tasks: Auth/Role & KotobaWeb Multiplayer Game (`003-kotobaweb-multiplayer-game`)

## Phase 1: Auth, RBAC & Di trú dữ liệu `user1@gmail.com`
- [ ] **T001** Cập nhật `docs/database/schema.sql` thêm cột `password_hash`, `display_name`, `role` vào bảng `users` và áp dụng lên PostgreSQL `kanji_nest`.
- [ ] **T002** Tạo script `backend/src/scripts/migrate-user1.ts` tạo tài khoản `user1@gmail.com` (mật khẩu `luong123` hash bằng `scrypt`, `role = 'admin'`) và gán toàn bộ `folders`/`vocabularies` hiện có sang tài khoản này.
- [ ] **T003** Xây dựng `backend/src/services/auth.service.ts`, `auth.controller.ts`, `auth.routes.ts` (`/api/auth/register`, `/api/auth/login`, `/api/auth/me`) và `auth.middleware.ts` (`requireAuth`, `requireRole`).
- [ ] **T004** Xây dựng `mobile/app/login.tsx`, `mobile/app/register.tsx`, `mobile/src/features/auth/auth-store.ts`, đính kèm Bearer token vào API client và thêm nút Đăng xuất ở `profile.tsx`.

## Phase 2: Kho Bộ Từ Game (JLPT + Thư mục cá nhân)
- [ ] **T005** Tạo bảng `game_decks`, `game_cards`, `game_matches` trong `docs/database/schema.sql` và PostgreSQL.
- [ ] **T006** Viết script seed bộ từ JLPT N5–N1 (từ nguồn mở Tanos/JMdict + bộ 880 từ hiện có) vào `game_decks` & `game_cards`.

## Phase 3: Backend WebSocket Game Engine (KotobaWeb Clone)
- [ ] **T007** Cài `@fastify/websocket` trong `backend/` và đăng ký plugin tại `server.ts`.
- [ ] **T008** Xây dựng `backend/src/services/game-room.service.ts` (tạo phòng, ghép nhiều deck, vòng lặp câu hỏi + timer, bộ chuyển Romaji→Hiragana, chấm điểm người nhanh nhất, bảng xếp hạng, tổng kết từ sai).
- [ ] **T009** Tạo `backend/src/routes/game.routes.ts` (REST lấy danh sách phòng/deck + WebSocket `/api/games/ws/:roomCode`).

## Phase 4: Giao diện Game Đối Kháng Đa Nền Tảng (`mobile/app/games/*`)
- [ ] **T010** Xây dựng `mobile/app/games/index.tsx` (sảnh phòng công khai + nhập mã phòng 6 ký tự + nút Tạo phòng).
- [ ] **T011** Xây dựng `mobile/app/games/create.tsx` (chọn nhiều bộ từ, chế độ Reading/Meaning/Mixed, Score limit, Time limit, Delay).
- [ ] **T012** Xây dựng `mobile/app/games/[roomCode].tsx` (phòng đấu real-time: Bảng điểm, Thẻ câu hỏi + thanh đếm ngược, Ô gõ đáp án nhanh, Luồng chat, Tổng kết + nút Lưu từ sai vào Flashcard).
