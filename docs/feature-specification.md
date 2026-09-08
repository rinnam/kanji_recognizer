# Đặc tả Tính năng (Feature Specification)

| Thuộc tính | Giá trị |
|-----------|---------|
| Tài liệu | Feature Specification — Kanji Recognizer |
| Phiên bản | 1.0 |
| Phạm vi | Module nhận diện chữ Kanji viết tay trong `ai-service` |
| Tài liệu liên quan | [PRD](./prd.md) · [Requirements](./requirements-analysis.md) · [User Stories](./user-stories.md) |

> Đặc tả đủ chi tiết để AI/dev implement và viết test. Quy ước: `F-xx` = Feature.

---

## Luồng nhận diện tổng quát (Sequence)

```
Client
  │  POST /api/kanji/recognize  (image: base64 | multipart)
  ▼
F-01 Nhận ảnh ─────────► validate + Pillow → RGB   ─(lỗi)─► HTTP 400 { success:false, error }
  ▼
F-02 Tiền xử lý ───────► Otsu → bbox+padding25% → canvas vuông → 300×300 → normalize
  ▼
F-03 Dự đoán ─────────► EfficientNet-B3 → softmax → top-5 (train_index, json_id, kanji, confidence)
  ▼
F-04 Metadata ────────► tra jlpt-kanji.json theo json_id → ghép trường
  ▼
Response 200 { success:true, predictions:[...], message }
```

---

## F-01 — Nhận ảnh đầu vào

**Liên kết:** US-01, FR-01

### Hợp đồng đầu vào
- **JSON:** `{ "image": "<base64 hoặc data URL>" }`.
- **Multipart:** field file tên `image`.

### Quy tắc
- Ảnh phải mở được bằng Pillow và convert sang RGB.
- Thiếu `image` / base64 lỗi / file không phải ảnh → **HTTP 400**, JSON lỗi, không dừng process.
- Môi trường public: giới hạn kích thước request và validate MIME/content **trước** khi decode.

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
- Thiết bị: CUDA nếu có, ngược lại CPU. Model **load một lần** khi khởi động process.

### Mỗi phần tử kết quả giữ tối thiểu
`train_index`, `json_id`, `kanji`, `confidence`.

### Quy tắc
- `predictions` sắp xếp **giảm dần** theo `confidence`.
- `confidence ∈ [0, 1]`; số phần tử ≤ số class.

---

## F-04 — Bổ sung Metadata Kanji

**Liên kết:** US-03, FR-04

### Nguồn
`ai-service/data/jlpt-kanji.json` — tra theo `json_id` (khớp với `train_idx_to_json_id`).

### Field reference (đối tượng prediction)
| Trường | Kiểu | Nguồn | Mô tả |
|--------|------|-------|-------|
| `kanji` | string | model + JSON | Ký tự dự đoán |
| `confidence` | number | model | Độ tin cậy, `[0, 1]` |
| `train_index` | number | model | Chỉ số class trong model |
| `json_id` | number | mapping | Khóa tra `jlpt-kanji.json` |
| `id` | number | JSON | ID ký tự trong từ điển |
| `hiragana` | string | JSON | Cách đọc kana |
| `reading_on` | string/array | JSON | Âm On |
| `reading_kun` | string/array | JSON | Âm Kun |
| `meaning_vi` | string | JSON | Nghĩa tiếng Việt |
| `meaning_hv` | string | JSON | Nghĩa Hán-Việt |
| `meaning_en` | string | JSON | Nghĩa tiếng Anh |
| `example` | string/array | JSON | Ví dụ |
| `description` | string | JSON | Mô tả |
| `tags` | array | JSON | Nhãn phân loại |
| `jlpt` | string | JSON | Cấp JLPT |
| `strokes` | number | JSON | Số nét |
| `radical_number` | number | JSON | Số bộ thủ |
| `frequency` | number | JSON | Tần suất sử dụng |

### Quy tắc
- Không tìm thấy Kanji trong JSON → trả kết quả với các trường rỗng, **không** crash.

---

## F-05 — API Contract & Vận hành

**Liên kết:** US-01, US-05, US-06, NFR-03, NFR-04, NFR-06, NFR-07, NFR-08

### Endpoints
```
POST /api/kanji/recognize      # endpoint chính
POST /predict                  # alias — cùng logic; deprecated trước khi xóa nếu không còn dùng
```

### Request
```json
{ "image": "data:image/png;base64,iVBORw0KGgo..." }
```
hoặc multipart với field file `image`.

### Response thành công (đầy đủ trường)
```json
{
  "success": true,
  "predictions": [
    {
      "kanji": "学",
      "id": 123,
      "json_id": 123,
      "train_index": 12,
      "confidence": 0.91,
      "hiragana": "ガク、まなぶ",
      "reading_on": ["ガク"],
      "reading_kun": ["まな.ぶ"],
      "meaning_vi": "học",
      "meaning_hv": "HỌC",
      "meaning_en": "study, learning",
      "example": "学生 (がくせい) — học sinh",
      "description": "...",
      "tags": ["giáo dục"],
      "jlpt": "N5",
      "strokes": 8,
      "radical_number": 39,
      "frequency": 63
    }
  ],
  "message": "..."
}
```
> `predictions` là mảng giảm dần theo `confidence`; client dùng phần tử đầu tiên làm kết quả chính.

### Response lỗi
```json
{ "success": false, "error": "..." }
```

### Bảng lỗi
| Tình huống | HTTP | Body |
|-----------|------|------|
| Thiếu `image` | 400 | `{ "success": false, "error": "..." }` |
| Base64/data URL lỗi | 400 | `{ "success": false, "error": "..." }` |
| File không phải ảnh | 400 | `{ "success": false, "error": "..." }` |
| Kanji không có trong JSON | 200 | Kết quả với metadata rỗng |

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
| F-05 API & vận hành | US-01, US-05, US-06 | FR-01 | NFR-03, NFR-04, NFR-06, NFR-07, NFR-08 |
| F-06 Test & metrics | US-04 | — | NFR-09 |
| F-07 Chốt phạm vi | — | — | — |

---

## Ghi chú cho AI sinh code
- Tuân thủ **chính xác** hợp đồng tiền xử lý (F-02) và API contract (F-05) — đây là ràng buộc cứng.
- Không tạo/không đụng tới chatbot, RAG, embedding hay route khác.
- Giữ tên trường JSON bằng tiếng Anh như trên; thông báo cho người dùng có thể bằng tiếng Việt.
- Không suy lại mapping theo thứ tự thư mục — luôn đọc mapping từ checkpoint.
