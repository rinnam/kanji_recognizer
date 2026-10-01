# Decisions Log — Phiên thiết kế #1 (2026-10-01)

> Bản ghi tổng kết phiên "Solutions Architect / Technical Writer". Dành cho AI/người đọc phiên sau: đọc để nắm nhanh những gì đã chốt và những gì còn treo (TBD).

## 1. File đã tạo / sửa trong phiên

**Gốc repo:**
- `.nvmrc` *(mới)* — Node 24.14.1
- `AGENTS.md` *(mới)* — điểm vào cho mọi agent
- `CLAUDE.md` *(mới)* — tóm tắt trỏ về AGENTS.md
- `CONTEXT.md` *(mới)* — ngôn ngữ chung / domain model
- `backend/package.json` *(sửa)* — `engines`; TypeScript hạ 7.0.2 → **6.0.3**
- `frontend/package.json` *(sửa)* — `engines`; pin toàn bộ dependency (bỏ `"latest"`)

**docs/:**
- `docs/prd.md` *(viết lại)* — PRD đầy đủ
- `docs/roadmap.md` *(mới)* — 3 giai đoạn
- `docs/context/tech-stack.md` *(mới)* — version lock + hướng dẫn PATH + TBD
- `docs/context/decisions-log.md` *(mới — file này)*
- `docs/reference/kotobase-feature-audit.md` *(mới)*
- `docs/database/schema.sql` *(mới — ĐÃ KIỂM CHẠY trên PG 18.4, idempotent)*
- `docs/database/schema.md` *(mới)*
- `docs/adr/0001-two-way-smart-merge.md` *(mới)*
- `docs/adr/0002-version-lock.md` *(mới)*
- `docs/adr/0003-fsd-layered.md` *(mới)*
- `docs/architecture/frontend.md` *(mới)*
- `docs/architecture/backend.md` *(mới)*

**.agents/skills/:**
- `.agents/skills/ui-design/SKILL.md` *(mới)*
- `.agents/skills/backend-design/SKILL.md` *(mới)*

**frontend/src/:**
- `frontend/src/entities/README.md` *(mới — scaffold FSD)*
- `frontend/src/shared/README.md` *(mới — scaffold FSD)*

> Lưu ý: lệnh `npm install -D --save-exact typescript@6.0.3` trong `backend/` đã cập nhật `node_modules` + `package-lock.json`.

## 2. Trạng thái các TBD (cập nhật 2026-10-01)

1. **Tên dự án:** ✅ CHỐT — sản phẩm "Kanji Nest", repo giữ `kanji_recognizer` (có chủ đích).
2. **DB `kanji_nest`:** ✅ đã tạo + áp `schema.sql`, 8 bảng. (Còn lại: cấu hình `DATABASE_URL` trong `.env`.)
3. **`psql` PATH:** ✅ đã thêm `D:\Ki_2_nam_3\ChuyenDe2\PostgreSQL\18\bin` vào **User PATH** (REG_EXPAND_SZ) — mở terminal MỚI để nhận.
4. **Thang điểm SRS:** ✅ CHỐT — Again=0, Hard=3, Good=4, Easy=5 (feature-audit §2.4).
5. **`server_received_at`:** ✅ CÓ — đã thêm cột + trigger vào `folders`/`vocabularies`.
6. **Hạn dọn tombstone:** ✅ CHỐT — **90 ngày**.
7. **Kanji (GĐ3):** ✅ CHỐT — **ĐÓNG BĂNG**, làm sau cùng; đã thiết kế sẵn (bảng `kanji_entries`/`recognition_results`, feature/entity `kanji`) nhưng không phát triển bây giờ.
8. ✅ **License repo public:** CHỐT **MIT** — đã tạo `LICENSE` + `docs/adr/0004-license.md`.
9. ⏳ **Nâng TypeScript 7:** chờ 7.1 + ecosystem (roadmap GĐ2) — **còn mở**.
10. ⏳ **Nguồn từ điển Kanji + Mazii/Jisho (GĐ3):** chưa xác minh endpoint/field — **còn mở** (chỉ cần khi mở băng GĐ3).

## 3. Self-check SKILL.md theo checklist agentskills.io

| Tiêu chí | `ui-design` | `backend-design` |
|---|---|---|
| `name` ≤64, chỉ `a-z0-9-`, không `--`, không mở/kết hyphen, **trùng tên thư mục** | ✅ | ✅ |
| `description` ≤1024, nêu "làm gì" + "dùng khi nào" + từ khóa kích hoạt | ✅ | ✅ |
| Chỉ dùng field hợp lệ (`name`,`description`,`license`,`compatibility`,`metadata`,`allowed-tools`) | ✅ | ✅ |
| Thân Markdown: step-by-step + ví dụ input/output + edge case | ✅ | ✅ |
| **< 500 dòng** | ✅ (~95) | ✅ (~100) |
| Ghi chú progressive disclosure (tách `references/` nếu dài) | ✅ | ✅ |

## 4. Những gì đã kiểm bằng lệnh thật (không đoán)

- Version: `node -v` (24.14.1), `npm -v` (11.11.0), `pnpm -v` (10.17.1), `git --version` (2.55.0), `npm ls` (FE+BE).
- PostgreSQL: service `postgresql-x64-18` + cổng 5432 LISTENING; `SELECT version()` → **18.4**.
- `schema.sql`: tạo DB nháp → áp 2 lần (idempotent) → `\dt` thấy 8 bảng → drop DB nháp.
