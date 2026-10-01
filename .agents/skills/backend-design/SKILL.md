---
name: backend-design
description: >-
  Thiết kế và review backend Kanji Nest (Node + TypeScript + Fastify + Kysely +
  PostgreSQL) theo Layered Architecture (routes/controllers → services →
  repositories → DB). Dùng skill này khi thêm hoặc sửa endpoint, controller,
  service, repository, validator Zod, migration PostgreSQL, hoặc logic đồng bộ.
  Nhấn mạnh transaction, idempotency, versioning dữ liệu cho sync (updated_at +
  deleted_at/tombstone, Last-Write-Wins) và nơi đặt logic SRS (SM-2), logic merge,
  logic chấm điểm quiz. Từ khóa kích hoạt - Fastify, Kysely, repository, service,
  controller, transaction, migration, idempotent, sync, merge, SM-2 SRS, quiz,
  PostgreSQL, Zod, endpoint, API backend.
license: UNLICENSED
compatibility: Kanji Nest backend (Node 24, TypeScript 6.0.3, Fastify 5.12.5, Kysely 0.29.6, PostgreSQL 18.4).
metadata:
  project: kanji-nest
  layer: backend
allowed-tools: Read Grep Glob Edit Bash
---

# Backend Design Skill — Kanji Nest (Layered Architecture)

Chi tiết kiến trúc: `docs/architecture/backend.md`. Mô hình dữ liệu: `docs/database/schema.md`.

## Khi nào dùng

- Thêm/sửa endpoint, service, repository, validator, migration.
- Viết hoặc review logic đồng bộ (merge), SRS, chấm quiz.

## Quy tắc tầng (một chiều)

`routes → controllers → services → repositories → DB`. Mỗi tầng chỉ gọi tầng ngay dưới.
- Controller: không business logic, không query DB.
- Service: chứa business logic + quản transaction.
- Repository: chỉ truy cập DB bằng Kysely (type-safe), không business logic.

## Quy trình từng bước (thêm 1 endpoint)

1. **Zod schema** cho input ở `validators/`.
2. **Route** khai báo method/path + gắn validate + controller.
3. **Controller** mỏng: map request → gọi service → map response.
4. **Service** chứa logic; nếu ghi nhiều bảng → `db.transaction()`.
5. **Repository** cho mỗi bảng; nhận `trx` khi trong transaction.
6. **Scope `owner_id`** trong mọi truy vấn dữ liệu người dùng.
7. **Test** (Vitest): unit cho service (logic thuần), integration cho repo/endpoint.

## Nơi đặt logic (tránh nhầm tầng)

- **SRS (SM-2):** `services/srs.service.ts` — EF mặc định 2.5, sàn 1.3; interval theo n (1, 6, rồi ×EF). Công thức: feature-audit §2. Hàm thuần, dễ unit test, tất định.
- **Merge/sync:** `services/sync.service.ts` — LWW theo `updated_at`, tombstone `deleted_at` (ADR 0001).
- **Chấm quiz:** `services/quiz.service.ts`.

## Transaction

- Dùng `db.transaction().execute(async (trx) => { ... })` cho thao tác đa bảng (vd tạo vocab + gắn `vocabulary_folders`).
- Không mở transaction ở controller.

## Migration PostgreSQL

- Nguồn schema: `docs/database/schema.sql` (idempotent, đã kiểm trên PG 18.4).
- Áp: `psql "$DATABASE_URL" -f docs/database/schema.sql`.
- Mọi DDL mới phải idempotent (IF NOT EXISTS / guard DO) và chạy lại được an toàn.
- Kiểm trạng thái: `npm run db:status`.

## Idempotency

- **Push sync idempotent:** nhận lại cùng `(id, updated_at)` → không đổi kết quả (bỏ qua nếu không mới hơn bản server).
- Cân nhắc **idempotency-key** cho tạo tài nguyên nhạy cảm.

## Versioning dữ liệu cho sync

- Mỗi bảng đồng bộ: `updated_at` (merge key) + `deleted_at` (tombstone).
- Pull theo delta `updated_at > last_pulled_at`, lọc `owner_id`, kèm tombstone.
- (TBD) thêm `server_received_at` chống lệch đồng hồ client.

## Ví dụ (input → output)

**Input:** "Endpoint tạo từ vựng mới."
**Output mong đợi:**
- `validators/vocabulary.ts` (Zod: word, meaning bắt buộc…).
- `routes/vocabulary.routes.ts` → `controllers/vocabulary.controller.ts` → `services/vocabulary.service.ts` (Quick Add chống trùng theo `owner_id, word, reading`) → `repositories/vocabulary.repo.ts` + `vocabulary-folders.repo.ts` trong 1 transaction.
- Trả 201 + bản ghi; 409 nếu trùng.

## Edge cases

- Trùng từ (unique một phần `WHERE deleted_at IS NULL`).
- Xóa rồi tạo lại cùng từ (tombstone + tạo bản mới hợp lệ).
- Merge khi client gửi bản cũ hơn (bỏ qua, giữ bản server).
- parentId trỏ tới folder đã bị xóa (ON DELETE SET NULL).

> Chi tiết dài hơn 500 dòng → tách sang `references/*.md` (progressive disclosure).
