# Engineering Coding Standards

Đây là bộ quy tắc vận hành **bổ sung và cụ thể hóa** cho các coding skill trong `docs/skills/`.

## Thứ tự ưu tiên

1. `docs/prd.md` — nghiệp vụ, scope và requirement canonical.
2. `docs/coding-operating-contract.md` — nguyên tắc chung khi AI triển khai.
3. `docs/engineering/01-ai-coding-playbook.md` — Definition of Done, vertical slice, evidence gate.
4. `docs/engineering/02-backend-standards.md` — Fastify/Kysely/PostgreSQL architecture, errors, tests.
5. `docs/engineering/03-frontend-standards.md` — React/Vite feature boundaries, API/state/UI.
6. `docs/engineering/04-env-database-runbook.md` — runtime, DB, proxy và 502 diagnosis.
7. `docs/engineering/05-library-api-contract.md` — Library v1 API contract.
8. `docs/skills/*` — skill chuyên biệt; không được trái với các tài liệu engineering ở trên.

## Quy tắc vàng

- PostgreSQL dev là runtime thật mặc định.
- Mock chỉ tồn tại trong `frontend/src/mocks/`, chỉ bật khi `VITE_USE_MOCK=true`.
- Không dùng mock để che lỗi backend/database.
- Không gọi feature là `Done` nếu chưa có API evidence, DB evidence và UI evidence.
- HTTP 502 phải được chẩn đoán ở proxy/backend trước; không biến thành `empty` hoặc dữ liệu giả.
- Mỗi feature đi theo vertical slice: DB → BE → API smoke → FE → browser → evidence.

## Lý do bộ này được thêm

Bộ tài liệu này giải quyết trực tiếp các lỗi đã xuất hiện trong repo: Library rỗng, feature chỉ chạy với repository giả, code dồn vào một file, FE/BE lệch error contract, Vite proxy không rõ ràng và việc báo `Done` khi chưa kiểm chứng DB thật.
