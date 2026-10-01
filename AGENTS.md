# AGENTS.md — Kanji Nest

> File này là điểm vào cho **mọi AI/agent** (Claude, Cursor, Codex, Copilot, Gemini CLI…) làm việc trên repo. Đọc file này trước. Khi đổi agent giữa chừng, agent mới chỉ cần đọc các file liên kết dưới đây là hiểu toàn bộ bối cảnh.

## 1. Dự án là gì

**Kanji Nest** — app học tiếng Nhật qua **flashcard, SRS (Anki SM-2), quiz**, và **nhận diện Kanji** (làm cuối cùng). Mô hình **local-first** (client giữ bản chính trong IndexedDB) + **đồng bộ hai chiều** lên PostgreSQL.

> ✅ **Tên (đã chốt):** tên **sản phẩm** là **"Kanji Nest"**; **repo/package giữ nguyên** `kanji_recognizer` / `kanji-recognizer-*`. Cùng một dự án — khác biệt tên là có chủ đích, KHÔNG đổi.

## 2. Tech stack đã CHỐT (nguồn sự thật: `docs/context/tech-stack.md`)

- **Node** 24.14.1 (Active LTS) · **npm** ≥ 11 · **Git** 2.55.x
- **Frontend:** React 19.3.0 + Vite 8.3.1 + **TypeScript 6.0.3** (Feature-Sliced Design)
- **Backend:** Node + **TypeScript 6.0.3** + Fastify 5.12.5 + Kysely 0.29.6 + pg 8.23.0 + Zod 4.6.5 (Layered Architecture)
- **DB:** PostgreSQL **18.4** · **Vitest** 5.0.2 (test cả FE + BE)
- ⚠️ **TypeScript GIỮ 6.0.3** (chưa lên 7.x) — lý do & lộ trình: `docs/adr/0002-version-lock.md`.

## 3. Lệnh thường dùng

| Việc | Backend (`backend/`) | Frontend (`frontend/`) |
|---|---|---|
| Dev | `npm run dev` | `npm run dev` |
| Build | `npm run build` | `npm run build` |
| Typecheck | `npm run typecheck` | `npm run typecheck` |
| Lint | `npm run lint` | `npm run lint` |
| Test | `npm test` / `npm run test:unit` / `npm run test:integration` / `npm run test:guard` | `npm test` |
| DB status/baseline | `npm run db:status` / `npm run db:baseline` | — |

**DB migrate (áp schema):**
```bash
psql "$DATABASE_URL" -f docs/database/schema.sql
```
`DATABASE_URL` đọc từ `.env` (xem §5). `psql` nếu chưa có trên PATH: thêm theo hướng dẫn trong `docs/context/tech-stack.md` (§2c).

## 4. Quy ước code

- **Clean code (12 quy tắc):** đặt tên có nghĩa, Single Responsibility, tránh magic number/string, hàm nhỏ, tránh lồng sâu, tránh type assertion thừa, hạn chế disable ESLint, tách test helper khỏi test case, test tất định, assertion tường minh, format dễ đọc, cấu trúc thư mục rõ ràng. (Chi tiết: `docs/prd.md` §NFR.)
- **Frontend:** Feature-Sliced Design — `docs/architecture/frontend.md`. Skill: `.agents/skills/ui-design/`.
- **Backend:** Layered (routes/controllers → services → repositories → DB) — `docs/architecture/backend.md`. Skill: `.agents/skills/backend-design/`.
- **Đặt tên feature khớp 1-1 FE↔BE** (vd `flashcard` có cả FE slice và BE layer tương ứng).
- **Variables bí mật:** chỉ qua biến môi trường, không hardcode.

## 5. Bảo mật (repo PUBLIC)

- KHÔNG commit secret. Mật khẩu/chuỗi kết nối DB chỉ ở `.env` (phải nằm trong `.gitignore`).
- Code đọc DB qua `DATABASE_URL`. Không hardcode chuỗi `postgresql://...` trong file commit.
- **License:** repo phát hành theo **MIT** — xem `LICENSE` và `docs/adr/0004-license.md`.

## 6. Bản đồ tài liệu (đọc theo nhu cầu)

- `CONTEXT.md` — ngôn ngữ chung / domain model (đọc để không dùng sai thuật ngữ).
- `docs/prd.md` — PRD đầy đủ (mục tiêu, persona, non-goals, yêu cầu, NFR, rủi ro).
- `docs/roadmap.md` — 3 giai đoạn (MVP → mở rộng → nhận diện Kanji).
- `docs/context/tech-stack.md` — version lock + TBD.
- `docs/architecture/frontend.md`, `docs/architecture/backend.md` — kiến trúc chi tiết.
- `docs/database/schema.md` + `schema.sql` — mô hình dữ liệu (đã kiểm trên PG 18.4).
- `docs/reference/kotobase-feature-audit.md` — audit dự án tham khảo.
- `docs/adr/` — quyết định kiến trúc: 0001 (merge), 0002 (version lock), 0003 (FSD + Layered).

## 7. Nguyên tắc bất biến

1. Hai interface `LocalFolder` / `LocalVocabulary` là **nguồn sự thật tầng client** — không đổi tên field; mọi thiết kế DB phải map được 1-1 hoặc giải thích rõ.
2. Mọi bảng đồng bộ phải có `updated_at` (merge LWW) + `deleted_at` (tombstone).
3. Tài liệu bằng tiếng Việt, UTF-8, không BOM.
