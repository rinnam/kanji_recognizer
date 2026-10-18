# Plan cào UI — Trang Shadowing YouTube (`/vi/shadowing-youtube`)

> **URL:** `https://jlpt.jpdictionary.com/vi/shadowing-youtube`
> **Mục tiêu đối chiếu:** bố cục **player + bảng phụ đề + thanh điều khiển luyện shadowing** để tham chiếu cho tính năng ở [`docs/shadowing-youtube.md`](../shadowing-youtube.md) (và `docs/youtube-immersion.md`).
> **Nguyên tắc:** xem [`README.md`](./README.md) — chỉ tham chiếu UI/UX; **không** lấy phụ đề, audio, hay nội dung bài học của họ.

---

## 1. Đặc điểm trang (từ khảo sát shell HTML)

- Cùng là **SPA Vite + React**: HTML trả về **giống hệt** trang chủ (cùng shell, cùng `#root` rỗng). ⟹ Nội dung trang shadowing **chỉ xuất hiện sau khi JS render** → **bắt buộc Playwright**, không suy ra gì được từ HTML thô.
- Không có dữ liệu JSON‑LD riêng cho trang này trong shell → mọi cấu trúc phải lấy **sau hydrate**.

---

## 2. Giả thuyết các khối UI cần kiểm kê (xác nhận khi render)

Khớp với chức năng S1–S9 ở `docs/shadowing-youtube.md`:

| Khối UI | Cần ghi nhận | Map tới chức năng |
|---|---|---|
| **Ô dán link / chọn video** | input URL YouTube, nút nạp, danh sách video mẫu | luồng mở "bài" video |
| **Khung player YouTube** | tỉ lệ, vị trí so với phụ đề, overlay điều khiển | nhúng IFrame Player |
| **Bảng phụ đề (transcript)** | danh sách dòng, dòng đang phát được **tô sáng**, auto-scroll | S2 karaoke highlight |
| **Bấm dòng → tua** | click 1 dòng có tua video không | S1 seekTo |
| **Thanh điều khiển luyện** | nút lặp A–B, chọn tốc độ (0.5/0.75/1×), ẩn/hiện phụ đề, furigana | S3/S4/S5/S6 |
| **Ghi âm giọng** | nút record, trạng thái đang ghi, nghe lại | S7/S8 (MediaRecorder) |
| **Chạm từ → tra/lưu** | tap từ trong phụ đề mở popup tra | S9 (nối Quick Add) |
| **4 trạng thái** | khi chưa có video / lỗi link / đang tải phụ đề | chuẩn 4 trạng thái dự án |

> Ghi nhận **bố cục & tương tác**, KHÔNG lưu text phụ đề/nội dung video.

---

## 3. Kịch bản thu thập (Playwright)

1. `goto('/vi/shadowing-youtube')`, `waitUntil: 'networkidle'`, chờ `#root` có con **và** phần tử đặc trưng của trang (vd input link / vùng player) xuất hiện.
2. **Screenshot full-page** 3 viewport: 390 / 768 / 1280 (bố cục player + transcript thay đổi mạnh theo bề rộng — chú ý mobile xếp dọc vs desktop 2 cột).
3. `extract/dom-outline` + `extract/components`: nhận diện khối player, danh sách phụ đề, cụm nút điều khiển.
4. `extract/tokens`: màu dòng-đang-phát (highlight), màu nút active, font phụ đề, spacing giữa các dòng.
5. **Kịch bản tương tác** (chụp/ghi trước–sau — nếu cần có thể nạp **một video public vô hại** chỉ để quan sát UI, không lưu nội dung):
   - Bấm 1 dòng phụ đề → quan sát player có **tua** không, dòng có đổi highlight không.
   - Bật **lặp A–B**, đổi **tốc độ**, bật/tắt **ẩn phụ đề (dictation)**, bật **furigana** → ghi cách UI phản hồi.
   - Thử nút **ghi âm** → chỉ ghi nhận **trạng thái UI** (không lưu âm thanh).
   - Mobile: kiểm tra player + transcript xếp dọc, điều khiển gọn lại thế nào.
6. `report`: sơ đồ bố cục (player ↔ transcript ↔ control bar) + bản đồ tương tác (tự viết).

**Giới hạn & lịch sự:** chỉ trang công khai này; không gọi `/api/`; delay ≥ 1.5s; chạy thủ công; không tải/lưu phụ đề hay audio của họ (vấn đề bản quyền + ToS YouTube — xem `docs/youtube-immersion.md` §3 về nguồn phụ đề hợp lệ).

---

## 4. Đầu ra & đối chiếu

- Artifact thô → `tools/scraper/output/shadowing-youtube/` (**gitignore**).
- Tổng hợp (tự viết) → thêm mục **"Đối chiếu UI shadowing jpdictionary"** vào `docs/shadowing-youtube.md`: cách họ sắp xếp player/transcript/control bar, mẫu highlight dòng đang phát, cụm điều khiển gọn — rồi nêu Kanji Nest sẽ tự dựng bằng FSD (`features/shadowing/` trên `features/video-immersion/`), audio = video gốc, so sánh phát âm = mic người dùng (không TTS/VOICEVOX).

## 5. Tiêu chí hoàn thành (trang này)

- Có ảnh 3 viewport + DOM outline + token (đặc biệt màu highlight dòng đang phát).
- Có bản đồ tương tác: bấm dòng→tua, lặp A–B, tốc độ, dictation, furigana, record (chỉ trạng thái UI).
- Không lưu phụ đề/audio/nội dung; không chạm path bị cấm.
