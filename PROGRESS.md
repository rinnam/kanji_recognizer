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
| 6 | FE features: folder-tree ✅, vocabulary ✅, sync client (debounce 3.5s) ✅, flashcard 3 chế độ ✅, typing quiz ✅ | ✅ XONG (F0–F5 + dọn placeholder + e2e BE + làm lại UI F3/F4 + phím tắt) |

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

## Mục 6 — F4 làm lại giao diện + phím tắt (theo bố cục tham khảo) ✅

Chỉ đổi UI/UX; GIỮ NGUYÊN chấm cục bộ (mirror BE), lưu phiên BE, local-first. FSD + 4 trạng thái. KHÔNG thêm dependency.

### Bố cục + luồng mới
- Thanh **phạm vi** + chip Tất cả / 20 câu đầu / Random 20.
- **Thẻ điều khiển**: nhóm nút **kiểu hỏi** (Nghĩa→Nhật / Nhật→Nghĩa) + Xáo trộn / Làm lại + ô "Tự chuyển (giây)" (1–10, mặc định 5) + "TIẾN ĐỘ KIỂM TRA i/total" + bar.
- **Thẻ câu hỏi**: tiêu đề loại câu (hoa, có ⓘ), đề to, gợi ý nghiêng, công tắc "Hiển thị gợi ý Âm Hán Việt" (nếu từ có Hán Việt).
- **Ô nhập lớn** + placeholder "Nhập câu trả lời vào đây..." + 2 nút **Bỏ qua (Tab)** / **Kiểm tra** (mờ khi trống).
- **Phản hồi từng câu** sau nộp: viền thẻ + ô nhập đổi đúng/sai, "✓ Chính xác!" hoặc "✗ … + Đáp án: …", chip Cách đọc / Hán Việt, ví dụ; nút **Tiếp / Nộp bài** kèm **đếm ngược tự chuyển** (mặc định 5s, chỉnh 1–10) + **Enter** chuyển ngay. Câu cuối → màn kết quả hiện có.

### Phím tắt (brief)
- **Enter**: chưa nộp → nộp (chấm + phản hồi); đã nộp → câu tiếp (hoặc Nộp bài ở câu cuối).
- **Tab**: bỏ qua câu (chỉ khi CHƯA nộp) → ghi null, sang câu kế.
- Ô nhập **tự focus** mỗi câu mới (effect theo index/submitted).
- Đếm ngược: effect `setInterval` (setState chỉ trong callback, không trong thân effect → không vi phạm `react-hooks/set-state-in-effect`); seed `remaining` tại handler nộp.

### Thiết kế hook (`model/useQuiz.ts` viết lại)
- Pha `active → result` (bỏ pha config rời; điều khiển luôn hiện trên đầu). `submit` (chấm 1 câu + feedback) / `skip` / `advance` (câu cuối → `finishWith`). Chọn kiểu hỏi/phạm vi/xáo trộn → dựng lại câu hỏi (`buildQuestions` + limit/shuffle). `currentVocab` tra từ `all` để hiện gợi ý/chip. Lưu phiên BE giữ nguyên (navigator.onLine + bắt ApiError).

### KHÔNG làm (chờ duyệt)
- Kiểu hỏi "nhìn chữ, nhập cách đọc" (Dạng 1 trong ảnh) — theo yêu cầu, CHƯA tự làm; cần bạn xác nhận trước.

### Files
- VIẾT LẠI: `model/useQuiz.ts`, `ui/QuizRunner.tsx`, `ui/quiz.css`. GIỮ: `model/{grade,questions,session,types}.ts`, `ui/QuizResult.tsx`.

### Kiểm chứng
- `npm run typecheck`: **0 lỗi**. `npm test`: **50/50 pass** (8 test quiz model giữ nguyên). `npm run lint`: **0 lỗi** (4 cảnh báo react-refresh cũ). `npm run build`: **OK** — chunk Quiz 11.71 kB, CSS 3.33 kB.
- CẦN XEM BẰNG MẮT: sáng/tối, desktop/mobile; Enter nộp→tiếp; Tab bỏ qua; auto-focus; đếm ngược 1–10s; công tắc Hán Việt; lưu phiên khi BE online.

## Việc A — Gộp 3 trang thành MỘT màn hình làm việc ✅ (commit a)

Bỏ 3 trang rời (/library, /study, /quiz) + link header; dồn về MỘT màn hình: cây thư mục luôn hiện ở cột trái, đổi chế độ bằng tab (lưu trong URL `?tab=`), KHÔNG chuyển trang. GIỮ FSD; không thêm dependency.

### Thay đổi chính
- **Header gọn** (`app/AppLayout.tsx` + `App.css`): chỉ còn tên "Kanji Nest" (trái) + `SyncStatus` (đã có nút "Đồng bộ ngay") + `ThemeToggle` (phải). BỎ `NavLink` Thư viện/Ôn tập/Quiz và CSS `.kn-nav`.
- **Màn hình gộp MỚI** `pages/Workspace/{WorkspacePage.tsx,WorkspacePage.css,index.ts}`: layout 2 cột. Cột trái = sidebar thẻ LUÔN mounted (`FolderTree`). Cột phải = thanh "Đang chọn:" + chip tên thư mục → thanh tab pill "Tổng quan | Flashcard | Quiz" + gợi ý theo tab → nội dung tab (Tổng quan = `VocabularyOverview` theo thư mục đang chọn; Flashcard = `FlashcardStudy`; Quiz = `QuizRunner`). `selectedFolderId` + tab giữ ở lớp page (FSD: feature không import feature).
- **Tab trong URL**: `routes/paths.ts` thêm `TAB_PARAM/TABS/parseTab/LEGACY_REDIRECTS`; `router.tsx` → index là Workspace, redirect `/library|/study|/quiz` → `/?tab=overview|flashcard|quiz` (replace), giữ 404. `NotFound` trỏ về `/`.
- **Sidebar** (`FolderTree`): tiêu đề "Quản lý Thư mục"; nút "Tất cả từ vựng" + badge tổng; nhãn "CÂY THƯ MỤC"; mỗi thư mục có badge SỐ TỪ gồm cả thư mục con cháu (đọc vocab còn sống qua `entities/vocabulary` + nghe `subscribeDataChanged` để khớp Overview). `onSelect(id, name)` để hiện tên thư mục đang chọn. GIỮ expand/collapse, thêm/sửa/xóa, kéo–thả.
- **Mobile (≤48rem)**: sidebar thành ngăn kéo (chip "… ⌄" ở đầu nội dung mở drawer + scrim; `FolderTree` vẫn mounted, chỉ ẩn/hiện bằng CSS transform, tôn trọng `prefers-reduced-motion`). Thanh tab cuộn ngang. Không cuộn ngang trang ở 320/390px.

