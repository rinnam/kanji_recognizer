# 02 — Backend Standards (Fastify + Kysely + PostgreSQL)

Giữ nguyên quyết định kiến trúc đã duyệt: `Route → Controller → Service → Repository → Kysely → PostgreSQL`, các thư mục layer nằm trực tiếp dưới `backend/src`. Tài liệu này bổ sung **ranh giới trách nhiệm, cách tách file, và hợp đồng lỗi** mà trước đây chưa có.

## 1. Trách nhiệm từng layer

| Layer | Được làm | Cấm |
|---|---|---|
| `routes/` | Khai báo method + path, gắn handler, đăng ký plugin | Logic, parse body, gọi DB |
| `controllers/` | Lấy input từ request, **gọi validator**, gọi service, chọn status code, `reply.send` | Quy tắc nghiệp vụ, SQL, import `kysely` |
| `validators/` | Zod schema cho params/query/body; export kiểu suy ra | Gọi DB |
| `services/` | Quy tắc nghiệp vụ, mở transaction, kiểm quyền sở hữu, ném `AppError` | Import `fastify`, đọc `request`/`reply`, viết SQL |
| `repositories/` | Mọi câu truy vấn Kysely; nhận `ownerId` ở mọi hàm truy cập dữ liệu người dùng; **trả model đã map** | Quy tắc nghiệp vụ, ném lỗi HTTP, trả nguyên hàng DB |
| `mappers/` | Hàm thuần `row → model/DTO` (đổi `snake_case` → `camelCase`, `Date` → ISO) | I/O |
| `models/` | Kiểu domain (`DeckRecord`, ...), hằng số domain | Phụ thuộc Fastify/Kysely |
| `types/database.ts` | Kiểu bảng Kysely, **phải khớp migration** | — |
| `utils/` | Hàm thuần dùng chung (vd. `deck-hierarchy.ts`) | Truy cập DB |
| `config/` | `env.ts`, `database.ts` | Đọc `process.env` ở nơi khác |
| `middlewares/` | Hook cắt ngang (owner context) | Nghiệp vụ |

Quy tắc kiểm được bằng lint/grep: `kysely` chỉ được import trong `repositories/`, `config/`, `types/`; `fastify` không được import trong `services/` và `repositories/`.

## 2. Đặt tên và tách file

Giữ thư mục theo layer. Trong mỗi layer, **một file cho mỗi aggregate**, đặt tên `<aggregate>.<layer>.ts`.

```text
backend/src/
  app.ts  server.ts
  config/        env.ts  database.ts
  routes/        index.ts  system.routes.ts  library.routes.ts  <feature>.routes.ts
  controllers/   library.controller.ts  deck.controller.ts ...
  validators/    deck.validators.ts  library.validators.ts ...
  services/      library.service.ts  deck.service.ts  saved-item.service.ts
  repositories/  library.repository.ts  deck.repository.ts  saved-item.repository.ts  content.repository.ts
  mappers/       deck.mapper.ts  saved-item.mapper.ts
  models/  types/  constants/  utils/  middlewares/
backend/tests/   unit/  integration/  contract/  support/
db/migrations/   0001_init.sql  0002_<tên>.sql ...
db/seeds/        0001_dev_content.sql
```

Ngưỡng bắt buộc tách:

| Chỉ số | Giới hạn |
|---|---|
| Dòng/file | 250 (cảnh báo ở 200) |
| Dòng/hàm | 40 |
| Tham số/hàm | 4 (hơn thì gom object) |
| Aggregate/repository | 1 |

Áp dụng ngay: `library.repository.ts` (240 dòng, gồm library + deck + saved item + membership + browse) tách thành `library.repository.ts` (ensure/version), `deck.repository.ts`, `saved-item.repository.ts` (kèm membership) và `library-browse.repository.ts` (query lọc/phân trang). `library.service.ts` tách tương ứng khi vượt ngưỡng.

Khi số feature > 4 và các thư mục layer bắt đầu chứa nhiều file không liên quan, **đề xuất owner** chuyển sang `src/modules/<feature>/{route,controller,service,repository,validator}` — đây là thay đổi cấu trúc, không tự làm.

Quy ước tên: file `kebab-case.layer.ts`; class `PascalCase` (`DeckService`); cột DB `snake_case`; JSON API `camelCase`; route danh từ số nhiều (`/decks`); hành động không phải CRUD dùng sub-resource (`PUT /decks/rebalance`).

## 3. Quy tắc dữ liệu

- Repository **luôn trả model đã map**. `POST /library/items` hiện trả nguyên hàng DB (`library_id`, `owner_id`, `content_item_id`) — sai quy tắc, sửa theo F0.8.
- Cột `bigint` (`version`, `sort_position`) đi qua API dưới dạng **chuỗi**. Zod nhận bằng `z.coerce.bigint()`.
- Mọi truy vấn dữ liệu người dùng có `owner_id = :ownerId`; mọi truy vấn bản ghi "đang sống" có `archived_at IS NULL AND deleted_at IS NULL`.
- Ghi có tranh chấp dùng **optimistic version** (`expectedVersion`) → không khớp thì `409 CONFLICT`.
- Xóa là soft-delete (`archived_at` + `deleted_at`), con trước cha.
- UUID do ứng dụng sinh bằng `randomUUID()`; seed dùng `gen_random_uuid()`. **Zod 4 `z.uuid()` kiểm tra nghiêm ngặt version/variant** — chuỗi như `11111111-1111-1111-1111-111111111111` hoặc `00000000-0000-0000-0000-000000000001` bị từ chối (xem `04` §5).

