# Kế hoạch chuyển Kanji Nest sang Đa nền tảng (Cross-platform)

> **Trạng thái:** BẢN KẾ HOẠCH — chưa triển khai code. Nhánh làm việc: `feature/cross-platform`.
> **Tư tưởng chủ đạo:** *viết một lần, chạy mọi nơi* bằng cách tái dùng tối đa web app React hiện có; mọi khác biệt nền tảng được giấu sau **adapter**. Backend Fastify + PostgreSQL **giữ nguyên** và dùng chung cho mọi nền tảng qua HTTP.
> **Liên quan:** `docs/roadmap.md` (đã ghi "Android/iOS (Capacitor) là lựa chọn tương lai"), `docs/architecture/frontend.md`, `docs/adr/0003-fsd-layered.md`.

---

## 1. Mục tiêu & phạm vi

**Mục tiêu:** từ một web app, đưa Kanji Nest chạy được trên nhiều nền tảng mà **không viết lại logic/UI**:

| Nền tảng | Công nghệ đề xuất | Mức độ ưu tiên |
|---|---|---|
| **Web (PWA)** — cài được, chạy offline | `vite-plugin-pwa` (Workbox) | GĐ1 — nền tảng gốc, bắt buộc |
| **Desktop** (Windows/macOS/Linux) | **Tauri** (nhẹ) hoặc Electron | GĐ2 |
| **Mobile** (Android/iOS) | **Capacitor** (bọc web build) | GĐ3 — đúng định hướng roadmap |

**Nằm trong phạm vi:** PWA, vỏ Desktop, vỏ Mobile, tách tầng lưu trữ sau adapter, cấu hình API/CORS, pipeline build cho từng vỏ.

**Ngoài phạm vi (non-goals):**
- ❌ **Không** viết lại sang React Native (sẽ phải bỏ IndexedDB + toàn bộ UI DOM — chi phí rất lớn, không tương xứng).
- ❌ **Không** động vào Giai đoạn 3 "Nhận diện Kanji" đang bị **freeze** (feature `kanji-recognition`, bảng `kanji_entries`, `recognition_results`).
- ❌ **Không** nâng TypeScript khỏi 6.0.3 (giữ theo `docs/adr/0002-version-lock.md`).

---

## 2. Hiện trạng (đã khảo sát trực tiếp trong code)

### 2.1 Điểm thuận lợi (vì sao chuyển đổi KHÔNG khó)
- **UI là web chuẩn 100%:** `frontend/package.json` chỉ có `react`, `react-dom`, `react-router-dom`, `vite` — **không có dependency gắn chặt trình duyệt riêng**, nên chạy được trong mọi WebView.
- **Lưu trữ đã cô lập:** toàn bộ IndexedDB nằm trong **một** file `frontend/src/shared/lib/idb.ts`, lại được bọc sau `shared/db/DbProvider.tsx` + hook `useDb`. Mọi feature truy cập dữ liệu qua một cổng duy nhất.
- **Backend đã tách rời qua HTTP:** `frontend/src/shared/api/http.ts` dùng `fetch`, base URL cấu hình được bằng `VITE_API_BASE_URL` (`shared/config/env.ts`). Backend Fastify (`backend/src/server.ts`) đăng ký mọi route dưới prefix `/api` → client nào cũng gọi được.
- Kiến trúc FSD (frontend) + Layered (backend) đã tách lớp rõ, giảm "blast radius" khi refactor.

### 2.2 Điểm ghép nối cần xử lý (các "khó khăn" thật)
| # | Điểm ghép nối | Vị trí trong code | Ảnh hưởng |
|---|---|---|---|
| 1 | **`DbContext` giữ thẳng `IDBDatabase`** (API trình duyệt) | `shared/db/context.ts`, `DbProvider.tsx` | WebView (Tauri/Capacitor) vẫn chạy được; nhưng muốn bền vững/thuần native thì cần tách sau interface |
| 2 | **API base mặc định `/api` + proxy chỉ có khi dev** | `shared/config/env.ts`, `frontend/vite.config.ts` | App đóng gói không có proxy → phải trỏ URL tuyệt đối qua `VITE_API_BASE_URL` |
| 3 | **Backend chưa bật CORS** (không có `@fastify/cors`) | `backend/package.json`, `server.ts` | Client khác origin (desktop/mobile) sẽ bị chặn → cần thêm CORS |
| 4 | **Router dùng history trình duyệt** | `shared/.../router.tsx` | Trong vỏ desktop/mobile thường cần Hash router hoặc chỉnh `base` |
| 5 | **Backend bind IPv4 `127.0.0.1`** | `vite.config.ts` (ghi chú), `server.ts` | Mobile thiết bị thật không gọi được `localhost` → cần host LAN/URL thật |

