# Phân tích Yêu cầu (Requirements Analysis)

| Thuộc tính | Giá trị |
|-----------|---------|
| Tài liệu | Requirements Analysis — Kanji Recognizer |
| Phiên bản | 1.0 |
| Phạm vi | Module nhận diện chữ Kanji viết tay trong `ai-service` |
| Tài liệu liên quan | [PRD](./prd.md) · [User Stories](./user-stories.md) · [Feature Spec](./feature-specification.md) |

---

## 1. Quy ước

- `FR-xx` — Functional Requirement (Yêu cầu chức năng).
- `NFR-xx` — Non-Functional Requirement (Yêu cầu phi chức năng).
- Ưu tiên theo **MoSCoW**: Must / Should / Could.
- Mỗi FR mô tả theo cấu trúc: **Đầu vào → Xử lý → Đầu ra → Xử lý lỗi** để có thể implement và viết test trực tiếp.

---

## 2. Yêu cầu Chức năng (Functional Requirements)

### FR-01 — Nhận ảnh đầu vào  ·  *Ưu tiên: Must*

**Mô tả:** API tiếp nhận ảnh chứa một ký tự Kanji viết tay.

- **Đầu vào:** một trong hai dạng
  - JSON: `{ "image": "<base64 hoặc data URL>" }`.
  - Multipart: field file tên `image`.
- **Xử lý:** đọc ảnh bằng Pillow, chuyển sang RGB.
- **Đầu ra:** ảnh RGB hợp lệ, sẵn sàng cho bước tiền xử lý.
- **Xử lý lỗi:** thiếu `image` / base64 lỗi / file không phải ảnh → **HTTP 400** với JSON lỗi; **không** làm dừng process.

### FR-02 — Tiền xử lý ảnh  ·  *Ưu tiên: Must*

**Mô tả:** chuẩn hóa ảnh **đồng bộ tuyệt đối** với validation transform lúc train (hợp đồng dữ liệu train ↔ inference).

- **Đầu vào:** ảnh RGB từ FR-01.
- **Xử lý (đúng thứ tự):**
  1. RGB → grayscale.
  2. Threshold **Otsu** để tách nét chữ.
  3. Tự động đảo màu khi nền trắng chiếm đa số.
  4. Cắt bounding box của chữ + padding **25%** theo cạnh lớn nhất.
  5. Căn giữa vào canvas vuông.
  6. Resize về **300 × 300**.
  7. Grayscale → 3 kênh.
  8. Normalize ImageNet: mean `[0.485, 0.456, 0.406]`, std `[0.229, 0.224, 0.225]`.
- **Đầu ra:** tensor ảnh `3 × 300 × 300` đã chuẩn hóa.
- **Ràng buộc:** đổi bất kỳ bước nào ⇒ phải train lại hoặc đánh giá lại ảnh hưởng độ chính xác.

### FR-03 — Dự đoán  ·  *Ưu tiên: Must*

**Mô tả:** suy luận ký tự Kanji bằng EfficientNet-B3.

- **Đầu vào:** tensor ảnh từ FR-02.
- **Xử lý:**
  - Load EfficientNet-B3 với `weights=None` khi inference.
  - Thay lớp classifier cuối bằng lớp có số class = `num_classes` trong checkpoint (**250**).
  - Chạy `eval()` + `torch.no_grad()`; áp dụng **softmax** trên output.
  - Lấy tối đa **5** class xác suất cao nhất.
- **Đầu ra:** danh sách tối đa 5 phần tử, mỗi phần tử giữ `train_index`, `json_id`, `kanji`, `confidence`.
- **Ràng buộc:** `predictions` sắp xếp **giảm dần** theo `confidence`; `confidence ∈ [0, 1]`; số phần tử ≤ số class.

### FR-04 — Bổ sung thông tin Kanji  ·  *Ưu tiên: Must*

**Mô tả:** làm giàu mỗi kết quả bằng metadata từ `jlpt-kanji.json`.

- **Đầu vào:** danh sách kết quả từ FR-03 (theo `json_id`).
- **Xử lý:** tra `jlpt-kanji.json` theo `json_id`, ghép các trường metadata.
- **Đầu ra:** mỗi kết quả kèm tối thiểu: `id`, `kanji`, `hiragana`, `reading_on`, `reading_kun`, `meaning_vi`, `meaning_hv`, `meaning_en`, `example`, `description`, `tags`, `jlpt`, `strokes`, `radical_number`, `frequency`, `confidence`.
- **Xử lý lỗi:** không tìm thấy Kanji trong JSON → trả kết quả với các trường rỗng, **không** crash request.

---

## 3. Bảng Xử lý Lỗi Đầu vào

| Tình huống | Kết quả | HTTP |
|-----------|---------|------|
| Thiếu trường `image` | JSON lỗi `{ "success": false, "error": "..." }` | 400 |
| Base64 / data URL không hợp lệ | JSON lỗi | 400 |
| File tải lên không phải ảnh (Pillow không mở được) | JSON lỗi | 400 |
| Kanji dự đoán không có trong `jlpt-kanji.json` | Vẫn trả kết quả, metadata rỗng | 200 |
| Model/mapping/JSON thiếu khi khởi động | Service từ chối khởi động | — |

