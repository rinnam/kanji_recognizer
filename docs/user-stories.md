# User Stories & Tiêu chí Chấp nhận

| Thuộc tính | Giá trị |
|-----------|---------|
| Tài liệu | User Stories — Kanji Recognizer |
| Phiên bản | 1.0 |
| Phạm vi | Module nhận diện chữ Kanji viết tay trong `ai-service` |
| Tài liệu liên quan | [PRD](./prd.md) · [Requirements](./requirements-analysis.md) · [Feature Spec](./feature-specification.md) |

---

## Quy ước & Định nghĩa

- `US-xx` — User Story; `AC` — Acceptance Criteria (viết theo **Given / When / Then**).
- **Definition of Ready (DoR):** story có mô tả rõ vai trò/nhu cầu, liên kết FR/NFR, và tối thiểu 2 tiêu chí chấp nhận đo được.
- **Definition of Done (DoD):** code hoàn thành + toàn bộ AC pass + có test regression tương ứng + không phá vỡ API contract.

---

## US-01 — Gửi ảnh Kanji để nhận diện

> **Là** client, **tôi muốn** gửi một ảnh Kanji (base64 hoặc multipart), **để** nhận về ký tự được nhận diện.

**Ưu tiên:** Must · **Liên kết:** FR-01, FR-03

- **AC1 — Given** request JSON có `image` là base64/data URL hợp lệ, **When** gọi `POST /api/kanji/recognize`, **Then** trả `success: true` kèm mảng `predictions`.
- **AC2 — Given** request multipart có field file `image`, **When** gọi API, **Then** cho kết quả tương đương cách gửi base64 (trong sai số cho phép).
- **AC3 — Given** thiếu `image`, **When** gọi API, **Then** trả **HTTP 400** với JSON `{ "success": false, "error": "..." }`.
- **AC4 — Given** `image` là base64 lỗi hoặc file không phải ảnh, **When** gọi API, **Then** trả **HTTP 400** và process **không** bị dừng.

---

## US-02 — Nhận top-5 kết quả theo độ tin cậy

> **Là** client, **tôi muốn** nhận tối đa 5 kết quả kèm độ tin cậy, **để** hiển thị kết quả tốt nhất và các phương án thay thế.

**Ưu tiên:** Must · **Liên kết:** FR-03, NFR-02

- **AC1 — Given** một ảnh hợp lệ, **When** nhận diện, **Then** `predictions` có tối đa 5 phần tử, sắp xếp **giảm dần** theo `confidence`.
- **AC2 — Given** kết quả trả về, **When** kiểm tra, **Then** mọi `confidence` nằm trong `[0, 1]` và số phần tử không vượt quá số class.
- **AC3 — Given** kết quả trả về, **When** client dùng, **Then** phần tử **đầu tiên** là kết quả chính.

---

## US-03 — Nhận thông tin chi tiết mỗi Kanji

> **Là** người học, **tôi muốn** mỗi kết quả kèm thông tin Kanji, **để** hiểu cách đọc và nghĩa.

**Ưu tiên:** Must · **Liên kết:** FR-04

- **AC1 — Given** một class được dự đoán, **When** trả kết quả, **Then** đính kèm thông tin từ `jlpt-kanji.json`: `kanji`, `hiragana`, `reading_on`, `reading_kun`, `meaning_vi`, `meaning_hv`, `meaning_en`, `example`, `description`, `tags`, `jlpt`, `strokes`, `radical_number`, `frequency`.
- **AC2 — Given** Kanji không có trong JSON, **When** trả kết quả, **Then** các trường thông tin để rỗng và request **không** crash.
- **AC3 — Given** mỗi kết quả, **When** kiểm tra, **Then** `train_index` và `json_id` được giữ nguyên để client/hệ thống truy vết.

---

## US-04 — Tiền xử lý ảnh đúng như lúc train

> **Là** kỹ sư, **tôi muốn** ảnh inference được xử lý y hệt lúc train, **để** độ chính xác không bị lệch.

**Ưu tiên:** Must · **Liên kết:** FR-02

- **AC1 — Given** ảnh nền trắng nét đen, **When** tiền xử lý, **Then** ảnh được đảo màu đúng và đưa về cùng canvas với ảnh ETL.
- **AC2 — Given** cùng một chữ gửi bằng base64 và multipart, **When** nhận diện, **Then** cho cùng kết quả trong sai số cho phép.
- **AC3 — Given** pipeline tiền xử lý, **When** chạy test regression, **Then** đầu ra khớp kỳ vọng (Otsu, bounding box + padding 25%, canvas vuông, 300×300, normalize ImageNet).
- **AC4 — Given** ảnh có nhiều khoảng trắng thừa quanh chữ, **When** tiền xử lý, **Then** chữ được cắt bounding box và căn giữa trước khi resize.

---

## US-05 — Khởi động an toàn & vận hành ổn định

> **Là** người vận hành, **tôi muốn** service từ chối khởi động khi cấu hình sai, **để** tránh chạy với model/mapping lỗi.

**Ưu tiên:** Must · **Liên kết:** NFR-01, NFR-03, NFR-04, NFR-08

- **AC1 — Given** model checkpoint, `data/jlpt-kanji.json` và mapping hợp lệ, **When** start service, **Then** khởi động thành công.
- **AC2 — Given** checkpoint thiếu mapping, **When** start service, **Then** **từ chối ngay khi startup** với thông báo rõ ràng.
- **AC3 — Given** service đang chạy, **When** xử lý nhiều request, **Then** model chỉ được load một lần (không load lại mỗi request).
- **AC4 — Given** môi trường production, **When** xử lý ảnh, **Then** **không** ghi `debug/kanji_preprocessed.png`.

---

## US-06 — Endpoint alias `/predict` tương thích

> **Là** client cũ đang dùng `/predict`, **tôi muốn** nhận cùng kết quả như endpoint chính, **để** không phải sửa tích hợp ngay lập tức.

**Ưu tiên:** Should · **Liên kết:** FR-01, FR-03

- **AC1 — Given** cùng một ảnh, **When** gọi `POST /predict` và `POST /api/kanji/recognize`, **Then** hai endpoint trả cùng cấu trúc và cùng kết quả.
- **AC2 — Given** alias không còn client nào dùng, **When** rà soát, **Then** được đánh dấu **deprecated** trước khi xóa.

---

## Bảng Tổng hợp

| User Story | Ưu tiên | FR/NFR liên quan |
|-----------|---------|-------------------|
| US-01 Gửi ảnh & nhận diện | Must | FR-01, FR-03 |
| US-02 Top-5 theo confidence | Must | FR-03, NFR-02 |
| US-03 Thông tin Kanji | Must | FR-04 |
| US-04 Tiền xử lý đúng chuẩn | Must | FR-02 |
| US-05 Khởi động an toàn | Must | NFR-01/03/04/08 |
| US-06 Alias `/predict` | Should | FR-01, FR-03 |

---
*Tài liệu tiếp theo: [Feature Specification](./feature-specification.md).*
