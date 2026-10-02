# PROGRESS — Kanji Nest (bàn giao giữa các phiên AI)

> File theo dõi tiến độ để đổi AI giữa chừng không mất ngữ cảnh. Cập nhật sau MỖI
> mục nhỏ: ghi file đã tạo/sửa, việc đang dở, bước tiếp theo. Tiếng Việt, UTF-8.

## Trạng thái tổng quan

| Mục | Nội dung | Trạng thái |
|---|---|---|
| 1 & 2 | Nền backend + CRUD folder/vocabulary (Quick Add chống trùng) | ✅ XONG |
| 3 | BE sync (pull/push, LWW theo `updated_at` + tombstone + delta, idempotent) | ✅ XONG |
| 4 | BE learning: SRS (SM-2 thuần) + quiz (chấm điểm) + endpoints + unit test | ✅ XONG (phiên này) |
| 5 | FE nền (FSD): entities/shared, IndexedDB local-first, api client, app shell (4 trạng thái + theme) | ✅ XONG (phiên này) |
| 6 | FE features: folder-tree ✅, vocabulary ✅, sync client (debounce 3.5s) ✅, flashcard 3 chế độ ✅, typing quiz ✅ | ✅ XONG F0–F5 + dọn placeholder + e2e BE (đang: làm lại UI F3/F4 theo bố cục tham khảo) |

## Lưu ý quan trọng (phát hiện trong phiên làm mục 4)

- **Toàn bộ `backend/src` trước đây CHƯA được commit** (git untracked) dù todo ghi mục 1–3 là XONG. Phiên này đã commit lại toàn bộ nền BE (mục 1–3) cùng với mục 4 trong một commit. Từ nay bám đúng quy tắc: commit sau mỗi mục.
- `backend/src/types/database.ts` **đã khớp** `docs/database/schema.sql` (đủ 8 bảng, có kiểu cho `quiz_sessions`/`quiz_attempts`). Typecheck 0 lỗi → KHÔNG cần sửa (khác với giả định "đang sửa dở").
- ✅ (ĐÃ XÓA) File rác ở gốc repo tên `showDialog({` (rỗng) đã được gỡ khỏi git bằng `git rm` + commit riêng. Working tree & index giờ sạch (xem mục "Dọn dẹp BE" bên dưới, BE-2).
- Đã xóa file rác rỗng `backend/typecheck.out.txt`.

## Mục 4 — BE learning (SRS SM-2 + Quiz) ✅

### Nguồn công thức (tuân theo tài liệu)
- SM-2: `docs/reference/kotobase-feature-audit.md` §2.
- Thang điểm (ĐÃ CHỐT — `CONTEXT.md`): **Again=0, Hard=3, Good=4, Easy=5**.
- `EF' = EF + (0.1 - (5-q)·(0.08 + (5-q)·0.02))`, **sàn 1.3**, mặc định **2.5** (áp cho MỌI lần đánh giá).
- `q<3` → `repetition=0, interval=1`. `q>=3` → `repetition+=1`, `interval = n==1?1 : n==2?6 : round(interval_trước × EF')`. `nextReview = now + interval ngày`.

### Files TẠO MỚI
- `backend/src/repositories/quiz.repo.ts` — `insertSession`, `insertAttempts`, `selectSessionById`, `listAttemptsBySession`.
- `backend/src/services/srs.service.ts` — **SM-2 THUẦN, không phụ thuộc DB**: `ratingToQuality`, `nextEaseFactor`, `review`, `isDue`.
- `backend/src/services/flashcard.service.ts` — điều phối: `listDueVocabularies`, `reviewVocabulary` (ghép `srs.service` + `vocabulary.repo`).
- `backend/src/services/quiz.service.ts` — chấm điểm THUẦN (`normalizeAnswer`, `gradeAnswer`, `scoreAttempts`) + điều phối `createSession`/`getSession` (transaction).
- `backend/src/utils/quiz-mappers.ts` — DTO quiz (snake_case → camelCase).
- `backend/src/validators/flashcard.ts`, `backend/src/validators/quiz.ts` — schema Zod.
- `backend/src/controllers/flashcard.controller.ts`, `backend/src/controllers/quiz.controller.ts`.
- `backend/src/routes/flashcard.routes.ts`, `backend/src/routes/quiz.routes.ts`.
- `backend/tests/unit/srs.service.test.ts` (15 test), `backend/tests/unit/quiz.service.test.ts` (6 test).

### Files SỬA
- `backend/src/repositories/vocabulary.repo.ts` — thêm `listDue(ownerId, now, limit)`: hàng đợi ôn (thẻ `srs_next_review <= now` HOẶC `NULL` = thẻ mới).
- `backend/src/server.ts` — đăng ký `flashcardRoutes` + `quizRoutes` (prefix `/api`).

### Endpoints (prefix `/api`)
- `GET  /api/flashcards/due?limit=` → danh sách thẻ tới hạn/thẻ mới để ôn.
- `POST /api/flashcards/:id/review` body `{ "rating": "again|hard|good|easy" }` → áp SM-2, lưu lịch ôn mới, trả về vocab đã cập nhật.
- `POST /api/quiz/sessions` body `{ mode?, startedAt?, finishedAt?, attempts:[{ vocabularyId?, prompt, userAnswer?, acceptedAnswers[] }] }` → chấm điểm + lưu phiên, trả 201.
- `GET  /api/quiz/sessions/:id` → phiên quiz kèm danh sách attempts.

