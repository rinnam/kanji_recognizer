# Khám phá Sản phẩm (Product Discovery)

| Thuộc tính | Giá trị |
|-----------|---------|
| Tài liệu | Product Discovery — Kanji Recognizer |
| Phiên bản | 1.0 |
| Phạm vi | Module nhận diện chữ Kanji viết tay trong `ai-service` |
| Tài liệu liên quan | [PRD](./prd.md) · [Requirements](./requirements-analysis.md) · [User Stories](./user-stories.md) · [Feature Spec](./feature-specification.md) |

---

## 1. Bối cảnh & Tuyên bố Vấn đề

Người học tiếng Nhật liên tục gặp chữ Kanji trong sách, manga, biển hiệu, tài liệu... nhưng **nhìn thấy mà không biết cách đọc**. Từ điển truyền thống lại yêu cầu người dùng **đã biết** một trong các thông tin sau để tra:

- Âm đọc (On/Kun) — thứ mà người học thường chưa biết.
- Bộ thủ (radical) + số nét — đòi hỏi kỹ năng phân tích chữ, chậm và dễ sai với người mới.

→ Hình thành một **rào cản tra cứu**: càng là chữ lạ (thứ cần tra nhất) thì càng khó tra. Vấn đề cốt lõi cần giải quyết:

> **"Làm sao để tra một chữ Kanji chỉ từ hình dạng của nó, mà không cần biết trước cách đọc?"**

## 2. Đối tượng Người dùng (Personas)

| Persona | Mô tả | Mục tiêu chính | Tần suất |
|---------|-------|----------------|----------|
| **Người học N5–N4** *(chính)* | Người tự học / học sinh / sinh viên mới học | Tra nhanh một chữ Kanji gặp khi đọc | Cao |
| **Client ứng dụng** | Frontend web/app tích hợp API | Gửi ảnh, nhận top-5 kết quả + metadata để hiển thị | Liên tục |
| **Kỹ sư/Người vận hành** | Người triển khai & bảo trì service | Chạy ổn định, dễ giám sát, dễ kiểm thử | Theo phiên |

**Persona chính:** người học tiếng Nhật trình độ **N5–N4**, đúng với tập ký tự mà model đang phục vụ.

## 3. Hành trình Người dùng (User Journey)

**Hiện tại (không có công cụ):**
> Gặp chữ lạ → không biết đọc → thử đoán bộ thủ → đếm nét → dò trong từ điển bộ thủ → mất nhiều phút, thường bỏ cuộc.

**Với Kanji Recognizer:**
> Gặp chữ lạ → viết/chụp lại chữ đó → gửi vào ứng dụng → nhận ngay top-5 ứng viên kèm nghĩa & cách đọc → chọn đúng chữ trong vài giây.

## 4. Nỗi đau & Nhu cầu

| | Nỗi đau / Nhu cầu |
|---|-------------------|
| 🔴 | Không biết cách đọc → không tra được từ điển thông thường |
| 🔴 | Tra theo bộ thủ / số nét quá chậm và khó với người mới |
| 🟡 | Chữ viết tay của mỗi người rất khác nhau → cần dung sai cao |
| 🟢 | Muốn kết quả kèm thông tin đầy đủ: âm On/Kun, nghĩa (Việt/Hán-Việt/Anh), số nét, cấp JLPT, ví dụ |

## 5. Giá trị Đề xuất (Value Proposition)

> Biến việc tra Kanji từ *"phải biết mới tra được"* thành *"chỉ cần thấy là tra được"*.

- **Trực quan:** đầu vào là hình ảnh chữ — thứ tự nhiên nhất khi ta chỉ "nhìn thấy" chữ.
- **Nhanh:** trả kết quả gần như tức thời, model load sẵn.
- **Đầy đủ:** không chỉ nhận diện, mà cung cấp trọn bộ thông tin học tập cho mỗi ký tự.
- **Dễ tích hợp:** một API JSON gọn, hỗ trợ cả base64 lẫn upload file.

## 6. Giải pháp