### Lưu ý bàn giao
- Badge số từ ở sidebar tính ĐÚNG (gồm thư mục con) nhưng bằng helper tạm trong `FolderTree` (đánh dấu `// TODO(B0)`). **Việc B0 sẽ thay bằng hàm thuần `collectDescendantFolderIds`/`selectWordsInScope` + unit test, dùng chung cho sidebar + Overview.**
- `FlashcardStudy`/`QuizRunner` đang mount theo dữ liệu TOÀN BỘ (chưa nhận `selectedFolderId`). Gắn phạm vi thư mục cho 2 tab này nằm ở B1/B2 (ScopeBar + selectWordsInScope).

### Files
- MỚI: `pages/Workspace/{WorkspacePage.tsx,WorkspacePage.css,index.ts}`.
- SỬA: `app/{AppLayout.tsx,router.tsx,App.css,NotFound.tsx}`, `routes/{paths.ts,index.ts}`, `features/folder-tree/ui/{FolderTree.tsx,FolderTreeItem.tsx,folder-tree.css}`.
- XÓA: `pages/{Library,Study,Quiz}/*`.

### Kiểm chứng
- `npm run typecheck`: **0 lỗi**. `npm test`: **50/50 pass** (9 file, không đổi test). `npm run lint`: **0 lỗi, 2 cảnh báo** react-refresh cũ (router.tsx, ThemeProvider.tsx — trong hạn ≤4). `npm run build`: **OK** — 118 modules, chunk Workspace 38.87 kB JS + 12.28 kB CSS.
- CẦN XEM BẰNG MẮT: layout một màn hình (sáng/tối, desktop/mobile 320/390), sidebar luôn hiện + badge số từ, chuyển tab giữ trạng thái cây, ngăn kéo thư mục trên mobile, redirect path cũ.

## Việc B0 — Quy tắc phạm vi (scope) + ScopeBar ✅ (commit b)

Hàm thuần + unit test cho "phạm vi theo thư mục", dùng chung sidebar & Overview để số luôn khớp; thêm ScopeBar presentational (sẽ dùng ở B1/B2). KHÔNG đổi SM-2/sync/local-first; không thêm dependency.

### Hàm thuần (`entities/vocabulary/model/scope.ts`)
- `collectDescendantFolderIds(folders, rootId)` → tập id thư mục còn sống gồm chính nó + MỌI con cháu (thư mục đã xóa / id lạ → tập rỗng).
- `selectWordsInScope(vocabs, folders, selectedFolderId)` → từ còn sống trong phạm vi; `null` = tất cả; từ thuộc nhiều thư mục chỉ tính MỘT lần; bỏ từ đã xóa và từ chỉ thuộc thư mục đã xóa.
- Dùng kiểu cấu trúc tối thiểu `ScopeFolder` (không phụ thuộc chéo entity). Xuất qua barrel `entities/vocabulary`.

### Dùng chung để "số luôn khớp"
- Sidebar `FolderTree`: badge mỗi thư mục = `selectWordsInScope(vocab, folders, id).length` (bỏ helper tạm `// TODO(B0)` của Task A).
- `VocabularyOverview`: lọc theo phạm vi (gồm con cháu) bằng `selectWordsInScope` rồi mới áp JLPT + tìm kiếm (gọi `filterVocabularies` với folderId = null) → danh sách khớp badge. Overview nạp thêm thư mục còn sống + nghe `subscribeDataChanged`.
- `useFolderTree` thêm `folders` (phẳng, còn sống) vào API để tính phạm vi.

### ScopeBar (`shared/ui`, presentational)
- "Phạm vi: x/y" + chip [Tất cả] [N từ đầu] [Random N] + ô nhập N (1..total). CHỈ hiển thị + phát sự kiện; logic "N đầu" (createdAt tăng) / "Random N" (bốc lại) + reset khi đổi thư mục nằm ở Flashcard/Quiz (B1/B2). Khóa chip khi total = 0.

### Files
- MỚI: `entities/vocabulary/model/scope.ts`, `shared/ui/ScopeBar.tsx`, `shared/ui/scope-bar.css`, `tests/unit/scope.test.ts`, `tests/unit/scope-bar.test.tsx`.
- SỬA: `entities/vocabulary/{index.ts,model/index.ts}`, `shared/ui/index.ts`, `features/folder-tree/{model/useFolderTree.ts,ui/FolderTree.tsx}`, `features/vocabulary/ui/VocabularyOverview.tsx`.

### Kiểm chứng
- `npm run typecheck`: **0 lỗi**. `npm test`: **59/59 pass** (+9: 7 scope + 2 ScopeBar). `npm run lint`: **0 lỗi, 2 cảnh báo** react-refresh cũ. `npm run build`: **OK** — 121 modules.
- CẦN XEM BẰNG MẮT: badge sidebar khớp danh sách Overview; ví dụ N3 = Bài 1 + Bài 2 (gồm con cháu).

## Việc B1 — Làm lại Flashcard theo bố cục ảnh ✅ (commit c)

Chỉ lấy bố cục/hành vi; dùng token màu dự án; không thêm dependency; icon SVG inline (`shared/ui/icons`). GIỮ NGUYÊN SM-2 (`queue.ts`, `review.ts`) và phím tắt (`keymap.ts` + test 8 ca đã có).

### Cấu trúc mới
- `ScopeBar` + thẻ điều khiển (chế độ Bình thường/Tiến độ/Anki SRS + IconButton Xáo trộn/Làm lại có aria-label + tooltip + thống kê "Tổng · Tới hạn · Mới") + hàng "i/total" + thanh tiến độ mảnh + thẻ lớn + CardNav (Trước/Tiếp theo, hoặc 4 nút Again/Hard/Good/Easy ở Anki).
- Phạm vi theo thư mục: `FlashcardStudy` nhận `folderId`, dùng `selectWordsInScope` (gồm con cháu). ScopeBar: y = số thẻ của chế độ hiện tại (deck), x = số thẻ dùng sau chip; "N từ đầu" theo createdAt tăng, "Random N" bốc lại khi bấm. Đổi thư mục → remount (`key`) nên reset về "Tất cả" + thẻ đầu.

### Mặt thẻ (hàm thuần `selectFaceContent` + test)
- MẶT TRƯỚC: TỪ to đậm (clamp chống tràn) + Âm Hán Việt IN HOA giãn chữ (ẩn nếu rỗng, không để trống).
- MẶT SAU: Cách đọc (trên) · Nghĩa (to đậm) · khung "VÍ DỤ" (câu ví dụ + dịch nghiêng); trường rỗng ẩn đúng khối, không có ví dụ thì ẩn cả khung.
- Góc trên trái LUÔN có "BẤM ĐỂ LẬT" + icon flip. Bấm/chạm thẻ hoặc Space để lật — animation xoay ngắn, tôn trọng `prefers-reduced-motion`. Chuyển thẻ → luôn về mặt trước.

