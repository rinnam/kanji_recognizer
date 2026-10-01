# Audit dự án tham khảo — Kotobase

> **Mục đích:** học kiến trúc, tính năng, luồng UX, công thức SRS và cách tổ chức dữ liệu của **Kotobase** để **thiết kế lại** cho **Kanji Nest** bằng từ ngữ/kiến trúc riêng.
>
> **Ràng buộc bản quyền (quan trọng):** Kotobase là repo public **không có license mã nguồn mở rõ ràng** (chỉ "phục vụ học tập, nghiên cứu cá nhân").
> - ✅ ĐƯỢC: học ý tưởng tính năng, luồng UX, công thức SRS, cấu trúc dữ liệu, cách tích hợp từ điển → viết lại.
> - ❌ KHÔNG: copy nguyên văn code hoặc văn bản của họ vào dự án này (kể cả khi dự án mình cũng public).
> Toàn bộ tài liệu này là **mô tả/diễn giải lại**, không chép nguyên văn.

## 0. Nguồn đã đọc & một đính chính quan trọng

Nguồn tham khảo thực tế đã đọc (bộ tài liệu kỹ thuật Kotobase tại `D:\Ki_1_nam_4\Job\Reup\Thu6\docs`):
`README.md`, `ANKI_SRS.md`, `GOOGLE_DRIVE_SYNC.md`, `AI_FEATURES.md`, `TTS_ENGINE.md`, `listening-roadmap.md`, `SETUP_GUIDE.md`.

> ⚠️ **Đính chính so với đề bài:** đề bài giả định Kotobase dùng **Firestore**. Tài liệu thực tế cho thấy Kotobase là **Local-First dùng IndexedDB** (trình duyệt) + **đồng bộ qua Google Drive** (thuật toán Last-Write-Wins theo `updatedAt`), **không phải Firestore**. Điều này thực ra **gần hơn** với mô hình "local-first + đồng bộ PostgreSQL" của Kanji Nest. Vì vậy ở cột "quyết định áp dụng" bên dưới, lý do "không áp dụng" sẽ dựa trên **đổi tầng đồng bộ (Google Drive → PostgreSQL server)** thay vì "đổi khỏi Firestore".

## 1. Danh sách tính năng gốc & quyết định áp dụng

Phân loại: **PHẢI CÓ** (clone 1:1) · **NÊN CÓ** (clone + cải tiến) · **KHÔNG ÁP DỤNG** (ở giai đoạn này).

