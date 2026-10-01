# Coding Operating Contract — Kanji Recognizer

> Đây là luật vận hành dành cho AI coding agent. Nó ưu tiên feature chạy thật và có bằng chứng hơn việc tạo nhiều code.

## 1. Golden rule
**Không code để tạo cảm giác feature đã xong. Code phải tạo ra behavior có thể kiểm chứng.**

Nếu PostgreSQL local đang chạy, integration test phải dùng PostgreSQL thật.

## 2. Không được dùng mock để né integration
Nếu requirement là Library CRUD, AI phải gọi API thật. Không được trả object từ memory để làm UI “xanh”.

## 3. Mỗi feature phải có vertical slice
Ví dụ `Create Deck`:
`PRD rule → FE form → FE api.ts → POST /v1/... → route → controller → service → repository → PostgreSQL → response → UI refresh → test`.

Thiếu một mắt xích thì status là `Partial/Blocked`, không phải `Implemented`.

## 4. API-first validation
Trước khi sửa UI cho feature backend:
- Xác nhận route tồn tại.
- Gọi endpoint trực tiếp.
- Kiểm tra status/body.
- Thực hiện mutation.
- Đọc lại.
- Nếu API fail, sửa backend/contract trước khi thêm mock vào FE.

## 5. 502 là infrastructure/integration signal
Không biến `502` thành empty state.

### Checklist
- `curl` backend trực tiếp.
- `curl` qua Vite `/v1`.
- kiểm tra port backend.
- kiểm tra Vite proxy.
- kiểm tra server startup.
- kiểm tra DB connection.
- kiểm tra logs.

## 6. Test matrix cho 6 feature đầu tiên
Mỗi feature phải có:
| Layer | Required evidence |
|---|---|
| PRD | business rules + acceptance criteria |
| FE | component/state test |
| API | HTTP integration test |
| BE | service/repository test phù hợp |
| DB | PostgreSQL persistence verification |
| Runtime | FE → Vite → API → DB |

## 7. CRUD minimum
Feature có create/update/delete phải chứng minh cả ba mutation bằng API thật.

Không chấp nhận:
- “nút bấm đã có”
- “state đã đổi”
- “mock response trả 200”

Chấp nhận:
- HTTP response đúng.
- DB state thay đổi đúng.
- Reload vẫn đúng.
- Error case đúng.

## 8. Architecture compliance
Trước mỗi feature, AI phải ghi ngắn:
`Files to change:` và `Why:`.

Sau khi code, kiểm tra:
- Không tạo duplicate API client.
- Không đưa SQL vào controller.
- Không đưa business rule vào React.
- Không đưa mock persistence vào production path.
- Không tạo file mới nếu module hiện hữu đã sở hữu trách nhiệm đó.

## 9. Evidence-first status
Chỉ được dùng:
- `Implemented` khi evidence đầy đủ.
- `Partial` khi một layer còn thiếu.
- `Blocked` khi dependency chưa sẵn sàng.
- `Unverified` khi code có nhưng chưa test.

Không được nâng status chỉ vì code compile.

## 10. Required output sau mỗi feature
AI phải trả:
1. Files changed.
2. Business behavior implemented.
3. API requests tested.
4. DB verification.
5. Tests run + result.
6. Mock usage.
7. Remaining issues.

## 11. Stop condition
Nếu API trả `502`, AI phải dừng việc thêm mock data và chuyển sang diagnosis. Không được tiếp tục “làm UI cho xong”.

## 12. Completion command set
Project phải có command tương ứng cho:
- typecheck
- lint
- unit test
- API integration test
- DB verification
- build
- runtime smoke test

Tên command cụ thể lấy từ package scripts hiện tại; không tự bịa command.