### Phím tắt (giữ nguyên `keymap.ts`)
- Space lật (preventDefault); mặt sau: Bình thường/Tiến độ → qua thẻ, Anki → chỉ lật; ← → chuyển (chặn biên); 1/2/3/4 chấm (chỉ Anki + đã lật); bỏ qua khi đang gõ / có modal / giữ Ctrl-Alt-Meta. (8 ca test đã phủ.)

### Files
- MỚI: `features/flashcard/model/face.ts`, `shared/ui/icons/index.tsx`, `tests/unit/flashcard-face.test.ts`.
- VIẾT LẠI: `features/flashcard/ui/{FlashcardCard.tsx,FlashcardStudy.tsx,flashcard.css}`.
- SỬA: `shared/ui/index.ts` (export icons), `pages/Workspace/WorkspacePage.tsx` (truyền `folderId` + `key` cho Flashcard).
- GIỮ: `features/flashcard/model/{keymap.ts,useFlashcardKeys.ts,queue.ts,review.ts,types.ts,useFlashcards.ts}`.

### Kiểm chứng
- `npm run typecheck`: **0 lỗi**. `npm test`: **61/61 pass** (+2 `selectFaceContent`; keymap 8 ca giữ nguyên). `npm run lint`: **0 lỗi, 2 cảnh báo** react-refresh cũ. `npm run build`: **OK** — 123 modules.
- CẦN XEM BẰNG MẮT: mặt trước/sau (sáng/tối, desktop/mobile), animation lật, clamp từ dài, phạm vi theo thư mục, phím Space/←→/1-4.

## Việc B2 — Quiz 2 dạng + toolbar + IME ✅ (commit d)

Đổi quiz sang 2 dạng theo ảnh + ScopeBar + TimerPill + phản hồi từng câu. GIỮ NGUYÊN chấm (`normalizeAnswer`/`gradeAnswer` mirror BE), lưu phiên BE, local-first. KHÔNG đổi schema/BE.

### Đối chiếu BE (đã kiểm — KHÔNG cần sửa, không có gì cần duyệt)
- `backend quiz.service.ts` chấm bằng `gradeAnswer` so với `acceptedAnswers` do client gửi; `quiz_attempts` lưu prompt/userAnswer/isCorrect/vocabularyId, `mode` là chuỗi tự do — KHÔNG lưu "loại câu hỏi". ⇒ Dạng 1/Dạng 2 là chuyện FE. BE không chuẩn hóa Katakana↔Hiragana nên FE cũng KHÔNG thêm.

### 2 dạng + Ngẫu nhiên (`questions.ts`)
- Dạng 1 (reading): đề = word (rất to), đáp án = [reading], gợi ý "Gõ cách đọc bằng Hiragana". CHỈ từ có cách đọc; nếu không từ nào có cách đọc → "Các từ trong phạm vi chưa có cách đọc".
- Dạng 2 (meaning): đề = meaning, đáp án = [word (+reading)], gợi ý "Gõ Hiragana hoặc Kanji tương ứng". (Dạng 1 THAY cho "Nhật→Nghĩa" cũ.)
- Ngẫu nhiên: mỗi từ bốc ngẫu nhiên 1 trong 2 dạng; từ không có cách đọc → tự Dạng 2.

### UI (`QuizRunner`)
- ScopeBar (x/y) + QuizControls (nhóm Ngẫu nhiên/Dạng 1/Dạng 2 + IconButton Xáo trộn/Làm lại + TimerPill: icon đồng hồ + số giây 1–10, mặc định 5) + QuizProgress ("TIẾN ĐỘ KIỂM TRA" + i/total + bar).
- Thẻ câu: tiêu đề icon ⓘ + tên dạng IN HOA; công tắc "Hiển thị gợi ý Âm Hán Việt" (chip khi bật). Ô nhập + QuizActions ("Bỏ qua (Tab)" / "Kiểm tra", mờ khi trống). Sau nộp: phản hồi (viền đúng/sai, "✓ Chính xác!" hoặc đáp án chấp nhận, chip cách đọc/Hán Việt + ví dụ), nút "Tiếp (Ns)" đếm ngược + Enter chuyển ngay; câu cuối "Nộp bài" → màn kết quả cũ.
- Phạm vi theo thư mục (`folderId` + remount `key`); "Xáo trộn" = trộn lại thứ tự bộ câu; "Làm lại" = về câu 1 giữ bộ câu; mỗi phiên bốc Fisher–Yates.

### IME (hàm thuần `decideQuizKey` + test)
- `composing` (event.isComposing hoặc keyCode 229) → Enter/Tab KHÔNG nộp/bỏ qua. Enter: chưa nộp + có nội dung → nộp; đã nộp → tiếp. Tab: chưa nộp → bỏ qua. Ô nhập tự focus mỗi câu mới.

### Files
- MỚI: `features/quiz/model/keymap.ts`, `tests/unit/quiz-keymap.test.ts`.
- VIẾT LẠI: `features/quiz/model/{types.ts,questions.ts,useQuiz.ts}`, `features/quiz/ui/{QuizRunner.tsx,quiz.css}`, `tests/unit/quiz.test.ts`.
- SỬA: `pages/Workspace/WorkspacePage.tsx` (truyền `folderId` + `key` cho Quiz).
- GIỮ: `features/quiz/model/{grade.ts,session.ts}`, `features/quiz/ui/QuizResult.tsx`.

### Kiểm chứng
- `npm run typecheck`: **0 lỗi**. `npm test`: **65/65 pass** (quiz model 8 + IME keymap 4 mới). `npm run lint`: **0 lỗi, 2 cảnh báo** react-refresh cũ. `npm run build`: **OK**.
- CHƯA làm (theo yêu cầu, chờ duyệt giao diện): "quiz tự đồng bộ trước khi lưu phiên".
- CẦN XEM BẰNG MẮT: Dạng 1/Dạng 2/Ngẫu nhiên; gõ IME rồi Enter (không nộp khi đang gõ dở); đếm ngược tự chuyển; Tab bỏ qua; công tắc Hán Việt; sáng/tối + mobile.

## Commit 1 — Hành vi Flashcard (Space lật · Xáo trộn công tắc · Anki hết thẻ + Ôn trước hạn + Đặt lại SRS) ✅

Chỉ đổi hành vi/logic flashcard; GIỮ NGUYÊN công thức SM-2 (`entities/card`), sync, local-first, FSD. KHÔNG thêm dependency; icon SVG inline; dùng token màu (sáng/tối).

