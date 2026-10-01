# 04 — Môi trường, Database và Runbook gỡ lỗi

Mọi lỗi kiểu "502 khi thêm bộ thẻ" phải được gỡ theo tài liệu này **trước** khi sửa code. Các mục §5 là những nguyên nhân đã được tái hiện thực tế bằng cách chạy đúng source backend của dự án trên PostgreSQL với schema `db/migrations/0001_init.sql`.

## 1. Sơ đồ chạy

```text
Trình duyệt ──> Vite dev server :5173 ──proxy /v1──> Fastify 127.0.0.1:3000 ──> PostgreSQL :5432 / kanji_recognizer
```

502 do một **proxy ở giữa** (Vite, hoặc VPN/proxy hệ thống) trả về khi nó không nhận được phản hồi hợp lệ từ Fastify; thường là Fastify không chạy, sai cổng/host, hoặc đã thoát. Lỗi logic của API (400/404/409/422/500) **không** ra 502.

## 2. File cấu hình mẫu

`backend/.env.example` (copy thành `backend/.env`, file `.env` phải nằm trong `.gitignore`):

```dotenv
NODE_ENV=development
HOST=127.0.0.1
PORT=3000
LOG_LEVEL=info
# Thay <password>; ký tự đặc biệt phải URL-encode (@ → %40, # → %23)
DATABASE_URL=postgres://postgres:<password>@127.0.0.1:5432/kanji_recognizer
# Chỉ dùng cho test tích hợp; tên DB BẮT BUỘC kết thúc bằng _test và khác DATABASE_URL
TEST_DATABASE_URL=postgres://postgres:<password>@127.0.0.1:5432/kanji_recognizer_test
# Phải là UUID hợp lệ RFC 4122 (version 1–8, variant 8/9/a/b)
LOCAL_OWNER_ID=00000000-0000-4000-8000-000000000000
```

`frontend/.env.example`:

```dotenv
# Để trống: FE gọi /v1 và Vite proxy chuyển sang backend
VITE_API_BASE_URL=
VITE_USE_MOCK=false
```

`frontend/vite.config.ts` (phần proxy):

```ts
server: {
  port: 5173,
  proxy: {
    '/v1': { target: 'http://127.0.0.1:3000', changeOrigin: true },
  },
},
```

Dùng `127.0.0.1`, không dùng `localhost`: backend chỉ lắng nghe IPv4 `127.0.0.1` (đã kiểm chứng: IPv4 trả 200, `[::1]` bị từ chối), còn `localhost` có thể phân giải sang IPv6 tùy máy/phiên bản Node.

**Bảo mật:** không đưa mật khẩu vào docs, commit, log hay tin nhắn. Mật khẩu đã từng dán vào chat/tài liệu nên được đổi nếu PostgreSQL có thể truy cập từ ngoài máy.

## 3. Thiết lập lần đầu

```bash
# 1) Tạo DB (một lần)
createdb -U postgres kanji_recognizer
createdb -U postgres kanji_recognizer_test

# 2) Backend
cd backend
cp .env.example .env            # rồi điền mật khẩu
npm install
npm run db:status               # xem bảng hiện có
```

| Tình trạng DB `kanji_recognizer` | Việc cần làm |
|---|---|
| Rỗng (0 bảng) | `npm run db:migrate` (F0.2) |
| Đã có đủ 31 bảng nhưng `schema_migrations` trống (trường hợp hiện tại) | `npm run db:baseline -- --confirm-existing-schema` |
| Đã có bảng nhưng thiếu bảng/cột | Dừng, hỏi owner; không tự `DROP` |

```bash
# 3) Dữ liệu dev để Library có nội dung (idempotent)
npm run db:seed:dev             # F0.3, chạy db/seeds/*.sql

# 4) Chạy
npm run dev                     # backend  → "Server listening at http://127.0.0.1:3000"
cd ../frontend && npm install && npm run dev
```

Khi chưa có `db:migrate`/`db:seed:dev`, có thể tạm áp thủ công: `psql -d kanji_recognizer -f db/migrations/0001_init.sql` (chỉ với DB rỗng) và `psql -d kanji_recognizer -f db/seeds/0001_dev_content.sql`.

API tự tạo `owner_scope` và `library` cho `LOCAL_OWNER_ID` ở lần gọi `GET /v1/library` đầu tiên; không cần chèn tay.

## 4. Kiểm tra nhanh sau khi chạy

```bash
curl -s http://127.0.0.1:3000/v1/health                       # {"status":"ok"}
curl -s http://127.0.0.1:3000/v1/library                      # 200, có "decks" và "items"
curl -s http://127.0.0.1:5173/v1/health                       # qua proxy Vite: phải giống kết quả trên
curl -s -X POST http://127.0.0.1:3000/v1/library/decks \
  -H 'content-type: application/json' -d '{"name":"N5"}'      # 201
```

