# Backend Coding Skill — API thật, PostgreSQL thật

## Mục tiêu
Mọi backend feature có persistence phải đi xuyên suốt:
`Route → Controller → Service → Repository → Kysely/SQL → PostgreSQL`.

## Nguyên tắc tuyệt đối
1. PostgreSQL local là runtime mặc định cho development/integration test.
2. Không tạo `mockRepository`, in-memory array, fake CRUD hoặc hard-coded response để thay thế DB nếu feature yêu cầu persistence.
3. Mock chỉ được tồn tại trong test unit khi test boundary không cần DB, và phải đặt tên rõ `mock/fake/stub`.
4. API integration test phải gọi HTTP endpoint thật.
5. Sau mutation (`POST/PUT/PATCH/DELETE`), test phải đọc lại bằng API và/hoặc query DB để chứng minh persistence.
6. Repository không được chứa business workflow; service không được tự SQL trực tiếp nếu repository layer đã được quy định.
7. Controller chịu HTTP mapping; validator chịu input contract; service chịu business rules; repository chịu persistence.

## Local database contract
Development DB mặc định:
- host: `localhost`
- port: `5432`
- database: `kanji_recognizer`
- username: `postgres`
- password: lấy từ `DATABASE_PASSWORD`/`DATABASE_URL`, không hard-code vào source.

Khuyến nghị `.env` local:
`DATABASE_URL=postgresql://postgres:<local-password>@localhost:5432/kanji_recognizer`

Không commit password thật vào repository.

## API verification gate
Trước khi nói “backend feature done”, chạy tối thiểu:
1. Health/readiness endpoint.
2. GET endpoint thật.
3. POST/PUT/PATCH/DELETE tương ứng feature.
4. GET lại để xác nhận state.
5. Query DB hoặc migration/schema verification nếu mutation liên quan persistence.
6. Test invalid input và resource-not-found/conflict case phù hợp.

## 502 diagnosis protocol
502 không được xử lý bằng cách đổi sang mock.

Kiểm tra theo thứ tự:
1. PostgreSQL đang listen `localhost:5432`.
2. Backend process đang listen đúng port.
3. Gọi backend trực tiếp, bỏ qua Vite proxy.
4. Gọi qua `/v1/...` bằng Vite proxy.
5. So sánh status/body/log của hai request.
6. Kiểm tra Vite `server.proxy` target.
7. Kiểm tra backend startup/config/database connection.
8. Chỉ sau khi root cause rõ mới sửa code.

## CRUD acceptance
Ví dụ deck:
- `POST /v1/library/decks` tạo row thật.
- `GET /v1/library/decks` thấy row vừa tạo.
- `PATCH/PUT` thay đổi row thật.
- `DELETE` hoặc archive thay đổi đúng business state.
- Reload/restart backend vẫn thấy dữ liệu nếu không phải transient test DB.

## Definition of Done
- No production mock path.
- HTTP integration tests pass.
- DB persistence verified.
- Error mapping verified.
- Typecheck/lint/build pass.
- Architecture files remain separated.
