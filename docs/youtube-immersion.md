# Kế hoạch tính năng: Xem video YouTube kèm phụ đề tiếng Nhật (Immersion)

> **Nguồn cảm hứng:** app **Mira/Miraa** (học qua "comprehensible input"): dán link YouTube → nhúng video → hiện **phụ đề tiếng Nhật đồng bộ phía dưới**, chạm từ để tra nghĩa & lưu. Chỉ tái hiện **ý tưởng tính năng**, dùng dữ liệu/đồ hoạ của chính Kanji Nest.
> **Trạng thái:** BẢN KẾ HOẠCH — chưa code. Giữ TS 6.0.3, FSD, local-first; KHÔNG đụng Giai đoạn 3 (Kanji) đang freeze.
> **Liên quan:** `docs/architecture/frontend.md`, `docs/architecture/backend.md`.

---

## 1. Mục tiêu & luồng người dùng

1. Người dùng **dán link YouTube** (watch / youtu.be / shorts / embed).
2. App **tách video ID** → **nhúng video** bằng YouTube IFrame Player API.
3. **Phụ đề tiếng Nhật hiện ngay dưới video**, tự **đồng bộ theo thời gian phát**.
4. (Nâng cao) **Chạm vào từ** trong phụ đề → tra nghĩa → **lưu vào thư viện từ vựng** (tái dùng Quick Add + folders + SRS hiện có).

---

## 2. Kiến trúc kỹ thuật (FSD)

**Feature slice đề xuất:** `features/video-immersion/`
- `model/` — tách URL→videoId, trạng thái player, **đồng bộ cue theo thời gian**, parse phụ đề (.srt/.vtt → mảng cue).
- `ui/` — khung player, **bảng phụ đề** phía dưới, ô dán link, (sau) lớp tra từ.

**Nhúng video (YouTube IFrame Player API):**
- Nạp script `https://www.youtube.com/iframe_api`, khởi tạo `YT.Player` trong `useEffect`.
- **Poll `getCurrentTime()` ~200ms** (setInterval/`requestAnimationFrame`) khi đang phát → cập nhật `currentTime` → tìm cue khớp để hiển thị.
- Giữ **dependency nhẹ** (dùng API gốc, giống phong cách `idb.ts` không thêm lib); `react-youtube` chỉ là tuỳ chọn.

> ⚠️ **Giới hạn cốt lõi:** IFrame Player API **KHÔNG trả text phụ đề** cho trang nhúng (giới hạn iframe cross-origin). Vì vậy muốn hiện phụ đề *bên dưới* + chạm-tra-từ thì **phải có transcript riêng** (mục 3), rồi tự đồng bộ theo `getCurrentTime()`.

**Đồng bộ cue:** mảng cue `{ start, end, text }` sắp theo `start`; mỗi tick dùng tìm kiếm nhị phân theo `currentTime` để lấy cue hiện hành. Hàm thuần, dễ unit test.

---

## 3. Nguồn phụ đề tiếng Nhật — phần khó & nhạy cảm nhất

| # | Cách lấy | Hợp lệ? | Ghi chú |
|---|---|---|---|
| **1. Người dùng tự dán / tải lên `.srt`/`.vtt`** (hoặc dán transcript) | ✅ An toàn | **Khuyến nghị cho MVP** — không scraping, không CORS, không ToS risk. Chỉ cần viết parser .srt/.vtt. |
| **2. YouTube Data API v3 — endpoint captions** | ⚠️ Hạn chế | Cần OAuth và **chỉ tải được phụ đề video mình sở hữu**. Không dùng cho video public bất kỳ. |
| **3. Dịch vụ transcript bên thứ ba (có giấy phép)** | ⚠️ Tuỳ nhà cung cấp | REST trả JSON (text + start + duration). Thường trả phí, gọi **qua backend**. |
| **4. Tự fetch endpoint nội bộ `timedtext` / `youtube-transcript-api` / `yt-dlp`** | ❌ Vi phạm ToS | YouTube cấm trích xuất tự động; dễ **bị chặn IP**; trình duyệt bị **CORS**. **KHÔNG khuyến nghị.** |

**CORS:** trình duyệt (local-first) **không** gọi trực tiếp YouTube để lấy transcript được → nếu chọn cách 2/3 phải thêm **route proxy ở backend** (`/api/transcripts?...`) trong Fastify.

**Khuyến nghị:** MVP đi theo **cách 1** (người dùng cung cấp phụ đề) — đơn giản, hợp lệ, chạy được ngay cả offline. Các cách tự lấy phụ đề để sau và chỉ dùng nguồn hợp lệ.