### Kiểm chứng
- `npm run typecheck`: **0 lỗi**.
- `npm run test:unit`: **26/26 pass** (srs 15, quiz 6, sync 5).
- CHƯA chạy integration (cần DB thật). Logic ghi DB (flashcard review, quiz persist) chưa có integration test.

### Việc còn dở / cần theo dõi
- ✅ (ĐÃ XỬ LÝ) `quiz_attempts.vocabulary_id` là FK → trước đây gửi id không tồn tại ném FK-violation (map nhầm 500). Nay `quiz.service.createSession` **pre-check** mọi `vocabularyId` tham chiếu bằng `vocabRepo.selectExistingIds` (từ ĐANG SỐNG + cùng owner); thiếu → `ValidationFailedError` → **400** kèm danh sách id. Thêm **safety-net** bắt FK-violation (`23503`) phòng tình huống đua → cũng về 400. Logic thuần `missingVocabularyIds` + `isPgForeignKeyViolation` có unit test. Chi tiết ở mục dưới.
- Chưa có integration test cho flashcard/quiz (cần DB `kanji_nest`).

## Dọn dẹp BE sau mục 4 (phiên bàn giao hiện tại)

### BE-1 ✅ Map lỗi FK `quiz_attempts.vocabulary_id` → 400 (thông báo rõ) + test
- **Vấn đề:** POST `/api/quiz/sessions` với `attempts[].vocabularyId` không tồn tại (hoặc không thuộc owner / đã xóa mềm) → Postgres ném FK-violation (`23503`) → error handler map về **500** (sai; đây là lỗi input của client).
- **Cách xử lý (đặt ở tầng service, đúng Layered):**
  - `backend/src/utils/errors.ts` — thêm hằng `PG_FOREIGN_KEY_VIOLATION = '23503'` + helper `isPgForeignKeyViolation(err)` (mirror `isPgUniqueViolation`).
  - `backend/src/repositories/vocabulary.repo.ts` — thêm `selectExistingIds(ownerId, ids, trx?)`: trả tập con id ĐANG SỐNG của owner (lọc `deleted_at IS NULL`).
  - `backend/src/services/quiz.service.ts` — `createSession` **pre-check**: gom các `vocabularyId` tham chiếu (distinct, non-null) → `selectExistingIds` → nếu còn id thiếu thì ném `ValidationFailedError` (**400**) kèm danh sách id. Bọc transaction trong try/catch, bắt FK-violation (`23503`) làm **safety-net** cho tình huống đua (vocab bị xóa giữa chừng) → cũng 400. Thêm helper THUẦN `missingVocabularyIds(attempts, existingIds)`.
  - `ValidationFailedError` đã sẵn map → 400 ở `server.ts` (KHÔNG đổi error handler).
- **Chọn 400 (không phải 404):** endpoint tạo phiên quiz vẫn tồn tại; lỗi nằm ở *input* tham chiếu từ vựng không tồn tại → 400 hợp lý hơn 404.
- **Test (THUẦN, không cần DB):**
  - `backend/tests/unit/quiz.service.test.ts` — thêm suite `missingVocabularyIds` (2 test).
  - `backend/tests/unit/errors.test.ts` (MỚI) — `isPgForeignKeyViolation` / `isPgUniqueViolation` (3 test).
- **Kiểm chứng:** `npm run typecheck` 0 lỗi; `npm run test:unit` **31/31 pass** (srs 15, quiz 8, sync 5, errors 3).
- **Còn lại:** integration test (POST trả 400 thật) vẫn chờ DB `kanji_nest`.

### BE-2 ✅ Gỡ file rác tracked `showDialog({`
- File rỗng `showDialog({` ở gốc repo (tạo nhầm từ phiên trước, git theo dõi) đã được gỡ bằng `git rm -- "showDialog({"` và commit **riêng** (không trộn với BE-1).
- Sau khi gỡ: `git status` sạch (chỉ còn chênh lệch do các commit chưa push).

## Mục 5 — FE nền (FSD) ✅ (phiên bàn giao hiện tại)

Quyết định đã chốt với người dùng:
- **D1 (API base):** chọn cách đơn giản — đổi Vite proxy `/v1` → `/api` (`vite.config.ts`), api client dùng base `/api`. Đã grep toàn bộ FE: `/v1` chỉ xuất hiện ở `vite.config.ts` (đã sửa). BE giữ nguyên prefix `/api`. Có thể override bằng `VITE_API_BASE_URL`.
- **D2 (tên):** đổi `index.html` `<title>` + header app shell sang **"Kanji Nest"**.
- Tạo `frontend/tests/setup.ts` tối thiểu (đăng ký jest-dom cho Vitest) để `npm test` không lỗi.

Ràng buộc đã giữ: **KHÔNG thêm/sửa dependency** (IndexedDB + fetch thuần, chưa thêm router); FSD import một chiều (`shared` ← `entities` ← `app`); mỗi slice export qua `index.ts`.

