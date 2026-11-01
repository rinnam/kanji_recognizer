# Kế hoạch tính năng: Từ điển tra cứu JLPT (Dictionary Lookup)

> **Nguồn cảm hứng:** trang chủ **jpdictionary** (`jlpt.jpdictionary.com/vi/`) — chỉ tái hiện **ý tưởng tính năng** (tra từ/Kanji/ngữ pháp theo cấp JLPT, nhận dạng thể chia, phân tích đoạn văn, danh sách "đã lưu", quiz). KHÔNG sao chép nội dung/đồ hoạ/dữ liệu riêng của họ — Kanji Nest dùng **nguồn dữ liệu mở** và UI của chính mình.
> **Trạng thái:** BẢN KẾ HOẠCH — chưa code. Giữ **TS 6.0.3**, **FSD**, **local-first + sync**, test tất định. **KHÔNG mở Giai đoạn 3 (nhận diện Kanji) đang freeze** — các phần dính Kanji/handwriting/OCR được đánh dấu hoãn.
> **Liên quan:** `docs/roadmap.md` (GĐ2 & GĐ3), `docs/architecture/frontend.md`, `docs/architecture/backend.md`, `docs/reference/kotobase-feature-audit.md`, `CONTEXT.md`.

---

## 1. Mục tiêu & luồng người dùng

Biến Kanji Nest từ "quản lý vốn từ của tôi" thành có thêm **từ điển tra cứu** để người học N5–N1 tra nghĩa nhanh và **lưu vào thư viện** (tái dùng Quick Add + folder + SRS đã có).

**Luồng chính:**
1. Người dùng gõ từ khoá (kana / kanji / romaji / nghĩa tiếng Việt) vào ô tra cứu.
2. App trả kết quả: từ vựng khớp (có `reading`, nghĩa, cấp JLPT, câu ví dụ), gợi ý thể gốc nếu gõ dạng chia.
3. Mỗi kết quả có nút **"Lưu"** → mở Quick Add (đã chống trùng `word`+`reading`) để thêm vào `vocabularies` + chọn folder + vào hàng đợi SRS.
4. (Mở rộng) Duyệt theo cấp JLPT → danh sách bài học theo "Ngày"; đánh dấu sao; làm quiz/mini-game trên tập đã lưu.

**Nguyên tắc:** tra cứu là tính năng **đọc** (read); mọi hành động "ghi" đi qua đúng đường Quick Add/SRS hiện có để không phá vỡ local-first + merge.

---

## 2. Phân rã chức năng (theo độ sẵn sàng & ràng buộc freeze)

### 🟢 Nhóm A — Hợp với GĐ2, không đụng freeze

| Chức năng | Mô tả | Field/Nguồn | Ghi chú |
|---|---|---|---|
| **Tra từ vựng** | Tìm theo kana/kanji/romaji/nghĩa; hiển thị `reading`, nghĩa, cấp JLPT, ví dụ | JMdict + Tatoeba | Lõi của tính năng |
| **Lọc & duyệt theo cấp JLPT** | Danh sách N5→N1, chia theo "Ngày"/chủ đề để học dần | JMdict + nhãn JLPT | Tái dùng `ScopeBar` (JLPT) đã có |
| **Nhận dạng thể chia (inflection)** | Gõ `食べません`/`走った` → trả về thể gốc `食べる`/`走る` | Bộ deinflection (bảng quy tắc thuần) | Hàm thuần, dễ unit test |
| **Phân tích đoạn văn (text analysis)** | Dán đoạn tiếng Nhật → tách từ → tra từng từ | Tokenizer (kuromoji) + JMdict | Tokenizer cũng dùng cho furigana (xem `youtube-immersion.md` §5) |
| **Danh sách "đã lưu"/đánh sao (starred)** | Đánh dấu từ để ôn sau, không cần thêm hẳn vào folder | Tái dùng `tags[]` hoặc folder "Đã lưu" | Local-first + sync như vocab |
| **Quiz/mini-game trên kết quả tra** | Luyện tập ngay từ tập vừa tra/lưu | — | Tái dùng `docs/mini-games.md` & `features/quiz` |

### 🟡 Nhóm B — Cần dữ liệu bổ sung (GĐ2 cuối / GĐ3 sớm)

