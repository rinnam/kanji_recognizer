# Tài liệu Yêu cầu Sản phẩm (PRD)

> Module **nhận diện chữ Kanji viết tay** trong `ai-service`.

| Thuộc tính | Giá trị |
|-----------|---------|
| Tên module | Kanji Recognizer |
| Phiên bản tài liệu | 1.0 |
| Model | EfficientNet-B3 (`efficientnet_b3_kanji_n4_n5.pt`) |
| Số class | 250 ký tự Kanji |
| Kích thước ảnh | 300 × 300 |
| Endpoint chính | `POST /api/kanji/recognize` |

---

## 1. Tổng quan

Kanji Recognizer là một module AI nhận vào **một ảnh chữ Kanji viết tay** và trả về **ký tự được nhận diện** cùng thông tin chi tiết của nó. Người học tiếng Nhật thường nhìn thấy một chữ Kanji nhưng không biết cách đọc, nên khó tra cứu bằng từ điển truyền thống. Module này biến thao tác tra cứu thành: *đưa ảnh vào — nhận kết quả ngay*.

Module chạy trong service Python `ai-service`, dùng mô hình học sâu **EfficientNet-B3** đã được huấn luyện trên dữ liệu chữ viết tay ETL9B/ETL10, nhận diện **250 ký tự Kanji** và trả về **top-5** phương án khả năng cao nhất kèm metadata tra từ từ điển `jlpt-kanji.json`.

## 2. Tầm nhìn

> "Cho phép một client gửi một ảnh chữ Kanji viết tay và nhận lại đúng ký tự cùng thông tin của nó, thông qua một API ổn định, chính xác và dễ tích hợp."

## 3. Mục tiêu (Goals)

1. **Nhận diện chính xác:** dự đoán đúng ký tự Kanji từ ảnh viết tay bằng EfficientNet-B3.
2. **Đầu vào linh hoạt:** chấp nhận ảnh ở dạng base64/data URL (JSON) và dạng multipart upload.
3. **Kết quả có thứ hạng:** trả về top-5 ký tự, sắp xếp giảm dần theo độ tin cậy để client hiển thị kết quả tốt nhất và các phương án thay thế.
4. **Thông tin phong phú:** mỗi kết quả kèm metadata đầy đủ (âm đọc, nghĩa, số nét, cấp JLPT, ví dụ...).
5. **Nhất quán train ↔ inference:** tiền xử lý ảnh khi suy luận khớp tuyệt đối với transform lúc huấn luyện.
6. **Vận hành ổn định:** load model một lần khi khởi động, kiểm tra cấu hình trước khi chạy, xử lý lỗi đầu vào rõ ràng.

## 4. Người dùng & Vai trò

| Vai trò | Mô tả | Cách tương tác |
|---------|-------|----------------|
| **Người học tiếng Nhật** | Người dùng cuối, trình độ N5–N4 | Viết/chụp một chữ Kanji và xem kết quả qua ứng dụng client |
| **Client ứng dụng** | Frontend web/app tích hợp module | Gọi API, gửi ảnh, hiển thị `predictions` |
| **Người vận hành** | Kỹ sư triển khai & giám sát service | Cấu hình biến môi trường, theo dõi metrics, khởi động service |

## 5. Phạm vi (Scope)

Module cung cấp các năng lực sau:

- **API nhận diện:** endpoint chính `POST /api/kanji/recognize` và alias `POST /predict` (cùng logic).
- **Tiếp nhận ảnh:** đọc ảnh từ JSON (base64/data URL) hoặc multipart field `image`, chuyển sang RGB bằng Pillow.
- **Tiền xử lý ảnh:** chuẩn hóa ảnh về đúng định dạng dữ liệu huấn luyện.
- **Suy luận:** chạy EfficientNet-B3 và lấy top-5 kết quả kèm độ tin cậy.
- **Bổ sung metadata:** tra thông tin từng ký tự từ `jlpt-kanji.json`.
- **Khởi động an toàn:** kiểm tra sự tồn tại của model checkpoint, từ điển và mapping trước khi phục vụ.

## 6. Yêu cầu Chức năng (tóm tắt)

| Mã | Chức năng |
|----|-----------|
| FR-01 | Nhận ảnh Kanji qua JSON (base64) hoặc multipart |
| FR-02 | Tiền xử lý ảnh đồng bộ với transform lúc train |
| FR-03 | Dự đoán bằng EfficientNet-B3, trả top-5 kèm confidence |
| FR-04 | Bổ sung metadata Kanji từ `jlpt-kanji.json` |

> Chi tiết đầy đủ xem [requirements-analysis.md](./requirements-analysis.md) và [feature-specification.md](./feature-specification.md).

## 7. Metrics Thành công

| Metric | Mục tiêu | Ghi chú |
|--------|----------|---------|
| Top-1 accuracy | Theo dõi & báo cáo | Tỷ lệ ký tự đầu tiên đúng, trên tập validation |
| Top-5 accuracy | Theo dõi & báo cáo | Client dùng phần tử đầu làm kết quả chính |
| Latency p50 / p95 | Đo & báo cáo | Thời gian xử lý một request |
| Confusion matrix | Có | Phát hiện các cặp Kanji hay bị nhầm |
| Confidence hợp lệ | 100% | Nằm trong `[0, 1]`, sắp xếp giảm dần |

## 8. Kiến trúc