### Files TẠO MỚI (frontend/src)
- `vite-env.d.ts` — ref `vite/client` + khai báo `VITE_API_BASE_URL`.
- `shared/config/` — `db.ts` (DB name/version/STORE), `env.ts` (`API_BASE_URL`), `index.ts`.
- `shared/lib/` — `idb.ts` (wrapper IndexedDB + `openKanjiDb`/migrate), `id.ts` (`newVocabId`/`newFolderId`), `time.ts`, `debounce.ts`, `index.ts`.
- `shared/api/` — `http.ts` (`request<T>` + `ApiError`), `dto.ts` (DTO khớp mapper BE), `flashcards.api.ts`, `quiz.api.ts`, `sync.api.ts`, `index.ts`.
- `shared/ui/` — `states/{LoadingState,EmptyState,ErrorState}.tsx`, `theme/{ThemeProvider.tsx,useTheme.ts,ThemeToggle.tsx,tokens.css}`, `index.ts`.
- `entities/folder/` — `model/{types.ts,folder.local.ts,index.ts}`, `api/folder.api.ts`, `index.ts`.
- `entities/vocabulary/` — `model/{types.ts,vocab.local.ts,index.ts}`, `api/vocabulary.api.ts`, `index.ts`.
- `entities/card/` — `model/{srs.ts,index.ts}` (SM-2 **MIRROR** `backend/src/services/srs.service.ts`), `index.ts`.
- `app/` — `App.tsx` (4 trạng thái + Shell), `AppProviders.tsx`, `index.ts`, `App.css`.
- `main.tsx` — entry (mount `<App/>` + import `tokens.css` & `App.css`).
- `tests/setup.ts`, `tests/unit/{id.test.ts,srs.test.ts}`.

### Files SỬA
- `vite.config.ts` — proxy `/v1` → `/api` (không rewrite vì BE đã ở `/api`).
- `index.html` — `<title>` → "Kanji Nest — Học tiếng Nhật".

### Lược đồ IndexedDB (`kanji-nest`, version 1)
- `folders` (keyPath `id`) — index: `by_parentId`, `by_updatedAt`, `by_deletedAt`.
- `vocabularies` (keyPath `id`) — index: `by_updatedAt`, `by_deletedAt`, `by_srsNextReview`, `by_folderIds` (multiEntry), `by_tags` (multiEntry).
- `meta` (keyPath `key`) — dành cho con trỏ sync `lastPulledAt` + version (dùng ở Mục 6).

### Entity ↔ API (khớp 1-1 BE)
- Local types alias DTO: `LocalFolder = FolderDto`, `LocalVocabulary = VocabularyDto` (camelCase, không `owner_id`, map 1-1 cột DB — AGENTS §7.1).
- api: folder/vocabulary CRUD ở `entities/*/api`; flashcards (due/review), quiz (sessions), sync (pull/push) ở `shared/api`.

### App shell — 4 trạng thái + theme
`loading` (mở IndexedDB) · `error` (mở DB lỗi + nút Thử lại) · `empty` (0 folder & 0 vocab) · `ready` (hiện số lượng). Theme sáng/tối qua `data-theme` + tokens, lưu `localStorage`, mặc định theo `prefers-color-scheme`.

### Kiểm chứng
- `npm run typecheck` (tsc -b): **0 lỗi**.
- `npm test` (vitest run): **6/6 pass** (id 2, srs 4). *Lưu ý: reporter mặc định của Vitest vẽ động trong pipe non-TTY nên log giữa chừng có thể hiện "0 passed"; chạy với `CI=true` cho kết quả cuối rõ ràng.*
- CHƯA chạy app thực tế (cần `npm run dev` + backend) — để người dùng kiểm.

## Bước tiếp theo → Mục 6 (FE features) — ĐANG CHỜ DUYỆT
Mục 5 đã xong và **DỪNG theo yêu cầu** để người dùng kiểm tra trước. Mục 6 (folder-tree, vocabulary Overview + Quick Add, flashcard 3 chế độ, typing quiz, sync client debounce 3.5s) **chỉ bắt đầu sau khi người dùng đồng ý**; làm từng feature một, typecheck sau mỗi feature.

## Lệnh nhanh
```bash
# Backend
cd backend && npm run typecheck && npm run test:unit
# Frontend
cd frontend && npm run typecheck && npm test && npm run dev
# Áp schema DB (đọc DATABASE_URL từ .env)
psql "$DATABASE_URL" -f docs/database/schema.sql
```

## Mục 6 — F0: Router + DbProvider + primitive shared/ui + khung pages/nav ✅

Quyết định đã chốt với người dùng: **#1** react-router-dom **7.18.4** (pin cứng, không caret); **#5** DbProvider (mở IndexedDB một lần) + primitive shared/ui (Button/Input/Field/Modal), KHÔNG thêm thư viện UI.

### Dependency
- `react-router-dom`: **7.18.4** (exact) — hỗ trợ React 19 (tối thiểu React 18).

### Files TẠO MỚI (frontend/src)
- `shared/db/` — `DbProvider.tsx` (mở IndexedDB 1 lần qua `openKanjiDb`, 3 trạng thái loading/error/ready, KHÔNG đóng kết nối), `useDb.ts` (hook lấy db, ném lỗi nếu dùng ngoài provider), `index.ts`.
- `shared/ui/primitives/` — `Button.tsx`, `Input.tsx`, `Field.tsx`, `Modal.tsx` (Esc/click nền để đóng, focus tiêu đề khi mở, aria-modal), `primitives.css` (dùng token --kn-*).
- `routes/` — `paths.ts` (`ROUTE_PATHS`, `ROUTES`, `NAV_ITEMS`), `index.ts`.
- `app/` — `AppLayout.tsx` (header + nav NavLink + ThemeToggle + <Outlet/> trong <Suspense/>), `router.tsx` (createBrowserRouter + React.lazy 3 trang + route 404), `NotFound.tsx`.
- `pages/Library|Study|Quiz/` — `*Page.tsx` + `index.ts` (placeholder; Library đọc số đếm folder/vocab qua useDb). TÁI DÙNG thư mục cũ, CHƯA xóa .gitkeep.
- `tests/unit/primitives.test.tsx` — smoke test Button + Field (2 test).