Một **API nhận diện Kanji** trong `ai-service`: nhận một ảnh chữ Kanji viết tay → chuẩn hóa ảnh theo đúng pipeline huấn luyện → dùng model **EfficientNet-B3** dự đoán → trả **top-5** ký tự khả năng cao nhất, mỗi kết quả kèm thông tin tra từ `jlpt-kanji.json`.

## 7. Giả thuyết & Cách Kiểm chứng (Hypotheses & Validation)

| Giả thuyết | Cách kiểm chứng |
|-----------|-----------------|
| Người dùng chấp nhận viết/chụp chữ để tra | Đo tỷ lệ hoàn thành thao tác "gửi ảnh → xem kết quả" |
| Top-5 đủ để người dùng tìm thấy chữ cần | Đo tỷ lệ chữ đúng nằm trong top-5 (top-5 accuracy) |
| Model tổng quát tốt với nhiều nét chữ khác nhau | Đánh giá trên ảnh viết tay đa dạng, dựng confusion matrix |
| Pipeline tiền xử lý là yếu tố quyết định độ chính xác | So sánh accuracy khi tiền xử lý khớp/lệch với lúc train |

## 8. Tiêu chí Thành công (cấp Discovery)

- Model nhận diện được trên tập ký tự mục tiêu với **top-5 accuracy** ở mức chấp nhận được.
- Thao tác "gửi ảnh → nhận kết quả" hoạt động ổn định qua cả base64 và multipart.
- Kết quả trả về đầy đủ metadata giúp người học hiểu ngay chữ vừa tra.

## 9. Hiện trạng đã Xác nhận (Current State)

- **Entry point:** `ai-service/app.py`; route bật khi `ENABLE_KANJI_ROUTES` = `true` / `1` / `yes`.
- **Logic inference:** `ai-service/kanji_routes.py`.
- **Model:** `ai-service/models/efficientnet_b3_kanji_n4_n5.pt`
  - `num_classes = 250`, `image_size = 300`.
  - Có `train_idx_to_kanji` và `train_idx_to_json_id`, mỗi mapping 250 phần tử.
- **Từ điển:** `ai-service/data/jlpt-kanji.json`.
- **Dữ liệu huấn luyện:** ETL9B/ETL10; script ETL `transN4N5.py`; script train `source/ai-service/train.py`.
- **Thiết bị:** CUDA nếu có, ngược lại CPU.

## 10. Giả định & Rủi ro

| Loại | Nội dung | Mức độ | Giảm thiểu |
|------|----------|--------|------------|
| Giả định | Model + mapping + `jlpt-kanji.json` hợp lệ tồn tại khi khởi động | Cao | Kiểm tra tồn tại lúc startup |
| Rủi ro | Tiền xử lý inference lệch với lúc train → giảm chính xác | Cao | Coi pipeline là "hợp đồng dữ liệu", có test regression |
| Rủi ro | Nhầm lẫn giữa các Kanji gần giống nhau | Trung bình | Trả top-5 + theo dõi confusion matrix |
| Rủi ro | Chữ viết tay quá đa dạng giữa người dùng | Trung bình | Dữ liệu huấn luyện đa dạng, dung sai qua top-5 |
| Rủi ro | Phạm vi N4/N5 chưa nhất quán (xem mục 11) | Cao | Chốt phạm vi trước khi công bố |

## 11. Vấn đề Phạm vi Ký tự cần Chốt

`transN4N5.py` hiện chỉ lọc `N5`:
```python
if jlpt_level not in ["N5"]:
    continue
```
trong khi tên model/message ghi `N4_N5`. **Cần chốt** một trong hai hướng:

- **Mục tiêu N5:** đổi tên model/message/tài liệu cho đúng.
- **Mục tiêu N4 + N5:** lọc cả `N4` và `N5`, tạo lại dataset + mapping và **train lại** checkpoint.

> ⚠️ Không được chỉ đổi tên file model để kết luận model đã hỗ trợ N4.

## 12. Ngoài Phạm vi (Out of Scope)

- Chatbot, RAG, embedding và mọi route khác của project lớn.
- Nhận diện nhiều ký tự / cả câu, dịch đoạn văn.
- Nhận diện Hiragana/Katakana.
- Tài khoản người dùng, lịch sử tra cứu.

---
*Tài liệu tiếp theo: [PRD](./prd.md).*
