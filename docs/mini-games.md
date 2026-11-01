# Kế hoạch Mini-game cho Kanji Nest

> **Nguồn cảm hứng:** DORA Dojo (`hocvuicungdora.com`) — chỉ tham khảo **ý tưởng cơ chế chơi**, KHÔNG sao chép nội dung/đồ hoạ/tài sản của họ.
> **Trạng thái:** BẢN KẾ HOẠCH — chưa code. Khớp với **Giai đoạn 2** trong `docs/roadmap.md` ("Mở rộng quiz: trắc nghiệm, điền khuyết, nghĩa↔từ…").
> **Ràng buộc (AGENTS.md):** tái dùng tối đa dữ liệu `LocalVocabulary` hiện có; **không** mở Giai đoạn 3 (nhận diện Kanji) đang freeze; giữ TypeScript 6.0.3; kiến trúc FSD; test tất định.

---

## 1. Nguyên tắc thiết kế chung

1. **Mỗi game = một feature slice** theo FSD: `features/<game>/{model,ui}`. Logic thuần (chọn thẻ, chấm điểm, luật chơi) tách khỏi UI để **unit test** được — giống cách `features/flashcard` và `features/quiz` đang làm.
2. **Tái dùng SRS, nói rõ game nào "ghi" vs "chỉ đọc":**
   - *Ghi SRS:* kết quả đúng/sai cập nhật `srs*` qua `applyReview` (như chế độ Anki) **và** đặt `updatedAt = now` để đồng bộ coi là "bẩn".
   - *Chỉ đọc SRS:* chỉ dùng `srsRepetition`/`srsNextReview` để chọn/ưu tiên thẻ, không ghi (như chế độ Progress).
3. **Lưu phiên chơi** vào `quiz_sessions` / `quiz_attempts` (cột `mode` vốn đã thiết kế để mở rộng) → có thống kê & lịch sử.
4. **Ưu tiên game chỉ cần dữ liệu đã có:** `word`, `reading`, `meaning`, `sinoVietnamese`, `example`, `exampleMeaning`, `tags`, `jlptLevel`, `srs*`.
5. **Phạm vi (scope) dùng chung:** mọi game nhận đầu vào là một tập từ (theo folder / JLPT / tags), tái dùng `ScopeBar` + bộ chọn phạm vi hiện có.

---

## 2. Danh mục mini-game (phân theo độ sẵn sàng dữ liệu)

### 🟢 Nhóm A — Làm được ngay (chỉ cần dữ liệu hiện có)

| Game | Cơ chế | Field dùng | SRS | FSD slice | Độ khó |
|---|---|---|---|---|---|
| **Ghép cặp** (matching) | Lật/nối cặp `word` ↔ `meaning` (hoặc `reading`) | word, meaning, reading | chỉ đọc | `features/match` | ⭐ Thấp |
| **Thử thách tốc độ** (speed) | Trả lời nhanh có đồng hồ đếm ngược; mở rộng từ Typing Quiz | word, meaning, reading | ghi | `features/quiz` (mode mới) | ⭐ Thấp |
| **Mật Mã Hôm Nay** (daily) | Mỗi ngày 1 bộ thẻ cố định (seed theo ngày) để tạo thói quen | mọi field | ghi | `features/daily` | ⭐ Thấp |
| **Phi Tiêu Hán Việt** | Hiện từ, chọn đúng **âm Hán–Việt**; combo liên tiếp | **sinoVietnamese**, word | ghi | `features/darts` | ⭐⭐ TB |
| **Nối từ Shiritori** | Từ sau bắt đầu bằng kana cuối của từ trước (しりとり) | **reading** (kana) | chỉ đọc | `features/shiritori` | ⭐⭐ TB |
| **Thử thách sinh tồn** (survival) | Có "mạng" (hearts); sai là mất mạng, chơi đến khi hết | word, meaning | ghi | `features/survival` | ⭐⭐ TB |

> Nhóm A chủ yếu là biến thể cách hỏi/chấm trên **cùng tập dữ liệu từ vựng** → chi phí thấp, giá trị cao.

### 🟡 Nhóm B — Cần bổ sung dữ liệu nhỏ

| Game | Cơ chế | Dữ liệu cần thêm | FSD slice | Độ khó |
|---|---|---|---|---|
| **Băng Chuyền Sushi** | Chộp token theo đúng thứ tự để ghép thành câu hoàn chỉnh | Tách `example` thành chuỗi token/thứ tự (hoặc thêm field `exampleTokens`) | `features/sushi` | ⭐⭐⭐ Cao |
| **Điền từ vào câu** (cloze/ngữ pháp) | Chọn trợ từ / thể động từ / mẫu ngữ pháp đúng ngữ cảnh | Ngân hàng câu: `text`, vị trí `blank`, đáp án, đáp án nhiễu, `grammarPoint`, `jlpt` → **bảng/collection mới** | `features/cloze` | ⭐⭐⭐ Cao |

