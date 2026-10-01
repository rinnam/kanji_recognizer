# 03 — Frontend Standards (React + Vite + TypeScript)

Áp dụng cho `frontend/src`. Hiện `LibraryScreen.tsx` vừa gọi API, vừa giữ state, vừa chứa nhãn tiếng Việt và JSX một dòng rất dài; `DeckTree.tsx` gom dialog, focus trap, cây và logic di chuyển. Tài liệu này định nghĩa cách tách.

## 1. Nguyên tắc

1. Component chỉ **hiển thị và phát sự kiện**. Gọi API nằm ở `api/`, trạng thái và hiệu ứng nằm ở `hooks/`.
2. Không có dữ liệu giả trong `features/*` (xem §5).
3. Không hard-code chuỗi hiển thị trong component; dùng `i18n/vi.ts` (§7).
4. Kiểu API (`types/`) phản chiếu đúng contract (`05-*-api-contract.md`).
5. Một thay đổi UI nhỏ không được yêu cầu sửa nhiều feature.

## 2. Cấu trúc thư mục

```text
frontend/src/
  main.tsx  App.tsx
  pages/                 # ghép feature thành màn hình, không chứa logic dữ liệu
    LibraryPage.tsx
  features/
    library/
      api/               library.api.ts  deck.api.ts
      hooks/             useLibrary.ts  useDeckActions.ts  useLibraryFilters.ts
      components/        DeckTree/  DeckTree.tsx  DeckNode.tsx  DeckDialog.tsx
                         LibraryFilters.tsx  LibraryGrid.tsx  LibraryCard.tsx
      types.ts           # hoặc types/ khi > 100 dòng
      utils/             deck-tree.ts       # hàm thuần: dựng cây, tìm hậu duệ
      index.ts           # chỉ export thứ trang khác được dùng
  components/ui/         Button, Dialog, Notice, StatePanel, StatusTag   # dùng chung ≥ 2 feature
  lib/                   http-client.ts  api-error.ts
  i18n/                  vi.ts
  mocks/                 (§5)  chỉ tồn tại khi dùng VITE_USE_MOCK
  styles/                tokens.css  base.css
```

Quy tắc đặt chỗ: thứ chỉ một feature dùng nằm trong feature; dùng ≥ 2 feature mới được đưa lên `components/ui/` hoặc `lib/`. Feature không import trực tiếp vào bên trong feature khác, chỉ qua `index.ts`.

Ngưỡng bắt buộc tách: component ≤ **150 dòng**, hook ≤ 100 dòng, một dòng JSX ≤ 100 ký tự (cấu hình Prettier `printWidth: 100`), một file CSS cho một component hoặc một nhóm nhỏ, không CSS toàn cục theo feature.

Tách ngay: `LibraryScreen.tsx` → `LibraryPage.tsx` + `useLibrary.ts` + `LibraryFilters.tsx` + `LibraryGrid.tsx`; `DeckTree.tsx` → `DeckTree.tsx` + `DeckNode.tsx` + `DeckDialog.tsx` + `useFocusTrap.ts` (dùng chung → `lib/` nếu cần ở nơi khác) + `utils/deck-tree.ts`.

## 3. Tầng dữ liệu

```text
component ──> hook ──> feature/api ──> lib/http-client ──> fetch('/v1/...')
```

- `lib/http-client.ts` là nơi **duy nhất** gọi `fetch`. Nó ném `ApiError { status, code, message, requestId?, details? }` và phân biệt:
  - `NETWORK` — `fetch` ném lỗi (không có phản hồi);
  - `BACKEND_UNREACHABLE` — status 502/503/504 **không có** body JSON hợp lệ (proxy không tới được backend);
  - mã từ backend (`INVALID_REQUEST`, `CONFLICT`, ...) khi body JSON có `code`.
- `api/*.ts` chỉ là hàm mỏng: dựng URL/body, trả kiểu đã định nghĩa. Không xử lý thông báo lỗi ở đây.
- `API_BASE` mặc định `/v1` (đi qua Vite proxy). Không hard-code `http://localhost:3000` trong code.
- Sau mỗi thao tác ghi: hoặc cập nhật state từ phản hồi, hoặc refetch; **không** dùng `window.setTimeout(…, 0)` để "lách" lint (hiện có trong `LibraryScreen`). Dùng `useEffect` + cờ hủy hoặc `AbortController`.
- Phân trang theo `nextCursor`; nối trang thêm bằng hàm riêng, không bằng cờ `append` trong cùng hàm tải.

## 4. State và trải nghiệm

