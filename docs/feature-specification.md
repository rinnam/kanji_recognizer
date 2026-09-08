# Đặc tả Tính năng (Feature Specification)

> Đặc tả chi tiết **module nhận diện Kanji** trong `ai-service` — đủ để AI/dev implement và viết test.
> **Chỉ** nhận diện Kanji. Chatbot, RAG, embedding, các route khác — **ngoài phạm vi**.

| Quy ước | Ý nghĩa |
|---------|---------|
| `F-xx` | Feature |

---

## F-01 — Nhận ảnh đầu vào

**Liên kết:** US-01, FR-01

### Mô tả
Nhận ảnh Kanji từ client qua hai dạng request.

### Hợp đồng đầu vào
- **JSON:** `{ "image": "<base64 hoặc data URL>" }`.
- **Multipart:** field file tên `image`.

### Quy tắc
- Ảnh phải mở được bằng Pillow và convert sang RGB.
- Thiếu `image` / base64 lỗi / file không phải ảnh → **HTTP 400**, JSON lỗi, không dừng process.
- Ở môi trường public: giới hạn kích thước request và validate MIME/content **trước** khi decode.

---

## F-02 — Tiền xử lý ảnh

**Liên kết:** US-04, FR-02

### Pipeline (đúng thứ tự — hợp đồng dữ liệu train ↔ inference)
1. RGB → grayscale.
2. Threshold **Otsu**.
3. Đảo màu tự động khi nền trắng chiếm đa số.
4. Cắt bounding box + padding **25%** theo cạnh lớn nhất.
5. Căn giữa vào canvas vuông.
6. Resize **300 × 300**.
7. Grayscale → 3 kênh.
8. Normalize ImageNet: mean `[0.485, 0.456, 0.406]`, std `[0.229, 0.224, 0.225]`.

### Quy tắc
- Thay đổi bất kỳ bước nào ⇒ phải train lại hoặc đánh giá lại độ chính xác.
- Ảnh trung gian `debug/kanji_preprocessed.png` chỉ ghi ở môi trường debug.

---

## F-03 — Dự đoán bằng EfficientNet-B3

**Liên kết:** US-02, FR-03, NFR-01, NFR-02, NFR-05

### Đặc tả
- Kiến trúc: **EfficientNet-B3**, load `weights=None` khi inference.
- Thay classifier cuối bằng lớp có `num_classes` = giá trị trong checkpoint (**250**).
- `eval()` + `torch.no_grad()`; **softmax** trên output.
- Lấy **top-5** xác suất cao nhất.
- Thiết bị: CUDA nếu có, ngược lại CPU.
- Model **load một lần** khi khởi động process.

### Mỗi phần tử kết quả giữ tối thiểu
`train_index`, `json_id`, `kanji`, `confidence`.

### Quy tắc
- `predictions` sắp xếp **giảm dần** theo `confidence`.
- `confidence` ∈ `[0, 1]`; số phần tử ≤ số class.

---

## F-04 — Bổ sung Metadata Kanji

**Liên kết:** US-03, FR-04

### Nguồn
`ai-service/data/jlpt-kanji.json` — tra theo `json_id` (khớp với `train_idx_to_json_id`).

### Trường trả về (tối thiểu)
`id`, `kanji`, `hiragana`, `reading_on`, `reading_kun`, `meaning_vi`, `meaning_hv`, `meaning_en`, `example`, `description`, `tags`, `jlpt`, `strokes`, `radical_number`, `frequency`, `confidence`.

### Quy tắc
- Không tìm thấy Kanji trong JSON → trả kết quả với các trường rỗng, **không** crash.

---

## F-05 — API Contract & Vận hành

**Liên kết:** US-01, US-05, NFR-03, NFR-04, NFR-06, NFR-07, NFR-08

### Endpoint chính
```
POST /api/kanji/recognize
```
### Endpoint alias
```
POST /predict      # gọi lại cùng logic; nếu không client nào dùng → đánh dấu deprecated trước khi xóa
```

### Request
```json
{ "image": "data:image/png;base64,iVBORw0KGgo..." }
```
hoặc multipart với field file `image`.

