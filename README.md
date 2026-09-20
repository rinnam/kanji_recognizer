<div align="center">

# 🖌️ Kanji Recognizer

### Nhận diện chữ Kanji viết tay bằng AI

*Viết một chữ Kanji — nhận ngay ký tự, cách đọc và ý nghĩa.*

<p>
  <img alt="Python" src="https://img.shields.io/badge/Python-3.x-3776AB?logo=python&logoColor=white">
  <img alt="PyTorch" src="https://img.shields.io/badge/PyTorch-EE4C2C?logo=pytorch&logoColor=white">
  <img alt="EfficientNet-B3" src="https://img.shields.io/badge/Model-EfficientNet--B3-6f42c1">
  <img alt="Classes" src="https://img.shields.io/badge/Classes-250%20Kanji-0aa">
  <img alt="JLPT" src="https://img.shields.io/badge/JLPT-N5%20%2F%20N4-2ea44f">
</p>

</div>

---

## 📖 Giới thiệu

**Kanji Recognizer** là module AI (trong `ai-service`) nhận diện **chữ Kanji viết tay**. Người dùng thường *nhìn thấy* một chữ Kanji nhưng không biết cách đọc để tra từ điển — dự án này giải quyết điều đó: chỉ cần đưa **ảnh** chữ Kanji vào, hệ thống dự đoán ký tự và trả về thông tin đầy đủ.

Module sử dụng mô hình **EfficientNet-B3** được huấn luyện trên dữ liệu **ETL9B/ETL10**, nhận diện **250 ký tự Kanji** (phạm vi JLPT N5/N4) và trả về **top-5** kết quả kèm metadata từ `jlpt-kanji.json`.

> 🎯 **Phạm vi:** repo này chỉ tập trung vào **nhận diện Kanji**. Các thành phần khác (chatbot, RAG, embedding...) không thuộc phạm vi tài liệu/module này.

---

## ✨ Tính năng chính

| | Tính năng | Mô tả |
|:--:|-----------|-------|
| 🖼️ | **Nhận ảnh linh hoạt** | Hỗ trợ cả `base64`/data URL (JSON) và `multipart` upload |
| 🧹 | **Tiền xử lý chuẩn** | Otsu → cắt bounding box + padding 25% → canvas vuông → 300×300 → normalize ImageNet |
| 🧠 | **Model EfficientNet-B3** | Suy luận nhanh (CUDA nếu có, ngược lại CPU), softmax → top-5 |
| 🔢 | **Top-5 kết quả** | Sắp xếp giảm dần theo độ tin cậy `confidence` |
| 📚 | **Metadata đầy đủ** | Âm On/Kun, nghĩa (Việt / Hán-Việt / Anh), số nét, cấp JLPT, ví dụ... |
| 🛡️ | **Khởi động an toàn** | Kiểm tra model, mapping, từ điển trước khi chạy |

---

## 🏗️ Kiến trúc

```
        ┌──────────────┐
        │    Client    │  ảnh Kanji (base64 / multipart)
        └──────┬───────┘
               │  POST /api/kanji/recognize
               ▼
     ┌───────────────────┐
     │  ai-service/app.py │  route bật khi ENABLE_KANJI_ROUTES = true
     └─────────┬─────────┘
               ▼
     ┌───────────────────┐
     │  kanji_routes.py  │
     │  1. Tiền xử lý ảnh │  Otsu → bbox → 300×300 → normalize
     │  2. EfficientNet-B3│  eval + no_grad + softmax → top-5
     │  3. Ghép metadata │  từ data/jlpt-kanji.json
     └─────────┬─────────┘
               ▼
        ┌──────────────┐
        │ JSON: top-5  │  predictions[] (giảm dần theo confidence)
        └──────────────┘
```

---

## 🚀 API

### Endpoint chính
```http
POST /api/kanji/recognize
```
> Alias `POST /predict` gọi lại cùng logic (có thể deprecated sau).

### Request

**Dạng JSON (base64):**
```json
{ "image": "data:image/png;base64,iVBORw0KGgo..." }
```

**Dạng Multipart:** field file tên `image`.

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

### Response lỗi
```json
{ "success": false, "error": "..." }
```
> Request thiếu `image`, base64 lỗi hoặc file không phải ảnh → **HTTP 400**.

---

## 📂 Cấu trúc dự án

```
kanji_recognizer/
├── ai-service/
│   ├── app.py                 # Entry point (bật route qua ENABLE_KANJI_ROUTES)
│   ├── kanji_routes.py        # Logic tiền xử lý + inference
│   ├── models/
│   │   └── efficientnet_b3_kanji_n4_n5.pt   # Checkpoint (250 class, 300px)
│   ├── data/
│   │   └── jlpt-kanji.json     # Whitelist + metadata Kanji
│   ├── transN4N5.py            # Script ETL (lọc JLPT)
│   └── requirements.txt
├── docs/                       # 📑 Tài liệu đặc tả (spec-driven)
│   ├── product-discovery.md
│   ├── prd.md
│   ├── requirements-analysis.md
│   ├── user-stories.md
│   └── feature-specification.md
└── README.md
```

---

## ⚙️ Cài đặt & Chạy

```bash
# 1. Cài dependencies (chạy từ thư mục repository)
cd ai-service
pip install -r requirements.txt

# 2. Bật route nhận diện Kanji
#    Windows PowerShell:
$env:ENABLE_KANJI_ROUTES = "true"
#    Linux/macOS:
export ENABLE_KANJI_ROUTES=true

# 3. Khởi động service
python app.py
```

> 💡 Model được load **một lần** khi khởi động. Service sẽ **từ chối start** nếu thiếu model, `jlpt-kanji.json` hoặc mapping trong checkpoint.

### Kiểm tra nhanh checkpoint
```powershell
cd ai-service
python -c "import torch; c=torch.load('models/efficientnet_b3_kanji_n4_n5.pt', map_location='cpu'); print(c['num_classes'], c['image_size'], len(c['train_idx_to_kanji']))"
```
> Số class phải bằng số phần tử mapping.

---

## 🧪 Kiểm thử & Metrics

- ✅ Test regression: tiền xử lý · mapping · API contract · tương đương base64/multipart
- 📊 Metrics: **Top-1 / Top-5 accuracy**, **confusion matrix**, **latency p50 / p95**

---

## 🧭 Model & Dữ liệu

| Thuộc tính | Giá trị |
|-----------|---------|
| Kiến trúc | EfficientNet-B3 (pretrained ImageNet → fine-tune) |
| Số class | 250 Kanji |
| Kích thước ảnh | 300 × 300 |
| Normalize | ImageNet mean/std |
| Nguồn dữ liệu | ETL9B / ETL10 |
| Từ điển | `jlpt-kanji.json` |

> ⚠️ **Cần chốt phạm vi:** `transN4N5.py` hiện chỉ lọc `N5` trong khi tên model ghi `N4_N5`. Nếu mục tiêu là N4+N5, cần lọc lại dữ liệu, tạo lại mapping và **train lại** checkpoint (không đổi tên file suông).

---

## 📚 Tài liệu

Bộ tài liệu đặc tả (spec-driven) nằm trong thư mục [`docs/`](./docs):

- 🔍 [Product Discovery](./docs/product-discovery.md)
- 📋 [PRD](./docs/prd.md)
- 🧩 [Requirements Analysis](./docs/requirements-analysis.md)
- 👤 [User Stories](./docs/user-stories.md)
- 🛠️ [Feature Specification](./docs/feature-specification.md)

---

<div align="center">

*Made with ❤️ for Japanese learners.*

</div>