### 1.1 Space CHỈ lật (mọi chế độ)
- `model/keymap.ts`: Space luôn trả `flip` ở MỌI chế độ và cả hai mặt (bỏ hành vi cũ "Space mặt sau Normal/Progress → qua thẻ"). Chuyển thẻ chỉ bằng ← → và nút Trước/Tiếp theo (Anki giữ ← →). 1/2/3/4 chấm (chỉ Anki + đã lật) giữ nguyên.
- `tests/unit/flashcard-keymap.test.ts`: SỬA (không xóa) các ca cũ khẳng định "Space mặt sau → next/none" → nay khẳng định "flip" (gồm cả thẻ cuối). Còn 7 ca.
- Dòng gợi ý phím: "Space: lật · ← →: chuyển thẻ" (+ " · 1/2/3/4: chấm điểm" ở Anki).

### 1.2 "Xáo trộn" là CÔNG TẮC; "Làm lại" là hành động
- `ui/FlashcardStudy.tsx`: nút Xáo trộn có `aria-pressed`; bật = chốt MỘT thứ tự Fisher–Yates ổn định (không xáo lại khi render/lật/chấm — lọc id còn tồn tại, nối id mới ở cuối), tắt = về thứ tự mặc định; tooltip "Xáo trộn: bật/tắt". CSS `.kn-fc__icon-btn.is-on` (nền tint `color-mix` + viền + icon accent). Tab chế độ đang chọn đậm hơn (`.kn-fc__mode-btn.is-active`). "Làm lại" = nút hành động: về thẻ đầu + mặt trước; ở Anki nạp lại hàng đợi qua state `now` (TUYỆT ĐỐI KHÔNG đụng srs*).

### 1.3 Anki: hết thẻ + Ôn trước hạn + Đặt lại SRS
- **Nguyên nhân "Anki không chạy":** hàng đợi RỖNG HỢP LỆ — các thẻ đã chấm có lịch ở tương lai nên chưa "tới hạn" (đúng SM-2, KHÔNG phải lỗi code). Unit test tái hiện: 2 thẻ (Again + Good) có `srsNextReview` tương lai → `buildQueue(anki)` = [] và `summarize().due` = 0.
- **Thống kê:** `summarize` nay tính "Mới" = CHỈ `srsNextReview === null` (thẻ Again repetition 0 nhưng ĐÃ có lịch → "đã có lịch", không phải Mới). Bất biến có test: Tới hạn ≥ Mới; Tổng = Mới + đã có lịch.
- **Màn hình hết thẻ (THUẦN + test):** `queue.ts` thêm `buildReviewAheadQueue` (thẻ chưa tới hạn, sắp theo `srsNextReview` tăng dần) + `nextDueAt` (mốc tới hạn kế tiếp). UI hiện "Đã hết thẻ tới hạn" + "Thẻ kế tiếp đến hạn: {ngày giờ}" + 2 nút "Ôn trước hạn" (chấm bình thường theo SM-2) / "Đặt lại tiến độ SRS".
- **Đặt lại tiến độ SRS (THUẦN + test):** `model/reset.ts` — `resetSrsProgress` (null hoá srsInterval/srsRepetition/srsEaseFactor/srsNextReview + updatedAt = now), `selectResetTargets` (chỉ thẻ sống & có tiến độ trong phạm vi), `persistResetSrs` (ghi 1 transaction + emit change-bus MỘT lần). Hook `useFlashcards.resetSrs(scopeVocabs)` dùng `putVocabulariesLocal`. Modal xác nhận (primitive có sẵn) nêu rõ SỐ thẻ sẽ bị reset trong phạm vi hiện tại (thư mục đang chọn gồm con cháu).

### Files
- SỬA: `features/flashcard/model/{keymap.ts,queue.ts,types.ts,useFlashcards.ts}`, `features/flashcard/ui/{FlashcardStudy.tsx,flashcard.css}`, `tests/unit/{flashcard-keymap.test.ts,flashcard.test.ts}`.
- MỚI: `features/flashcard/model/reset.ts`.

### Kiểm chứng
- `npm run typecheck`: **0 lỗi**.
- `npm test`: **71/71 pass** (flashcard-keymap 7, flashcard 14 — +7 ca mới: anki hết thẻ, bất biến summarize, buildReviewAheadQueue, nextDueAt×2, reset×2).
- `npm run lint`: **0 lỗi, 2 cảnh báo** react-refresh cũ (router.tsx + ThemeProvider.tsx — trong hạn ≤4).
- `npm run build`: **OK** — 125 modules.

## Commit 3C — applyScope thuần + FlashcardStudy nhận prop scope ✅
- MỚI `entities/vocabulary/model/scope-apply.ts`: `applyScope(words,{mode,n,seed})` thuần/tất định — 'first' theo createdAt (tie-break id); 'random' Fisher–Yates + mulberry32 có seed; kẹp n∈[1,len], rỗng→[], không mutate; export qua barrel.
- `FlashcardStudy` thêm prop TÙY CHỌN `scope?`: CÓ → ẩn ScopeBar nội bộ + dùng `applyScope`; KHÔNG → chip nội bộ cũng gọi `applyScope` (bỏ `byCreatedAtAsc` trùng lặp). Thêm +7 ca `tests/unit/scope-apply.test.ts`.
- Kiểm chứng: typecheck **0 lỗi** · test **119/119** (19 file) · lint 0 lỗi, 2 cảnh báo cũ · build **OK** (141 modules). Không thêm dependency; không đụng SM-2/chấm quiz.
- CHƯA kiểm bằng mắt: Flashcard chạy thật (chip Tất cả / N từ đầu / Random vẫn chạy); prop `scope` sẽ được page truyền ở 3E.
- CẦN XEM BẰNG MẮT: công tắc Xáo trộn bật/tắt (nền tint + viền accent + icon đổi màu); Space chỉ lật ở mọi chế độ; màn Anki hết thẻ (dòng "Thẻ kế tiếp đến hạn" + 2 nút); Modal "Đặt lại tiến độ SRS" (số thẻ đúng theo phạm vi); sáng/tối + mobile.

## Commit 2 — Bám bố cục KotoBase (mật độ · tab segmented+icon · ScopeBar · thẻ điều khiển · sidebar · icon · mobile) ✅

Chỉ đổi bố cục/kích thước/CSS + icon SVG inline; KHÔNG đổi hành vi (keymap, Xáo trộn công tắc, Anki hết thẻ/Ôn trước hạn/Đặt lại SRS, SM-2, chấm quiz, IME, sync). Dùng token màu (`--kn-*`, sáng/tối); không thêm dependency.

