# Roadmap — Kanji Nest

> App học tiếng Nhật qua flashcard, SRS, quiz, và (cuối cùng) nhận diện Kanji.
> Mô hình: **local-first** (IndexedDB) + **đồng bộ PostgreSQL** (Two-Way Smart Merge — xem `docs/adr/0001-two-way-smart-merge.md`).
> Web responsive là bắt buộc ở mọi giai đoạn. Android/iOS (Capacitor) chỉ là **lựa chọn tương lai**, KHÔNG triển khai bây giờ.

---

## Giai đoạn 1 — MVP

**Mục tiêu:** người học quản lý được từ vựng theo thư mục và học bằng flashcard SRS + quiz gõ, hoạt động offline và đồng bộ an toàn.

**Phạm vi:**
- Folder cây lồng nhau (tạo/sửa/xóa, kéo–thả sắp xếp, `parentId` + `order`).
- Vocabulary CRUD, local-first + đồng bộ 2 chiều (có tombstone chống hồi sinh).
- Quick Add chống trùng (`word` + `reading`).
- Flashcard 3 chế độ: Normal / Progress / **Anki SRS** (SM-2: `srsInterval`, `srsRepetition`, `srsEaseFactor` mặc định 2.5, `srsNextReview`).
- Typing Quiz cơ bản (gõ đáp án, chấm đúng/sai).

**User story tóm tắt:**
- *Là người học*, tôi muốn tạo thư mục & thêm từ nhanh để sắp xếp vốn từ.
- *Là người học*, tôi muốn ôn flashcard theo lịch SRS để nhớ lâu.
- *Là người học*, tôi muốn làm quiz gõ để tự kiểm tra.
- *Là người học*, tôi muốn dữ liệu được đồng bộ để không mất khi đổi máy.

**Acceptance criteria tóm tắt:**
- CRUD folder/vocab hoạt động offline; đồng bộ merge đúng (LWW), xóa không bị hồi sinh.
- Quick Add chặn trùng từ còn sống trong cùng người dùng.
- Flashcard SRS cập nhật `srs*` đúng công thức SM-2; hàng đợi ôn lấy theo `srsNextReview`.
- Typing Quiz chấm điểm chính xác; lưu phiên vào `quiz_sessions`/`quiz_attempts`.
- UI đủ 4 trạng thái (loading/empty/error/success), responsive mobile→desktop.

**Phụ thuộc:** schema `kanji_nest` đã tạo & áp `schema.sql`; version lock (Node 24.14.1, React 19.3.0, TS 6.0.3…).

**Rủi ro:**
- Logic merge/tombstone sai → mất hoặc nhân đôi dữ liệu. *Giảm thiểu:* test đồng bộ kỹ, có ADR 0001.
- Thang điểm SRS: **đã chốt** (Again=0 / Hard=3 / Good=4 / Easy=5 — feature-audit §2.4).

---

## Giai đoạn 2 — Mở rộng & tối ưu

**Mục tiêu:** làm giàu trải nghiệm học và tối ưu hiệu năng khi dữ liệu lớn.

**Phạm vi:**
- Mở rộng quiz (nhiều dạng: trắc nghiệm, điền khuyết, nghĩa↔từ…).
- Cải thiện SRS (tinh chỉnh interval/ease, thống kê tiến độ, Focus Recall ẩn nghĩa).
- Tối ưu hiệu năng: **debounce search**, **dynamic import / code-splitting**, phân trang/lọc phía server cho Overview.
- (Tùy chọn) AI bulk vocab generator — sinh từ theo yêu cầu ngôn ngữ tự nhiên (trường trả về khớp `LocalVocabulary`).
- **Nâng TypeScript 6.0.3 → 7.0.2** khi hệ sinh thái (eslint parser, test tooling) đã tương thích ổn định (xem `docs/adr/0002-version-lock.md`).

**User story tóm tắt:** *người học* muốn nhiều kiểu luyện tập hơn và app vẫn mượt khi có hàng nghìn từ.

**Acceptance criteria tóm tắt:** các dạng quiz mới chấm đúng; Overview phản hồi nhanh với bộ dữ liệu lớn; bundle giảm nhờ code-splitting.

**Phụ thuộc:** GĐ1 ổn định; (nếu làm AI) chốt nhà cung cấp LLM + quản lý khóa qua biến môi trường.

**Rủi ro:** nâng TS 7 có thể làm gãy tool → nâng sau khi kiểm trên nhánh riêng; chi phí/giới hạn API nếu bật AI.

---

## Giai đoạn 3 — Nhận diện Kanji (CUỐI CÙNG)

> ❄️ **ĐÓNG BĂNG (freeze) ở hiện tại:** giai đoạn này làm **sau cùng**. Các phần liên quan — feature `kanji-recognition`, entity `kanji`, bảng `kanji_entries` & `recognition_results` — đã được **thiết kế sẵn** nhưng **KHÔNG phát triển/sửa** cho tới khi GĐ3 được kích hoạt.

**Mục tiêu:** nhận diện Kanji người dùng vẽ tay/ảnh và lưu kết quả vào thư viện từ vựng.

**Phạm vi:**
- Nhập liệu: vẽ tay (canvas) hoặc tải ảnh.
- Nhận diện → trả ký tự + độ tin cậy (`recognition_results`).
- Tra cứu Kanji: on'yomi/kun'yomi, cấp JLPT, số nét, nghĩa (`kanji_entries`) — ưu tiên nguồn dữ liệu mở (KanjiDic2/JMdict/KanjiVG) sau một adapter; Mazii/Jisho là tùy chọn (cần xác minh & lưu ý license).
- Lưu kết quả vào thư viện (`saved_vocab_id` → `vocabularies`).

**User story tóm tắt:** *người học* gặp một Kanji lạ → vẽ/chụp → app nhận diện và cho lưu vào thư viện kèm nghĩa/âm.

**Acceptance criteria tóm tắt:** nhận diện trả ký tự + độ tin cậy; tra cứu hiển thị on/kun/JLPT/số nét; "Lưu vào thư viện" tạo vocab đúng mapping.

**Phụ thuộc:** engine/model nhận diện (TBD: on-device vs API); nguồn từ điển Kanji + license.

**Rủi ro:** độ chính xác nhận diện; bản quyền/giới hạn nguồn từ điển; kích thước model nếu chạy on-device.

---

## Ngoài phạm vi hiện tại (ghi nhận để không quên)

- **Android/iOS qua Capacitor** — lựa chọn tương lai, chỉ bọc web responsive khi cần.
- **TTS (VOICEVOX GPU), luyện nghe** — có ở Kotobase nhưng ngoài phạm vi 3 giai đoạn trên.