### Response thành công
```json
{
  "success": true,
  "predictions": [
    {
      "kanji": "学",
      "hiragana": "ガク、まなぶ",
      "meaning_vi": "học",
      "confidence": 0.91,
      "train_index": 12,
      "json_id": 123
    }
  ],
  "message": "..."
}
```
> `predictions` là mảng giảm dần theo `confidence`; client dùng phần tử đầu tiên làm kết quả chính. (Mỗi phần tử còn kèm các trường metadata ở F-04.)

### Response lỗi
```json
{ "success": false, "error": "..." }
```

### Cấu hình & khởi động
- Route bật khi `ENABLE_KANJI_ROUTES` = `true` / `1` / `yes` (mặc định bật).
- Chạy từ thư mục repository để đường dẫn tương đối đúng; dependencies trong `ai-service/requirements.txt`.
- Kiểm tra tồn tại **trước khi start**: model checkpoint, `data/jlpt-kanji.json`, mapping trong checkpoint.
- Checkpoint thiếu mapping → **từ chối ngay khi startup**.

---

## F-06 — Kiểm thử & Metrics

**Liên kết:** NFR-09

### Test regression bắt buộc
- **Tiền xử lý:** Otsu, đảo màu, bounding box + padding 25%, canvas vuông, 300×300, normalize.
- **Mapping:** mỗi `train_index` map đúng sang `kanji` và `json_id`.
- **API contract:** dạng response, sắp xếp, khoảng `confidence`, xử lý lỗi 400.
- **Tương đương đầu vào:** base64 và multipart cho cùng kết quả (trong sai số).

### Metrics tối thiểu
- Top-1 accuracy, Top-5 accuracy.
- Confusion matrix.
- Latency p50 / p95.

### Kiểm tra nhanh sai lệch checkpoint
```powershell
Set-Location ai-service
python -c "import torch; c=torch.load('models/efficientnet_b3_kanji_n4_n5.pt', map_location='cpu'); print(c['num_classes'], c['image_size'], len(c['train_idx_to_kanji']))"
```
Kết quả: số class phải bằng số phần tử mapping. Đổi dataset/mapping/preprocessing ⇒ chạy lại kiểm tra này + test inference trước khi deploy.

---

## F-07 — Chốt phạm vi N5 vs N4+N5 (điều kiện tiên quyết)

**Liên kết:** Open Question

`transN4N5.py` hiện chỉ lọc `N5`:
```python
if jlpt_level not in ["N5"]:
    continue
```
Trong khi tên model/message ghi `N4_N5`. Phải chọn:
- **N5:** đổi tên model/message/tài liệu cho đúng.
- **N4+N5:** lọc cả `N4` và `N5`, tạo lại dataset + mapping, **train lại** checkpoint.

> ⚠️ Không được chỉ đổi tên file model để kết luận model đã hỗ trợ N4.

---

## Bảng Ánh xạ Feature ↔ Yêu cầu

| Feature | User Stories | FR | NFR |
|---------|-------------|-----|-----|
| F-01 Nhận ảnh | US-01 | FR-01 | NFR-07 |
| F-02 Tiền xử lý | US-04 | FR-02 | NFR-08 |
| F-03 Dự đoán | US-02 | FR-03 | NFR-01, NFR-02, NFR-05 |
| F-04 Metadata | US-03 | FR-04 | — |
| F-05 API & vận hành | US-01, US-05 | FR-01 | NFR-03, NFR-04, NFR-06, NFR-07, NFR-08 |
| F-06 Test & metrics | US-04 | — | NFR-09 |
| F-07 Chốt phạm vi | — | — | — |

---

## Ghi chú cho AI sinh code
- Tuân thủ **chính xác** hợp đồng tiền xử lý (F-02) và API contract (F-05) — đây là ràng buộc cứng.
- Không tạo/không đụng tới chatbot, RAG, embedding hay route khác.
- Giữ tên trường JSON bằng tiếng Anh như trên; thông báo cho người dùng có thể bằng tiếng Việt.
- Không suy lại mapping theo thứ tự thư mục — luôn đọc mapping từ checkpoint.
