# Kế hoạch tính năng: Shadowing với YouTube

> **Nguồn cảm hứng:** trang **shadowing-youtube** của jpdictionary (`jlpt.jpdictionary.com/vi/shadowing-youtube`) — chỉ tái hiện **ý tưởng tính năng** (bấm dòng phụ đề tua video, lặp đoạn, chỉnh tốc độ, dictation, ghi âm giọng mình), dùng UI/dữ liệu của chính Kanji Nest.
> **Quan hệ với tài liệu khác:** đây là bản **mở rộng** của `docs/youtube-immersion.md`. Phần **nhúng player, nguồn phụ đề, parser .srt/.vtt, đồng bộ cue, tra từ → lưu** đã nằm ở doc đó; doc này tập trung vào **lớp luyện shadowing** đặt lên trên.
> **Trạng thái:** BẢN KẾ HOẠCH — chưa code. Giữ **TS 6.0.3**, **FSD**, **local-first**; **KHÔNG đụng Giai đoạn 3 (Kanji) đang freeze**.

---

## 0. Lưu ý phạm vi sản phẩm (cần chốt)

PRD §4 liệt kê **"luyện nghe"** và **TTS GPU (VOICEVOX)** là **non-goal**. Shadowing là một dạng luyện nói/nghe → **có mâu thuẫn cần quyết định sản phẩm**. Khuyến nghị:
- Coi Shadowing là **tính năng tuỳ chọn của GĐ2**, cùng nhóm với `youtube-immersion.md` (vốn đã được lập kế hoạch) → nếu immersion vào scope thì shadowing là bước kế tiếp tự nhiên.
- **KHÔNG dùng TTS GPU/VOICEVOX.** Âm thanh để shadow là **audio gốc của video YouTube**; so sánh phát âm dùng **ghi âm mic của người dùng** (MediaRecorder) → **không vi phạm** non-goal VOICEVOX.

---

## 1. Mục tiêu & luồng người dùng

Shadowing = nghe người bản xứ nói và **nhại lại ngay, trễ ~1 nhịp**, để luyện nhịp điệu/ngữ điệu. Luồng:

1. Mở một "bài" video (tái dùng `videoLesson` từ `youtube-immersion.md`): dán link YouTube + nạp phụ đề tiếng Nhật.
2. Phụ đề hiện dưới video, **đồng bộ theo thời gian phát**; dòng đang phát được **tô sáng**.
3. **Bấm 1 dòng phụ đề** → player **tua đúng mốc thời gian** dòng đó.
4. Chọn chế độ **Shadowing**: nghe → (tuỳ chọn) **ghi âm** đọc theo → nghe lại/so sánh → **sang dòng kế**.
5. Công cụ hỗ trợ mỗi dòng: **lặp đoạn A–B**, **chỉnh tốc độ** (0.5–1×), **ẩn/hiện phụ đề** (dictation), **furigana**, **chạm từ để tra & lưu**.

---

## 2. Chức năng shadowing cụ thể (lớp đặt lên immersion)

