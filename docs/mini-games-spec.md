# Spec chi tiết Mini-game — Nhóm A & B (Kanji Nest)

> **Mục đích:** mô tả **cụ thể cơ chế chơi** (phỏng theo DORA Dojo) đủ để triển khai bằng **dữ liệu & đồ hoạ của chính Kanji Nest**. Đây là *tái hiện gameplay*, KHÔNG sao chép văn bản/đồ hoạ/mã nguồn của DORA Dojo.
> **Liên quan:** `docs/mini-games.md` (bản tổng quan & ưu tiên). Khớp Giai đoạn 2 trong `docs/roadmap.md`.
> **Trạng thái:** BẢN KẾ HOẠCH — chưa code. Giữ TS 6.0.3, FSD, test tất định. KHÔNG mở Giai đoạn 3 (Kanji) đang freeze.

---

## 0. Chuẩn dùng chung cho mọi game

**Dữ liệu nguồn (`LocalVocabulary`):** `word`, `reading`, `meaning`, `sinoVietnamese`, `example`, `exampleMeaning`, `tags`, `jlptLevel`, `srs*`.

**Phạm vi (scope):** mọi game nhận một tập thẻ theo folder / JLPT / tags (tái dùng `ScopeBar` + bộ chọn phạm vi hiện có).

**Sinh đáp án nhiễu (distractors):** ưu tiên lấy từ thẻ **cùng `jlptLevel`** (hoặc cùng folder) để câu khó hợp lý; không trùng đáp án đúng; tất định theo `seed`.

**Độ khó:** 2 mức "Vừa / Khó" (giống web) — Khó = nhiều lựa chọn hơn / đồng hồ ngắn hơn / nhiễu cùng cấp JLPT.

**Thông số mặc định đề xuất** (chỉ là mặc định, chỉnh được):
- Tim (hearts): **3**. Combo nhân điểm: ×1 → +0.1 mỗi lần đúng, tối đa ×2; sai → reset ×1.
- Điểm cơ bản mỗi câu đúng: **10** × combo (+ thưởng tốc độ nếu có).

**Hiệu ứng (phỏng cảm giác web, tự vẽ):** tim đập khi còn ít, combo "ngọn lửa", điểm `+N` bay lên, "nổ hoa anh đào", đồng hồ nhấp nháy khi gần hết giờ. Tất cả bằng CSS transform, phần tử vẫn thấy được khi tắt animation (`prefers-reduced-motion`).

**Ghi vs đọc SRS:**
- *Ghi SRS* (đúng→`Good`, sai/timeout→`Again`, qua `applyReview`, nhớ set `updatedAt`): Thử thách tốc độ, Phi Tiêu Hán Việt, Thử thách sinh tồn, Mật Mã Hôm Nay.
- *Chỉ đọc SRS* (ưu tiên thẻ `srsRepetition` thấp, không ghi): Ghép cặp, Nối từ Shiritori.

**Lưu phiên:** ghi vào `quiz_sessions`/`quiz_attempts` với `mode` riêng từng game.

---

# NHÓM A — làm được ngay (dữ liệu đã có)

## A1. Ghép cặp (Matching) — `features/match`
**Cảm giác chơi:** một lưới các ô; chạm 2 ô để nối **từ ↔ nghĩa**. Nối đúng → cặp biến mất + combo; sai → nhấp nháy đỏ. Hết cặp = thắng, tính theo **thời gian + số lần sai**.

**Luật chi tiết:**
- 1 ván = `N` cặp (mặc định 6 → 12 ô). Một cột là `word`, cột kia là `meaning` (tuỳ chọn `reading`).
- Chọn ô A rồi ô B: khớp → ẩn cặp, +điểm×combo; không khớp → bật lại, combo reset.
- Thắng khi ghép hết. Chấm: thời gian hoàn thành + số lỗi (ít lỗi/nhanh = sao cao).

**Dữ liệu:** cần `meaning` (bắt buộc). SRS: chỉ đọc.

**Model thuần (có test):** `buildBoard(vocabs, pairCount, seed)`, `checkPair(a, b)`, `isComplete(board)`, `scoreOf(timeMs, mistakes)`.

**Edge:** cần ≥ `pairCount` thẻ sống; từ/nghĩa dài phải wrap; chống chọn trùng 1 ô.

---

## A2. Thử thách tốc độ (Speed) — `features/quiz` (mode `speed`)
**Cảm giác chơi:** trắc nghiệm nhanh, **đồng hồ đếm ngược** (tổng 60s). Trả đúng nhiều nhất có thể; combo + thưởng tốc độ.

**Luật chi tiết:**
- Mỗi câu: hiện `word`, 4 lựa chọn `meaning` (1 đúng + 3 nhiễu). Chọn càng nhanh thưởng càng cao.
- Đúng → +điểm×combo (+bonus theo thời gian còn lại); sai/hết giờ câu → combo reset (không trừ tim).
- Hết đồng hồ tổng → kết thúc, hiện tổng điểm & số câu đúng.

