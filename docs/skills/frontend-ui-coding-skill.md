# Frontend UI Coding Skill — Feature đúng boundary, không dồn code

## Mục tiêu
React UI phải phản ánh nghiệp vụ và kiến trúc, không trở thành nơi chứa API, business logic và mock persistence cùng lúc.

## Cấu trúc bắt buộc
- `features/<feature>/` chứa UI, API adapter, types và logic riêng feature.
- `components/` chỉ chứa shared components.
- `pages/` là route/page composition, không chứa repository logic.
- `services/` dành cho cross-feature infrastructure khi thực sự cần.
- `stores/` chỉ dùng khi state cần chia sẻ; không tạo store chỉ để thay DB.
- `hooks/` cho reusable React behavior.

## API rule
1. UI không tự `fetch` rải rác trong component nếu feature đã có `features/<feature>/api.ts`.
2. API adapter gọi backend thật theo contract.
3. DTO phải map rõ sang view model.
4. Không fallback sang mock khi API lỗi.
5. Error 502/5xx phải hiện trạng thái lỗi và log đủ thông tin để debug.

## State rule
Mỗi API-backed feature phải có tối thiểu:
`idle/loading/success/empty/error`.
Mutation phải có:
`submitting/success/error` và xử lý double-submit.

## UI acceptance
Feature chỉ hoàn thành khi:
- UI gọi API thật.
- Refresh vẫn phản ánh DB.
- Create/update/delete không chỉ sửa React state.
- Error API được hiển thị đúng.
- Empty state không dùng dữ liệu giả để che API failure.

## Không dồn code
Không tăng `App.tsx`, page hoặc một component thành “god file” để hoàn thành nhanh feature. Trước khi code, xác định file ownership và dependency.

## Mock policy
Mock được phép cho:
- Storybook/demo visual.
- Unit test boundary.
- Explicit offline/demo mode.

Mock không được phép cho:
- Production CRUD.
- Integration test.
- Acceptance evidence.
- Thay thế PostgreSQL đang chạy.

## UI Definition of Done
`PRD acceptance → component → feature API adapter → real API → real persistence → error/loading/empty states → tests → manual verification`.