### Files SỬA
- `app/App.tsx` — rút gọn thành `<AppProviders><RouterProvider/></AppProviders>` (bỏ boot logic cũ; việc mở DB chuyển vào DbProvider).
- `app/AppProviders.tsx` — ThemeProvider (ngoài cùng) → DbProvider.
- `app/App.css` — thêm `.kn-nav*`, `.kn-boot`; `.kn-main` chuyển sang block.
- `shared/ui/index.ts` — import `primitives.css` + export 4 primitive.

### Định tuyến
- `/` → chuyển hướng `/library`. Các trang `/library` `/study` `/quiz` nạp lười (tách chunk). `*` → 404.

### Kiểm chứng
- `npm run typecheck`: **0 lỗi**.
- `npm test`: **8/8 pass** (id 2, srs 4, primitives 2).
- `npm run build`: **OK** — tách chunk Library/Study/Quiz (code-splitting).
- `npm run lint`: **sạch** (0 lỗi/cảnh báo).

### Audit placeholder (#4 — CHƯA xóa)
Tất cả thư mục scaffold dưới `frontend/src` (features/{auth,library,progress,srs,study}, pages/{Home,Login,Progress,SRS}, components/, hooks/, utils/, routes-cũ, services/, stores/, types/, constants/, layouts/, assets/) chỉ chứa `.gitkeep` và KHÔNG nơi nào import. Sẽ gom vào **1 commit dọn riêng** sau khi người dùng duyệt danh sách.

### Lưu ý
- `vocab.local.ts` / `folder.local.ts` khớp mẫu gitignore `*.local` của tooling nên công cụ AI không đọc trực tiếp được, nhưng ĐÃ được track trong git (commit Mục 5) và dùng bình thường qua public API của entity.

## Mục 6 — F1: features/folder-tree (CRUD cây + kéo–thả) ✅

Local-first: đọc/ghi IndexedDB qua entities/folder. **Xóa = tombstone** (đặt `deletedAt`), KHÔNG hard-delete (để xóa lan truyền khi sync, tránh server hồi sinh — ADR 0001). Khớp BE: sắp xếp `order asc (null cuối) → createdAt asc`; parent phải tồn tại; không tự làm cha; FE chặn thêm vòng (kéo vào con cháu). Folder con của folder bị xóa sẽ re-root lên gốc (BE không cascade).

### Files TẠO MỚI
- `features/folder-tree/model/tree.ts` — hàm THUẦN: `buildTree`, `siblingsOf`, `isAncestor`, `reparentAppend`, `reorderBefore`, `livingById`, `ORDER_STEP`.
- `features/folder-tree/model/useFolderTree.ts` — hook local-first: load/reload, create/rename/remove(tombstone), moveInto/moveBefore (áp patch order).
- `features/folder-tree/ui/FolderTree.tsx` — cây + ô thêm thư mục gốc + vùng thả "ra gốc" + nút "Tất cả từ".
- `features/folder-tree/ui/FolderTreeItem.tsx` — nút cây: chọn, kéo–thả, thêm con, đổi tên, xóa (Modal xác nhận), gập/mở.
- `features/folder-tree/ui/folder-tree.css`, `features/folder-tree/index.ts`.
- `pages/Library/LibraryPage.css` — layout 2 cột (sidebar cây + vùng chính).
- `tests/unit/folder-tree.test.ts` — 6 test THUẦN cho tree.ts.
- `shared/db/context.ts` — tách DbContext ra file riêng.

### Files SỬA
- `pages/Library/LibraryPage.tsx` — bố cục 2 cột, gắn <FolderTree/>, giữ state thư mục đang chọn (cho F2).
- `shared/db/DbProvider.tsx`, `shared/db/useDb.ts`, `shared/db/index.ts` — DbContext chuyển sang `context.ts`; **sửa lỗi lint `react-hooks/set-state-in-effect` lọt từ F0** (effect nạp DB không setState đồng bộ trước await, vẫn giữ nút Thử lại).

### Kéo–thả (HTML5 DnD, không thêm thư viện)
Thả vào MỘT folder → thành con (nối cuối). Thả vào "gạch trước" một mục → đặt ngay trước (đổi order). Thả vào vùng "ra gốc" → đưa về gốc. Chặn kéo vào chính nó/con cháu.

### Kiểm chứng
- `npm run typecheck`: **0 lỗi**.
- `npm test`: **14/14 pass** (id 2, srs 4, primitives 2, folder-tree 6).
- `npm run build`: **OK** (chunk Library ~8.7kB).
- `npm run lint`: **0 lỗi**; 4 cảnh báo react-refresh HMR vô hại (router.tsx 3 + ThemeProvider.tsx 1 — ThemeProvider có sẵn từ Mục 5).

## Mục 6 — F2: features/vocabulary (Overview + Quick Add) ✅

Local-first. **Quick Add chống trùng (word + reading**, reading null = rỗng) KHỚP BE (so khớp chính xác, có trim). Overview: lọc theo thư mục đang chọn (folderIds chứa id) + JLPT + tìm kiếm (**debounce 300ms**, trên word/meaning/reading/sinoVietnamese), sắp mới nhất trước. Xóa = tombstone.

