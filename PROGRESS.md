# PROGRESS — Kanji Nest (bàn giao giữa các phiên AI)

> File theo dõi tiến độ để đổi AI giữa chừng không mất ngữ cảnh. Cập nhật sau MỖI
> mục nhỏ: ghi file đã tạo/sửa, việc đang dở, bước tiếp theo. Tiếng Việt, UTF-8.

## Trạng thái tổng quan

| Mục | Nội dung | Trạng thái |
|---|---|---|
| 1 & 2 | Nền backend + CRUD folder/vocabulary (Quick Add chống trùng) | ✅ XONG |
| 3 | BE sync (pull/push, LWW theo `updated_at` + tombstone + delta, idempotent) | ✅ XONG |
| 4 | BE learning: SRS (SM-2 thuần) + quiz (chấm điểm) + endpoints + unit test | ✅ XONG (phiên này) |
| 5 | FE nền (FSD): entities/shared, IndexedDB local-first, api client, app shell (4 trạng thái + theme) | ⬜ CHƯA |
| 6 | FE features: folder-tree, vocabulary Overview + Quick Add, flashcard 3 chế độ, typing quiz, sync client (debounce 3.5s) | ⬜ CHƯA |

## Lưu ý quan trọng (phát hiện trong phiên làm mục 4)

- **Toàn bộ `backend/src` trước đây CHƯA được commit** (git untracked) dù todo ghi mục 1–3 là XONG. Phiên này đã commit lại toàn bộ nền BE (mục 1–3) cùng với mục 4 trong một commit. Từ nay bám đúng quy tắc: commit sau mỗi mục.
- `backend/src/types/database.ts` **đã khớp** `docs/database/schema.sql` (đủ 8 bảng, có kiểu cho `quiz_sessions`/`quiz_attempts`). Typecheck 0 lỗi → KHÔNG cần sửa (khác với giả định "đang sửa dở").
- Có **file rác ở gốc repo tên `showDialog({`** (rỗng, git đang báo deleted ở working tree). KHÔNG đụng tới vì ngoài phạm vi mục 4 — để bạn quyết định xóa khỏi index.
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

## Bước tiếp theo → Mục 5 (FE nền, FSD)

Theo `docs/architecture/frontend.md`:
- `entities` / `shared` nền tảng; model `LocalFolder` / `LocalVocabulary` là nguồn sự thật client (giữ nguyên tên field).
- IndexedDB local-first (bản chính của client).
- api client (gọi BE: folder/vocabulary/flashcard/quiz/sync).
- app shell: 4 trạng thái + theme (dark/light).

## Lệnh nhanh
```bash
# Backend
cd backend && npm run typecheck && npm run test:unit
# Áp schema DB (đọc DATABASE_URL từ .env)
psql "$DATABASE_URL" -f docs/database/schema.sql
```