> **Ghi chú quan trọng (đừng phóng đại việc phải làm):** Tauri và Capacitor đều chạy **WebView**, nên **IndexedDB vẫn hoạt động** ở cả hai. Việc tách tầng lưu trữ sang SQLite native (mục 5.1) là **nâng cấp chất lượng/độ bền cho mobile**, **không phải điều kiện bắt buộc** để chạy được.

---

## 3. Chiến lược: "Web-core + nhiều vỏ (shell)"

```
                   ┌─────────────────────────────┐
                   │   Core dùng chung (web)     │
                   │  React UI · FSD · logic SRS │
                   │  sync · quiz · entities     │
                   └──────────────┬──────────────┘
            ┌────────────────┬────┴────┬────────────────┐
            ▼                ▼         ▼                 ▼
        PWA (web)        Desktop     Mobile          (tương lai)
       Service Worker   Tauri/Electron Capacitor    React Native ❌
            │                │         │
            └────────────────┴─────────┴──── HTTP ───► Backend Fastify + PostgreSQL (giữ nguyên)
```

Mỗi "vỏ" chỉ là lớp đóng gói mỏng, **nạp cùng một bản build web**. Khác biệt nền tảng (lưu trữ, camera, file…) đặt sau **adapter** để core không cần biết đang chạy ở đâu.

---

## 4. Cấu trúc thư mục chuẩn (target)

Chuyển sang **monorepo dùng npm workspaces** (npm ≥ 11 đã có sẵn). Cấu trúc chuẩn đề xuất:

```
kanji_recognizer/
├─ apps/
│  ├─ web/              # Vite + React + PWA  (từ frontend/ hiện tại)
│  ├─ desktop/          # Vỏ Tauri (hoặc Electron) — nạp build của apps/web
│  ├─ mobile/           # Vỏ Capacitor (android/ ios/) — nạp build của apps/web
│  └─ backend/          # Fastify + PostgreSQL (từ backend/ hiện tại, gần như nguyên vẹn)
│
├─ packages/            # Code dùng chung giữa các app (TS thuần, không phụ thuộc nền tảng)
│  ├─ core/             #   Domain: SRS (SM-2), merge/sync (LWW + tombstone), quiz, entities, types
│  ├─ ui/               #   React component tái dùng (từ shared/ui hiện tại)
│  └─ storage/          #   Interface KanjiStore + adapter: web (IndexedDB) / native (SQLite)
│
├─ docs/                # giữ nguyên (adr, architecture, context, database, reference…)
├─ .postman/ · postman/ # giữ nguyên
├─ package.json         # "workspaces": ["apps/*", "packages/*"]
├─ AGENTS.md · CLAUDE.md · CONTEXT.md · PROGRESS.md · LICENSE
└─ tools/
```

**Quy ước:**
- `apps/*` = thứ **chạy/đóng gói được** (có pipeline build riêng). `packages/*` = thư viện **được import** bởi apps, không tự chạy.
- `apps/desktop` và `apps/mobile` **không chứa UI** — chúng chỉ cấu hình vỏ + nạp output của `apps/web`.
- Giữ nguyên quy ước **đặt tên feature khớp 1-1 FE↔BE** (AGENTS.md §4).

> Vì đây là thay đổi lớn, **không làm "big-bang"**. Lộ trình ở mục 6 cho phép tiến từng bước: giữ `frontend/` + `backend/` chạy bình thường, thêm vỏ trước, tách `packages/*` sau.

---

## 5. Các tầng cần tách / điều chỉnh

### 5.1 Tầng lưu trữ — quan trọng nhất (`packages/storage`)
- **Định nghĩa interface** `KanjiStore` gom đúng các thao tác đang có trong `idb.ts`: `get`, `getAll`, `getAllByIndex`, `count`, `put`, `bulkPut`, `delete`, `clear`…
- **Adapter 1 — Web (IndexedDB):** chuyển code `idb.ts` hiện tại vào, triển khai `KanjiStore`. **Không đổi logic**, chỉ gói lại.
- **Adapter 2 — Native (tương lai):** SQLite qua `@capacitor-community/sqlite` (mobile) hoặc `tauri-plugin-sql` (desktop) — chỉ làm khi cần độ bền cao hơn WebView.
- **Đổi `DbContext`** từ kiểu `IDBDatabase` → kiểu `KanjiStore`. Vì mọi feature đã đi qua `useDb`, phạm vi sửa gọn.
- **Ràng buộc bất biến (AGENTS.md §7):** interface `LocalFolder` / `LocalVocabulary` là nguồn sự thật tầng client — **không đổi tên field**; adapter phải map 1-1.

### 5.2 API base URL + CORS
- **Frontend:** đặt `VITE_API_BASE_URL` tuyệt đối cho bản build đóng gói (ví dụ `https://api.kanjinest...`); dev vẫn dùng proxy `/api` như hiện tại — cơ chế đã sẵn trong `env.ts`.
- **Backend:** thêm `@fastify/cors`, cho phép origin của các vỏ (desktop/mobile dùng scheme riêng như `tauri://`, `capacitor://`, `http://localhost`). Chỉ mở origin cần thiết.

