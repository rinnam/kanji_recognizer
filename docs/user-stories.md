# User Stories & Tiêu chí Chấp nhận

> Chỉ cho **module nhận diện Kanji** trong `ai-service`. Tiêu chí chấp nhận viết theo **Given / When / Then**.

| Quy ước | Ý nghĩa |
|---------|---------|
| `US-xx` | User Story |
| `AC` | Acceptance Criteria |

---

## US-01 — Gửi ảnh Kanji để nhận diện

> **Là** client, **tôi muốn** gửi một ảnh Kanji (base64 hoặc multipart), **để** nhận về ký tự được nhận diện.

**Liên kết:** FR-01, FR-03

- **AC1 — Given** request JSON có `image` là base64/data URL hợp lệ, **When** gọi `POST /api/kanji/recognize`, **Then** trả `success: true` kèm mảng `predictions`.
- **AC2 — Given** request multipart có field file `image`, **When** gọi API, **Then** cho kết quả tương đương cách gửi base64 (trong sai số cho phép).
- **AC3 — Given** thiếu `image`, base64 lỗi hoặc file không phải ảnh, **When** gọi API, **Then** trả **HTTP 400** với JSON `{ "success": false, "error": "..." }` và process không bị dừng.

---

## US-02 — Nhận top-5 kết quả sắp xếp theo độ tin cậy

> **Là** client, **tôi muốn** nhận tối đa 5 kết quả kèm độ tin cậy, **để** hiển thị kết quả tốt nhất và các phương án thay thế.

**Liên kết:** FR-03, NFR-02

- **AC1 — Given** một ảnh hợp lệ, **When** nhận diện, **Then** `predictions` có tối đa 5 phần tử, sắp xếp **giảm dần** theo `confidence`.
- **AC2 — Given** kết quả trả về, **When** kiểm tra, **Then** mọi `confidence` nằm trong `[0, 1]` và số phần tử không vượt quá số class.
- **AC3 — Given** kết quả trả về, **When** client dùng, **Then** phần tử **đầu tiên** là kết quả chính.

---

## US-03 — Nhận thông tin chi tiết mỗi Kanji

> **Là** người học, **tôi muốn** mỗi kết quả kèm thông tin Kanji, **để** hiểu cách đọc và nghĩa.

**Liên kết:** FR-04

- **AC1 — Given** một class được dự đoán, **When** trả kết quả, **Then** đính kèm thông tin từ `jlpt-kanji.json`: `kanji`, `hiragana`, `reading_on`, `reading_kun`, `meaning_vi`, `meaning_hv`, `meaning_en`, `example`, `description`, `tags`, `jlpt`, `strokes`, `radical_number`, `frequency`.
- **AC2 — Given** Kanji không có trong JSON, **When** trả kết quả, **Then** các trường thông tin để rỗng và request **không** crash.

---

## US-04 — Tiền xử lý ảnh đúng như lúc train

> **Là** kỹ sư, **tôi muốn** ảnh inference được xử lý y hệt lúc train, **để** độ chính xác không bị lệch.

**Liên kết:** FR-02

- **AC1 — Given** ảnh nền trắng nét đen, **When** tiền xử lý, **Then** ảnh được đảo màu đúng và đưa về cùng canvas với ảnh ETL.
- **AC2 — Given** cùng một chữ gửi bằng base64 và multipart, **When** nhận diện, **Then** cho cùng kết quả trong sai số cho phép.
- **AC3 — Given** pipeline tiền xử lý, **When** chạy test regression, **Then** đầu ra khớp kỳ vọng (Otsu, bounding box + padding 25%, canvas vuông, 300×300, normalize ImageNet).

---

## US-05 — Khởi động an toàn & vận hành ổn định

> **Là** người vận hành, **tôi muốn** service từ chối khởi động khi cấu hình sai, **để** tránh chạy với model/mapping lỗi.

**Liên kết:** NFR-01, NFR-03, NFR-04, NFR-08

- **AC1 — Given** model checkpoint, `data/jlpt-kanji.json` và mapping hợp lệ, **When** start service, **Then** khởi động thành công.
- **AC2 — Given** checkpoint thiếu mapping, **When** start service, **Then** **từ chối ngay khi startup** với thông báo rõ ràng.
- **AC3 — Given** service đang chạy, **When** xử lý nhiều request, **Then** model chỉ được load một lần (không load lại mỗi request).
- **AC4 — Given** môi trường production, **When** xử lý ảnh, **Then** **không** ghi `debug/kanji_preprocessed.png`.

---

## Bảng Ưu tiên

| User Story | Ưu tiên |
|-----------|---------|
| US-01 Gửi ảnh & nhận diện | Must |
| US-02 Top-5 theo confidence | Must |
| US-03 Thông tin Kanji | Must |
| US-04 Tiền xử lý đúng chuẩn | Must |
| US-05 Khởi động an toàn | Must |