---

## 4. Mô hình dữ liệu mới (đề xuất)

- **`videoLesson`**: `id`, `youtubeId`, `title`, `lang` (vd `ja`), `createdAt`, (local-first → `updatedAt`/`deletedAt` nếu đồng bộ).
- **`caption` / `cue`**: `lessonId`, `start`, `end`, `text`, (tuỳ chọn) `furigana`, `translation`.
- Cache transcript vào **IndexedDB** (thêm object store mới trong `shared/lib/idb.ts`) để xem lại không cần tải lại. Map 1-1 FE↔BE nếu đưa lên sync.

---

## 5. Tích hợp học tập (giống Mira)

- **Chạm từ trong phụ đề** → tra nghĩa → **Quick Add vào `vocabularies`** (tái dùng chống trùng `word`+`reading`, gắn `folderIds`, vào hàng đợi SRS).
- **Furigana tự động** (hiện kana trên kanji): cần bộ **tách từ tiếng Nhật** (vd `kuromoji.js`) — **nặng** (từ điển vài MB) → xem là **tuỳ chọn giai đoạn sau**, cân nhắc chạy ở backend hoặc tải lười.
- **Bản dịch**: hiển thị nghĩa câu/ từ; nếu dùng dịch máy thì qua backend + nhà cung cấp có khoá môi trường (không hardcode).

---

## 6. Hiển thị phụ đề dưới video
- Dòng phụ đề **hiện tại** cỡ chữ lớn, giữ chỗ cố định (không nhảy layout khi đổi dòng).
- Tuỳ chọn: hiện dòng trước/sau mờ hơn; **tap để tua** tới cue; nút lặp lại cue (shadowing).
- Responsive mobile→desktop; tôn trọng `prefers-reduced-motion`.

---

## 7. Ràng buộc & rủi ro
- **ToS YouTube:** **nhúng** qua IFrame API là hợp lệ; **cào/tải phụ đề** tự động thì **không**. Tránh cách (4).
- **Bản quyền nội dung:** video & phụ đề thuộc chủ sở hữu — chỉ nhúng/hiển thị, không tải video về, không tái phát hành.
- **CORS:** cần backend proxy nếu tự lấy transcript (cách 2/3).
- **Mobile/WebView (Capacitor):** IFrame API trên WebView cần kiểm thử (autoplay, phát nền, chính sách cookie) — xem thêm `docs/architecture/cross-platform.md`.
- **Furigana/tokenizer:** `kuromoji.js` nặng → ảnh hưởng bundle; cân nhắc kỹ.

---

## 8. Non-goals
- ❌ Không scraping/tải phụ đề YouTube bằng cách vi phạm ToS.
- ❌ Không tải/lưu trữ file video.
- ❌ Không mở Giai đoạn 3 (nhận diện Kanji) đang freeze.
- ❌ Không hardcode khoá API dịch/transcript (chỉ qua biến môi trường).

---

## 9. Lộ trình đề xuất
1. **Phase 1 — MVP (hợp lệ, chạy ngay):** dán link → nhúng video → **người dùng dán/tải `.srt`/`.vtt`** → parser cue → hiện phụ đề đồng bộ dưới video. (Không cần backend.)
2. **Phase 2 — Học tập:** chạm từ → tra nghĩa → Quick Add vào `vocabularies` (vào SRS).
3. **Phase 3 — Tiện ích:** lưu "video lesson" + cache cue vào IndexedDB; lặp cue (shadowing); (tuỳ chọn) furigana tự động.
4. **Phase 4 — Tự lấy transcript (nếu cần):** backend proxy + **nguồn hợp lệ** (Data API cho video sở hữu, hoặc dịch vụ transcript có giấy phép).

---

## 10. Tiêu chí hoàn thành (DoD)
- [ ] Dán link các dạng (watch/youtu.be/shorts/embed) → tách đúng videoId; link sai báo lỗi rõ.
- [ ] Video nhúng chạy; phụ đề dưới video **đồng bộ** đúng theo thời gian phát.
- [ ] Parser `.srt`/`.vtt` + hàm chọn cue là **hàm thuần có unit test** (Vitest).
- [ ] UI đủ 4 trạng thái, responsive, tôn trọng reduced-motion.
- [ ] (Phase 2) lưu từ vào `vocabularies` đúng chuẩn (chống trùng, set `updatedAt` để sync).
- [ ] Không dùng cách lấy phụ đề vi phạm ToS; không hardcode secret.