| # | Chức năng | Mô tả | Kỹ thuật |
|---|---|---|---|
| S1 | **Bấm dòng → tua** | Click dòng phụ đề, video nhảy tới `cue.start` | `player.seekTo(start, true)` |
| S2 | **Tô sáng dòng đang phát (karaoke)** | Dòng khớp `currentTime` được highlight; auto-scroll | tái dùng tìm cue nhị phân ở immersion §2 |
| S3 | **Lặp đoạn A–B / lặp 1 dòng** | Lặp lại một dòng/đoạn N lần để nhại | poll `getCurrentTime()`; chạm `end` → `seekTo(start)` |
| S4 | **Chỉnh tốc độ phát** | 0.5× / 0.75× / 1× (nghe chậm để bắt âm) | `player.setPlaybackRate(rate)` (YouTube giữ cao độ) |
| S5 | **Dictation (ẩn phụ đề)** | Ẩn text, nghe rồi tự gõ/nói, bấm để lộ đáp án | state ẩn/hiện per-cue (giống Focus Recall) |
| S6 | **Furigana bật/tắt** | Hiện kana trên kanji của dòng | tokenizer (kuromoji, dynamic import) — xem immersion §5 |
| S7 | **Ghi âm giọng + nghe lại** | Ghi mic khi đọc theo, phát lại để tự so | **MediaRecorder API**, lưu blob ở IndexedDB |
| S8 | **"Record → Next line"** | Ghi xong tự chuyển dòng kế (phím tắt `R`) | tái dùng cơ chế phím tắt đã có (PROGRESS: F3/F4 phím tắt) |
| S9 | **Chạm từ → tra → lưu** | Tap từ trong phụ đề → tra nghĩa → Quick Add vào `vocabularies` + SRS | tái dùng `features/dictionary` (xem `docs/dictionary-lookup.md`) |

> **MVP tối thiểu:** S1 + S2 + S3 + S4 (điều khiển video theo dòng). **Nâng cao:** S5–S9.

---

## 3. Kiến trúc kỹ thuật (FSD)

**Feature slice đề xuất:** `features/shadowing/` — đặt **trên** `features/video-immersion/` (immersion lo player + phụ đề; shadowing lo luyện tập).
- `model/`
  - `loop.ts` — trạng thái lặp A–B (`{ start, end, repeatCount, remaining }`), hàm thuần `shouldLoopBack(currentTime, loop)`.
  - `recorder.ts` — bọc **MediaRecorder** (start/stop/dispose), trả blob + thời lượng; tách khỏi UI để test được phần logic trạng thái.
  - `line-progress.ts` — tiến độ từng dòng (`new/listened/recorded/mastered`), hàm thuần.
  - `keymap.ts` — phím tắt (Space phát/dừng, `R` ghi âm, `←/→` dòng trước/sau, `L` lặp).
- `ui/` — thanh điều khiển shadowing (tốc độ, lặp, ghi âm), danh sách phụ đề tương tác, nút ghi âm + sóng âm đơn giản (canvas), lớp dictation.

**Nhúng & đồng bộ:** tái dùng nguyên YouTube IFrame Player API + đồng bộ cue của `youtube-immersion.md` (nạp `iframe_api`, poll `getCurrentTime()` ~200ms). **Giữ dependency nhẹ**, không thêm lib nặng.

**Ghi âm (MediaRecorder):** xin quyền mic (`getUserMedia`), ghi `audio/webm`; lưu blob vào IndexedDB; cho phát lại bằng `URL.createObjectURL`. Không gửi server (riêng tư, nhẹ). Dọn `objectURL` khi unmount (tránh rò bộ nhớ).

> ⚠️ **Giới hạn kế thừa từ immersion §2:** IFrame API **không trả text phụ đề** cho trang nhúng → shadowing **bắt buộc có transcript riêng** (mục 4). Không có transcript thì chỉ chạy được điều khiển video thô, không có S2/S5/S9.

---

## 4. Nguồn phụ đề (kế thừa `youtube-immersion.md` §3)

| Cách | Hợp lệ? | Dùng cho |
|---|---|---|
| **Người dùng tự dán/tải `.srt`/`.vtt`** | ✅ An toàn | **Khuyến nghị MVP** — chỉ cần parser .srt/.vtt |
| YouTube Data API v3 (captions) | ⚠️ Chỉ video mình sở hữu + OAuth | Hạn chế |
| Dịch vụ transcript có giấy phép | ⚠️ Tuỳ nhà cung cấp, gọi **qua backend proxy** | Khi cần mở rộng |
| Tự fetch `timedtext`/`yt-dlp`/scraping | ❌ Vi phạm ToS + CORS | **KHÔNG dùng** |