**Dữ liệu:** `word`, `meaning`. SRS: ghi.

**Model thuần:** `makeQuestion(vocab, pool, seed)`, `pickDistractors(correct, pool, 3, seed)`, `applyAnswer(state, choice, elapsedMs)`, `tick(state, dtMs)`.

**Edge:** pool < 4 → giảm số lựa chọn; tránh lặp câu liên tiếp.

---

## A3. Mật Mã Hôm Nay (Daily) — `features/daily`
**Cảm giác chơi:** mỗi ngày **một bộ câu cố định** cho mọi lần mở (seed theo ngày — kiểu "daily challenge") → tạo thói quen + **chuỗi ngày học (streak)**.

**Luật chi tiết:**
- Seed = ngày `YYYY-MM-DD`. `pickDailySet` rút `M` thẻ (mặc định 10) **tất định** từ thẻ của người dùng.
- Chơi dạng tốc độ/trắc nghiệm. Hoàn thành → đánh dấu "đã học hôm nay", +1 streak (gãy nếu bỏ ngày).
- Đã chơi trong ngày → khoá, chỉ xem lại kết quả.

**Dữ liệu:** mọi field. SRS: ghi. Lưu tiến độ/streak vào **STORE.meta** (đã có trong IndexedDB).

**Model thuần:** `dailySeed(date)`, `pickDailySet(vocabs, date, M)`, `isDoneToday(meta, date)`, `updateStreak(meta, date)`.

**Edge:** đổi múi giờ/ngày; ít thẻ hơn `M` → dùng hết số có.

---

## A4. Phi Tiêu Hán Việt (Darts) — `features/darts`
**Cảm giác chơi (giống web):** một **bảng treo giấy washi** hiện **chữ Kanji** (+ cách đọc). Xung quanh là **lưới 2 cột các "bia" bay lơ lửng**, mỗi bia ghi một **âm Hán–Việt**. **Ném phi tiêu** trúng bia đúng → **nổ hoa anh đào** + combo; trúng sai → **mất 1 tim**.

**Luật chi tiết:**
- Có `hearts` (3). Mỗi màn: 1 từ (hiện `word` = Kanji, kèm `reading`), 4 bia = 1 âm Hán Việt đúng + 3 nhiễu.
- Trúng đúng: +điểm×combo, hiệu ứng hoa nở; trúng sai: −1 tim, combo reset.
- Hết tim → thua; nếu không giới hạn thì chơi theo số màn/scope.

**Dữ liệu:** **bắt buộc có `sinoVietnamese`** + `word`. Chỉ nạp thẻ có `sinoVietnamese`. SRS: ghi.

**Model thuần:** `makeDartRound(vocab, pool, seed)`, `pickHanVietDistractors(correct, pool, 3, seed)`, `applyHit(state, targetId)` (quản lý hearts/combo/score).

**UI gợi ý:** bảng washi (kanji + gạch hồng dưới chữ), lưới bia nổi, dãy tim, nhãn combo, hiệu ứng cánh hoa khi trúng.

**Edge:** thiếu thẻ có `sinoVietnamese` → báo "bộ từ chưa có âm Hán Việt".

---

## A5. Nối từ Shiritori (しりとり) — `features/shiritori`
**Cảm giác chơi (giống web):** trò chơi chữ quốc dân Nhật — **từ sau bắt đầu bằng kana cuối của từ trước**. Nối chuỗi càng dài càng tốt. **Thua nếu từ kết thúc bằng ん (n)**, trùng từ đã dùng, hoặc không nối được.

**Luật chi tiết:**
- Bắt đầu bằng 1 từ. Mỗi lượt người chơi **chọn từ hợp lệ từ gợi ý** (MVP, dựa trên vocab người dùng) — về sau mới mở nhập tự do (cần từ điển).
- Hợp lệ = kana đầu của từ mới == kana cuối của từ trước, chưa dùng, không kết thúc ん.
- Điểm theo độ dài chuỗi; có thể giới hạn thời gian mỗi lượt.

**Dữ liệu:** **bắt buộc có `reading`** (kana). SRS: chỉ đọc.

**Model thuần (lõi, cần test kỹ):** `normalizeKana(reading)` (katakana→hiragana, bỏ ー, âm nhỏ ゃゅょ về gốc), `firstKana`, `lastKana`, `canFollow(prev, next)`, `isDeadEnd(reading)` (kết thúc ん), `nextCandidates(pool, prev, used)`.

**Edge:** âm kéo dài ー, âm đục/bán đục (が↔か), small kana; từ chỉ có kanji không có reading → loại.

---

## A6. Thử thách sinh tồn (Survival) — `features/survival`
**Cảm giác chơi (giống web):** có **tim/mạng**, trả lời liên tục, **sai là mất mạng**; càng về sau **đồng hồ càng ngắn** (căng thẳng tăng dần). Hết tim → ghi **kỷ lục chuỗi sống sót**.