### 2.0 Mật độ & kích thước
- Cột giữa Flashcard rộng tối đa **50rem**, Quiz 44rem, căn giữa; gap các khối 0.75–0.8rem; cỡ chữ nhãn/nút ~0.8–0.85rem.
- **Thẻ flashcard co theo viewport:** `height: clamp(16rem, calc(100dvh - 34rem), 28rem)` (mobile `clamp(14rem, calc(100dvh - 26rem), 24rem)`). Ở cửa sổ cao ~900px (≈56rem) → thẻ ≈22rem, cộng các khối ≈15rem → tổng ≈37rem (~592px) < 900px nên nút Trước/Tiếp theo HIỆN mà không cuộn. (Chưa kiểm bằng mắt.)

### 2.1 Thanh tab + "Đang chọn"
- `WorkspacePage`: thanh tab là **segmented control** (container bo tròn nền tint, tab đang chọn là "viên" nổi `box-shadow`), mỗi tab có icon nhỏ (lưới=Tổng quan, lớp=Flashcard, bàn phím=Quiz); dòng gợi ý nằm bên phải ngoài container. Thanh "Đang chọn:" thành **thẻ full-width**, chip tên thư mục có icon thư mục.

### 2.2 ScopeBar
- Thẻ nền tint nhẹ: icon bộ lọc + "Phạm vi:" + viên đếm "x/y" + chip `[Tất cả] [{N} từ đầu] [Random + ô N inline]`. Dùng **MỘT N chung** (ô N nằm trong chip Random); bỏ ô N tách rời. Giữ props cũ nên không phá caller. Cập nhật `scope-bar.test.tsx` (nhãn chip giờ là "{n} từ đầu").

### 2.3–2.5 Flashcard
- Thẻ điều khiển 2 hàng (segmented chế độ có class is-active + nhóm icon Xáo trộn/Làm lại + thống kê). Khối tiến độ: số "i/total" đậm nhỏ ở trên, thanh ~8px full-width nằm DƯỚI. Thẻ flashcard nền gradient rất nhẹ (token). Nút điều hướng cao ~2.9rem, rộng ~9.5–14rem; Anki = 4 nút chấm cùng kích thước.

### 2.6–2.7 Quiz
- Nhãn **"TIẾN ĐỘ KIỂM TRA" `white-space: nowrap`** (không xuống dòng). Thẻ câu hỏi: dải tiêu đề riêng (đường kẻ dưới) chữ hoa căn giữa; thân cao `min-height: 17rem`, căn giữa dọc. Ô nhập cao `min-height: 3.5rem`, bo ~0.9rem, chữ + placeholder căn GIỮA, viền accent 2px + vòng focus. Hai nút căn giữa.

### 2.8 Sidebar
- Tiêu đề "Quản lý Thư mục" + đường kẻ dưới. Trạng thái chọn ("Tất cả từ vựng" + dòng cây) = **nền tint + viền accent mảnh** (không tô đặc cả khối). Nút sửa/xóa/thêm con hiện khi hover/focus-within và **luôn hiện trên thiết bị cảm ứng** (`@media (hover: none)`).

### 2.9 Icon
- Thêm icon SVG inline vào `shared/ui/icons`: grid, layers, keyboard, folder, chevron, sliders, skip, arrow-left, arrow-right (+ export qua `shared/ui`). Không thêm thư viện.

### 2.10 Mobile
- Tab bar + ScopeBar cuộn ngang trong khối riêng; thẻ flashcard/câu hỏi co nhỏ; mobile 320/390 không cuộn ngang trang (cần kiểm bằng mắt).

### Files
- SỬA: `pages/Workspace/{WorkspacePage.tsx,WorkspacePage.css}`, `shared/ui/{ScopeBar.tsx,scope-bar.css,icons/index.tsx,index.ts}`, `features/flashcard/ui/flashcard.css`, `features/quiz/ui/quiz.css`, `features/folder-tree/ui/folder-tree.css`, `tests/unit/scope-bar.test.tsx`.

### Kiểm chứng
- `npm run typecheck`: **0 lỗi**. `npm test`: **71/71 pass**. `npm run lint`: **0 lỗi, 2 cảnh báo** react-refresh cũ. `npm run build`: **OK** — 125 modules.
- CẦN XEM BẰNG MẮT: tab segmented có icon + viên nổi; ScopeBar một N (chip Random có ô số); thẻ điều khiển 2 hàng; thanh tiến độ nằm dưới số; nhãn "TIẾN ĐỘ KIỂM TRA" không xuống dòng; sidebar nền tint khi chọn; độ cao thẻ vừa cửa sổ ~900px; mobile 320/390 không cuộn ngang.

## Commit 3 — Quick Add đủ trường (tab Tổng quan) ✅

Đối chiếu `backend/src/validators/vocabulary.ts`: `createVocabularySchema` ĐÃ có đủ các trường word/meaning (bắt buộc), reading, sinoVietnamese, example, exampleMeaning, note, jlptLevel (N1–N5), folderIds — nên KHÔNG cần sửa BE/DTO. Chỉ bổ sung ở FE.

### Trường & bố cục form
- Hàng 1: Từ vựng* | Cách đọc | Âm Hán Việt | Nghĩa tiếng Việt*.
- Hàng 2: Câu ví dụ (textarea 2 dòng) | Dịch câu ví dụ (textarea 2 dòng).
- Hàng 3: JLPT | Ghi chú | nút "Thêm từ" (căn phải).

### Hành vi (hàm thuần `model/normalize.ts` + test)
- `trimToNull` (trim 2 đầu, rỗng → null) + `normalizeQuickAdd` (word/meaning trim; các trường tùy chọn trim→null). **Âm Hán Việt LƯU NGUYÊN như gõ** (chỉ trim); IN HOA chỉ bằng CSS lúc hiển thị (`.kn-qadd__sino` / `.kn-vtable__sino` `text-transform: uppercase`).
- Chống trùng (word + reading) giữ nguyên ở `useVocabulary`; báo lỗi ngay dưới form. Thêm xong: xóa các ô CHỮ, **GIỮ JLPT**, focus lại ô Từ (qua `document.getElementById('qa-word')`).
- **IME-safe:** ô một dòng Enter → submit (qua form onSubmit); đang gõ IME (`isComposing` hoặc `keyCode 229`) → chặn submit. Textarea: Ctrl/Cmd+Enter → submit; Enter thường = xuống dòng.

### Danh sách
- `VocabularyList` thêm cột **Âm Hán Việt**; câu ví dụ hiện thành **dòng phụ mờ, cắt bớt (ellipsis)** dưới Nghĩa (`.kn-vtable__example`). Mobile: bảng cuộn ngang trong `.kn-vlist` (overflow-x auto).

