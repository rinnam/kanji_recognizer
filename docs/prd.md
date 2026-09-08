# Tài liệu Yêu cầu Sản phẩm (PRD)

> Module **nhận diện chữ Kanji viết tay** trong `ai-service`.
> **Chỉ** mô tả chức năng nhận diện Kanji. Chatbot, RAG, embedding, các route khác — **ngoài phạm vi**.

| Thuộc tính | Giá trị |
|-----------|---------|
| Tên module | Kanji Recognizer (trong `ai-service`) |
| Phiên bản tài liệu | 0.1 (Draft) |
| Model | EfficientNet-B3 (`efficientnet_b3_kanji_n4_n5.pt`) |
| Tập ký tự | 250 class Kanji (JLPT — xem mục phạm vi cần chốt) |

---

## 1. Tầm nhìn

> "Cho phép client gửi một ảnh chữ Kanji viết tay và nhận lại đúng ký tự cùng thông tin của nó, thông qua một API ổn định trong `ai-service`."

## 2. Mục tiêu (Goals)

1. Nhận ảnh Kanji (base64 **hoặc** multipart) và nhận diện bằng EfficientNet-B3.
2. Trả **top-5** kết quả, sắp xếp giảm dần theo độ tin cậy.
3. Bổ sung thông tin mỗi ký tự từ `jlpt-kanji.json`.
4. Tiền xử lý inference **đồng bộ tuyệt đối** với transform lúc train.
5. Ổn định vận hành: load model một lần khi khởi động, validate đầu vào, xử lý lỗi rõ ràng.

### Non-Goals
- Không làm chatbot/RAG/embedding hay bất kỳ route nào khác.
- Không nhận diện nhiều ký tự / cả câu.
- Không có tài khoản / lịch sử tra cứu.

## 3. Phạm vi (Scope)

### In-Scope
- Endpoint chính `POST /api/kanji/recognize` (+ alias `POST /predict`).
- Nhận ảnh base64/data URL hoặc multipart field `image`.
- Pipeline tiền xử lý → inference → ghép metadata → trả JSON.
- Kiểm tra tồn tại model/JSON/mapping khi khởi động.

### Out-of-Scope
- Mọi chức năng ngoài nhận diện Kanji của project lớn.

## 4. Metrics Thành công

| Metric | Mục tiêu | Ghi chú |
|--------|----------|---------|
| Top-1 accuracy | Theo dõi & báo cáo | Trên tập validation |
| Top-5 accuracy | Theo dõi & báo cáo | Client dùng phần tử đầu làm kết quả chính |
| Latency p50 / p95 | Đo & báo cáo | Đo thời gian inference một request |
| Confusion matrix | Có | Phát hiện cặp Kanji hay nhầm |
| Confidence hợp lệ | 100% | Nằm trong `[0, 1]`, giảm dần |

## 5. Kiến trúc & Hiện trạng

```
[ Client ]
   |  image (base64 / data URL)  hoặc  multipart field "image"
   v
[ ai-service/app.py ]  -- route bật khi ENABLE_KANJI_ROUTES = true/1/yes
   v
[ kanji_routes.py ]
   |-- Tiền xử lý ảnh (Otsu → bounding box → padding → canvas vuông → 300x300 → normalize ImageNet)
   |-- EfficientNet-B3 (weights=None, eval, no_grad, softmax) → top-5
   |-- Ghép metadata từ data/jlpt-kanji.json (theo json_id)
   v
[ JSON response: predictions[] ]
```

### Thành phần đã xác nhận
- Model: `ai-service/models/efficientnet_b3_kanji_n4_n5.pt` (`num_classes=250`, `image_size=300`).
- Mapping (lưu trong checkpoint, bất biến): `train_idx_to_kanji`, `train_idx_to_json_id` (và chiều ngược lại).
- Từ điển: `ai-service/data/jlpt-kanji.json`.
- Thiết bị: CUDA nếu có, ngược lại CPU. Model load **một lần** khi khởi động.

## 6. Giả định & Phụ thuộc

- Checkpoint chứa `model_state_dict`, `num_classes`, `image_size` và đầy đủ mapping.
- `jlpt-kanji.json` là whitelist + nguồn metadata.
- Dependencies trong `ai-service/requirements.txt`; chạy từ thư mục repository để đường dẫn tương đối đúng.

## 7. Vấn đề phạm vi cần chốt (N5 hay N4+N5)

`transN4N5.py` hiện chỉ lọc `N5` nhưng tên model ghi `N4_N5`. Cần quyết định chính thức và (nếu chọn N4+N5) phải tạo lại dataset/mapping và **train lại** — không đổi tên file suông.

## 8. Lộ trình (bám phạm vi hiện tại)

| Giai đoạn | Nội dung |
|-----------|----------|
| **Hiện tại** | Ổn định API nhận diện, đồng bộ tiền xử lý train↔inference, thêm test regression & metrics |
| **Tiếp theo** | Chốt phạm vi N5 / N4+N5; nếu N4+N5 → train lại checkpoint |
| **Cứng hóa (public)** | Giới hạn kích thước request, validate MIME/content, tắt ghi ảnh debug ở production |