### Files TẠO MỚI (frontend/src/features/vocabulary)
- model: `dedupe.ts` (dedupeKey/findDuplicate), `filter.ts` (filterVocabularies), `useDebouncedValue.ts`, `useVocabulary.ts` (load/reload/quickAdd/remove).
- ui: `QuickAddForm.tsx` (Từ*, Cách đọc, Nghĩa*, JLPT, Ghi chú), `VocabularyFilters.tsx` (tìm kiếm + JLPT), `VocabularyList.tsx` (bảng + nút Xóa), `VocabularyOverview.tsx` (ghép + Modal xác nhận xóa), `vocabulary.css`.
- `index.ts`; `tests/unit/vocabulary.test.ts` (5 test: dedupe + filter).

### Files SỬA
- `pages/Library/LibraryPage.tsx` — vùng chính render <VocabularyOverview folderId={selectedFolderId}/>; chọn thư mục ở sidebar lọc danh sách và quyết định folder cho Quick Add.

### Kiểm chứng
- `npm run typecheck`: **0 lỗi**.
- `npm test`: **19/19 pass** (id 2, srs 4, primitives 2, folder-tree 6, vocabulary 5).
- `npm run build`: **OK** (chunk Library ~15.4kB).
- `npm run lint`: **0 lỗi**; 4 cảnh báo react-refresh HMR vô hại (router.tsx 3 + ThemeProvider.tsx 1).

### DỪNG sau F2 (theo yêu cầu) — chờ người dùng chạy thử trước khi làm F5 (sync).

## Mục 6 — F5: features/sync (sync client 2 chiều, debounce 3.5s) ✅

Local-first đồng bộ hai chiều lên BE qua `shared/api` (pull/push đã có từ Mục 5). KHÔNG thêm dependency; FSD import một chiều (feature → shared); tách lõi THUẦN để unit test không cần DOM/DB.

### Quyết định thiết kế
- **Con trỏ trong store `meta`** (keyPath 'key'): `sync.lastPulledAt` = `serverTime` server trả về (mốc delta cho pull kế); `sync.lastPushedAt` = **`updatedAt` LỚN NHẤT của các bản ghi vừa đẩy** (KHÔNG dùng giờ máy client — tránh lệch đồng hồ).
- **Thứ tự một vòng:** PUSH bản ghi "bẩn" (`updatedAt > lastPushedAt`; chưa có con trỏ → tất cả, gồm cả tombstone) → rồi PULL delta kể từ `lastPulledAt` → merge LWW. Push idempotent ở BE (so khớp `updated_at`, bằng/cũ hơn → bỏ qua) nên echo bản của thiết bị khác chỉ là no-op an toàn.
- **Merge LWW:** chỉ ghi incoming khi local chưa có HOẶC `updatedAt` incoming MỚI HƠN THỰC SỰ (strict `>`), mirror `isIncomingNewer` của BE; giữ tombstone để xóa lan truyền.
- **Trigger không coupling feature↔feature:** thêm `shared/lib/change-bus.ts` (emit/subscribe). Feature ghi dữ liệu gọi `emitDataChanged()`; `features/sync` subscribe để lên lịch đồng bộ sau **debounce 3.5s**. Đặt ở `shared` vì FSD cấm feature import feature khác.
- **Đọc/ghi mức store thô** (`shared/lib` idb + `STORE`) vì sync là hạ tầng chung mọi entity; local record = DTO (LocalFolder=FolderDto, LocalVocabulary=VocabularyDto). Lấy TẤT CẢ bản ghi (gồm tombstone) để đẩy cả thao tác xóa.
- **Debounce thủ công** (setTimeout + timer ref) thay cho `debounce()` của shared trong SyncProvider để tránh rule mới `react-hooks/refs` (cấm gọi hàm/đọc ref trong lúc render).

### Files TẠO MỚI
- `shared/lib/change-bus.ts` — `emitDataChanged` / `subscribeDataChanged` (bus thay đổi dữ liệu local, thuần, không React).
- `features/sync/model/engine.ts` — lõi THUẦN: `isNewer`, `selectDirty`, `maxUpdatedAt`, `latestIso`, `pickIncomingWinners` (+ kiểu `SyncRecord`).
- `features/sync/model/cursor.ts` — đọc/ghi con trỏ `sync.lastPulledAt` / `sync.lastPushedAt` trong store `meta`.
- `features/sync/model/runSync.ts` — điều phối một vòng push→pull (`runSync(db)` → `SyncRunSummary`).
- `features/sync/model/sync-context.ts` — `SyncContext` + kiểu (tách khỏi component để tránh warning react-refresh).
- `features/sync/model/SyncProvider.tsx` — provider: đồng bộ lần đầu khi mount, khi online lại, và sau thay đổi local (debounce 3.5s); chống chạy chồng (`running`/`rerun`).
- `features/sync/model/useSync.ts` — hook lấy API đồng bộ (ném lỗi nếu dùng ngoài provider).
- `features/sync/ui/SyncStatus.tsx` + `ui/sync-status.css` — chỉ báo 4 trạng thái (idle/syncing/error/offline) + nút "Đồng bộ ngay".
- `features/sync/index.ts` — public API (SyncProvider, useSync, SyncStatus + kiểu).
- `tests/unit/sync.test.ts` — 8 test THUẦN cho engine.