### Files
- MỚI: `features/vocabulary/model/normalize.ts`.
- SỬA: `features/vocabulary/model/useVocabulary.ts` (QuickAddInput + quickAdd nhận sinoVietnamese/example/exampleMeaning), `features/vocabulary/ui/{QuickAddForm.tsx,VocabularyList.tsx,vocabulary.css}`, `tests/unit/vocabulary.test.ts`.

### Kiểm chứng
- `npm run typecheck`: **0 lỗi**. `npm test`: **73/73 pass** (+2: trimToNull + normalizeQuickAdd). `npm run lint`: **0 lỗi, 2 cảnh báo** react-refresh cũ. `npm run build`: **OK** — 126 modules.
- CẦN XEM BẰNG MẮT: form 3 hàng đủ trường; gõ IME xong Enter KHÔNG submit khi đang gõ dở; thêm xong focus về ô Từ + giữ JLPT; cột Âm Hán Việt IN HOA; dòng ví dụ mờ cắt bớt; mobile bảng cuộn ngang.

## Commit 4 — Import, phần lõi THUẦN + test (features/vocabulary/model/import/) ✅

Toàn bộ là hàm THUẦN (không DOM/DB), tái dùng `trimToNull` (normalize) + `dedupeKey` (dedupe) đã có. UI nhập nằm ở Commit 5.

### Parse (`import/parse.ts`)
- `parseCsv(text, delimiter?)`: máy trạng thái đúng **RFC 4180** (ô trong `"`, `""` = một dấu nháy, xuống dòng trong ô, CRLF/CR/LF), bỏ **BOM**, tự **dò dấu phân cách** `, ; Tab` ở dòng đầu (ngoài dấu nháy; mặc định phẩy).
- `parseDelimited(text, {colSep, rowSep})`: tách đơn giản cho ô dán (mặc định Tab × xuống dòng kiểu Quizlet; hỗ trợ cột `, | Tab/Tùy chọn`, dòng `xuống dòng ; /Tùy chọn`), chuẩn hóa CRLF, bỏ dòng rỗng.
- `parseMarkdownTable(text)`: bảng pipe, bỏ dòng ngăn `|---|`, trim ô.

### Ánh xạ cột (`import/columns.ts`)
- `normalizeHeader` (thường + bỏ dấu + đ→d) + bí danh tiêu đề cho từng đích; `detectHeaderMapping` (null nếu không ô nào khớp → coi như không có tiêu đề); `defaultMappingByPosition` (2 cột = [Từ, Nghĩa]; ≥3 cột theo `TEMPLATE_ORDER`); `mapRowsToRecords` (bỏ tiêu đề/dòng rỗng, giữ số dòng gốc 1-based).

### Kiểm tra & giới hạn (`import/validate.ts`)
- `buildPreview(rows, existingKeys)`: Mới / **Trùng** (bỏ qua — so `dedupeKey` với DB còn sống VÀ các dòng Mới trước đó trong file) / **Lỗi** (thiếu Từ hoặc Nghĩa, kèm lý do + số dòng); `normalizeJlpt` chấp nhận N1–N5 không phân biệt hoa/thường (cả "n 3"), sai → null + cảnh báo (KHÔNG phải lỗi). Tổng kết tính trên TẤT CẢ dòng.
- `MAX_IMPORT_ROWS=5000`, `MAX_IMPORT_BYTES=2MB`, `byteLength` (TextEncoder), `hasReplacementChar` (U+FFFD → cảnh báo không phải UTF-8), `clampRows` (cắt theo giới hạn dòng).

### Mẫu (`import/template.ts`)
- `buildTemplateCsv()` (BOM UTF-8 + tiêu đề `Từ,Cách đọc,Âm Hán Việt,Nghĩa,Câu ví dụ,Dịch câu ví dụ,JLPT,Ghi chú` + 2 dòng ví dụ, CRLF) và `buildTemplateMarkdown()`.

### Files
- MỚI: `features/vocabulary/model/import/{types.ts,parse.ts,columns.ts,validate.ts,template.ts,index.ts}`, `tests/unit/import.test.ts` (14 ca).

### Kiểm chứng
- `npm run typecheck`: **0 lỗi**. `npm test`: **87/87 pass** (+14 import). `npm run lint`: **0 lỗi, 2 cảnh báo** react-refresh cũ. `npm run build`: **OK** (126 modules; lõi import chưa vào bundle app vì UI dùng ở Commit 5).

## Commit 5 — Import UI 3 bước + ghi IndexedDB 1 transaction + sync đẩy theo lô ✅

### Kết quả kiểm tra giới hạn push (ĐÃ kiểm theo yêu cầu)
- `backend/src/server.ts` dùng `Fastify({ logger })` — **KHÔNG đặt `bodyLimit`** ⇒ áp mặc định **1 MiB (1048576 bytes)** cho body `POST /api/sync/push`.
- `backend/src/validators/sync.ts` `pushBodySchema`: hai mảng `folders`/`vocabularies` **KHÔNG có `.max()`** ⇒ Zod không chặn số lượng; chặn thực tế là bodyLimit ở trên.
- `runSync` cũ đẩy TẤT CẢ bản ghi bẩn trong MỘT lần ⇒ import lớn (tới 5000 từ) dễ vượt 1 MiB → 413 `FST_ERR_CTP_BODY_TOO_LARGE`. ⇒ **cần đẩy theo lô** (đã làm, KHÔNG đổi backend/giao thức sync).

### UI nhập (features/vocabulary/ui/ImportModal.tsx) — 3 bước
1. **Nguồn:** dán văn bản hoặc chọn file (CSV/TSV/MD/dán Quizlet) + nút **Tải mẫu CSV / Markdown** (Blob + `<a download>`, KHÔNG gọi server). 4 trạng thái: đang đọc file / lỗi đọc file / rỗng / sẵn sàng. Tự chọn parser: có dòng ngăn `|---|` → `parseMarkdownTable`, còn lại → `parseCsv` (tự dò `, ; Tab`).
2. **Cột & xem trước:** dropdown ánh xạ từng cột, công tắc "Dòng đầu là tiêu đề", chọn **Thư mục đích** (mặc định theo phạm vi đang chọn; "Tất cả từ vựng" = không gán). Bảng xem trước **50 dòng đầu** gắn nhãn Mới/**Trùng**/**Lỗi** + cảnh báo JLPT; tổng kết `{total} dòng: {new} mới · {dup} trùng · {err} lỗi` tính trên **TẤT CẢ** dòng. Cảnh báo cắt dòng (>5000) và không-UTF-8.
3. **Kết quả:** `Đã thêm {n} · Bỏ qua (trùng) {d} · Lỗi {e}` + danh sách dòng lỗi.
- Hộp thoại **remount mỗi lần mở** (parent render có điều kiện) nên không cần effect reset (tránh lỗi lint "setState trong effect"). Dùng Modal primitive (Esc/click nền đóng, khóa bàn phím).