---

## 4. Yêu cầu Phi chức năng (Non-Functional Requirements)

| Mã | Loại | Yêu cầu | Tiêu chí đo được |
|----|------|---------|-------------------|
| **NFR-01** | Hiệu năng | Model load **một lần** khi khởi động, không load lại mỗi request | Không có thao tác load model trong đường xử lý request; đo latency p50/p95 |
| **NFR-02** | Đúng đắn | Kết quả hợp lệ | `confidence ∈ [0,1]`, sắp xếp giảm dần, số phần tử ≤ số class |
| **NFR-03** | Toàn vẹn mapping | `train_index` map đúng sang `kanji` và `json_id`, bất biến suốt vòng đời model | Test mapping: mọi index ánh xạ đúng |
| **NFR-04** | Khởi động an toàn | Kiểm tra tồn tại model checkpoint, `data/jlpt-kanji.json`, mapping trong checkpoint | Checkpoint thiếu mapping → **từ chối khởi động** |
| **NFR-05** | Thiết bị | Dùng CUDA nếu có, ngược lại CPU | Chạy được ở cả hai môi trường |
| **NFR-06** | Cấu hình | Bật/tắt route bằng `ENABLE_KANJI_ROUTES` (mặc định bật); chạy từ thư mục repository | Route xuất hiện/ẩn theo biến môi trường |
| **NFR-07** | Bảo mật (public) | Giới hạn kích thước request; validate MIME/content trước khi decode ảnh | Request quá lớn / sai MIME bị từ chối |
| **NFR-08** | Debug/Production | `debug/kanji_preprocessed.png` chỉ ghi ở môi trường debug | Production không sinh file ảnh trung gian |
| **NFR-09** | Kiểm thử | Có test regression cho tiền xử lý, mapping và API contract | Bộ test chạy được trong CI/local |

---

## 5. Hợp đồng Dữ liệu (Data Contract)

### Request
| Trường | Kiểu | Bắt buộc | Ghi chú |
|--------|------|----------|---------|
| `image` (JSON) | string | Có (nếu dùng JSON) | base64 hoặc data URL |
| `image` (multipart) | file | Có (nếu dùng multipart) | field file tên `image` |

### Mỗi phần tử `predictions[]`
| Trường | Kiểu | Nguồn | Ghi chú |
|--------|------|-------|---------|
| `kanji` | string | model + JSON | ký tự dự đoán |
| `confidence` | number | model | trong `[0, 1]` |
| `train_index` | number | model | chỉ số class trong model |
| `json_id` | number | mapping | khóa tra `jlpt-kanji.json` |
| `hiragana`, `reading_on`, `reading_kun` | string/array | JSON | cách đọc |
| `meaning_vi`, `meaning_hv`, `meaning_en` | string/array | JSON | nghĩa |
| `example`, `description`, `tags` | string/array | JSON | thông tin bổ sung |
| `jlpt`, `strokes`, `radical_number`, `frequency` | string/number | JSON | thuộc tính ký tự |

---

## 6. Ràng buộc Dữ liệu & Huấn luyện

### Nguồn dữ liệu
- ETL10/ETL9B cung cấp record ảnh nhị phân 64×63.
- `JIS0208.py` map JIS code → Unicode Kanji.
- `jlpt-kanji.json` là whitelist + nguồn metadata.
- Dataset sau convert: `dataset_output_*/<kanji>/*.png`.

### Mapping class (bắt buộc, bất biến)
`train_idx_to_kanji`, `kanji_to_train_idx`, `train_idx_to_json_id`, `json_id_to_train_idx`.
Checkpoint **bắt buộc** lưu mapping cùng `model_state_dict`, `num_classes`, `image_size`. **Không** được suy lại mapping theo thứ tự thư mục khi inference.

### Quy trình train tối thiểu
1. Lọc whitelist Kanji từ JSON.
2. Convert ETL → PNG, kiểm tra số ảnh mỗi class.
3. Chia train/validation theo từng class (không class nào thiếu validation).
4. EfficientNet-B3 pretrained ImageNet.
5. Freeze backbone giai đoạn đầu → fine-tune toàn bộ.
6. Lưu checkpoint tốt nhất theo validation accuracy.
7. Kiểm tra checkpoint có mapping và số class khớp dataset.
8. Test inference với ảnh đại diện mỗi nhóm class.

---

## 7. Câu hỏi Mở (Open Questions)

- Chốt phạm vi **N5** hay **N4+N5**? (`transN4N5.py` hiện chỉ lọc `N5` nhưng model đặt tên `N4_N5`.)
- Endpoint alias `POST /predict`: còn client nào dùng, hay đánh dấu deprecated?
- Có cần ngưỡng confidence tối thiểu để coi kết quả là đáng tin không?

## 8. Bảng Truy vết (Traceability)

| Yêu cầu | User Story | Feature |
|---------|-----------|---------|
| FR-01 | US-01 | F-01 |
| FR-02 | US-04 | F-02 |
| FR-03 | US-02 | F-03 |
| FR-04 | US-03 | F-04 |
| NFR-01..09 | US-05 | F-05, F-06 |

---
*Tài liệu tiếp theo: [User Stories](./user-stories.md).*