Mỗi màn hình dữ liệu có đủ 5 trạng thái, cài bằng `StatePanel` dùng chung: `loading`, `empty`, `error` (có nút Thử lại), `offline/unreachable`, `ready`. Mỗi thao tác ghi có `busy` (khóa nút), thông báo thành công, thông báo lỗi theo bảng §6, và **tải lại** khi `CONFLICT`.

Thao tác phá hủy (xóa) cần hộp xác nhận nói rõ phạm vi ảnh hưởng. Truy cập bàn phím và `aria-*` theo `docs/skills/learning-experience-ui-skill.md`.

## 5. Mock policy

| Quy tắc | Chi tiết |
|---|---|
| Vị trí | `frontend/src/mocks/` duy nhất |
| Bật | `VITE_USE_MOCK=true`; mặc định `false` |
| Cách cắm | Chỉ `lib/http-client.ts` chọn adapter mock; hook và component không biết có mock |
| Hiển thị | Khi mock bật, header hiện banner "Dữ liệu mẫu — không lưu" |
| Production | `vite.config.ts` throw nếu `mode === 'production' && VITE_USE_MOCK === 'true'` |
| Kiểm | Test xác nhận build production không chứa `mocks/` |

Cấm: `useState` giữ danh sách deck/item "cho chạy tạm", nhãn "đồng bộ" khi chưa gọi API, fixture trong component.

## 6. Bảng map lỗi → thông báo tiếng Việt (bắt buộc đủ)

Đặt trong `i18n/vi.ts` hoặc `lib/api-error.ts`; mọi mã ở `02-backend-standards.md` §5 đều có dòng:

| `code` | Thông báo |
|---|---|
| `NETWORK` | Không kết nối được tới máy chủ. Kiểm tra mạng và thử lại. |
| `BACKEND_UNREACHABLE` | Máy chủ chưa chạy hoặc không phản hồi (502/503/504). Hãy khởi động backend rồi thử lại. |
| `INVALID_REQUEST` | Dữ liệu chưa hợp lệ. Kiểm tra lại các trường được đánh dấu. |
| `VALIDATION_ERROR` | Thao tác không được phép với dữ liệu hiện tại (ví dụ lồng bộ thẻ quá sâu hoặc tạo vòng lặp). |
| `NOT_FOUND` | Mục này không còn tồn tại. |
| `CONFLICT` | Dữ liệu đã được thay đổi ở nơi khác. Đã tải lại bản mới nhất. |
| `OWNER_SCOPE_FORBIDDEN` | Bạn không có quyền truy cập thư viện này. |
| `DB_UNAVAILABLE` | Không kết nối được cơ sở dữ liệu. Hãy kiểm tra PostgreSQL. |
| `DB_SCHEMA_MISMATCH` | Cơ sở dữ liệu chưa được cập nhật. Chạy migrate rồi thử lại. |
| `INTERNAL_ERROR` | Có lỗi hệ thống. Mã tham chiếu: `{requestId}`. |
| (mã lạ) | Không thể hoàn tất yêu cầu. Hãy thử lại. |

Hiện FE chỉ map `OFFLINE`, `NOT_FOUND`, `CONFLICT`, `VALIDATION_ERROR` nên mọi lỗi 400/500/502 đều ra câu chung chung — đây là lý do người dùng không phân biệt được "chưa chạy backend" với "dữ liệu sai".

## 7. i18n

Mọi chuỗi hiển thị nằm trong `i18n/vi.ts`, nhóm theo feature (`library.title`, `library.kind.kanji`, ...). Nhãn enum (`kind`, `sourceKind`) là bảng tra trong i18n, không phải `Record` trong component. Nội dung tiếng Nhật dùng `lang="ja"`.

## 8. Quy ước code

- TypeScript strict; không `any`, không `as` ép kiểu API (dùng kiểu trả về từ `api/`).
- Hàm thuần tách vào `utils/` và có unit test (`deck-tree.ts`).
- Prettier + ESLint chạy trong CI; JSX nhiều thuộc tính phải xuống dòng.
- Tên: component `PascalCase.tsx`, hook `useXxx.ts`, API `xxx.api.ts`, test `xxx.test.tsx` đặt cạnh file hoặc trong `tests/`.
- Không thêm dependency khi chưa hỏi owner.

## 9. Test

| Loại | Công cụ | Cần có |
|---|---|---|
| Hàm thuần | Vitest | `utils/*` |
| Hook | Vitest + Testing Library | trạng thái loading/ready/error/conflict |
| Component | Testing Library | đủ 5 trạng thái, bàn phím cho dialog |
| Map lỗi | Vitest | bảng §6 có đủ mọi mã backend (test so khớp danh sách mã) |
| Tích hợp thật | Thủ công theo DoD (playbook §1) | Ghi lại thao tác và kết quả |