### Files SỬA
- `shared/lib/index.ts` — export change-bus.
- `app/AppProviders.tsx` — bọc `<SyncProvider>` bên trong `<DbProvider>`.
- `app/AppLayout.tsx` — thêm `<SyncStatus/>` trên header.
- `features/folder-tree/model/useFolderTree.ts` — gọi `emitDataChanged()` sau create/rename/remove/applyPatches (chỉ THÊM, không đổi logic).
- `features/vocabulary/model/useVocabulary.ts` — gọi `emitDataChanged()` sau quickAdd/remove.

### Kiểm chứng
- `npm run typecheck`: **0 lỗi**.
- `npm test`: **27/27 pass** (sync 8, folder-tree 6, vocabulary 5, srs 4, id 2, primitives 2).
- `npm run lint`: **0 lỗi**; vẫn 4 cảnh báo react-refresh HMR vô hại như cũ (router.tsx 3 + ThemeProvider.tsx 1).
- `npm run build`: **OK** (sync nằm trong bundle chính qua SyncProvider).
- CHƯA chạy luồng thật với BE (F5 cần BE + DB) — để người dùng kiểm bằng tay.

### DỪNG sau F5 (theo yêu cầu) — chờ người dùng chạy thử (cần BE chạy) trước khi làm F3.

## Mục 6 — F3: features/flashcard (3 chế độ Normal/Progress/Anki SRS) ✅

Local-first. SM-2 **dùng lại** `entities/card` (mirror BE `srs.service`), KHÔNG viết lại công thức. Tách lõi THUẦN (queue, review) để unit test không cần DOM/DB. Feature chỉ phụ thuộc `entities/*` + `shared/*` (FSD một chiều, không import feature khác).

### Thiết kế
- **3 chế độ** (`model/types.ts`): `normal` (lật thẻ thường, đi hết bộ), `progress` (ưu tiên thẻ ít tiến độ nhất = `srsRepetition` asc), `anki` (chỉ thẻ **tới hạn** theo `isDue`, áp SM-2 + lưu lịch ôn). Normal/Progress KHÔNG ghi SRS; chỉ Anki ghi srs*.
- **Hàng đợi THUẦN** (`model/queue.ts`): `buildQueue(vocabs, mode, now)` (lọc thẻ sống, sắp xếp tất định; anki chỉ lấy thẻ due, thẻ mới trước) + `summarize(vocabs, now)` (tổng/tới hạn/mới/đã học).
- **BẤT BIẾN QUAN TRỌNG** (`model/review.ts`): `applyReview(vocab, rating, now)` áp SM-2 VÀ **luôn đặt `updatedAt = now`** cùng với srs*. `persistReview(deps, …)` ghi local **TRƯỚC** rồi **emit change-bus** (deps `put`/`emit` tiêm vào → test được không cần DOM/DB). Nếu quên `updatedAt`/emit, sync KHÔNG đẩy tiến độ học lên server.
- **Hook** (`model/useFlashcards.ts`): nạp thẻ sống từ IndexedDB (mẫu effect cờ `active` như useVocabulary, tránh set-state-in-effect); `review()` dùng `persistReview` với `put = putVocabularyLocal(db, …)` + `emit = emitDataChanged`.

### Files TẠO MỚI (frontend/src/features/flashcard)
- model: `types.ts`, `queue.ts` (THUẦN), `review.ts` (THUẦN), `useFlashcards.ts`.
- ui: `FlashcardStudy.tsx` (bộ chọn chế độ + 4 trạng thái loading/empty/error/ready + điều khiển lật/điều hướng/đánh giá), `FlashcardCard.tsx` (mặt trước/sau), `flashcard.css`.
- `index.ts` (export `FlashcardStudy`); `tests/unit/flashcard.test.ts` (7 test).

### Files SỬA
- `pages/Study/StudyPage.tsx` — render `<FlashcardStudy/>` (bỏ placeholder EmptyState).

### Kiểm chứng
- `npm run typecheck`: **0 lỗi**.
- `npm test`: **34/34 pass** (+7 flashcard: queue 3, summarize 1, applyReview 2, persistReview 1).
- `npm run lint`: **0 lỗi**; vẫn 4 cảnh báo react-refresh HMR vô hại (router.tsx 3 + ThemeProvider.tsx 1).
- `npm run build`: **OK** — chunk Study (flashcard) ~5.64 kB (code-split route). *Lưu ý môi trường: lần build đầu lỗi `EPERM` khi dọn `dist/` cũ (file bị khóa trên Windows); xóa `dist/` rồi build lại OK — KHÔNG phải lỗi code.*
- CHƯA chạy luồng thật với BE (anki ghi srs* → sync đẩy lên) — để người dùng kiểm bằng tay.

## Mục 6 — F4: features/quiz (typing quiz) ✅

Local-first. Sinh câu từ vocab local, **chấm CỤC BỘ** (mirror `quiz.service` của BE: `normalizeAnswer`/`gradeAnswer`), **lưu phiên lên BE khi online** (`POST /api/quiz/sessions`). `quiz_sessions`/`quiz_attempts` chỉ ở server → KHÔNG ghi IndexedDB; nếu offline/lỗi vẫn hiển thị kết quả cục bộ. Tách lõi THUẦN để unit test không cần DOM/DB. Feature chỉ phụ thuộc `entities/*` + `shared/*` (FSD một chiều).