Nếu bước 2 chạy mà bước 3 (qua Vite) lỗi → lỗi nằm ở proxy/cổng, không ở API.

## 5. Gỡ lỗi 502 — theo thứ tự

| Bước | Kiểm tra | Nếu sai |
|---|---|---|
| 1 | `curl http://127.0.0.1:3000/v1/health` trả `{"status":"ok"}`? | Backend không chạy → bước 2 |
| 2 | Terminal backend còn chạy không? Có dòng `Server listening`? Có stack trace khi khởi động? | Đọc lỗi, đối chiếu bảng dưới |
| 3 | Cổng/host trong `vite.config.ts` đúng `127.0.0.1:3000`, khớp `PORT` trong `.env`? | Sửa proxy, restart Vite |
| 4 | Terminal Vite có dòng `http proxy error ... ECONNREFUSED`? | Xác nhận backend không nghe ở địa chỉ đó |
| 5 | Có VPN/proxy hệ thống/Clash/Fiddler chặn `localhost`? | Thêm `127.0.0.1,localhost` vào danh sách bỏ qua proxy |
| 6 | Backend chạy từ bản build cũ? (`dist/src/server.js`) | `npm run build` lại hoặc chạy `dev` |
| 7 | `curl` trực tiếp backend OK nhưng trình duyệt vẫn lỗi? | Xóa cache, kiểm tra tab Network xem request đi tới `5173` hay cổng khác |

**Các lý do backend không lên đã tái hiện được** (khi đó mọi request đều 502 qua proxy):

| Triệu chứng ở terminal backend | Nguyên nhân | Cách sửa |
|---|---|---|
| `ZodError ... "message": "Invalid UUID"` ngay khi start | `LOCAL_OWNER_ID` không phải UUID hợp lệ (vd. `00000000-0000-0000-0000-000000000001`, version nibble = 0) | Dùng `00000000-0000-4000-8000-000000000000` hoặc UUID v4 sinh bằng `gen_random_uuid()` |
| `Error: DATABASE_URL is required to start the database-backed server` | Thiếu `.env` hoặc chạy sai thư mục (`.env` được nạp theo `package.json` script) | Tạo `backend/.env`, chạy script đã nạp `.env` |
| Chỉ `[::1]:3000` bị từ chối, IPv4 OK | Proxy dùng `localhost` → IPv6 | Dùng `127.0.0.1` |

**Backend lên nhưng DB lỗi** (khi đó lỗi là 500/503, không phải 502; nếu thấy 500 trống thì FE đang thiếu bản map, xem `03` §6):

| Dấu hiệu trong log | Nguyên nhân | Sửa |
|---|---|---|
| `ECONNREFUSED 5432` | PostgreSQL chưa chạy | Khởi động service PostgreSQL |
| `28P01 password authentication failed` | Sai mật khẩu trong `DATABASE_URL` | Sửa `.env` |
| `3D000 database "..." does not exist` | Chưa `createdb` | Tạo DB |
| `42P01 relation "..." does not exist` | Chưa áp schema | `db:migrate` hoặc `db:baseline` |
| `23503` foreign key | Dữ liệu seed/tham chiếu thiếu | Chạy seed, kiểm tra `owner_scope`/`library` |

Nếu vẫn chưa rõ: gửi cho AI **3 thứ** — 20 dòng cuối terminal backend, 20 dòng cuối terminal Vite, và kết quả `curl` ở §4 (che mật khẩu).

## 6. Dữ liệu dev (seed)

- File: `db/seeds/0001_dev_content.sql`. Chèn kanji N5 và vài từ vựng vào `content_item` + `content_revision` **trong một transaction**, `status='active'`, `source_ref='dev-fixture'`, `license_ref='original-dev-fixture'`.
- Bắt buộc có `content_revision` cùng lúc vì `content_item.current_revision_no` có khóa ngoại hoãn tới `content_revision`.
- Idempotent: `ON CONFLICT (kind, canonical_key) DO NOTHING`.
- Đây **không phải** nội dung production. Trước khi phát hành, dữ liệu `dev-fixture` phải bị loại (`DELETE FROM content_item WHERE source_ref='dev-fixture'` chỉ chạy khi owner yêu cầu, sau khi gỡ `saved_item` liên quan) và nguồn thật được duyệt theo `LS-OD-02`.

## 7. Làm lại DB dev (cần owner yêu cầu trực tiếp)

```bash
dropdb -U postgres kanji_recognizer && createdb -U postgres kanji_recognizer
cd backend && npm run db:migrate && npm run db:seed:dev
```

AI không tự chạy khối lệnh này (xem playbook §3).
