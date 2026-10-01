# Schema cơ sở dữ liệu — Kanji Nest (PostgreSQL 18)

## 0. Tổng quan & trạng thái

- **Mô hình:** local-first — client giữ bản chính trong IndexedDB, **đồng bộ hai chiều** lên PostgreSQL server qua `updatedAt`.
- **Nguồn sự thật tầng client:** 2 interface `LocalFolder` và `LocalVocabulary` (GIỮ NGUYÊN tên field). Mọi bảng server map 1-1 hoặc giải thích rõ sai khác bên dưới.
- **DDL:** [`schema.sql`](./schema.sql) — ✅ **đã kiểm chạy thật trên PostgreSQL 18.4** (x86_64-windows): áp lần 1 OK, áp lần 2 **idempotent** (mọi object "already exists, skipping"), tạo đủ 8 bảng. Việc kiểm dùng một DB nháp (`kanji_nest_schemacheck`) rồi **drop ngay**, KHÔNG đụng tới `kanji_nest` hay DB khác.
- **DB đích:** `kanji_nest` ✅ **đã được tạo** trên instance local (2026-10-01) và đã áp `schema.sql` thành công — `\dt` xác nhận đủ **8 bảng**. Áp lại khi cần: `psql "$DATABASE_URL" -f docs/database/schema.sql`.

## 1. Mapping field — tầng client (TS) → server (PostgreSQL)

### 1.1. `LocalFolder` → bảng `folders`

| Field TS (client) | Cột (server) | Kiểu | Ghi chú |
|---|---|---|---|
| `id` | `id` | `text` PK | ID do client sinh: `folder_<timestamp>_<random>` |
| `name` | `name` | `text NOT NULL` | |
| `parentId` | `parent_id` | `text` FK→`folders(id)` | `NULL` = thư mục gốc |
| `order` | `sort_order` | `integer` | `order` là **từ khóa SQL** → đổi tên cột |
| `createdAt` | `created_at` | `timestamptz` | ISO Timestamp |
| `updatedAt` | `updated_at` | `timestamptz` | **MERGE KEY** (LWW) |
| *(không có)* | `owner_id` | `uuid` FK→`users(id)` | **SERVER-ONLY** — tách dữ liệu theo người dùng; client local-first không cần |
| *(không có)* | `deleted_at` | `timestamptz` | **SERVER thêm** — tombstone xử lý xóa (xem §3) |

### 1.2. `LocalVocabulary` → bảng `vocabularies` (+ `vocabulary_folders`)

| Field TS (client) | Cột (server) | Kiểu | Ghi chú |
|---|---|---|---|
| `id` | `id` | `text` PK | `vocab_<timestamp>_<random>` |
| `word` | `word` | `text NOT NULL` | |
| `meaning` | `meaning` | `text NOT NULL` | |
| `reading?` | `reading` | `text` | |
| `sinoVietnamese?` | `sino_vietnamese` | `text` | Hán Việt |
| `example?` | `example` | `text` | |
| `exampleMeaning?` | `example_meaning` | `text` | |
| `note?` | `note` | `text` | |
| `folderIds: string[]` | **bảng nối** `vocabulary_folders(vocabulary_id, folder_id)` | — | Quan hệ N-N → chuẩn hóa thành bảng nối |
| `tags: string[]` | `tags` | `text[]` | Mảng Postgres + chỉ mục GIN |
| `jlptLevel?` | `jlpt_level` | `DOMAIN jlpt_level` | CHECK ∈ {N1..N5} |
| `srsInterval?` | `srs_interval` | `integer` | số ngày |
| `srsRepetition?` | `srs_repetition` | `integer` | |
| `srsEaseFactor?` | `srs_ease_factor` | `numeric(4,2)` | mặc định `2.50`, CHECK ≥ `1.30` |
| `srsNextReview?` | `srs_next_review` | `timestamptz` | |
| `createdAt` | `created_at` | `timestamptz` | |
| `updatedAt` | `updated_at` | `timestamptz` | **MERGE KEY** (LWW) |
| *(không có)* | `owner_id` | `uuid` | SERVER-ONLY |
| *(không có)* | `deleted_at` | `timestamptz` | tombstone |

> **Khác biệt có chủ đích:** `folderIds` không lưu dạng mảng mà tách sang `vocabulary_folders` để có ràng buộc khóa ngoại + truy vấn ngược (một folder có những từ nào). `tags` giữ dạng mảng vì không cần toàn vẹn tham chiếu.

