# Plan cào UI — Trang chủ / Từ điển JLPT (`/vi/`)

> **URL:** `https://jlpt.jpdictionary.com/vi/`
> **Mục tiêu đối chiếu:** bố cục trang chủ + luồng **tra cứu/duyệt theo cấp JLPT** để tham chiếu cho tính năng ở [`docs/dictionary-lookup.md`](../dictionary-lookup.md).
> **Nguyên tắc:** xem [`README.md`](./README.md) — chỉ tham chiếu UI/UX, không lấy nội dung/dữ liệu riêng.

---

## 1. Đặc điểm trang (từ khảo sát shell HTML)

- **SPA Vite + React** → phải render bằng Playwright, chờ `#root` có con rồi mới thu thập.
- Trong shell có **JSON‑LD** gợi ý cấu trúc điều hướng (dùng để lập bản đồ section, KHÔNG phải nội dung):
  - `SearchAction`: `https://jlpt.jpdictionary.com/vocabulary?q={search_term_string}` → trang chủ có **ô tìm kiếm** dẫn tới trang từ vựng.
  - `ItemList` các mục học: **Từ vựng** (`/vocabulary`), **Ngữ pháp** (`/grammar`), **Luyện Nghe** (`/listening`), **Luyện Đọc** (`/reading`), **Thi Thử** (`/mock-test`).
  - `Course` "miễn phí" → có khả năng có khối CTA/giá trị "miễn phí".
- `theme-color = #2563eb` (xanh dương) → gợi ý màu nhấn chủ đạo (cần xác nhận lại bằng computed style ở M3).

---

## 2. Giả thuyết các khối UI cần kiểm kê (xác nhận khi render)

| Khối | Cần ghi nhận | Vì sao hữu ích cho Kanji Nest |
|---|---|---|
| **Header / Nav** | logo, menu chính (các mục ItemList ở trên), chuyển ngôn ngữ vi/en, nút đăng nhập | Đối chiếu IA điều hướng tổng |
| **Ô tìm kiếm (hero)** | vị trí, placeholder, gợi ý khi gõ (autocomplete?), submit → route nào | Thiết kế ô tra cứu của `dictionary-lookup` |
| **Bộ lọc cấp JLPT (N5–N1)** | dạng tab/pill/chip, trạng thái active | Tái dùng ý tưởng `ScopeBar` (JLPT) |
| **Thẻ mục học (cards)** | lưới card: icon, tiêu đề, mô tả, link | Bố cục trang "trung tâm học" |
| **Khối "theo Ngày"/chủ đề** | cách chia bài học theo ngày/chủ đề | Ý tưởng duyệt dần theo lộ trình |
| **Footer** | nhóm link, mạng xã hội, bản quyền | Hoàn thiện khung layout |
| **4 trạng thái UI** | loading/empty/error khi tìm không ra | Chuẩn 4 trạng thái của dự án |

> Ghi nhận bằng **mô tả + ảnh**, không chép text nội dung từ/định nghĩa.

---

## 3. Kịch bản thu thập (Playwright)

1. `goto('/vi/')`, `waitUntil: 'networkidle'`, chờ `#root` có con.
2. **Screenshot full-page** ở 3 viewport: 390 / 768 / 1280.
3. `extract/dom-outline` + `extract/components` cho trạng thái tĩnh.
4. `extract/tokens`: đọc `getComputedStyle` của header/nút/nền + liệt kê CSS custom properties (`--*`) ở `:root` → bảng màu/font/spacing/bo góc.
5. **Kịch bản tương tác** (chụp trước–sau):
   - Gõ 1 từ khoá vô hại vào ô tìm kiếm → xem có **autocomplete/gợi ý** không, submit dẫn tới route gì.
   - Bấm lần lượt **tab cấp JLPT (N5→N1)** → ghi cách danh sách/section đổi.
   - Thu nhỏ về mobile → kiểm tra **menu hamburger** & cách bố cục co lại.
6. `report`: tổng hợp **inventory component + token + sơ đồ tương tác** (tự viết).

**Giới hạn:** chỉ ở trang công khai; **không** gọi `/api/`, không vào `/dashboard`, `/auth`, `/upgrade` (bị `robots.txt` cấm). Nếu muốn đối chiếu sâu trang `/vocabulary`, `/grammar`… thì đó là **route công khai** nhưng vẫn chỉ lấy *bố cục*, không lấy nội dung.

---

## 4. Đầu ra & đối chiếu

- Artifact thô (ảnh/DOM/json) → `tools/scraper/output/homepage/` (**gitignore**).
- Phần tổng hợp (tự viết) → thêm mục **"Đối chiếu UI trang chủ jpdictionary"** vào `docs/dictionary-lookup.md`, nêu: điểm nên học (bố cục tìm kiếm, tab JLPT, lưới card) và điểm Kanji Nest làm khác (local-first, dữ liệu mở, nguồn & license riêng).

## 5. Tiêu chí hoàn thành (trang này)

- Có ảnh 3 viewport + DOM outline + bảng token sơ bộ.
- Có bản đồ tương tác: search, tab JLPT, menu mobile.
- Không chạm path bị cấm; không commit nội dung bản quyền.
