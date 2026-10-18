# Kế hoạch cào UI tham chiếu từ jpdictionary (overview)

> **Mục đích:** thu thập **cấu trúc & hành vi UI/UX** của 2 trang jpdictionary để **đối chiếu** khi tự thiết kế giao diện Kanji Nest. Chỉ dùng làm **tham chiếu UI/UX nội bộ** — tái hiện *ý tưởng bố cục / luồng tương tác*, **KHÔNG** sao chép nội dung, đồ hoạ, hay **dữ liệu từ điển riêng** của họ (nhất quán với `docs/dictionary-lookup.md`, `docs/shadowing-youtube.md` và nguyên tắc dùng nguồn dữ liệu mở của dự án).
> **Trạng thái:** BẢN KẾ HOẠCH — chưa code. Giữ **TS 6.0.3**, Node 24.14.1; scraper là **công cụ phụ trợ** (nằm trong `tools/`), KHÔNG đụng `frontend/` hay `backend/`, KHÔNG đụng Giai đoạn 3 (Kanji) đang freeze.
> **2 trang mục tiêu:**
> - Trang chủ / từ điển JLPT: `https://jlpt.jpdictionary.com/vi/` → chi tiết ở [`homepage-vi.md`](./homepage-vi.md)
> - Trang shadowing YouTube: `https://jlpt.jpdictionary.com/vi/shadowing-youtube` → chi tiết ở [`shadowing-youtube.md`](./shadowing-youtube.md)

---

## 0. Phát hiện kỹ thuật quan trọng (đã khảo sát 11/2026)

| Hạng mục | Kết quả khảo sát | Hệ quả cho việc cào |
|---|---|---|
| Loại ứng dụng | **SPA Vite + React** — HTML trả về chỉ là *shell* với `<div id="root"></div>` + `<script type="module" src="/assets/index-*.js">` | **Bắt buộc dùng headless browser (Playwright)**: phải chạy JS & chờ hydrate xong mới có UI thật. `fetch` tĩnh + Cheerio **không** lấy được nội dung động. |
| 2 URL trả HTML giống hệt | Server trả cùng một shell cho mọi route; điều hướng do React Router làm phía client | Phải **điều hướng trong trình duyệt** (goto URL rồi chờ render), không suy ra UI từ HTML thô. |
| Dữ liệu có sẵn trong shell | JSON‑LD (`ItemList`, `Course`, `SearchAction` `/vocabulary?q=...`), thẻ meta/OG, `theme-color #2563eb` | Dùng để **lập bản đồ route/section** & gợi ý **design token** ban đầu — không phải để lấy nội dung. |
| `robots.txt` | `Allow: /` cho mọi bot; **Disallow** `/api/`, `/vi|en/auth`, `/login`, `/register`, `/dashboard`, `/admin`, `/upgrade`, `/teacher-application`; `Crawl-delay 1–2s`; có `sitemap.xml` | **Chỉ cào trang công khai, không chạm các path bị cấm & `/api/`**; đặt delay ≥ 1.5s giữa các request. |
| Hạ tầng | Cloudflare + LiteSpeed, HSTS, `x-frame-options: SAMEORIGIN` | Không nhúng iframe trang của họ; dùng trình duyệt thật tránh bị chặn bot; tần suất thấp. |

---

## 1. Phạm vi "cào UI" (cào cái gì)

Chỉ thu thập **tín hiệu thiết kế**, không thu thập nội dung bản quyền:

1. **Ảnh chụp màn hình** full-page ở nhiều viewport (mobile 390px, tablet 768px, desktop 1280px) để làm *mood board* đối chiếu.
2. **Bản phác cây DOM rút gọn** (tag + vai trò ARIA + nhóm class lặp lại) — hiểu *bố cục*, không lưu text nội dung.
3. **Kiểm kê component** lặp lại: header/nav, ô tìm kiếm, thẻ (card), tab cấp JLPT, danh sách, player, điều khiển… (đếm & mô tả, không trích nội dung).
4. **Design token suy ra** từ computed style / CSS variables: bảng màu, font chữ, cỡ chữ, spacing, bo góc, bóng đổ.
5. **Bản đồ tương tác**: hành động → thay đổi state (vd bấm tab JLPT → đổi danh sách; bấm dòng phụ đề → tua video). Mô tả bằng lời, kèm ảnh trước/sau.