```
[ Client ]
   |  image (base64 / data URL)  hoặc  multipart field "image"
   v
[ ai-service/app.py ]  -- route bật khi ENABLE_KANJI_ROUTES = true/1/yes
   v
[ kanji_routes.py ]
   |-- Tiền xử lý ảnh (Otsu → bounding box → padding 25% → canvas vuông → 300x300 → normalize ImageNet)
   |-- EfficientNet-B3 (eval, no_grad, softmax) → top-5
   |-- Ghép metadata từ data/jlpt-kanji.json (theo json_id)
   v
[ JSON response: predictions[] ]  (sắp xếp giảm dần theo confidence)
```

### Luồng xử lý chi tiết
1. Client gửi ảnh tới endpoint.
2. Service đọc ảnh, kiểm tra hợp lệ, chuyển sang RGB.
3. Tiền xử lý: Otsu → cắt bounding box + padding 25% → căn giữa canvas vuông → resize 300×300 → grayscale 3 kênh → normalize ImageNet.
4. Model EfficientNet-B3 suy luận, áp dụng softmax, lấy top-5 chỉ số xác suất cao nhất.
5. Ánh xạ mỗi chỉ số sang `kanji` và `json_id` qua mapping trong checkpoint.
6. Tra metadata từ `jlpt-kanji.json` và ghép vào từng kết quả.
7. Trả JSON `predictions[]` sắp xếp giảm dần theo `confidence`.

## 9. Thành phần Hệ thống

| Thành phần | Vị trí | Vai trò |
|-----------|--------|--------|
| Entry point | `ai-service/app.py` | Khởi tạo service, đăng ký route khi `ENABLE_KANJI_ROUTES` bật |
| Logic nhận diện | `ai-service/kanji_routes.py` | Tiền xử lý, inference, ghép metadata |
| Model checkpoint | `ai-service/models/efficientnet_b3_kanji_n4_n5.pt` | EfficientNet-B3 (`num_classes=250`, `image_size=300`) |
| Mapping | Lưu trong checkpoint | `train_idx_to_kanji`, `train_idx_to_json_id` (và chiều ngược lại), bất biến |
| Từ điển | `ai-service/data/jlpt-kanji.json` | Whitelist ký tự + nguồn metadata |
| Script ETL | `ai-service/transN4N5.py` | Chuyển dữ liệu ETL sang ảnh huấn luyện |
| Script train | `source/ai-service/train.py` | Huấn luyện & lưu checkpoint |

## 10. Model & Dữ liệu

| Thuộc tính | Giá trị |
|-----------|---------|
| Kiến trúc | EfficientNet-B3 (pretrained ImageNet → fine-tune) |
| Số class | 250 Kanji |
| Kích thước ảnh đầu vào | 300 × 300 |
| Chuẩn hóa | ImageNet — mean `[0.485, 0.456, 0.406]`, std `[0.229, 0.224, 0.225]` |
| Nguồn dữ liệu | ETL9B / ETL10 (ảnh chữ viết tay) |
| Thiết bị suy luận | CUDA nếu có, ngược lại CPU |

Checkpoint lưu kèm `model_state_dict`, `num_classes`, `image_size` và toàn bộ mapping — mapping được đọc trực tiếp từ checkpoint để đảm bảo `train_index` luôn ánh xạ đúng ký tự và `json_id`.

## 11. Cấu hình & Vận hành

- **Bật/tắt module:** biến môi trường `ENABLE_KANJI_ROUTES` nhận `true` / `1` / `yes` (mặc định bật).
- **Thư mục chạy:** chạy từ thư mục repository để các script dùng đường dẫn tương đối chính xác.
- **Dependencies:** cài từ `ai-service/requirements.txt`.
- **Load model:** thực hiện **một lần** khi khởi động process, không load lại theo từng request để đảm bảo hiệu năng.
- **Kiểm tra khởi động:** xác nhận sự tồn tại của model checkpoint, `data/jlpt-kanji.json` và mapping trong checkpoint trước khi phục vụ; nếu checkpoint thiếu mapping, service từ chối khởi động.
- **Bảo mật (môi trường public):** giới hạn kích thước request và validate MIME/content trước khi decode ảnh.
- **Ảnh debug:** ảnh trung gian `debug/kanji_preprocessed.png` chỉ ghi ở môi trường debug.

## 12. Giả định & Phụ thuộc

- Có sẵn model checkpoint hợp lệ với mapping đầy đủ.
- `jlpt-kanji.json` cung cấp whitelist ký tự và metadata.
- Client gửi ảnh chứa **một** ký tự Kanji viết tay, đọc được bởi Pillow.
- Môi trường chạy đã cài đúng các dependencies (PyTorch, Pillow...).

## 13. Lộ trình (Roadmap)

| Giai đoạn | Nội dung |
|-----------|----------|
| **Ổn định** | Củng cố API nhận diện, đồng bộ tiền xử lý train ↔ inference, bổ sung test regression và metrics |
| **Tăng cường** | Mở rộng bộ ký tự, cải thiện độ chính xác với các cặp Kanji dễ nhầm |
| **Cứng hóa cho public** | Giới hạn kích thước request, validate MIME/content, tắt ghi ảnh debug ở production |

---

*Tài liệu này mô tả module nhận diện Kanji. Chi tiết kỹ thuật xem thêm trong [feature-specification.md](./feature-specification.md).*