### 🔴 Nhóm C — Cần hạ tầng/dữ liệu lớn (để sau)

| Game | Vì sao hoãn |
|---|---|
| **Đấu từ vựng / Đấu online / Phòng thách đấu** (PvP) | Cần realtime (WebSocket), ghép trận (matchmaking), tài khoản/định danh người chơi, chống gian lận → thay đổi backend đáng kể. |
| **Ghép Kanji** (kéo–thả bộ thủ) | Cần dữ liệu chiết tự bộ thủ (radical decomposition). **Dính Giai đoạn 3 (Kanji) đang FREEZE** → chỉ làm sau khi GĐ3 được kích hoạt. |

---

## 3. Bảng ưu tiên (giá trị ↔ công sức)

| Ưu tiên | Game | Lý do |
|---|---|---|
| **P0 – làm trước** | Ghép cặp · Thử thách tốc độ · Mật Mã Hôm Nay | Dữ liệu sẵn, tái dùng nhiều code quiz/flashcard, tạo thói quen học |
| **P1** | Phi Tiêu Hán Việt · Shiritori · Sinh tồn | Dữ liệu sẵn (sinoVietnamese/reading), gameplay hấp dẫn |
| **P2** | Băng Chuyền Sushi · Điền từ vào câu | Cần chuẩn hoá/ bổ sung dữ liệu câu & ngữ pháp |
| **P3 – sau cùng** | PvP (Đấu online…) · Ghép Kanji | Hạ tầng realtime / chờ mở Giai đoạn 3 |

---

## 4. Dữ liệu cần chuẩn bị (tóm tắt)
- **Shiritori:** chuẩn hoá `reading` về kana nhất quán để so khớp chữ **cuối → đầu** (xử lý ー, ん kết thúc, âm đục/bán đục).
- **Băng Chuyền Sushi:** tách `example` thành danh sách token theo thứ tự đúng (có thể sinh sẵn khi import, hoặc field phụ `exampleTokens`).
- **Điền từ vào câu:** thiết kế thực thể mới `sentence` (map 1-1 FE↔BE): `id`, `text`, `blankIndex`, `answer`, `distractors[]`, `grammarPoint`, `jlptLevel`, chuẩn đồng bộ (`updatedAt`/`deletedAt` nếu local-first).
- **Ghép Kanji:** bảng chiết tự bộ thủ — **hoãn** cùng Giai đoạn 3.

---

## 5. Tích hợp SRS & thống kê
- **Ghi SRS:** Thử thách tốc độ, Phi Tiêu Hán Việt, Sinh tồn, Mật Mã Hôm Nay (đúng → `applyReview(Good/Easy)`, sai → `Again`).
- **Chỉ đọc SRS:** Ghép cặp, Shiritori (dùng để ưu tiên thẻ yếu, không phá lịch ôn).
- **`quiz_sessions.mode`:** bổ sung giá trị cho từng game, ví dụ `'match' | 'speed' | 'daily' | 'darts' | 'shiritori' | 'survival' | 'sushi' | 'cloze'` (cột đã để mở rộng trong schema).

---

## 6. Lộ trình đề xuất (theo sprint)
1. **Sprint 1 (P0):** Ghép cặp → Thử thách tốc độ → Mật Mã Hôm Nay.
2. **Sprint 2 (P1):** Phi Tiêu Hán Việt → Shiritori → Thử thách sinh tồn.
3. **Sprint 3 (P2):** Băng Chuyền Sushi → Điền từ vào câu (kèm chuẩn bị dữ liệu câu).
4. **Về sau (P3):** PvP realtime; Ghép Kanji (chờ mở Giai đoạn 3).

---

## 7. Non-goals / ràng buộc
- ❌ Không sao chép nội dung, hình ảnh, âm thanh hay mã của DORA Dojo — chỉ học hỏi **ý tưởng cơ chế**.
- ❌ Không mở Giai đoạn 3 (nhận diện Kanji / dữ liệu bộ thủ cho "Ghép Kanji") khi chưa được kích hoạt.
- ✅ Giữ TypeScript 6.0.3, kiến trúc FSD, đặt tên feature khớp 1-1 FE↔BE, test tất định.

---

## 8. Tiêu chí hoàn thành cho MỖI game (Definition of Done)
- [ ] Logic luật chơi/chấm điểm là hàm **thuần**, có unit test (Vitest) tất định.
- [ ] UI đủ 4 trạng thái (loading/empty/error/success) và **responsive** mobile→desktop.
- [ ] Nếu game "ghi SRS": cập nhật `srs*` **và** `updatedAt` → đồng bộ nhận ra thay đổi.
- [ ] Lưu phiên vào `quiz_sessions`/`quiz_attempts` với `mode` tương ứng.
- [ ] Không ảnh hưởng dữ liệu/khối Giai đoạn 3 đang freeze.