### Thiết kế
- **Chấm THUẦN** (`model/grade.ts`): `normalizeAnswer` (NFC + trim + gộp khoảng trắng + hạ chữ thường) + `gradeAnswer` — MIRROR nguyên văn BE → điểm cục bộ == điểm server.
- **Sinh câu THUẦN** (`model/questions.ts`): `buildQuestions(vocabs, direction, limit)`. `viToJa` (hiện Nghĩa → gõ tiếng Nhật; đáp án = [word, reading]); `jaToVi` (hiện Từ（đọc）→ gõ Nghĩa; đáp án = [meaning]). Bỏ tombstone + thẻ thiếu word/meaning.
- **Phiên THUẦN** (`model/session.ts`): `gradeSession(questions, answers[])` (canh theo index; rỗng/null = sai) + `toCreateSessionInput(result, meta)` dựng payload khớp `validators/quiz.ts`.
- **Hook** (`model/useQuiz.ts`): nạp vocab (effect cờ `active`); pha `config → active → result`; trộn thứ tự (Fisher–Yates) mỗi phiên; `start/answer/restart`; `saveToServer` dùng `navigator.onLine` + bắt `ApiError` (vd 400 khi từ chưa đồng bộ) → báo rõ nhưng KHÔNG chặn kết quả cục bộ.

### Files TẠO MỚI (frontend/src/features/quiz)
- model: `grade.ts` (THUẦN, mirror BE), `types.ts`, `questions.ts` (THUẦN), `session.ts` (THUẦN), `useQuiz.ts`.
- ui: `QuizRunner.tsx` (4 trạng thái + 3 pha + form config/active), `QuizResult.tsx` (điểm + trạng thái lưu + soát từng câu), `quiz.css`.
- `index.ts` (export `QuizRunner`); `tests/unit/quiz.test.ts` (8 test).

### Files SỬA
- `pages/Quiz/QuizPage.tsx` — render `<QuizRunner/>` (bỏ placeholder EmptyState).

### Kiểm chứng
- `npm run typecheck`: **0 lỗi**.
- `npm test`: **42/42 pass** (+8 quiz: normalizeAnswer 1, gradeAnswer 2, buildQuestions 3, session 2).
- `npm run lint`: **0 lỗi**; vẫn 4 cảnh báo react-refresh HMR vô hại (router.tsx 3 + ThemeProvider.tsx 1).
- `npm run build`: **OK** — chunk Quiz ~6.85 kB (code-split route). (Nhắc: nếu gặp `EPERM` khi dọn `dist/` trên Windows → xóa `dist/` rồi build lại.)
- CHƯA chạy luồng thật với BE (lưu phiên cần BE + DB) — để người dùng kiểm bằng tay.

## Mục 6 — Dọn placeholder scaffold rỗng (chore) ✅

Người dùng đã duyệt (Nhóm A + B). Trước khi xóa đã grep `docs/` + README: chỉ `docs/architecture/frontend.md` (§1 cây thư mục + §5 lộ trình) và `frontend/src/shared/README.md` mô tả các thư mục cũ là "cấu trúc đã chốt" → đã sửa tài liệu cho khớp trong cùng commit. (`backend.md` nói về thư mục của BE, không liên quan.)

### Đã gỡ (chỉ chứa `.gitkeep`, không nơi nào import)
- **Nhóm A (xóa cả thư mục):** `features/{auth,library,progress,srs,study}`, `pages/{Home,Login,Progress,SRS}`, `components/` (+common/forms/ui), `constants/`, `hooks/`, `layouts/`, `services/`, `stores/`, `types/`, `utils/`, `assets/` (+fonts/icons/images).
- **Nhóm B (gỡ `.gitkeep` thừa, giữ thư mục đã tái dùng):** gốc `src/`, `features/`, `features/quiz/`, `pages/`, `pages/{Library,Quiz,Study}/`, `routes/`.
- Tổng: gỡ 32 file `.gitkeep`. Cây `frontend/src` còn: `app, entities, features, pages, routes, shared` + `main.tsx`.

### Files SỬA (tài liệu cho khớp)
- `docs/architecture/frontend.md` — §1 cây thư mục thực tế (bỏ các thư mục đã gỡ) + §5 đánh dấu lộ trình refactor HOÀN TẤT.
- `frontend/src/shared/README.md` — bỏ dòng "lộ trình chuyển dần từ components/hooks/utils" (đã gỡ).

### Kiểm chứng
- `npm run typecheck`: **0 lỗi**.
- `npm test`: **42/42 pass** (không đổi — chỉ gỡ thư mục rỗng).
- `npm run build`: **OK** (120 modules).
- *Lưu ý:* `study-theme/` (ảnh tham khảo bố cục) hiện là thư mục **untracked**, KHÔNG đưa vào commit (chỉ để xem, không import vào app).

## Mục 6 — e2e tự chạy gọi thẳng BE (không qua UI) ✅

Chạy bằng công cụ gửi request tới BE `http://127.0.0.1:3000` (DB PostgreSQL 18.4, đủ 8 bảng). KHÔNG để lại file tạm. Owner = `LOCAL_OWNER_ID` (MVP không auth).