| # | Tính năng Kotobase | Mô tả ngắn | Phân loại | Quyết định cho Kanji Nest | Nguồn (repo họ) |
|---|---|---|---|---|---|
| 1 | Folder cây lồng nhau, kéo–thả | Thư mục cha/con, sắp xếp bằng DnD | **PHẢI CÓ** | Clone 1:1. Model `LocalFolder.parentId` + `order` đã có sẵn. | *chưa xác minh file* |
| 2 | Quick Add chống trùng | Thêm nhanh từ, chặn trùng `word` | **PHẢI CÓ** | Clone 1:1. Chống trùng theo `word` (+ `reading`) trong cùng phạm vi. | *chưa xác minh file* |
| 3 | Bulk Import | Nhập hàng loạt từ văn bản/CSV | **PHẢI CÓ** | Clone 1:1 ở MVP (import), mở rộng định dạng ở GĐ2. | *chưa xác minh file* |
| 4 | Overview (lọc + phân trang) | Danh sách từ, filter theo folder/tag/JLPT, phân trang | **PHẢI CÓ** | Clone + phân trang/lọc phía server (PostgreSQL) để chịu tải lớn. | *chưa xác minh file* |
| 5 | Focus Recall (ẩn nghĩa) | Ẩn nghĩa để tự kiểm tra | **NÊN CÓ** | Clone + cải tiến (ẩn linh hoạt theo trường). | *chưa xác minh file* |
| 6 | Flashcard 3 chế độ (Normal / Progress / Anki SRS) | Lật thẻ; chế độ SRS theo SM-2 | **PHẢI CÓ** | Clone 1:1. Logic SRS: xem mục 2; dùng `srs*` fields. | logic SRS: xem `ANKI_SRS.md` |
| 7 | Kanji Dictionary (tự bóc tách + tra Mazii) | Bóc Kanji trong từ, tra từ điển ngoài | **NÊN CÓ** | Clone + cải tiến. Chi tiết nguồn từ điển: xem mục 3. | *chưa xác minh file (đề bài nêu Mazii)* |
| 8 | Typing Quiz | Gõ đáp án, chấm điểm | **PHẢI CÓ** | Clone 1:1 ở MVP; mở rộng dạng quiz ở GĐ2. | *chưa xác minh file* |
| 9 | Debounce search | Tìm kiếm có debounce | **NÊN CÓ** | Áp dụng (debounce ~300ms client). Tham khảo kỹ thuật, viết lại. | *kỹ thuật chung* |
| 10 | Dynamic import (code-splitting) | Tải lười module nặng | **NÊN CÓ** | Áp dụng với Vite (lazy route/feature). | *kỹ thuật chung* |
| 11 | Dark/Light mode | Chủ đề sáng/tối | **NÊN CÓ** | Áp dụng (theme token, lưu preference). | *kỹ thuật chung* |
| 12 | Đồng bộ Google Drive (Two-Way Smart Merge, LWW) | Backup/khôi phục qua Drive, merge theo `updatedAt`, debounce 3.5s | **KHÔNG ÁP DỤNG (thay thế)** | Thay bằng **đồng bộ PostgreSQL server**. Giữ lại **ý tưởng** Two-Way Smart Merge (xem mục 2 & ADR 0001). | `src/lib/sync-manager.ts` |
| 13 | AI bulk vocab generator | Sinh từ vựng từ ngôn ngữ tự nhiên, multi-provider fallback | **NÊN CÓ (GĐ sau)** | Đưa vào roadmap GĐ2/3. Trường AI sinh ra khớp đúng model `LocalVocabulary`. | logic: `AI_FEATURES.md` |
| 14 | TTS phát âm (VOICEVOX GPU, Tokyo pitch accent) | Đọc tiếng Nhật bằng GPU local | **KHÔNG ÁP DỤNG** | Ngoài phạm vi (phụ thuộc GPU/engine local). Có thể ghi roadmap xa. | `TTS_ENGINE.md` |
| 15 | Listening practice | Luyện nghe | **KHÔNG ÁP DỤNG** | Ngoài phạm vi 3 giai đoạn hiện tại. | `listening-roadmap.md` |

## 2. Công thức SRS (biến thể Anki / SuperMemo SM-2)

Trích từ `ANKI_SRS.md` (diễn giải lại). Mỗi từ quản lý bởi 3 tham số:

- **I** — Interval: số ngày chờ trước lần ôn kế tiếp → map `srsInterval`.
- **n** — Repetition count: số lần nhớ đúng liên tiếp → map `srsRepetition`.
- **EF** — Ease Factor: hệ số độ dễ, **mặc định 2.5**, **tối thiểu 1.3** → map `srsEaseFactor` (mặc định `2.5`).
- **srsNextReview** = thời điểm hiện tại + `I` ngày (ISO Timestamp).

Người học chấm 1 trong 4 mức sau khi lật thẻ (`q`), quy ước Again/Hard/Good/Easy.

**2.1. Cập nhật Ease Factor (EF):**

```
EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
if EF' < 1.3 then EF' = 1.3
```

**2.2. Cập nhật Interval (I) và Repetition (n):**

- Nếu **quên** (`q < 3`, tức "Again"/"Lại"):
  - `n = 0`
  - `I = 1 ngày`
- Nếu **nhớ** (`q >= 3`, tức "Hard"/"Good"/"Easy"):
  - lần nhớ 1 (`n = 1`): `I = 1 ngày`
  - lần nhớ 2 (`n = 2`): `I = 6 ngày`
  - lần nhớ `n > 2`: `I = round(I_trước × EF)`

**2.3. Hàng đợi ôn tập:** mỗi ngày lấy các thẻ có `srsNextReview <= now` để ôn.

**2.4. Đối chiếu field (nhất quán với Bước 4):**

| Khái niệm SM-2 | Field trong `LocalVocabulary` | Ghi chú |
|---|---|---|
| I (interval) | `srsInterval?: number` | đơn vị ngày |
| n (repetition) | `srsRepetition?: number` | |
| EF (ease factor) | `srsEaseFactor?: number` | mặc định `2.5`, sàn `1.3` |
| ngày ôn kế tiếp | `srsNextReview?: string` | ISO Timestamp |

