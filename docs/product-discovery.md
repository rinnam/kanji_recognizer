# Khám phá Sản phẩm (Product Discovery)

> **Phạm vi:** Tài liệu này **chỉ** mô tả module **nhận diện chữ Kanji viết tay** trong `ai-service`.
> Chatbot, RAG, embedding và các route khác của project **không thuộc phạm vi**.

---

## 1. Tuyên bố Vấn đề (Problem Statement)

Người học tiếng Nhật thường **nhìn thấy một chữ Kanji nhưng không biết cách đọc**, nên không tra được từ điển thông thường (vốn yêu cầu biết âm đọc hoặc bộ thủ/số nét). Cần một cách tra cứu trực quan: **đưa ảnh chữ Kanji vào → nhận lại ký tự và thông tin của nó**.

## 2. Đối tượng Người dùng

| Persona | Mô tả | Nhu cầu |
|---------|-------|---------|
| **Người học tiếng Nhật N5–N4** | Người tự học, học sinh, sinh viên | Tra nhanh một chữ Kanji gặp trong bài đọc |
| **Client ứng dụng** | Frontend/app gọi API nhận diện | Gửi ảnh, nhận top-5 kết quả kèm metadata |

**Persona chính:** người học tiếng Nhật trình độ N5–N4 (đúng với tập ký tự model đang hỗ trợ).

## 3. Nỗi đau & Nhu cầu

- 🔴 Không biết cách đọc → không tra được từ điển.
- 🔴 Tra theo bộ thủ / số nét chậm và khó với người mới.
- 🟢 Muốn có kết quả kèm thông tin: âm On/Kun, nghĩa (Việt/Hán-Việt/Anh), số nét, cấp JLPT, ví dụ.

## 4. Giải pháp

Một **API nhận diện Kanji** trong `ai-service`: nhận một ảnh chữ Kanji viết tay, chuẩn hóa ảnh, dùng model **EfficientNet-B3** để dự đoán, và trả **top-5** ký tự khả năng cao nhất kèm thông tin tra từ `jlpt-kanji.json`.

## 5. Hiện trạng đã xác nhận (Current State)

- Entry point: `ai-service/app.py`; route bật khi `ENABLE_KANJI_ROUTES` = `true/1/yes`.
- Logic inference: `ai-service/kanji_routes.py`.
- Model: `ai-service/models/efficientnet_b3_kanji_n4_n5.pt`
  (`num_classes = 250`, `image_size = 300`, có `train_idx_to_kanji` và `train_idx_to_json_id`, mỗi cái 250 mapping).
- Từ điển: `ai-service/data/jlpt-kanji.json`.
- Dữ liệu huấn luyện: ETL9B/ETL10; script ETL `transN4N5.py`; script train `source/ai-service/train.py`.
- Thiết bị: CUDA nếu có, ngược lại CPU.

## 6. Giả định & Rủi ro

| Loại | Nội dung | Mức độ |
|------|----------|--------|
| Giả định | Model + mapping + `jlpt-kanji.json` hợp lệ tồn tại khi khởi động | Cao |
| Rủi ro | Tiền xử lý inference lệch với lúc train → giảm độ chính xác | Cao |
| Rủi ro | Nhầm lẫn giữa các Kanji gần giống nhau | Trung bình |
| Rủi ro | Phạm vi N4/N5 chưa nhất quán (xem mục "Vấn đề cần chốt") | Cao |

## 7. Vấn đề cần chốt về phạm vi ký tự

`transN4N5.py` hiện chỉ lọc `N5` (`if jlpt_level not in ["N5"]: continue`), trong khi tên model/message ghi `N4_N5`. **Cần chốt** một trong hai:
- **Mục tiêu N5:** đổi tên model/message/tài liệu cho đúng.
- **Mục tiêu N4 + N5:** lọc cả `N4` và `N5`, tạo lại dataset + mapping và **train lại** checkpoint.

> ⚠️ Không được chỉ đổi tên file model để kết luận model đã hỗ trợ N4.

## 8. Ngoài Phạm vi (Out of Scope)

- Chatbot, RAG, embedding, và mọi route khác của project.
- Nhận diện nhiều ký tự / cả câu, dịch đoạn văn.
- Nhận diện Hiragana/Katakana.
- Tài khoản người dùng, lịch sử tra cứu.
