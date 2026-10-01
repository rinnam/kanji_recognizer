# ADR 0002 — Khóa phiên bản (Node / React / TypeScript / PostgreSQL)

- **Trạng thái:** Accepted
- **Ngày:** 2026-10-01
- **Liên quan:** `docs/context/tech-stack.md`

## Bối cảnh

Dự án public, nhiều AI/thiết bị cùng làm việc → cần **khóa phiên bản** để tái lập được. Các version được **phát hiện thực tế** trên máy dev (không dùng kiến thức cũ): Node 24.14.1, npm 11.11.0, React 19.3.0, Vite 8.3.1, PostgreSQL 18.4; TypeScript phát hiện **lệch**: backend 7.0.2, frontend 6.0.3.

## Quyết định

1. **Node 24.14.1** (Active LTS) — khóa trong `.nvmrc` và `engines` (`>=24.14.1 <25`).
2. **React 19.3.0 + Vite 8.3.1 + @vitejs/plugin-react 6.1.1** — giữ đúng bản đã cài; pin cứng trong `frontend/package.json` (bỏ `"latest"`).
3. **TypeScript: CHỐT 6.0.3 cho CẢ frontend và backend** (hạ backend 7.0.2 → 6.0.3).
   - Lý do: TS 7.0 là bản viết lại bằng Go, **programmatic API chưa ổn định tới 7.1**. Nhiều tool trong hệ sinh thái (`@typescript-eslint`, `ts-node`, `ts-jest`, type-check của Vite…) gọi trực tiếp API đó → có nguy cơ gãy lint/test/dev-server dù code không sai.
   - Bản 6.0.3 là bản 6.x cuối trên nền JS cũ, ổn định, tương thích toàn bộ tool hiện có.
4. **PostgreSQL 18.4** — dùng đúng server đang chạy; không nâng/hạ.
5. **npm** là trình quản lý gói (có `package-lock.json`); `pnpm` chỉ cài sẵn, không trộn lockfile.

## Hệ quả

**Tích cực:** môi trường tái lập; tránh gãy do tool chưa theo kịp TS 7; mọi dev/CI/agent dùng cùng bộ version.

**Tiêu cố / đánh đổi:**
- Chưa hưởng tốc độ build của TS 7 (native Go). → **Lộ trình:** nâng TS 7 ở **roadmap Giai đoạn 2**, sau khi kiểm trên nhánh riêng và hệ sinh thái tương thích.
- `frontend/package.json` trước đây để `"latest"` → đã pin cứng để hết non-reproducible.

## Việc đã làm

- Tạo `.nvmrc` = `24.14.1`; thêm `engines` cho cả 2 `package.json`.
- Hạ `backend` TypeScript về `6.0.3`; pin toàn bộ dependency `frontend` về version resolve thực tế.
- Ghi bảng version + hướng dẫn thêm `psql` vào PATH ở `docs/context/tech-stack.md`.

## TBD

- Thời điểm nâng TS 7.0.x (chờ 7.1 + ecosystem).
- ✅ Tên dự án: **đã chốt** — sản phẩm "Kanji Nest", repo/package giữ `kanji_recognizer` (có chủ đích; xem ADR 0004 & CONTEXT.md).