## 4. Transaction

- Service mở transaction (`repository.transaction(cb)`); repository không tự mở.
- Một thao tác nghiệp vụ = một transaction: kiểm tra → ghi → tăng `library.version`.
- Không `await` việc bên ngoài (HTTP, file) trong transaction.
- Mỗi use case ghi phải có test hai lần gọi trùng (idempotent hoặc 409) và test lỗi giữa chừng rollback.

## 5. Hợp đồng lỗi (nguồn sự thật duy nhất)

Body lỗi luôn là `{ "code": string, "message": string, "details"?: unknown, "requestId": string }`.

| HTTP | `code` | Khi nào | FE hiển thị |
|---|---|---|---|
| 400 | `INVALID_REQUEST` | Zod parse params/query/body thất bại | "Dữ liệu gửi lên không hợp lệ" + chi tiết trường |
| 403 | `OWNER_SCOPE_FORBIDDEN` | `x-owner-id` khác owner cục bộ | "Không có quyền truy cập thư viện này" |
| 404 | `NOT_FOUND` | Không thấy deck/content/saved item của owner | "Mục không còn tồn tại" |
| 409 | `CONFLICT` | `expectedVersion` lệch, xóa cha khi còn con, trùng đồng thời | "Dữ liệu đã đổi, đã tải lại" |
| 422 | `VALIDATION_ERROR` | Vi phạm quy tắc nghiệp vụ (chu trình, vượt độ sâu 8) | Hiện thông báo theo `code`, kèm `message` của backend nếu đã là tiếng Việt |
| 500 | `INTERNAL_ERROR` | Lỗi không lường trước | "Lỗi hệ thống, thử lại sau" + `requestId` |
| 500 | `DB_SCHEMA_MISMATCH` | Postgres `42P01`/`42703` (thiếu bảng/cột) | "Cơ sở dữ liệu chưa được cập nhật" |
| 503 | `DB_UNAVAILABLE` | Không kết nối được DB (`ECONNREFUSED`, `28P01`, `3D000`) | "Không kết nối được cơ sở dữ liệu" |

Quy tắc: ném lỗi bằng helper trong `utils/errors.ts` (`notFound`, `conflict`, `invalid`, ...), thêm helper mới cho mã mới; **không** `throw new Error(...)` trần trong validator/service vì sẽ thành 500. Thêm mã lỗi mới = cập nhật bảng này, `05-*-api-contract.md` và bảng map FE trong cùng thay đổi.

## 6. Cấu hình và khởi động

- Mọi biến môi trường đi qua `config/env.ts`; không đọc `process.env` chỗ khác.
- Thiếu hoặc sai biến → in **tên biến + ví dụ đúng** rồi thoát mã 1. Không để stack trace Zod là thông báo duy nhất.
- Không ghi `DATABASE_URL` đầy đủ vào log; chỉ log `host:port/database`.
- Server lắng nghe `127.0.0.1` theo mặc định; FE proxy cũng trỏ `127.0.0.1` (xem `04`).
- Mọi route mới phải đăng ký trong `routes/index.ts` và có prefix `/v1/<feature>`.

## 7. Thêm một feature mới (checklist theo thứ tự)

1. Migration `db/migrations/000N_<tên>.sql` + cập nhật `types/database.ts`.
2. `models/<f>.ts` (kiểu domain), `mappers/<f>.mapper.ts`.
3. `validators/<f>.validators.ts`.
4. `repositories/<f>.repository.ts` (nhận `ownerId`, trả model đã map).
5. `services/<f>.service.ts` (transaction, quy tắc, lỗi).
6. `controllers/<f>.controller.ts`, `routes/<f>.routes.ts`, đăng ký trong `routes/index.ts`.
7. Test: unit service (repository giả), integration (DB `_test`), contract (snapshot body lỗi).
8. Seed dev nếu feature cần dữ liệu có sẵn.
9. Cập nhật `/v1/capabilities` đúng thực tế.
10. Cập nhật contract API.

## 8. Test

| Loại | Phạm vi | DB |
|---|---|---|
| Unit | Service với repository giả, `utils/*`, validator, mapper | Không |
| Integration | Route → DB thật, owner isolation, 409/422, rollback | `kanji_recognizer_test` (tên phải kết thúc `_test`, khác `DATABASE_URL`) |
| Contract | Snapshot body thành công và body lỗi cho mọi `code` ở §5 | `_test` |
| Smoke | `curl` theo DoD trong playbook | DB dev |

Lệnh bắt buộc xanh trước khi báo xong: `typecheck`, `lint`, `test:unit`, `build`, `test:integration`.