### 5.3 Routing
- Trong vỏ desktop/mobile, app nạp từ `file://`/scheme nội bộ → cân nhắc **HashRouter** hoặc chỉnh `base` để deep-link và refresh không vỡ. Web/PWA giữ history router như hiện tại.

### 5.4 Khả năng thiết bị (camera — Giai đoạn 3, đang FREEZE)
- Phần vẽ tay (canvas) chạy ở mọi nền tảng. Chụp ảnh/camera cần plugin + quyền riêng từng OS (Capacitor Camera trên mobile).
- **Chưa làm bây giờ.** Chỉ ghi lại định hướng: khi mở GĐ3, bọc camera sau một adapter `CaptureSource` trong `packages/core` để UI không phụ thuộc nền tảng.

### 5.5 Build & đóng gói
- **PWA:** thêm `vite-plugin-pwa` (manifest + service worker). App vốn local-first nên offline là tự nhiên.
- **Desktop (Tauri):** `apps/desktop` trỏ `frontendDist` tới build của `apps/web`; đóng gói `.exe`/`.dmg`/AppImage.
- **Mobile (Capacitor):** `webDir` trỏ tới build của `apps/web`; sinh project `android/`, `ios/`; cấu hình `server.url` khi dev trên thiết bị thật (dùng IP LAN, không `localhost`).

---

## 6. Lộ trình theo giai đoạn (an toàn, tăng dần)

| GĐ | Việc chính | Kết quả | Rủi ro |
|---|---|---|---|
| **0 — Chuẩn bị** | Thêm `@fastify/cors`; chuẩn hoá đọc `VITE_API_BASE_URL`; (tuỳ chọn) dựng khung monorepo workspaces | Backend sẵn sàng cho client khác origin | Thấp |
| **1 — PWA** | `vite-plugin-pwa` + manifest + icon; kiểm thử cài đặt & offline | App web cài được, chạy offline | Thấp |
| **2 — Desktop** | Thêm `apps/desktop` (Tauri) bọc web build; chỉnh router nếu cần | Bản cài desktop | TB |
| **3 — Mobile** | Thêm `apps/mobile` (Capacitor); cấu hình CORS/scheme; test thiết bị thật | APK/IPA chạy được | TB |
| **4 — Củng cố** | Tách `packages/core` / `ui` / `storage`; (tuỳ chọn) adapter SQLite native cho mobile | Code chia sẻ sạch, lưu trữ bền hơn | TB |

> Có thể dừng ở bất kỳ giai đoạn nào mà web app vẫn hoạt động bình thường.

---

## 7. Rủi ro & cách giảm thiểu
- **Restructure monorepo làm gãy import/test (FE+BE).** → Làm trên nhánh này; chạy `typecheck` + `test` (Vitest) sau mỗi bước; tách `packages/*` **sau cùng**.
- **IndexedDB bị OS thu hồi trên mobile WebView khi thiếu dung lượng.** → Dùng adapter SQLite native ở GĐ4; đồng bộ server đã có nên dữ liệu không mất hẳn.
- **CORS/scheme sai gây lỗi gọi API trong vỏ.** → Khai báo rõ origin cho từng vỏ; test health-check (`/health`) ngay khi dựng vỏ.
- **Logic merge/tombstone (ADR 0001) nhạy cảm.** → Không đụng vào khi di chuyển; chỉ "move" không "modify"; giữ bộ test sync.

---

## 8. Ràng buộc bất biến phải tôn trọng (AGENTS.md §7)
1. `LocalFolder` / `LocalVocabulary` là nguồn sự thật tầng client — không đổi tên field; adapter lưu trữ phải map 1-1.
2. Mọi bảng đồng bộ giữ `updated_at` (merge LWW) + `deleted_at` (tombstone).
3. Tài liệu tiếng Việt, UTF-8, không BOM.
4. Secret chỉ qua biến môi trường; repo public — không hardcode chuỗi kết nối.

---

## 9. Tiêu chí hoàn thành (Definition of Done)
- [ ] Web vẫn chạy đầy đủ; `typecheck`, `lint`, `test` (FE+BE) đều xanh.
- [ ] PWA cài được và dùng được offline.
- [ ] Có ít nhất **một** vỏ native (desktop **hoặc** mobile) chạy được, gọi backend thành công (healthy `/health`).
- [ ] Tầng lưu trữ truy cập qua interface `KanjiStore` (không còn `IDBDatabase` lộ ra ngoài `packages/storage`).
- [ ] Giai đoạn 3 (nhận diện Kanji) vẫn **freeze**, không bị đụng tới.
- [ ] Cập nhật `docs/roadmap.md` + bản đồ tài liệu trong `AGENTS.md` trỏ tới file này.