**CORS:** client không gọi trực tiếp YouTube lấy transcript → nếu dùng cách có giấy phép phải thêm **route proxy backend** (`/api/transcripts?...`) trong Fastify (Layered). MVP đi theo **phụ đề do người dùng cung cấp**.

---

## 5. Mô hình dữ liệu mới (đề xuất)

- Tái dùng **`videoLesson`** + **`caption`/`cue`** từ `youtube-immersion.md` §4 (cache vào IndexedDB qua `shared/lib/idb.ts`).
- **`shadowingProgress`** (local-first, có thể sync): `lessonId`, `cueIndex`, `status` (`new|listened|recorded|mastered`), `playCount`, `updatedAt`, `deletedAt` (bám nguyên tắc bất biến AGENTS.md §7).
- **`recording`** (chỉ local, **không** sync vì là blob nặng + riêng tư): `id`, `lessonId`, `cueIndex`, `blob`, `durationMs`, `createdAt`. Lưu ở object store riêng trong IndexedDB; có hạn mức/dọn dẹp để không phình dung lượng.

---

## 6. Tích hợp học tập (vòng khép kín)

- **Chạm từ trong phụ đề → tra → Quick Add** vào `vocabularies` (chống trùng `word`+`reading`, gắn folder, vào SRS) — dùng chung `features/dictionary` (`docs/dictionary-lookup.md`).
- **Furigana** dùng chung tokenizer với text-analysis của từ điển (một lib, nạp động).
- **Thống kê:** số dòng đã shadow/ghi âm theo bài → có thể ghi vào `quiz_sessions` với `mode = 'shadowing'` (cột `mode` vốn đã mở rộng được) để có lịch sử.

---

## 7. Phân giai đoạn & ưu tiên

| Ưu tiên | Hạng mục | Phụ thuộc |
|---|---|---|
| **P0** | S1 bấm-dòng-tua · S2 tô sáng · S3 lặp A–B · S4 tốc độ | `youtube-immersion.md` (player + transcript) |
| **P1** | S5 dictation · S6 furigana · S8 Record→Next (phím tắt) | tokenizer (S6) |
| **P2** | S7 ghi âm + nghe lại + sóng âm | quyền mic, MediaRecorder, IndexedDB blob |
| **P3** | S9 chạm-từ-tra-lưu | `features/dictionary` |

---

## 8. Rủi ro & lưu ý pháp lý

- **ToS YouTube:** chỉ **nhúng** qua IFrame API và dùng **phụ đề do người dùng cung cấp**; **không** scraping/`timedtext`/tải audio về. Không tải/sao lưu video.
- **Quyền riêng tư:** bản ghi âm giọng người dùng lưu **cục bộ**, không gửi server; nêu rõ trong UI + cho xoá.
- **Non-goal (PRD §4):** không TTS GPU/VOICEVOX; cần quyết định đưa "luyện nghe/nói" vào scope (mục 0).
- **Hiệu năng/bộ nhớ:** blob ghi âm có thể lớn → đặt hạn mức, dọn `objectURL`, cho người dùng quản lý dung lượng.
- **Giới hạn transcript:** không có phụ đề thì mất phần lớn giá trị (S2/S5/S9) → nhấn mạnh bước nạp phụ đề trong onboarding.

---

## 9. Việc cần chốt trước khi code

1. **Phạm vi sản phẩm:** đồng ý đưa shadowing (luyện nghe/nói) vào GĐ2 dù PRD §4 ghi non-goal?
2. **Nguồn phụ đề MVP:** xác nhận đi theo "người dùng tự cung cấp .srt/.vtt" (không scraping)?
3. **Ghi âm:** có làm S7 (MediaRecorder) ở GĐ2 không, hay hoãn? Chính sách lưu/xoá bản ghi?
4. **Thứ tự triển khai:** làm `youtube-immersion.md` (player + transcript) trước, rồi chồng lớp shadowing lên.
