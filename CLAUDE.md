# CLAUDE.md

> Một số agent chỉ đọc file này. Toàn bộ hướng dẫn thật nằm ở **[`AGENTS.md`](./AGENTS.md)** — hãy đọc file đó trước tiên.

**Tóm tắt nhanh — Kanji Nest** (repo: `kanji_recognizer`): app học tiếng Nhật (flashcard + Anki SM-2 SRS + quiz + nhận diện Kanji ở giai đoạn cuối), **local-first + đồng bộ PostgreSQL**.

**Trước khi code, đọc theo thứ tự:**
1. [`AGENTS.md`](./AGENTS.md) — tech stack đã chốt, lệnh chạy, quy ước, bảo mật.
2. [`CONTEXT.md`](./CONTEXT.md) — ngôn ngữ chung (dùng đúng thuật ngữ).
3. [`docs/prd.md`](./docs/prd.md) + [`docs/roadmap.md`](./docs/roadmap.md) — phạm vi & thứ tự làm.
4. Kiến trúc: [`docs/architecture/frontend.md`](./docs/architecture/frontend.md), [`docs/architecture/backend.md`](./docs/architecture/backend.md).
5. Dữ liệu: [`docs/database/schema.md`](./docs/database/schema.md).
6. Skills: `.agents/skills/ui-design/`, `.agents/skills/backend-design/`.

**3 điều không được quên:**
- TypeScript **giữ 6.0.3** (chưa lên 7.x) — xem `docs/adr/0002-version-lock.md`.
- Mọi bảng đồng bộ có `updated_at` + `deleted_at` (tombstone) — xem `docs/adr/0001-two-way-smart-merge.md`.
- KHÔNG hardcode secret; dùng `DATABASE_URL` từ `.env`. Tài liệu tiếng Việt, UTF-8.
