# PRD Coding Skill — Nghiệp vụ trước, code sau

## Mục đích
Ép AI biến PRD/user story thành nghiệp vụ có thể kiểm chứng trước khi tạo hoặc sửa code.

## Bắt buộc
1. Đọc `docs/prd.md`, `docs/feature-specification.md`, story/plan liên quan trước khi code.
2. Với mỗi feature phải lập **Feature Contract**:
   - Actor
   - Trigger
   - Preconditions
   - Main flow
   - Alternate/error flows
   - Business rules
   - State transitions
   - API contract
   - Persistence effect
   - UI acceptance criteria
   - Test evidence
3. Không suy diễn nghiệp vụ từ tên hàm hoặc mock data.
4. Nếu requirement yêu cầu persistence thì mock/local array chỉ được dùng cho UI preview, không được dùng cho implementation chính.
5. Nếu API/DB contract chưa rõ: dừng tại decision cần xác nhận; không tự chế schema để làm feature “trông như chạy”.
6. Mỗi feature phải có Definition of Done và câu lệnh kiểm chứng cụ thể.

## Feature execution loop
`Understand → Contract → Map architecture → Implement → Test API → Verify DB → Test UI → Evidence → Update docs`

## Không được coi là hoàn thành nếu
- Chỉ UI chạy với mock.
- Chỉ unit test service nhưng chưa gọi API thật khi feature là API-backed.
- API trả dữ liệu hard-code.
- CRUD chưa chứng minh bằng HTTP request thật.
- DB write chưa được kiểm tra trực tiếp.
- Có 502/connection error chưa xác định root cause.
- Code dồn vào `App.tsx`, controller hoặc repository trái với architecture map.

## Feature evidence format
Mỗi feature phải ghi:
- `Implemented:` file chính.
- `API test:` command + result.
- `DB verification:` query/check + result.
- `UI test:` command/manual evidence.
- `Mock usage:` none / demo-only / blocked.
- `Known limitation:` nếu có.

## Business-rule priority
`PRD > approved feature spec > API contract/schema > existing implementation > mock/example`.
Mock không phải source of truth.
