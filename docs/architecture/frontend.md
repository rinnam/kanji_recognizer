# Kiến trúc Frontend — Feature-Sliced Design (Kanji Nest)

> React 19.3.0 + Vite 8.3.1 + TypeScript 6.0.3. Áp dụng **Feature-Sliced Design (FSD)** cho `frontend/src`. Skill liên quan: `.agents/skills/ui-design/`.

## 1. Cây thư mục đã chốt

Giữ cây hiện có + **bổ sung `entities/` và `shared/`** (quyết định ở Bước 3):

```
frontend/src/
  app/        (tích hợp cấp cao: providers, router gốc — có thể gộp với main.tsx)
  pages/      màn hình ghép nhiều feature (route-level)
  features/   logic ghép nhiều entity thành một tính năng người dùng
  entities/   *** MỚI *** model nghiệp vụ thuần (Vocabulary, Folder, Card...)
  shared/     *** MỚI *** dùng chung thuần kỹ thuật (UI kit, hooks, utils, api client)
  components/ (đang có) → dần chuyển phần dùng chung sang shared/ui
  hooks/      (đang có) → phần dùng chung sang shared/lib; hook theo feature về features/*
  utils/      (đang có) → chuyển sang shared/lib
  layouts/    bố cục khung trang
  routes/     khai báo route
  services/   gọi API / sync client (→ nên gom về shared/api + entities/*/api)
  stores/     state toàn cục (→ ưu tiên state theo slice; global tối thiểu)
  constants/  hằng số
  types/      kiểu dùng chung (→ kiểu theo entity về entities/*/model)
  assets/     ảnh, font
```

## 2. Quy tắc tầng (import direction)

Chỉ import **xuống dưới**, không ngược:

```
app → pages → features → entities → shared
```

- `shared/` không import gì ở trên nó (thuần kỹ thuật, tái dùng mọi nơi).
- `entities/` chỉ dùng `shared/`. **Không** import `features/`.
- `features/` dùng `entities/` + `shared/`. **Một feature KHÔNG import feature khác** (nếu cần chia sẻ → hạ xuống `entities/` hoặc `shared/`).
- `pages/` ghép nhiều `features/`.
- Mỗi slice export qua **public API** (`index.ts`) — che chi tiết nội bộ (tinh thần *codebase-design*: module sâu, interface nhỏ).

## 3. Map tính năng → slice

| Feature | `features/` | `entities/` dùng tới | Ghi chú |
|---|---|---|---|
| Folder cây lồng nhau (kéo–thả) | `features/folder-tree` | `entities/folder` | DnD, `parentId`+`order` |
| Vocabulary CRUD + Overview | `features/vocabulary` | `entities/vocabulary`, `entities/folder` | lọc/phân trang, Quick Add chống trùng |
| Flashcard (Normal/Progress/Anki SRS) | `features/flashcard` | `entities/vocabulary`, `entities/card` | logic SM-2 ở `entities/card/model` hoặc `features/flashcard/model` |
| Typing Quiz | `features/quiz` | `entities/vocabulary` | chấm điểm, lưu phiên |
| Nhận diện Kanji (GĐ3) | `features/kanji-recognition` | `entities/kanji`, `entities/vocabulary` | canvas/ảnh → tra cứu → lưu |
| Đồng bộ (sync client) | `features/sync` hoặc `shared/api/sync` | tất cả entity đồng bộ | debounce 3.5s, pull/push |

> **Khớp 1-1 với backend:** mỗi feature FE nên có layer BE cùng tên (vd `flashcard`, `vocabulary`, `quiz`) để map rõ — xem `docs/architecture/backend.md`.

## 4. Checklist UI bắt buộc (mọi màn hình/feature)

- **4 trạng thái:** loading · empty · error · success — không bỏ sót trạng thái rỗng/lỗi.
- **Accessibility:** điều hướng bàn phím, `aria-*`, tương phản màu đạt, focus thấy rõ.
- **Responsive:** mobile → desktop (web responsive là bắt buộc; native để tương lai).
- **Theme:** hỗ trợ sáng/tối qua token.
- **Hiệu năng:** debounce search; `React.lazy`/dynamic import cho route/feature nặng.

## 5. Lộ trình refactor nhẹ (không phá vỡ)

1. Tạo `entities/` + `shared/` (đã có README mô tả).
2. Chuyển dần UI dùng chung từ `components/` → `shared/ui`; util từ `utils/` → `shared/lib`.
3. Gom kiểu/model theo entity vào `entities/*/model`; API theo entity vào `entities/*/api` hoặc `shared/api`.
4. Giữ `pages/`, `layouts/`, `routes/` như hiện tại.