## 2. Bảng bổ sung (ngoài 2 model client)

| Bảng | Mục đích | Local-first? |
|---|---|---|
| `users` | Scoping dữ liệu theo người dùng ở server | Không (server) |
| `vocabulary_folders` | Quan hệ N-N vocab ↔ folder | Theo cùng vòng đời bản ghi được đồng bộ |
| `quiz_sessions` | Phiên quiz (mode, score, total, thời điểm) | Không (analytics server) |
| `quiz_attempts` | Từng lần trả lời trong 1 phiên | Không |
| `kanji_entries` | **(GĐ3)** cache từ điển Kanji: on/kun, JLPT, số nét, nghĩa, nguồn | Không (dữ liệu tham chiếu) |
| `recognition_results` | **(GĐ3)** kết quả nhận diện Kanji (vẽ tay/ảnh), có thể lưu vào thư viện | Không |

## 3. Cơ chế "Two-Way Smart Merge" (chi tiết ở ADR 0001)

**Khóa merge:** mỗi bản ghi đồng bộ (`folders`, `vocabularies`, và liên kết `vocabulary_folders`) có `id` (client sinh) + `updated_at` + `deleted_at`.

**Quy tắc hợp nhất (Last-Write-Wins theo `updated_at`):**
1. Cùng `id` ở cả client và server → giữ bản có `updated_at` **mới hơn**.
2. `id` chỉ có một bên → nhận bản đó về bên còn thiếu.
3. **Xử lý xóa bằng tombstone (sửa lỗi của Kotobase):** xóa = đặt `deleted_at` + bump `updated_at` (soft delete), KHÔNG hard-delete khi đồng bộ. Nhờ vậy "xóa" cũng lan truyền như một bản cập nhật → **không bị hồi sinh** bản đã xóa. Dọn tombstone cũ (> ~90 ngày) bằng job nền.

**Giao thức đồng bộ:**
- **Pull:** client xin thay đổi kể từ `last_pulled_at` (lọc theo `owner_id`): server trả các dòng có `updated_at > last_pulled_at` (kể cả tombstone). Dùng chỉ mục `(owner_id, updated_at)`.
- **Push:** client gửi các dòng đổi cục bộ; server áp LWW theo từng `id`.
- **Debounce 3.5s** phía client (học từ Kotobase) trước khi push ngầm.

**Xung đột & đồng hồ lệch:** xung đột sửa song song → LWW (bản ghi sau thắng, có thể mất sửa đổi cấp field — chấp nhận ở v1). `updated_at` do client sinh → rủi ro lệch đồng hồ; server lưu thêm cột `server_received_at` (**đã thêm** — server tự đóng dấu bằng trigger) để kiểm toán. Chi tiết & phương án thay thế: **ADR 0001**.

## 4. Chỉ mục & ràng buộc chính

- `idx_folders_owner_updated`, `idx_vocab_owner_updated` → tăng tốc **pull theo delta** `(owner_id, updated_at)`.
- `idx_vocab_next_review (owner_id, srs_next_review)` → lấy hàng đợi ôn tập SRS trong ngày.
- `idx_vocab_tags` (GIN) → lọc theo tag.
- `uq_vocab_owner_word_reading` **UNIQUE một phần** (`WHERE deleted_at IS NULL`) → **Quick Add chống trùng** (không trùng `word`+`reading` còn sống trong cùng người dùng).
- `chk_ease_factor_min` → đảm bảo EF ≥ 1.3 (bất biến SM-2).

## 5. Bảo mật (repo public)

- **KHÔNG hardcode** mật khẩu/chuỗi kết nối trong bất kỳ file commit nào. Đọc qua **`DATABASE_URL`**.
- `.env` chứa `DATABASE_URL` và PHẢI nằm trong `.gitignore`.
- `schema.sql` **không** chứa credential; chuỗi local dev chỉ nằm trên máy chủ dự án.

## 6. Cách chạy & cách đã kiểm

```bash
# tạo DB (chạy 1 lần, bằng tài khoản quản trị)
psql "$DATABASE_URL_ADMIN" -c "CREATE DATABASE kanji_nest;"
# áp schema (DATABASE_URL trỏ tới kanji_nest, đọc từ .env)
psql "$DATABASE_URL" -f docs/database/schema.sql
```

> Đã kiểm thực tế: tạo DB nháp → áp `schema.sql` 2 lần (idempotent) → `\dt` thấy đủ 8 bảng → drop DB nháp. Server: PostgreSQL 18.4.