**Luật chi tiết:**
- `hearts` = 3. Câu trắc nghiệm `word → meaning` (như A2). Đúng → tiếp + điểm×combo; sai hoặc hết giờ câu → −1 tim.
- `nextTimerMs(streak)` giảm dần theo chuỗi đúng (sàn ~3s). Hết tim → thua, lưu `bestStreak`.

**Dữ liệu:** `word`, `meaning`. SRS: ghi.

**Model thuần:** `makeQuestion` (dùng chung A2), `applyAnswer(state, choice)`, `nextTimerMs(streak)`.

**Edge:** đồng hồ không âm; đồng bộ "best streak" vào meta.

---

# NHÓM B — cần bổ sung dữ liệu nhỏ

## B1. Băng Chuyền Sushi (Sushi conveyor) — `features/sushi`
**Cảm giác chơi (giống web):** các **miếng sushi trôi trên băng chuyền**, mỗi miếng mang một **token (từ/chữ)**. **Chộp đúng token theo thứ tự** để **ghép thành câu hoàn chỉnh**. Chộp sai thứ tự → nhấp nháy/−tim; để trôi mất token đúng → hụt.

**Luật chi tiết:**
- 1 màn = 1 câu (từ `example`), tách thành **tokens đúng thứ tự**.
- Băng chuyền thả token (đúng + nhiễu) trôi qua liên tục. Chộp **đúng token kế tiếp** → ghép vào câu + điểm; chộp sai → combo reset / −tim.
- Ghép đủ câu → thắng màn; sang câu tiếp theo.

**Dữ liệu cần thêm:** **tách `example` thành `exampleTokens` (mảng theo thứ tự)**. Tiếng Nhật không có dấu cách → đây là phần **khó nhất**:
- *MVP:* nhập sẵn `exampleTokens` khi tạo/ import từ (thủ công), hoặc tách theo khoảng trắng nếu câu đã có.
- *Về sau:* tích hợp bộ tách từ (tokenizer) tiếng Nhật.
- Token nhiễu lấy từ câu khác.

**SRS:** tuỳ chọn (có thể gắn với từ chính của câu).

**Model thuần:** `tokenizeExample(example)` *hoặc* đọc `exampleTokens`, `buildConveyor(tokens, distractors, seed)`, `applyCatch(state, token)`, `isSentenceComplete(state)`.

**Edge:** thẻ không có `example` → loại khỏi game; câu quá dài → giới hạn số token/màn.

---

## B2. Điền từ vào câu (Cloze / ngữ pháp) — `features/cloze`
**Cảm giác chơi (giống web, 文の達人):** hiện **một câu có chỗ trống**, chọn **trợ từ / thể động từ / mẫu ngữ pháp** đúng ngữ cảnh **như đề JLPT**. Sau khi trả lời → **giải thích điểm ngữ pháp**.

**Luật chi tiết:**
- Mỗi câu có 1 chỗ trống + 4 lựa chọn (1 đúng + 3 nhiễu). Đúng → +điểm; hiện `grammarPoint` để học.
- Lọc theo cấp JLPT; có thể gom thành bộ đề.

**Dữ liệu cần thêm — thực thể mới `sentence` (map 1-1 FE↔BE):**
`id`, `text` (có placeholder chỗ trống), `answer`, `distractors[]`, `grammarPoint`, `jlptLevel`, và `updatedAt`/`deletedAt` nếu đưa vào local-first + sync.
→ Đây là **rào cản chính của Nhóm B**: cần nguồn/ngân hàng câu (tự soạn hoặc import có kiểm license).

**SRS:** có thể làm **SRS riêng cho ngữ pháp** (tách khỏi SRS từ vựng) — cân nhắc sau.

**Model thuần:** `makeClozeQuestion(sentence, seed)`, `pickGrammarDistractors(...)`, `checkCloze(answer, choice)`.

**Edge:** thiếu ngân hàng câu → game không chạy; cần kiểm tính đúng ngữ pháp của dữ liệu nguồn.

---

## Tiêu chí hoàn thành mỗi game (DoD)
- [ ] Lõi luật chơi/chấm điểm là **hàm thuần + unit test** (Vitest), tất định theo `seed`.
- [ ] UI đủ 4 trạng thái (loading/empty/error/success), responsive mobile→desktop, tôn trọng `prefers-reduced-motion`.
- [ ] Game "ghi SRS": cập nhật `srs*` **và** `updatedAt` để đồng bộ nhận ra.
- [ ] Lưu phiên vào `quiz_sessions`/`quiz_attempts` với `mode` tương ứng.
- [ ] Thông báo rõ khi bộ từ thiếu field bắt buộc (vd `sinoVietnamese` cho Phi Tiêu, `reading` cho Shiritori, `example` cho Sushi).
- [ ] Không đụng tới dữ liệu/khối Giai đoạn 3 đang freeze.
