# 01 — AI Coding Playbook

Mục tiêu: mỗi lần AI nhận một feature, kết quả phải **chạy được thật trên máy owner**, đúng cấu trúc thư mục, không mock ngầm, không dừng ở "Partial" vì thiếu bước nền.

## 1. Definition of Done (DoD)

Một feature chỉ được ghi `Done` khi **tất cả** mục sau có bằng chứng:

| # | Điều kiện | Bằng chứng tối thiểu |
|---|---|---|
| 1 | Schema/migration đã áp dụng lên DB dev | Kết quả `npm run db:status` |
| 2 | API chạy thật trên DB dev | Lệnh `curl` + status code cho từng thao tác (create/read/update/delete + 1 lỗi validate + 1 lỗi conflict) |
| 3 | Dữ liệu thật được ghi xuống DB | Một câu `SELECT` xác nhận hàng vừa tạo/sửa/xóa |
| 4 | FE gọi qua Vite proxy, không mock | Liệt kê request thấy trong tab Network (`/v1/...` trả 2xx) |
| 5 | Refresh trang vẫn còn dữ liệu | Mô tả thao tác và kết quả |
| 6 | Mọi mã lỗi API có thông báo tiếng Việt ở FE | Bảng map trong `03-frontend-standards.md` §6 đầy đủ |
| 7 | Có dữ liệu để thao tác thử | Seed dev đã chạy hoặc feature tự tạo được dữ liệu |
| 8 | `typecheck`, `lint`, `test`, `build` của BE và FE xanh | Output lệnh |
| 9 | Contract API cập nhật | Diff của `05-*-api-contract.md` |

Thiếu bất kỳ mục nào → status là `Partial` và **phải nêu đúng mục thiếu và ai/việc gì sẽ gỡ**. Không ghi `Done` dựa trên unit test với repository giả.

## 2. Quy trình một feature (vertical slice)

Làm theo đúng thứ tự, mỗi bước kiểm chứng trước khi sang bước sau:

1. **Đọc đúng chỗ cần đọc**: PRD requirement ID của feature + `02`/`03` + contract liên quan. Không đọc lại toàn bộ docs.
2. **Chạy `npm run doctor`** (xem F0.6). Nếu môi trường hỏng, sửa môi trường trước, không code tiếp.
3. **DB**: kiểm tra bảng/cột cần dùng đã có ở DB dev; nếu thiếu thì thêm migration forward-only mới (`0002_...sql`), không sửa `0001_init.sql`.
4. **Backend**: validator → repository → service → controller → route → đăng ký trong `app.ts` (đúng `02-backend-standards.md`).
5. **Gọi thử bằng `curl`** trên DB dev (DoD #2, #3).
6. **Frontend**: `api/` → `hooks/` → `components/` → ghép vào page; thêm chuỗi vào `i18n/vi.ts`.
7. **Chạy thử bằng trình duyệt** hoặc, nếu không có trình duyệt, ghi rõ `Browser: chưa kiểm chứng` thay vì suy diễn.
8. **Cập nhật contract + ghi log** (ngắn).

## 3. Quyền hạn trên database

Quy tắc cũ "không chạm DB ứng dụng" khiến AI không bao giờ kiểm chứng trên DB thật, và để lại `owner_scope`/`library` trống. Thay bằng bảng rõ ràng:

| Hành động | DB dev `kanji_recognizer` | DB test `kanji_recognizer_test` |
|---|---|---|
| `SELECT` | Được | Được |
| Chạy API (app tự `ensureLocalOwner`/`ensureLibrary`) | **Được** | Được |
| `db:migrate` (forward-only), `db:baseline` có `--confirm-existing-schema` | **Được** | Được |
| `db:seed:dev` (chỉ `INSERT ... ON CONFLICT DO NOTHING`) | **Được** | Được |
| Tạo dữ liệu thử qua API rồi xóa đúng hàng đã tạo (đánh dấu tên `__ai_test_*`) | Được | Được |
| `DROP`, `TRUNCATE`, `DELETE` không có `WHERE` theo hàng đã tạo, reset DB | **Cấm — cần owner yêu cầu trực tiếp trong tin nhắn** | Được |
| Test tích hợp tự động có dọn dẹp | Cấm | Được (tên DB phải kết thúc `_test`) |
| In/ghi mật khẩu hoặc `DATABASE_URL` đầy đủ vào log, docs, commit | Cấm | Cấm |

## 4. Gate và Open Decision: chặn cái gì, không chặn cái gì

`DG-xx` / `LS-OD-xx` là quyết định cần có **trước khi phát hành production** hoặc trước khi nhập dữ liệu có bản quyền thật. Chúng **không** cấm tạo dữ liệu phục vụ phát triển.

- Dữ liệu dev phải có `source_ref = 'dev-fixture'`, `license_ref = 'original-dev-fixture'`. Có lệnh/guard để loại chúng khỏi production.
- Khi một feature bị gate chặn, AI làm **lát cắt gần nhất không bị chặn** và hỏi owner đúng một câu quyết định. Ví dụ: chưa có nguồn nội dung được duyệt → vẫn làm đủ UI "Lưu vào thư viện" trên dữ liệu `dev-fixture`, gắn nhãn "Dữ liệu dev".
- **Cấm gỡ UI/chức năng đã có để né gate** (đã xảy ra: form Lưu bị xóa vì "chưa có nguồn nội dung", khiến Library luôn rỗng).
- Gate thật sự không thể né (ví dụ model nhận diện chưa có) thì ghi `Blocked` + người quyết định, không dựng giả lập.

## 5. Mock và dữ liệu giả

- Không có mock trong code feature (`features/*`). Mock chỉ ở `frontend/src/mocks/`, bật bằng `VITE_USE_MOCK=true`, luôn hiện banner "Dữ liệu mẫu", và build production phải fail nếu biến này bật (xem `03` §5).
- `frontend/src/learning.ts`, `frontend/src/capabilities.ts` hiện là phần còn lại của shell demo; chuyển vào `mocks/` hoặc xóa khi feature tương ứng làm thật.
- `/v1/capabilities` phải phản ánh thực tế đang chạy, không mô tả "local-mock shell" cho thứ đã làm thật.

## 6. Khi nào được hỏi, khi nào phải tự làm

**Tự làm, không hỏi:** thiếu `.env`/script DB, thiếu seed dev, lệch tên mã lỗi FE–BE, file quá dài cần tách, thiếu mapper, thiếu test.

**Hỏi owner (một câu, kèm đề xuất mặc định):** đổi schema đã tồn tại có dữ liệu, thêm dependency, đổi URL/DTO đang dùng, xóa dữ liệu, chọn nguồn nội dung thật, mọi thứ chạm production.

## 7. Cách ghi trạng thái

Chỉ dùng 3 trạng thái: `Done` (đủ DoD §1), `Partial` (liệt kê mục DoD còn thiếu), `Blocked` (ai quyết định + cần gì). Nhãn `Current/Target/Assumption` chỉ dùng trong PRD; không cần lặp lại trong mỗi báo cáo code.

`AI_WORK_LOG.md`: tối đa 15 dòng/entry với các trường `Scope`, `Files`, `Evidence` (lệnh + kết quả), `Status`, `Next`. Viết sau khi đã chạy kiểm chứng, không viết thay cho kiểm chứng.

## 8. Lỗi AI đã mắc trong repo này (không lặp lại)

| Hiện tượng | Nguyên nhân gốc | Quy tắc |
|---|---|---|
| Library luôn trống, không thêm được mục | Không có seed `content_item`; form Lưu bị gỡ | §3, §4 |
| Feature "Partial" mãi | Chỉ kiểm chứng trên DB tạm, DB dev chưa từng chạy API | §1, §3 |
| `db:baseline` có nhưng không có `db:migrate`/`db:seed` | CLI chỉ ghi nhận, không dựng được DB mới | F0.2, F0.3 |
| FE báo lỗi chung chung | BE trả `INVALID_REQUEST`, FE chỉ map `VALIDATION_ERROR` | `02` §5, `03` §6 |
| `POST /library/items` trả field `snake_case` | Repository trả nguyên hàng DB, thiếu mapper | `02` §3 |
| Code dồn một file | `library.repository.ts` giữ cả deck, saved item, membership, browse | `02` §2 |
| Docs nói một đằng, source một nẻo | `code-structure-proposal.md` vẫn mô tả cây cũ | README: ưu tiên tài liệu |

## 9. Việc nền tảng F0 — làm trước mọi feature mới

Giao các việc này cho AI theo thứ tự; mỗi việc có tiêu chí xong riêng.

| ID | Việc | Xong khi |
|---|---|---|
| F0.1 | Tạo `backend/.env.example` và `frontend/.env.example` theo `04` §2; `.env` nằm trong `.gitignore` | Copy `.env.example` → `.env` là chạy được |
| F0.2 | Thêm `npm run db:migrate` (áp `db/migrations/*.sql` forward-only, có checksum, ghi `schema_migrations`) | DB rỗng → latest chạy được; DB đã có 31 bảng thì từ chối và gợi ý `db:baseline` |
| F0.3 | Thêm `npm run db:seed:dev` chạy `db/seeds/*.sql` trong transaction, idempotent | Chạy 2 lần không lỗi, không nhân đôi; Library hiện kanji để lưu |
| F0.4 | Khi khởi động, bắt `ZodError`/thiếu `DATABASE_URL` và in thông báo dễ hiểu (biến nào sai, ví dụ đúng) rồi thoát mã ≠ 0 | Chạy với `LOCAL_OWNER_ID` sai in ra đúng tên biến |
| F0.5 | Map lỗi kết nối PostgreSQL (`ECONNREFUSED`, `28P01`, `3D000`, `42P01`) sang `503 DB_UNAVAILABLE`/`500 DB_SCHEMA_MISMATCH` kèm `requestId`; thêm `GET /v1/health/db` | Tắt Postgres → API trả 503 có `code`, không phải 500 trống |
| F0.6 | Thêm `npm run doctor` (backend): kiểm `.env`, kết nối DB, đủ bảng bắt buộc, có owner/library, có content seed, cổng 3000 rảnh/đang chạy | In bảng PASS/FAIL từng mục |
| F0.7 | Đồng bộ mã lỗi FE–BE theo `02` §5 và `03` §6; thêm `requestId` vào body lỗi | Mọi mã có test FE |
| F0.8 | `saveItem` trả DTO camelCase qua mapper; cập nhật contract | Khớp `05` |
| F0.9 | Vite proxy trỏ `http://127.0.0.1:3000`; script `npm run dev` ở gốc chạy cả BE lẫn FE | Một lệnh lên đủ hai bên |
| F0.10 | Tách `library.repository.ts` theo aggregate (`02` §2) và `LibraryScreen.tsx` theo `03` §2 | Không file nào > 250 dòng (BE) / 150 dòng (component) |
| F0.11 | Dọn `learning.ts`, `capabilities.ts`, `StatePanel`, `StatusTag` còn sót của shell mock | Chỉ còn thứ đang được import |

## 10. Mẫu giao việc một feature cho AI

```markdown
Feature: <tên> (<requirement ID>)
Người dùng làm được: <1–3 câu theo góc nhìn người dùng, ví dụ "tạo bộ thẻ con, đổi tên, kéo sang bộ khác">
API cần có: <method + path + trạng thái lỗi mong đợi>
Dữ liệu cần seed: <nếu có>
Không làm: <ví dụ Recognition>
Nghiệm thu (DoD §1): chạy curl + thao tác trên trình duyệt, gửi lại output và kết quả SELECT.
Đọc: docs/engineering/01, 02, 03, 05 + PRD §<mục>.
```