| Chức năng | Vì sao khó hơn |
|---|---|
| **Tra ngữ pháp theo JLPT** | Cần **ngân hàng mẫu ngữ pháp** (cấu trúc, nghĩa, ví dụ, cấp) — nguồn mở hạn chế, nhiều phần phải tự biên soạn → thêm bảng/collection mới. |
| **Phát âm / pitch accent** | Pitch accent cần dataset riêng; TTS GPU (VOICEVOX) đang là **non-goal** (PRD §4). Nếu làm chỉ nên dùng audio có giấy phép hoặc Web Speech API client. |

### 🔴 Nhóm C — DÍNH FREEZE (Giai đoạn 3), chỉ làm sau khi GĐ3 kích hoạt

| Chức năng | Lý do hoãn |
|---|---|
| **Tra Kanji chi tiết** (on/kun, số nét, bộ thủ, thứ tự nét KanjiVG) | Thuộc entity `kanji` + bảng `kanji_entries` **đang freeze** (roadmap GĐ3). |
| **Nhập liệu thông minh: viết tay / OCR ảnh / giọng nói để tra Kanji** | Trùng phạm vi `kanji-recognition` + `recognition_results` **đang freeze**. |

> ⚠️ **Quy tắc:** phần Kanji/handwriting/OCR được **thiết kế sẵn trên giấy** ở doc này nhưng **không code** cho tới khi GĐ3 được mở (xem roadmap). Phần từ vựng/ngữ pháp/phân tích đoạn văn **không** bị freeze.

---

## 3. Nguồn dữ liệu & giấy phép (phần nhạy cảm nhất)

| Nguồn | Dùng cho | Giấy phép (cần xác minh lại trước khi phát hành) |
|---|---|---|
| **JMdict / JMnedict** | Từ vựng, nghĩa đa ngôn ngữ | EDRDG — **CC BY-SA** (phải ghi công + chia sẻ tương tự) |
| **KANJIDIC2** | Dữ liệu Kanji (GĐ3) | EDRDG — **CC BY-SA** |
| **KanjiVG** | Thứ tự nét (GĐ3) | **CC BY-SA 3.0** |
| **Tatoeba / Tanaka corpus** | Câu ví dụ | **CC BY** (Tatoeba) |
| **Nhãn JLPT, mẫu ngữ pháp** | Phân cấp N5–N1 | JLPT không công bố danh sách chính thức → dùng danh sách cộng đồng/tự biên, **ghi rõ "tham khảo"** |

**Lưu ý triển khai:**
- **Ghi công + giữ điều khoản license** (CC BY-SA ⇒ nếu phân phối lại dữ liệu phải mở theo cùng giấy phép). Thêm mục **"Nguồn dữ liệu & giấy phép"** vào UI (About) và `LICENSE`/README.
- Tải/convert JMdict (XML/JSON) qua một **adapter** → chuẩn hoá về schema nội bộ (giống tinh thần "adapter" ở roadmap GĐ3). Không phụ thuộc cấu trúc gốc của nguồn.
- **Offline-first vs server:** dataset lớn (JMdict ~vài chục MB). Hai lựa chọn:
  - **(a) Bundle rút gọn** theo cấp JLPT vào IndexedDB để tra offline (hợp local-first) — khuyến nghị cho MVP tra từ vựng.
  - **(b) Tra qua backend** (`/api/dictionary/search`) khi cần full dataset — thêm route ở Fastify (Layered: routes → services → repositories). Dùng khi dataset quá lớn để nhúng.

---

## 4. Kiến trúc kỹ thuật (FSD + Layered)

**Frontend (feature mapping 1-1 FE↔BE):**
- `entities/dictionary-entry/` — model kết quả tra cứu (`DictionaryEntry`), tách khỏi `LocalVocabulary` (từ điển là dữ liệu tham chiếu, không phải vốn từ của người dùng).
- `features/dictionary/`
  - `model/` — chuẩn hoá truy vấn, **deinflection** (bảng quy tắc thuần), ghép kết quả JMdict + ví dụ, phân trang; hàm thuần để unit test.
  - `ui/` — ô tìm kiếm (có **debounce**, tái dùng `useDebouncedValue` đã có), danh sách kết quả, chi tiết 1 mục, nút **"Lưu → Quick Add"**.
- `features/text-analysis/` (Nhóm B) — dán đoạn văn → tokenizer (kuromoji, **dynamic import** để không phình bundle) → danh sách từ có thể tra/lưu.

**Backend (nếu chọn 3.b — tra qua server):**
- `routes/dictionary.route.ts` → `controllers` → `services/dictionary.service.ts` → `repositories/dictionary.repo.ts`.
- Endpoint gợi ý: `GET /api/dictionary/search?q=&level=&limit=&offset=` (phân trang server, hợp NFR Overview).
- Dữ liệu từ điển là **read-only, dùng chung** → **không** gắn `owner_id`, **không** vào luồng sync 2 chiều.

