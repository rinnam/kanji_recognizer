# Phân tích Yêu cầu (Requirements Analysis)

> Yêu cầu chức năng (FR) và phi chức năng (NFR) cho **module nhận diện Kanji** trong `ai-service`.
> Bám sát hiện trạng đã xác nhận. Mọi thứ ngoài nhận diện Kanji — **ngoài phạm vi**.

| Quy ước | Ý nghĩa |
|---------|---------|
| `FR-xx` | Functional Requirement |
| `NFR-xx` | Non-Functional Requirement |

---

## 1. Yêu cầu Chức năng (Functional Requirements)

### FR-01 — Nhận ảnh
API chấp nhận **một trong hai** dạng request:
- JSON: `{ "image": "<base64 hoặc data URL>" }`.
- Multipart: field file tên `image`.

Ảnh phải đọc được bởi Pillow và chuyển được sang RGB. Nếu thiếu `image`, base64 lỗi, hoặc file không phải ảnh → trả **HTTP 400** với JSON lỗi, **không** làm dừng process.

### FR-02 — Tiền xử lý ảnh (đồng bộ với validation transform lúc train)
1. RGB → grayscale.
2. Threshold **Otsu** để tách nét chữ.
3. Tự động đảo màu khi nền trắng chiếm đa số.
4. Cắt bounding box của chữ + padding **25%** theo cạnh lớn nhất.
5. Căn giữa vào canvas vuông.
6. Resize về **300 × 300**.
7. Grayscale → 3 kênh.
8. Normalize theo ImageNet: mean `[0.485, 0.456, 0.406]`, std `[0.229, 0.224, 0.225]`.

> Đây là **hợp đồng dữ liệu** giữa train và inference. Đổi bất kỳ bước nào → phải train lại hoặc đánh giá lại ảnh hưởng độ chính xác.

### FR-03 — Dự đoán
- Load EfficientNet-B3 với `weights=None` khi inference.
- Thay lớp classifier cuối bằng lớp có số class = `num_classes` trong checkpoint.
- Chạy `eval()` + `torch.no_grad()`, áp dụng **softmax** trên output.
- Trả tối đa **5** class xác suất cao nhất.
- Mỗi kết quả giữ: `train_index`, `json_id`, `kanji`, `confidence`.

### FR-04 — Bổ sung thông tin Kanji
Với mỗi class dự đoán, tra từ `jlpt-kanji.json`, tối thiểu các trường:
`id`, `kanji`, `hiragana`, `reading_on`, `reading_kun`, `meaning_vi`, `meaning_hv`, `meaning_en`, `example`, `description`, `tags`, `jlpt`, `strokes`, `radical_number`, `frequency`, `confidence`.

Nếu không tìm thấy trong JSON → vẫn trả kết quả với thông tin rỗng, **không** crash request.

---

## 2. Yêu cầu Phi chức năng (Non-Functional Requirements)

| Mã | Loại | Yêu cầu |
|----|------|---------|
| **NFR-01** | Hiệu năng | Model load **một lần** khi khởi động, không load lại mỗi request. Đo latency p50/p95. |
| **NFR-02** | Đúng đắn | Confidence trong `[0,1]`, giảm dần, số kết quả ≤ số class. |
| **NFR-03** | Tính toàn vẹn mapping | `train_index` phải map đúng sang Kanji và json_id; mapping bất biến suốt vòng đời model. |
| **NFR-04** | Khởi động an toàn | Kiểm tra tồn tại model checkpoint, `data/jlpt-kanji.json`, và mapping trong checkpoint. Checkpoint thiếu mapping → **từ chối ngay khi startup**. |
| **NFR-05** | Thiết bị | Dùng CUDA nếu có, ngược lại CPU. |
| **NFR-06** | Cấu hình | Bật/tắt route bằng `ENABLE_KANJI_ROUTES` (mặc định bật). Chạy từ thư mục repository. |
| **NFR-07** | Bảo mật (public) | Giới hạn kích thước request; validate MIME/content trước khi decode ảnh. |
| **NFR-08** | Debug/Production | `debug/kanji_preprocessed.png` chỉ bật ở môi trường debug; production không ghi để tránh tốn đĩa và rò rỉ ảnh người dùng. |
| **NFR-09** | Kiểm thử | Có test regression cho tiền xử lý, mapping và API contract. |

---

## 3. Ràng buộc Dữ liệu & Huấn luyện

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

## 4. Câu hỏi Mở (Open Questions)

- Chốt phạm vi **N5** hay **N4+N5**? (`transN4N5.py` hiện chỉ lọc `N5` nhưng model đặt tên `N4_N5`.)
- Endpoint alias `POST /predict`: có client nào còn dùng không, hay đánh dấu deprecated?
- Ngưỡng confidence tối thiểu để coi là kết quả đáng tin (nếu cần)?

## 5. Bảng Truy vết (Traceability)

| Yêu cầu | Hiện thực ở (Feature) |
|---------|------------------------|
| FR-01 | F-01 (Nhận ảnh) |
| FR-02 | F-02 (Tiền xử lý) |
| FR-03 | F-03 (Dự đoán) |
| FR-04 | F-04 (Metadata) |
| NFR-01..09 | F-05 (Vận hành & khởi động) |
