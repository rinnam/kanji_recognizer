---
name: ui-design
description: >-
  Thiết kế và review giao diện cho Kanji Nest (React 19 + TypeScript + Vite,
  Feature-Sliced Design). Dùng skill này khi tạo hoặc sửa màn hình/component
  (folder-tree, vocabulary Overview, flashcard, typing quiz, kanji recognition),
  khi chia slice UI theo FSD (app/pages/features/entities/shared), hoặc khi
  review UI. Áp dụng tinh thần codebase-design (module sâu, interface nhỏ, seam
  sạch) và bắt buộc kiểm checklist 4 trạng thái (loading/empty/error/success),
  accessibility (bàn phím, aria, tương phản) và responsive (mobile→desktop).
  Từ khóa kích hoạt - React, component, màn hình, FSD, slice, trạng thái rỗng,
  lỗi, loading, a11y, accessibility, responsive, theme sáng tối, flashcard, quiz.
license: UNLICENSED
compatibility: Kanji Nest frontend (React 19.3.0, Vite 8.3.1, TypeScript 6.0.3). Web responsive.
metadata:
  project: kanji-nest
  layer: frontend
allowed-tools: Read Grep Glob Edit
---

# UI Design Skill — Kanji Nest (Feature-Sliced Design)

Hướng dẫn thiết kế/review UI nhất quán. Chi tiết kiến trúc: `docs/architecture/frontend.md`.

## Khi nào dùng

- Tạo/sửa một màn hình hoặc component.
- Quyết định đặt code UI vào tầng FSD nào.
- Review một PR về UI.

## Nguyên tắc codebase-design (áp cho UI)

- **Module sâu, interface nhỏ:** mỗi component/slice lộ ra API tối thiểu qua `index.ts`; giấu state nội bộ, chi tiết DOM, lớp CSS.
- **Seam sạch:** tách "logic" (hook/model) khỏi "trình bày" (component thuần). Component nhận props rõ ràng, không gọi API trực tiếp bên trong presentational layer.
- **Một hướng phụ thuộc:** `app → pages → features → entities → shared`. Feature không import feature khác.

## Quy trình từng bước

1. **Xác định tầng:** dùng chung thuần kỹ thuật → `shared/ui`; gắn 1 model nghiệp vụ → `entities/<x>/ui`; ghép nhiều entity thành tính năng → `features/<x>`; ghép nhiều feature → `pages/`.
2. **Định nghĩa public API** của slice (`index.ts`) trước khi viết nội bộ.
3. **Thiết kế đủ 4 trạng thái** (xem checklist) — bắt đầu từ empty & error, không chỉ happy path.
4. **A11y & responsive** ngay từ đầu, không để sau.
5. **Hiệu năng:** debounce input tìm kiếm; `React.lazy` cho route/feature nặng.
6. **Tự kiểm theo checklist** rồi mới kết thúc.

## Checklist trạng thái UI (bắt buộc)

- [ ] **Loading:** có skeleton/spinner; không nhảy layout (CLS).
- [ ] **Empty:** thông điệp rõ + hành động gợi ý (vd "Thêm từ đầu tiên").
- [ ] **Error:** thông báo thân thiện + nút thử lại; log lỗi.
- [ ] **Success:** dữ liệu hiển thị đúng; phản hồi thao tác tức thì (optimistic khi hợp lý vì local-first).

## Checklist Accessibility

- [ ] Dùng được **chỉ bằng bàn phím**; thứ tự focus hợp lý; focus ring thấy rõ.
- [ ] `aria-label`/`role` cho control không có text; `alt` cho ảnh.
- [ ] Tương phản màu đạt chuẩn; không chỉ dùng màu để truyền thông tin.
- [ ] Vùng chạm ≥ 44px trên mobile.

## Checklist Responsive & Theme

- [ ] Bố cục mobile → desktop (test ít nhất 360px, 768px, 1280px).
- [ ] Theme sáng/tối qua token; không hardcode màu.

## Ví dụ (input → output)

**Input:** "Thêm màn hình Overview danh sách từ, lọc theo folder/JLPT, phân trang."
**Output mong đợi:**
- `features/vocabulary/ui/VocabularyOverview.tsx` (ghép), dùng `entities/vocabulary` + `entities/folder`.
- Có đủ loading (skeleton hàng), empty ("Chưa có từ"), error (nút thử lại), success (bảng + phân trang).
- Tìm kiếm debounce; filter JLPT là `select` có `aria-label`; responsive bảng → card trên mobile.

## Edge cases cần nghĩ tới

- Folder lồng rất sâu / kéo-thả vào chính con của nó (phải chặn).
- Danh sách rất lớn (ảo hóa/paginate; không render hết).
- Mất mạng (local-first vẫn phải chạy; hiển thị trạng thái "chưa đồng bộ").
- Từ trùng khi Quick Add (hiện cảnh báo chống trùng).

> Nếu phần hướng dẫn vượt quá ~500 dòng, tách chi tiết sang `references/*.md` và chỉ để tóm tắt ở đây (progressive disclosure).