**Hiệu năng (NFR):** debounce search; dynamic import tokenizer; phân trang/giới hạn kết quả; cache truy vấn gần đây trong IndexedDB.

---

## 5. Mô hình dữ liệu mới (đề xuất)

- **`DictionaryEntry`** (read-only, không sync): `id`, `word`, `readings[]`, `senses[]` (`gloss` theo ngôn ngữ, `partOfSpeech`), `jlptLevel?`, `examples[]` (`ja`, `vi`).
- **`GrammarPoint`** (Nhóm B): `id`, `title`, `structure`, `meaning`, `examples[]`, `jlptLevel` — bảng/collection mới (giống "ngân hàng câu" ở `mini-games.md` Nhóm B).
- **Kanji (GĐ3 — freeze):** tái dùng `kanji_entries` đã thiết kế sẵn trong schema; **không tạo mới, không sửa** cho tới khi mở GĐ3.
- **Starred:** không cần bảng mới — dùng `tags[]` (vd tag `starred`) hoặc một folder hệ thống "Đã lưu"; theo đó tự động được local-first + sync.

> Nguyên tắc bất biến (AGENTS.md §7): mọi dữ liệu người dùng (từ đã lưu) vẫn map 1-1 về `LocalVocabulary`, có `updatedAt`/`deletedAt`. Dữ liệu từ điển tham chiếu thì tách riêng, không đụng merge.

---

## 6. Tích hợp học tập (vòng khép kín)

- **Tra → Lưu:** mỗi `DictionaryEntry` có nút lưu → điền sẵn Quick Add (`word`, `reading`, `meaning`, `example`, `jlptLevel`) → chống trùng (`word`+`reading`) → vào folder + hàng đợi SRS.
- **Phân tích đoạn văn → lưu hàng loạt:** chọn nhiều từ trong đoạn → thêm một lượt (tái dùng `ImportModal`/`branch-dedupe` đã có trong `features/vocabulary`).
- **Ôn ngay:** từ danh sách "đã lưu"/kết quả tra → mở flashcard/quiz/mini-game trên đúng tập đó (tái dùng `ScopeBar`).

---

## 7. Phân giai đoạn & ưu tiên

| Ưu tiên | Hạng mục | Giai đoạn |
|---|---|---|
| **P0** | Tra từ vựng (JMdict) + "Lưu → Quick Add" + lọc JLPT | GĐ2 |
| **P1** | Nhận dạng thể chia (deinflection) + câu ví dụ (Tatoeba) + danh sách "đã lưu/sao" | GĐ2 |
| **P2** | Phân tích đoạn văn (tokenizer) + lưu hàng loạt | GĐ2 (cuối) |
| **P3** | Tra ngữ pháp theo JLPT (cần biên soạn dữ liệu) | GĐ2→GĐ3 |
| **🔒 Hoãn** | Tra Kanji chi tiết + viết tay/OCR/giọng nói | **GĐ3 (freeze)** |

---

## 8. Rủi ro & Non-goals

**Rủi ro:**
- **Giấy phép dữ liệu** (CC BY-SA đòi ghi công + share-alike) — xử lý ở mục 3; xác minh lại trước khi phát hành (repo đang MIT — xem ADR 0004).
- **Kích thước dataset** ảnh hưởng offline/bundle — chọn (a) bundle rút gọn theo JLPT hoặc (b) tra qua server.
- **Chất lượng deinflection/tokenizer** ảnh hưởng độ chính xác — giữ hàm thuần + bộ test tất định.
- **Nhãn JLPT không chính thức** — ghi rõ "tham khảo".

**Non-goals (bám PRD §4):** không làm TTS GPU/VOICEVOX; phát âm/pitch accent chỉ cân nhắc nếu có nguồn hợp lệ; không mở phần Kanji/handwriting/OCR khi GĐ3 còn freeze.

---

## 9. Việc cần chốt trước khi code

1. **Nguồn & cách phân phối dữ liệu:** JMdict bundle offline (a) hay tra qua server (b)? Phạm vi cấp JLPT đưa vào MVP?
2. **Giấy phép:** chấp nhận CC BY-SA và cách ghi công trong app/README?
3. **Ngữ pháp:** có làm ngân hàng ngữ pháp trong GĐ2 không (cần công sức biên soạn)?
4. **Xác nhận freeze:** đồng ý hoãn toàn bộ phần Kanji/handwriting/OCR tới GĐ3?
