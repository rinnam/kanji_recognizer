# Kiến trúc Backend — Layered Architecture (Kanji Nest)

> Node + TypeScript 6.0.3 + Fastify 5.12.5 + Kysely 0.29.6 + pg 8.23.0 + Zod 4.6.5, PostgreSQL 18.4. Skill liên quan: `.agents/skills/backend-design/`.

## 1. Các tầng (luồng một chiều)

```
HTTP → routes → controllers → services → repositories → DB (PostgreSQL)
                                   ↑
                             validators (Zod), models/types
```

- **routes/** — khai báo endpoint Fastify, gắn controller + schema validate.
- **controllers/** — nhận request đã validate, gọi service, trả response. KHÔNG chứa business logic, KHÔNG truy vấn DB trực tiếp.
- **services/** — **nơi chứa business logic** (SRS, merge, chấm quiz). Điều phối repository, quản lý transaction.
- **repositories/** — truy cập DB bằng Kysely (query type-safe). KHÔNG chứa business logic.
- **validators/** — schema Zod cho input/boundary.
- **models/ + types/** — kiểu dữ liệu, DTO. **Khớp mapping** với `docs/database/schema.md`.
- **middlewares/ · config/ · constants/ · utils/** — hạ tầng dùng chung.

**Quy tắc:** mỗi tầng chỉ gọi tầng ngay dưới. Controller không gọi repository; service không đụng `req/res`.

## 2. Map theo feature (khớp 1-1 với FE slice)

| Feature | routes/controllers | services | repositories |
|---|---|---|---|
| vocabulary | `vocabulary.routes` / `.controller` | `vocabulary.service` (Quick Add chống trùng) | `vocabulary.repo`, `vocabulary-folders.repo` |
| folder | `folder.routes` / `.controller` | `folder.service` | `folder.repo` |
| flashcard | `flashcard.routes` | **`srs.service` (logic SM-2)** | `vocabulary.repo` |
| quiz | `quiz.routes` | **`quiz.service` (chấm điểm)** | `quiz.repo` |
| sync | `sync.routes` | **`sync.service` (Two-Way Smart Merge/LWW)** | mọi repo bảng đồng bộ |
| kanji (GĐ3) | `kanji.routes` | `kanji.service` (tra cứu qua adapter từ điển) | `kanji.repo`, `recognition.repo` |

## 3. Nơi đặt logic quan trọng (tránh nhầm tầng)

- **Logic SRS (SM-2):** `services/srs.service.ts` — tính `srsInterval`, `srsRepetition`, `srsEaseFactor` (sàn 1.3), `srsNextReview`. Công thức: `docs/reference/kotobase-feature-audit.md` §2. KHÔNG đặt trong controller/repo.
- **Logic merge (sync):** `services/sync.service.ts` — LWW theo `updated_at` + tombstone `deleted_at` (ADR 0001). Pull theo delta, push idempotent.
- **Chấm điểm quiz:** `services/quiz.service.ts` — so khớp đáp án, ghi `quiz_sessions`/`quiz_attempts`.

## 4. Transaction, Migration, Idempotency, Versioning

- **Transaction (Kysely):** mọi thao tác ghi nhiều bảng (vd tạo vocab + gắn folder) bọc trong `db.transaction()`. Service điều phối, repository nhận `trx`.
- **Migration PostgreSQL:** nguồn gốc schema = `docs/database/schema.sql` (idempotent, đã kiểm trên 18.4). Áp bằng `psql "$DATABASE_URL" -f ...`. Dùng script `db:status` / `db:baseline` (có sẵn trong `backend/package.json`) để kiểm trạng thái/baseline.
- **Idempotency:**
  - DDL idempotent (IF NOT EXISTS/guard).
  - Endpoint push đồng bộ idempotent: nhận cùng bản ghi (`id` + `updated_at`) nhiều lần → kết quả không đổi (so sánh `updated_at`, bỏ qua nếu không mới hơn).
  - Cân nhắc idempotency-key cho thao tác tạo nhạy cảm.
- **Versioning dữ liệu cho sync:** mỗi bảng đồng bộ có `updated_at` (merge key) + `deleted_at` (tombstone). Pull dựa trên `updated_at > last_pulled_at`. (Có thể thêm `server_received_at` để chống lệch đồng hồ — TBD, ADR 0001.)

## 5. Bảo mật

- `DATABASE_URL` đọc từ `.env` (trong `.gitignore`). KHÔNG hardcode credential.
- Validate mọi input bằng Zod ở biên trước khi vào service.
- Scope dữ liệu theo `owner_id` ở mọi truy vấn người dùng.