| Bước | Request | Kết quả |
|---|---|---|
| Health | `GET /health` | 200 `{status:ok, db:up}` |
| Push (sống) | `POST /api/sync/push` (1 folder + 1 từ) | 200 `folders.applied=1, vocabularies.applied=1` |
| Pull | `GET /api/sync/pull?since=…09:00` | 200 — trả đúng folder + từ vừa đẩy (`deletedAt:null`) |
| Quiz hợp lệ | `POST /api/quiz/sessions` (vocabularyId tồn tại) | **201** `score 1/1`, attempt `isCorrect:true` |
| Quiz KHÔNG hợp lệ | `POST /api/quiz/sessions` (vocabularyId lạ) | **400** `ValidationError "…vocabulary that does not exist: …"` (đúng, KHÔNG 500 — xác nhận fix BE-1) |
| Tombstone | `POST /api/sync/push` (updatedAt mới hơn + deletedAt) | 200 `applied=1` cho cả folder & từ |
| Pull sau xóa | `GET /api/sync/pull?since=…10:30` | 200 — từ & folder có `deletedAt` (tombstone lan truyền) |
| Chống hồi sinh | `POST /api/sync/push` lại BẢN CŨ (updatedAt cũ hơn, deletedAt null) | 200 `vocabularies.skipped=1, applied=0` (LWW bỏ bản cũ) |
| Pull xác nhận | `GET /api/sync/pull?since=…10:30` | 200 — từ VẪN `deletedAt` (KHÔNG hồi sinh) ✅ |

Dữ liệu test (`folder_e2e_0001`, `vocab_e2e_0001`) kết thúc ở trạng thái **tombstone** → DB không còn bản sống rác.

### Ý tưởng cải tiến (ghi lại, CHƯA làm)
- **Quiz tự sync trước khi lưu phiên:** hiện POST `/quiz/sessions` có thể 400 nếu `vocabularyId` chưa đồng bộ lên server. Có thể cho `features/quiz` kích hoạt một vòng sync (qua `shared`) trước khi lưu, hoặc gửi attempt bỏ `vocabularyId` khi từ chưa đồng bộ.
- **Tối ưu đẩy ngược bản vừa pull:** bản vừa merge từ pull có thể bị tính "bẩn" ở vòng push kế (echo). Thêm cờ "nguồn server" hoặc so con trỏ để bỏ echo.
- **Phân trang pull** cho bộ dữ liệu lớn (hiện pull trả nguyên delta một lần).

## Mục 6 — F3 làm lại giao diện + phím tắt (theo bố cục tham khảo) ✅

Chỉ đổi UI/UX; GIỮ NGUYÊN logic SM-2 (`entities/card`), hàng đợi (`queue.ts`), ghi srs* + change-bus. FSD + 4 trạng thái giữ nguyên. KHÔNG thêm dependency.

### Bố cục mới (học từ `study-theme`, chỉ lấy bố cục — không copy màu/tên/ảnh)
- Thanh **phạm vi** "Phạm vi x/y" + chip Tất cả / 20 từ đầu / Random 20 (chọn tập thẻ từ hàng đợi theo chế độ).
- **Thẻ điều khiển**: tab chế độ (Bình thường / Tiến độ / Anki SRS) + công cụ Xáo trộn / Làm lại + tóm tắt (Tổng/Tới hạn/Mới).
- **Thanh tiến độ** "i/total" + bar mảnh.
- **Thẻ lớn** (~30rem, nhãn "BẤM ĐỂ LẬT"): mặt trước = cách đọc + NGHĨA to + khung nghĩa-ví-dụ; mặt sau = TỪ to + cách đọc + Hán Việt (hoa, giãn) + khung ví dụ/ghi chú. (**Đảo chiều hiển thị** so với bản cũ — chỉ là hiển thị.)
- **Điều hướng**: Normal/Progress → Trước / Tiếp theo (nhãn ← →, mờ ở biên); Anki → 4 nút Again/Hard/Good/Easy (nhãn 1/2/3/4).

### Phím tắt (brief) — tách lõi THUẦN để test
- `model/keymap.ts` (THUẦN): `decideFlashcardAction(ctx)` → flip/next/prev/grade/none. Space mặt trước = lật; mặt sau: Normal/Progress = qua thẻ, **Anki = chỉ lật** (tránh chấm nhầm); ← → điều hướng (chặn biên); 1/2/3/4 chấm (chỉ Anki + đã lật); bỏ qua khi đang gõ hoặc giữ Ctrl/Alt/Meta.
- `model/useFlashcardKeys.ts` (hook): gắn keydown document MỘT lần (đọc state qua ref → không re-attach/gọi 2 lần khi đổi chế độ); `preventDefault` cho Space/←/→ (chống cuộn); nếu đang focus `<button>` thì để Space kích hoạt nút (tránh double).
- **Bấm/chạm vào thẻ** cũng lật (wrapper `role=button`, Space-flip khi focus thẻ). Dòng gợi ý phím dưới thẻ (ẩn ở mobile).

### Files
- MỚI: `model/keymap.ts`, `model/useFlashcardKeys.ts`, `tests/unit/flashcard-keymap.test.ts` (8 test).
- VIẾT LẠI: `ui/FlashcardCard.tsx`, `ui/FlashcardStudy.tsx`, `ui/flashcard.css`.

### Kiểm chứng
- `npm run typecheck`: **0 lỗi**. `npm test`: **50/50 pass** (+8 keymap). `npm run lint`: **0 lỗi** (4 cảnh báo react-refresh cũ). `npm run build`: **OK** — chunk Study 9.48 kB, CSS 2.86 kB.
- CẦN XEM BẰNG MẮT: bố cục thẻ sáng/tối, desktop/mobile, phím Space/←→/1-4, bấm thẻ để lật.
