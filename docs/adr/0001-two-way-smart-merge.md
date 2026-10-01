# ADR 0001 — Two-Way Smart Merge (đồng bộ local-first ↔ PostgreSQL)

- **Trạng thái:** Accepted
- **Ngày:** 2026-10-01
- **Liên quan:** `docs/database/schema.md`, `docs/database/schema.sql`, `docs/reference/kotobase-feature-audit.md` (§4)

## Bối cảnh (Context)

Kanji Nest theo mô hình **local-first**: client (IndexedDB) là nơi làm việc chính, offline-first; dữ liệu được **đồng bộ hai chiều** lên PostgreSQL server để backup và dùng trên nhiều thiết bị. Nguồn sự thật tầng client là 2 interface `LocalFolder` và `LocalVocabulary`, cả hai đều có `updatedAt`.

Dự án tham khảo **Kotobase** dùng cơ chế **Last-Write-Wins (LWW) theo `updatedAt`** để merge giữa IndexedDB và Google Drive. Khi audit (xem feature-audit §4), phát hiện một **lỗ hổng**: Kotobase quy định "nếu `id` chỉ có ở một bên thì giữ lại" mà **không có cơ chế tombstone** → bản ghi đã xóa ở máy A sẽ **hồi sinh** sau khi merge với máy B (nơi chưa biết về việc xóa).

## Quyết định (Decision)

1. **Dùng LWW theo `updated_at`** làm quy tắc merge cơ bản cho các thực thể đồng bộ (`folders`, `vocabularies`, liên kết `vocabulary_folders`).
2. **Bổ sung tombstone `deleted_at`** cho mọi bảng đồng bộ. Xóa = **soft delete** (đặt `deleted_at`, bump `updated_at`), KHÔNG hard-delete trong luồng đồng bộ. Nhờ vậy "xóa" lan truyền như một bản cập nhật → **chống hồi sinh**.
3. **Giao thức pull/push theo delta `updated_at`**, lọc theo `owner_id`; client **debounce 3.5s** trước khi push ngầm.
4. **Dọn tombstone** quá hạn (đề xuất > 90 ngày) bằng job nền để tránh phình bảng.
5. Giữ `id` **do client sinh** (`folder_...`, `vocab_...`) làm khóa chính để client tạo bản ghi offline mà không cần round-trip server.

## Hệ quả (Consequences)

**Tích cực:**
- Sửa đúng lỗi hồi sinh dữ liệu của mô hình tham khảo.
- Đơn giản, dễ hiểu, dễ test; không cần hạ tầng đồng bộ phức tạp ở v1.
- Pull theo delta + chỉ mục `(owner_id, updated_at)` → đồng bộ nhẹ.

**Tiêu cực / đánh đổi:**
- LWW có thể **mất sửa đổi cấp field** khi hai thiết bị sửa cùng bản ghi gần như đồng thời (bản ghi sau ghi đè toàn bộ). Chấp nhận ở v1.
- Phụ thuộc **đồng hồ client** để sinh `updated_at` → rủi ro lệch giờ. Giảm thiểu: server lưu thêm `server_received_at` để kiểm toán (**TBD**), hoặc server đóng dấu thời gian có thẩm quyền.
- Tombstone cần job dọn định kỳ.

## Phương án đã cân nhắc & loại bỏ

- **Per-field merge / CRDT / version vector:** mạnh hơn (ít mất dữ liệu hơn) nhưng **phức tạp** vượt nhu cầu v1 → để ngỏ cho tương lai nếu xung đột đồng thời trở thành vấn đề thực tế.
- **Server-authoritative (không local-first):** trái triết lý offline-first của sản phẩm.
- **Hard-delete + bảng changelog riêng:** tốn thêm bảng/logic so với tombstone trực tiếp trên bản ghi.

## Quyết định bổ sung (đã chốt 2026-10-01)

- **Thang điểm SRS:** Again=0, Hard=3, Good=4, Easy=5 (chi tiết: `docs/reference/kotobase-feature-audit.md` §2.4).
- **`server_received_at`: CÓ** — đã thêm cột vào `folders` & `vocabularies`, server tự đóng dấu bằng trigger (`trg_folders_srv_recv`, `trg_vocab_srv_recv`). Dùng để kiểm toán / chống lệch đồng hồ. **KHÔNG** dùng làm merge key (merge key vẫn là `updated_at`).
- **Hạn dọn tombstone: 90 ngày** — job nền xóa cứng bản ghi có `deleted_at` cũ hơn 90 ngày.