### Ghi IndexedDB (features/vocabulary/model/import/assemble.ts + useVocabulary.importNew)
- `assembleImportVocabularies(records, folderId, baseIso, makeId)` THUẦN: `id = makeId()` (dùng `newVocabId` thật → test 5000 id KHÔNG trùng); `createdAt` TĂNG DẦN theo thứ tự dòng (`base + chỉ số` ms), `updatedAt = createdAt`; `srs*` = null (không đụng SM-2); `folderIds` là mảng RIÊNG mỗi bản.
- `useVocabulary.importNew(records, folderId)`: GHI chỉ dòng Mới qua `putVocabulariesLocal` (**MỘT transaction**), `emitDataChanged()` **MỘT lần**, rồi `reload()`. Trả về số đã thêm.

### Sync đẩy theo lô (features/sync/model/engine.ts + runSync.ts)
- Thêm hàm THUẦN `chunk(items, size)` và `highWaterMarkAfter(sortedAsc, pushedCount, previous)` (con trỏ an toàn: mốc muộn nhất mà MỌI bản `<=` nó đã đẩy, không lùi dưới `previous`; cắt ngang mốc trùng → lùi về `< ranh giới`, push lại idempotent).
- `runSync`: gộp folders+vocabularies thành MỘT dòng thời gian tăng theo `updatedAt`, đẩy từng lô `PUSH_BATCH_SIZE=200`; **sau MỖI lô thành công** lưu `lastPushedAt` an toàn ⇒ lô sau lỗi KHÔNG mất phần chưa đẩy (vòng kế đẩy tiếp). LWW/idempotent/tombstone giữ nguyên.

### Files
- MỚI: `features/vocabulary/ui/ImportModal.tsx`, `features/vocabulary/ui/import.css`, `features/vocabulary/model/import/assemble.ts`, `tests/unit/import-write.test.ts`, `tests/unit/sync-batch.test.ts`.
- SỬA: `features/vocabulary/model/import/index.ts` (export assemble), `features/vocabulary/model/useVocabulary.ts` (+`importNew`), `features/vocabulary/ui/VocabularyOverview.tsx` (nút "Nhập từ file / dán" + mount modal có điều kiện + `existingKeys`), `features/sync/model/engine.ts` (+chunk/highWaterMarkAfter), `features/sync/model/runSync.ts` (đẩy theo lô).

### Kiểm chứng
- `npm run typecheck`: **0 lỗi**. `npm test`: **99/99 pass** (16 file; +4 import-write, +8 sync-batch). `npm run lint`: **0 lỗi, 2 cảnh báo** react-refresh cũ. `npm run build`: **OK** (134 modules). KHÔNG đổi SM-2/sync-grading/local-first/quiz; không thêm dependency; không file tạm.
- CẦN XEM BẰNG MẮT: mở "Nhập từ file / dán"; dán TSV Quizlet / CSV / bảng Markdown; đổi ánh xạ cột + thư mục đích; bảng xem trước Mới/Trùng/Lỗi; nhập xong thấy từ mới trong danh sách; gõ IME ở ô dán không bị submit ngoài ý muốn.

---

# Phiên bàn giao mới — 6 commit sửa lỗi dữ liệu + UX (đang làm)

> Đánh số commit RIÊNG cho phiên này (KHÁC "Commit 1–5" ở trên — đó là phiên bố cục KotoBase trước). Làm theo thứ tự 1→6, mỗi mục một commit; typecheck + test + lint + build sạch rồi mới commit.

## [Phiên mới] Commit 1 — Xóa dây chuyền + sửa thứ tự đẩy đồng bộ (FK) ✅

### Nguyên nhân THẬT (chẩn đoán từ code, CHƯA chạy BE/Postgres thật)
- **"Xóa thư mục không đồng bộ":** `useFolderTree.remove` cũ chỉ tombstone ĐÚNG MỘT thư mục; con cháu + ~880 từ vẫn sống (local + server). `tree.ts > effectiveParentId` lại re-root thư mục con mồ côi lên gốc ⇒ xóa "Kanji N3" xong 11 thư mục con nhảy lên gốc, trông như không xóa. (Tombstone cũ ĐÃ đặt `updatedAt=now` nên bản thân nó vẫn đẩy được — giả thuyết "quên updatedAt" KHÔNG phải lỗi đang xảy ra; vẫn thêm test chốt bất biến.)
- **"Lỗi đồng bộ" đỏ:** `runSync` cũ trộn folders+vocab theo `updatedAt` rồi chia lô 200 (mỗi lô một request/transaction). Một thư mục con có thể vào lô TRƯỚC thư mục cha ⇒ BE pha B `setParentId` trỏ `parent_id` tới cha chưa tồn tại ⇒ **FK violation** ⇒ push ném ⇒ SyncStatus đỏ. (Link vocab→folder đã lọc theo folder tồn tại nên không ném, nhưng vocab lên trước folder thì MẤT liên kết thầm lặng.)

### Thay đổi
- **1d Xóa dây chuyền (THUẦN):** `features/folder-tree/model/cascade.ts > planFolderCascade(folders, vocabs, rootId, now)` — tombstone gốc + con cháu; từ còn thư mục khác → giữ + cắt `folderIds`; từ hết thư mục → tombstone; mọi bản ghi `updatedAt=now`. Trả `counts {folders, childFolders, vocabTombstoned, vocabKept}`.
- `useFolderTree.remove` áp plan qua `idbBulkPutMany` (MỘT transaction đa-store) + emit MỘT lần; thêm `planRemove` (dry-run) cho hộp xác nhận. `FolderTreeItem` hiện: "Xóa «tên»? Sẽ xóa {F} thư mục con và {V} từ vựng. {K} từ … giữ lại. Không thể hoàn tác."
- `shared/lib/idb.ts > idbBulkPutMany(db, writes[])`: ghi nhiều store trong MỘT transaction (nguyên tử).
- **tombstoneVocabularies** dùng chung cho Commit 4: `entities/vocabulary/model/tombstone.ts` (lõi THUẦN `markTombstoned` + wrapper DB emit một lần).
- **1b Thứ tự đẩy:** `engine.ts > orderFoldersParentsFirst` (cha trước con theo độ sâu); `runSync` đẩy **TẤT CẢ folder trước (cha→con), rồi vocabulary**; con trỏ `lastPushedAt` chỉ dời SAU khi đẩy xong toàn bộ (ordering không còn tăng theo updatedAt; lô lỗi → giữ con trỏ, vòng sau đẩy lại — push idempotent).
- **1c Lỗi đồng bộ rõ ràng:** `SyncProvider` `console.error` đầy đủ + `describeSyncError` (ApiError → "HTTP {status} · {message}") hiện trong tooltip SyncStatus; nút "Đồng bộ ngay" vẫn là retry.

