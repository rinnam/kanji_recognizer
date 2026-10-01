# ADR 0003 — Chọn Feature-Sliced Design (FE) + Layered Architecture (BE) thay vì MVC thuần

- **Trạng thái:** Accepted
- **Ngày:** 2026-10-01
- **Liên quan:** `docs/architecture/frontend.md`, `docs/architecture/backend.md`

## Bối cảnh

Kanji Nest có nhiều tính năng gắn kết chặt với **domain** (folder, vocabulary, flashcard SRS, quiz, nhận diện Kanji) và mô hình **local-first + đồng bộ**. Cần một cách tổ chức giúp: (a) code theo tính năng, dễ tìm; (b) map rõ ràng giữa frontend và backend; (c) tách biên sạch để module "sâu" (tinh thần codebase-design).

## Quyết định

- **Frontend: Feature-Sliced Design (FSD)** — tầng `app → pages → features → entities → shared`, import một chiều, mỗi slice có public API. Bổ sung `entities/` + `shared/` vào cây hiện có.
- **Backend: Layered Architecture** — `routes/controllers → services → repositories → DB`, business logic nằm ở `services`.
- **Đặt tên feature khớp 1-1 FE↔BE** (vd `flashcard`, `vocabulary`, `quiz`).

## Vì sao KHÔNG dùng MVC thuần

- MVC thuần gom theo **vai trò kỹ thuật** (controllers/models/views) → khi app lớn, một tính năng bị rải khắp nơi, khó tìm, dễ coupling chéo.
- FSD/Layered gom theo **tính năng + hướng phụ thuộc rõ**, hợp với domain nhiều thực thể và yêu cầu map FE↔BE.
- "View" trong MVC không phản ánh được mô hình component/slice của React hiện đại.

## Hệ quả

**Tích cực:** dễ định vị code theo tính năng; biên rõ, dễ test; FE↔BE ánh xạ 1-1; mở rộng (thêm `kanji-recognition`) không phá cấu trúc.

**Tiêu cực / đánh đổi:**
- Nhiều thư mục/boilerplate hơn MVC nhỏ gọn ban đầu.
- Cần kỷ luật tuân thủ hướng import (feature không gọi feature) — kèm review theo skill `ui-design` / `backend-design`.

## Phương án đã cân nhắc

- **MVC thuần:** đơn giản lúc đầu nhưng không chịu nổi độ phức tạp domain → loại.
- **Monolith theo tầng kỹ thuật thuần (không feature):** khó map FE↔BE → loại.