> ❌ **Không** lưu/commit: định nghĩa từ, câu ví dụ, bài nghe, đề thi, phụ đề, hình ảnh thương hiệu của họ — đó là dữ liệu/nội dung riêng. Kanji Nest dùng **nguồn mở** (JMdict, Tatoeba…) và nội dung tự biên.

---

## 2. Kiến trúc công cụ scraper (đề xuất)

Đặt tách biệt trong `tools/scraper/` (dự án phụ trợ, có `package.json` riêng, **không** gộp vào FE/BE):

```
tools/scraper/
  README.md
  package.json            # playwright, robots-parser (devDependencies riêng)
  playwright.config.ts
  src/
    config.ts             # danh sách URL mục tiêu, viewports, delay, userAgent
    robots.ts             # tải & kiểm tra allow/deny theo robots.txt trước mỗi URL
    crawl.ts              # điều phối: goto → chờ hydrate (#root có con) → thu thập
    extract/
      dom-outline.ts      # cây DOM rút gọn (tag + role + class pattern), bỏ text dài
      components.ts       # kiểm kê component lặp lại
      tokens.ts           # trích màu/font/spacing từ getComputedStyle + CSS vars
      interactions.ts     # kịch bản click/tab/search → chụp state thay đổi
    report.ts             # xuất JSON + markdown tóm tắt (do mình viết lại)
  output/                 # (GITIGNORE) ảnh + html + json thô — chỉ ở máy local
```

**Công nghệ:** **Playwright (TypeScript)** — hợp với stack TS của dự án, chạy JS/chờ hydrate, chụp màn hình, đọc computed style. Giữ **TS 6.0.3**. Không thêm lib vào FE/BE.

**Chờ hydrate đúng cách:** `page.goto(url, { waitUntil: 'networkidle' })` rồi `page.waitForFunction(() => document.querySelector('#root')?.children.length > 0)` (vì shell có `#root` rỗng lúc đầu).

---

## 3. Tuân thủ pháp lý & lịch sự (BẮT BUỘC)

- **Chỉ tham chiếu UI/UX nội bộ**, không tái phân phối nội dung/đồ hoạ/dữ liệu của họ. Repo công khai + MIT → **tuyệt đối không** commit artifact thô (ảnh/html/nội dung của họ): thêm `tools/scraper/output/` vào `.gitignore`.
- **Tôn trọng `robots.txt`:** KHÔNG chạm `/api/` và các path `Disallow`. Chỉ cào 2 URL công khai trong plan (+ route công khai cần đối chiếu).
- **Lịch sự:** `Crawl-delay ≥ 1.5s`, chạy **thủ công**, tần suất thấp, 1 luồng; User-Agent trung thực kèm cách liên hệ.
- **Không** vượt tường đăng nhập, không giả mạo phiên, không tải tài nguyên trả phí.
- Chỉ **phần phân tích do mình viết lại** (bằng lời của mình) mới được đưa vào `docs/`.

---

## 4. Lộ trình (milestones)

| Mốc | Nội dung | Đầu ra |
|---|---|---|
| **M0** | Scaffold `tools/scraper/`, cài Playwright, viết `robots.ts` kiểm tra path | Chạy được "hello crawl" + từ chối path bị cấm |
| **M1** | Render + screenshot full-page 2 trang ở 3 viewport | Ảnh trong `output/` (local) |
| **M2** | Trích DOM outline + kiểm kê component | `output/*.json` |
| **M3** | Trích design token (màu/font/spacing) | Bảng token sơ bộ |
| **M4** | Kịch bản tương tác (homepage: search/tab JLPT; shadowing: bấm dòng → tua) | Ảnh/clip trước–sau |
| **M5** | Tổng hợp **báo cáo đối chiếu** (tự viết) → bổ sung mục "Đối chiếu UI" vào `docs/dictionary-lookup.md` & `docs/shadowing-youtube.md` | Phân tích trong `docs/` |

---

## 5. Tiêu chí hoàn thành

- Có ảnh + DOM outline + token sơ bộ cho **cả 2 trang** ở 3 viewport.
- Có **bản đồ component & tương tác** mô tả bằng lời (không chứa nội dung bản quyền).
- `tools/scraper/output/` **đã gitignore**; chỉ phân tích tự viết nằm trong `docs/`.
- Không có request nào chạm path bị `robots.txt` cấm; có delay lịch sự.