### Files
- MỚI: `features/folder-tree/model/cascade.ts`, `entities/vocabulary/model/tombstone.ts`, `tests/unit/folder-cascade.test.ts` (9 ca), `tests/unit/sync-order.test.ts` (4 ca).
- SỬA: `shared/lib/idb.ts` (+idbBulkPutMany) + `shared/lib/index.ts`; `entities/vocabulary/{model/index.ts,index.ts}` (export tombstone); `features/folder-tree/model/useFolderTree.ts` (remove dây chuyền + planRemove); `features/folder-tree/ui/FolderTreeItem.tsx` (hộp xác nhận F/V/K); `features/sync/model/engine.ts` (+orderFoldersParentsFirst), `runSync.ts` (folder-trước-vocab), `SyncProvider.tsx` (lỗi rõ + console.error).

### Kiểm chứng
- `npm run typecheck`: **0 lỗi**. `npm test`: **112/112 pass** (18 file; +9 folder-cascade, +4 sync-order). `npm run lint`: **0 lỗi, 2 cảnh báo** react-refresh cũ. `npm run build`: **OK** (136 modules). KHÔNG thêm dependency; KHÔNG đổi SM-2/chấm quiz; KHÔNG file tạm.
- CHƯA kiểm được bằng chạy thật: tái hiện với BE+Postgres (xem payload `/api/sync/push`, bảng `folders.deleted_at`) — cần BE chạy. CẦN XEM BẰNG MẮT: xóa thư mục cha → hộp xác nhận số đúng; con + từ biến mất; sau khi đồng bộ không hồi sinh; header không còn "Lỗi đồng bộ" khi import lớn.

## [Phiên mới] Commit 2 — Sửa modal "Nhập từ file / dán" tràn khung ✅

### Nguyên nhân
- Modal primitive cũ `max-width: 28rem` nhưng `.kn-import` ép `min-width: min(44rem, 80vw)` ⇒ nội dung (lưới 8 ô + bảng ~900px) TRÀN ra ngoài khung, đè nền mờ; không có vùng cuộn thân nên footer dính đáy.

### Thay đổi
- **Modal primitive** (`shared/ui/primitives/Modal.tsx` + `primitives.css`): thêm prop `size` ('sm' mặc định | 'lg') và `headerExtra` (slot cố định dưới tiêu đề). Cấu trúc flex cột: **header cố định** (tiêu đề + headerExtra) / **thân cuộn** (`overflow:auto`, `min-height:0`) / **footer cố định** (đường kẻ trên, nút canh phải). Lớp phủ `display:grid; place-items:center`, `z-index:1000` (trên header/sidebar dính của Commit 3). `size=lg`: `width: min(64rem, calc(100vw - 2rem))`, `max-height: calc(100dvh - 2rem)`.
- **ImportModal**: dùng `size="lg"`, chuyển thanh bước 1·2·3 vào `headerExtra` (cố định, không cuộn). Thứ tự thân giữ đúng: lưới ánh xạ → hàng tùy chọn (tiêu đề + thư mục đích) → tổng kết → bảng xem trước.
- **import.css**: bỏ `min-width` ép rộng (`min-width:0; width:100%`), lưới `minmax(11rem,1fr)` + con `min-width:0`, select `width:100%`; bảng xem trước container cuộn riêng `max-height:40vh`, `table-layout:fixed`, thead dính, ô dài cắt ellipsis (cột cuối xuống dòng); `@media (max-width:40rem)` lưới 1 cột.

### Files
- SỬA: `shared/ui/primitives/Modal.tsx`, `shared/ui/primitives/primitives.css`, `features/vocabulary/ui/ImportModal.tsx`, `features/vocabulary/ui/import.css`.

### Kiểm chứng
- `npm run typecheck`: **0 lỗi**. `npm test`: **112/112 pass** (không đổi). `npm run lint`: **0 lỗi, 2 cảnh báo** react-refresh cũ. `npm run build`: **OK** (136 modules).
- CẦN XEM BẰNG MẮT (không kiểm được bằng unit test): modal căn giữa, không tràn/không đè nền; footer "Quay lại / Nhập N từ" cố định đáy; thân cuộn, KHÔNG cuộn ngang ở 1280/1024/390px; hộp xác nhận (size sm) vẫn gọn.

## [Phiên mới] Commit 3 — Phần 3A: Header dính + sidebar dính (chỉ CSS/layout) ✅
- Token `--kn-header-h: 3.5rem` (tokens.css); header `sticky top:0 z-index:30`, nền đặc, grid 3 cột: logo | giữa trống (min-width:0, chừa cho 3B) | SyncStatus+theme.
- Sidebar desktop `sticky` dưới header, `max-height` theo viewport; FolderTree tách 3 vùng: đầu cố định (tiêu đề + "Tất cả từ vựng") · `.kn-ftree__scroll` cuộn riêng · ô "Thư mục mới" cố định đáy.
- Mobile ≤48rem: ngăn kéo z-index 60, scrim 50 (đều trên header); không tổ tiên nào đặt overflow nên sticky chạy.
- Kiểm: typecheck 0 lỗi · test 112/112 · lint 0 lỗi (2 cảnh báo cũ) · build OK.

## [Phiên mới] Commit 4 — Phần 3B: Chuyển ô tìm kiếm lên header ✅
- `app/HeaderSearch.tsx` (+css): ô tìm kiếm trên header (icon kính lúp SVG, nút ×), flex:1 max-width 32rem; đọc/ghi URL param `q` (useSearchParams, replace, giữ `tab`).
- Chia sẻ qua `q`: WorkspacePage đọc `q` → prop `query` cho VocabularyOverview; Overview dùng prop thay state nội bộ, GIỮ debounce 300ms + filterVocabularies cũ.
- Xóa ô tìm kiếm khỏi VocabularyFilters (chỉ còn JLPT); thêm `SEARCH_PARAM='q'` + IconSearch/IconClose. Gõ ở tab khác → tab=overview (replace).
- Kiểm: typecheck 0 lỗi · test 112/112 · lint 0 lỗi (2 cảnh báo cũ) · build OK (138 modules).
- Chỉnh 3B (phản hồi): ô tìm kiếm canh GIỮA header + đưa bộ lọc JLPT lên header cạnh ô tìm kiếm, chia sẻ qua URL param `jlpt` (parseJlpt + JLPT_LEVELS ở shared/api); gỡ VocabularyFilters (đã rỗng). test 112/112 · build OK (140 modules).