> **Thang điểm SRS (ĐÃ CHỐT):** ánh xạ 4 nút → `q` của công thức SM-2 đã cho: **Again=0, Hard=3, Good=4, Easy=5**. Áp công thức `EF'` cho **mọi** lần đánh giá (sàn 1.3). Nếu `q < 3` (Again): `n=0`, `I=1`. Nếu `q ≥ 3`: `n += 1`, `I = (n==1 ? 1 : n==2 ? 6 : round(I_trước × EF'))`; `srsNextReview = now + I ngày`. Bám đúng công thức đã cho, KHÔNG thêm biến thể Hard×1.2 / Easy-bonus của Anki.

## 3. Tích hợp từ điển ngoài (cho tính năng Kanji — làm cuối)

Mục tiêu dữ liệu cần: **on'yomi / kun'yomi, cấp JLPT, số nét, nghĩa, (tùy chọn) mnemonic**.

- Đề bài nêu Kotobase dùng **Mazii** cho Kanji Dictionary; các tài liệu đã đọc **không có file mô tả chi tiết tích hợp Mazii/Jisho** → **cần mở repo để xác minh** endpoint/field cụ thể trước khi phụ thuộc. **Không bịa** endpoint.
- `AI_FEATURES.md` cho thấy Kotobase còn dùng **LLM (multi-provider fallback)** để sinh từ vựng; JSON trả về gồm đúng các trường: `word`, `reading` (hiragana), `sinoVietnamese` (Hán Việt viết HOA), `meaning`, `example`, `exampleMeaning` → **khớp 1-1** với `LocalVocabulary`.

**Khuyến nghị thiết kế cho Kanji Nest (ghi rõ là đề xuất của ta, không phải mô tả Kotobase):**
- Ưu tiên **nguồn dữ liệu mở, bundle sẵn** để tra cứu không phụ thuộc API bên thứ ba (tránh rate-limit/độ trễ): **KanjiDic2** (on/kun, số nét, grade, JLPT), **JMdict** (nghĩa/ví dụ), **KanjiVG** (thứ tự nét/SVG). Giấy phép các nguồn này (CC BY-SA…) cần ghi credit — **TBD về license** để duyệt.
- Mazii/Jisho (nếu dùng) đặt sau một **adapter** (interface nhỏ, module sâu) để có thể thay nguồn mà không ảnh hưởng tính năng — áp dụng tinh thần "codebase-design".

## 4. Cơ chế đồng bộ Kotobase & bài học cho Kanji Nest

Trích `GOOGLE_DRIVE_SYNC.md` (diễn giải lại):

- **Two-Way Smart Merge = Last-Write-Wins theo `updatedAt`:** so khớp Folder/Vocabulary theo `id`; cùng `id` thì giữ bản `updatedAt` mới hơn; `id` chỉ có một bên thì **giữ lại** (không xóa).
- **Auto-sync có debounce 3.5s:** sau khi người dùng ngừng thao tác 3.5s mới upload ngầm, tránh giật UI.
- Bảo toàn tiến độ SRS (`srsInterval`, `srsNextReview`, `srsEaseFactor`) khi merge.

> 🔴 **Lỗ hổng quan trọng cần SỬA khi thiết kế lại:** quy tắc "id chỉ có một bên thì giữ lại" khiến **bản ghi đã xóa bị 'hồi sinh'** sau khi merge (máy A xóa, máy B chưa biết → merge thêm lại). Kanji Nest **phải bổ sung tombstone/`deletedAt`** để xử lý xóa đúng cách. Chi tiết ở `docs/adr/0001-two-way-smart-merge.md`.

## 5. Những gì KHÔNG mang sang (và lý do)

- **Tầng đồng bộ Google Drive + OAuth GIS** → thay bằng đồng bộ **PostgreSQL server** (có `DATABASE_URL`), vẫn giữ triết lý local-first.
- **TTS VOICEVOX GPU, Listening** → ngoài phạm vi 3 giai đoạn.
- **Mọi code/văn bản nguyên văn của Kotobase** → không chép; chỉ tái thiết kế.
