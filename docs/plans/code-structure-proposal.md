# Đề xuất cấu trúc mã — Giai đoạn 0

> **Phạm vi ban đầu:** tài liệu và kiểm kê. **Superseded:** đề xuất bounded context/use case bên dưới không còn là Target. **Quyết định owner mới nhất:** gộp Stage 1–3, chỉ khởi tạo backend Platform + Library; không tạo frontend và không chạm recognition. Backend dùng quyết định riêng của project `Route -> Controller -> Service -> Repository -> Kysely -> PostgreSQL` với các thư mục layer trực tiếp dưới `backend/src`; Fastify không quy định đây là layout phổ quát. **Current/Assumption** lịch sử bên dưới chỉ là ảnh chụp Stage 0 và không được diễn giải là code hiện còn tồn tại.

## 1. Nguồn và phương pháp

Đã đọc `AGENTS.md`, `docs/AI_WORK_LOG.md`, toàn bộ `docs/prd.md` §18, `docs/database-design.md` §3/§8, toàn bộ `docs/plans/*.md`, `docs/ui-flow-design.md`, `docs/frontend-prd.md`, `docs/frontend-implementation-plan.md`, `docs/skills/learning-experience-ui-skill.md`, và `docs/kanji-recognizer-ui-direction.md`. Số dòng lấy bằng PowerShell `Get-Content`; vai trò được xác minh từ import/export, declaration và thân hàm. `dist/`, `node_modules/`, lockfile và binary asset không được dùng để đánh giá trách nhiệm mã.

## 2. Current — kiểm kê backend

### 2.1 Runtime, platform và domain thuần

| File (dòng) | Việc thật đã xác minh | Wrapper? |
|---|---|---|
| `backend/src/app/build-app.ts` (33) | Tạo Fastify, health/capabilities, error handler, đăng ký Learning routes | Composition root, không phải pass-through |
| `backend/src/config/env.ts` (14) | Parse/validate DB, host, port, log level bằng Zod | Không |
| `backend/src/entrypoints/cli.ts` (17) | Chạy migrate/baseline/bootstrap owner từ CLI | Thin entrypoint |
| `backend/src/entrypoints/server.ts` (27) | Tạo pool, migrate/bootstrap, listen và graceful shutdown | Thin entrypoint |
| `backend/src/platform/db/kysely.ts` (7) | Tạo Kysely adapter từ `pg` pool | Wrapper adapter |
| `backend/src/platform/db/migrations.ts` (144) | Migration table, checksum, migrate/baseline và bootstrap local owner | Không; infrastructure implementation |
| `backend/src/platform/db/pool.ts` (12) | Tạo `pg.Pool` | Wrapper factory |
| `backend/src/platform/db/tx.ts` (19) | Transaction helper commit/rollback | Wrapper có boundary |
| `backend/src/platform/db/types.ts` (20) | Kiểu DB dùng bởi Kysely | Không; type contract |
| `backend/src/platform/errors/app-error.ts` (28) | `AppError` và Fastify error mapping | Không |
| `backend/src/modules/quiz/scoring.ts` (24) | Chuẩn hóa/chấm reading quiz thuần | Không; domain policy |
| `backend/src/modules/srs/scheduler.ts` (57) | Scheduler/rating transition thuần, versioned | Không; domain policy |

### 2.2 Learning contexts

| File (dòng) | Việc thật đã xác minh | Wrapper? |
|---|---|---|
| `backend/src/modules/learning/routes.ts` (19) | Đăng ký 7 nhóm route Learning | Pure composition wrapper |
| `.../content/repository.ts` (72) | SQL tìm và insert content/revision/metadata | Không |
| `.../content/routes.ts` (23) | Parse HTTP list/import và gọi service | Thin transport wrapper |
| `.../content/schema.ts` (33) | Zod DTO/query/import schemas | Không; contract |
| `.../content/service.ts` (76) | Search/import transaction, context và unique handling | Không; application service |
| `.../courses/repository.ts` (236) | Route handlers + SQL course lifecycle/publish/save | Không; hiện trộn transport/persistence/transaction |
| `.../courses/routes.ts` (7) | Delegates sang service registration | Pure wrapper |
| `.../courses/schema.ts` (32) | Course HTTP schemas/types | Không; contract |
| `.../courses/service.ts` (7) | Delegates sang repository registration | Pure wrapper |
| `.../library/repository.ts` (253) | Route handlers + SQL library/deck/save/archive/delete/rebalance | Không; hiện trộn transport/persistence/transaction |
| `.../library/routes.ts` (7) | Delegates sang service registration | Pure wrapper |
| `.../library/schema.ts` (31) | Library/deck mutation schemas/types | Không; contract |
| `.../library/service.ts` (7) | Delegates sang repository registration | Pure wrapper |
| `.../progress/repository.ts` (36) | Query/rebuild daily progress | Không |
| `.../progress/routes.ts` (14) | Parse HTTP get/rebuild và gọi service | Thin transport wrapper |
| `.../progress/schema.ts` (9) | Progress response schema | Không; contract |
| `.../progress/service.ts` (30) | Owner context + transaction rebuild | Không; application service |
| `.../quiz/repository.ts` (230) | Route handlers + SQL attempt/question/answer/retry | Không; hiện trộn transport/persistence/transaction |
| `.../quiz/routes.ts` (7) | Delegates sang service registration | Pure wrapper |
| `.../quiz/schema.ts` (16) | Quiz HTTP schemas/types | Không; contract |
| `.../quiz/service.ts` (7) | Delegates sang repository registration | Pure wrapper |
| `.../srs/repository.ts` (169) | Route handlers + due queue/rating/event SQL | Không; hiện trộn transport/persistence/transaction |
| `.../srs/routes.ts` (7) | Delegates sang service registration | Pure wrapper |
| `.../srs/schema.ts` (14) | SRS HTTP schemas/types | Không; contract |
| `.../srs/service.ts` (7) | Delegates sang repository registration | Pure wrapper |
| `.../study/repository.ts` (242) | Route handlers + session/start/event/undo SQL | Không; hiện trộn transport/persistence/transaction |
| `.../study/routes.ts` (7) | Delegates sang service registration | Pure wrapper |
| `.../study/schema.ts` (20) | Study HTTP schemas/types | Không; contract |
| `.../study/service.ts` (7) | Delegates sang repository registration | Pure wrapper |
| `.../shared/context-repository.ts` (32) | Resolve local owner/library/content profile context | Không; cross-context persistence helper |
| `.../shared/deck-hierarchy.ts` (49) | Advisory lock và deck parent guard | Không; Library invariant helper |
| `.../shared/idempotency.ts` (49) | Idempotent mutation/replay wrapper | Wrapper có transaction semantics |
| `.../shared/pg-errors.ts` (43) | PostgreSQL error classification/mapping | Adapter helper |
| `.../shared/progress-repository.ts` (23) | Increment daily projection counters | Không; Progress projector helper |
| `.../shared/route-support.ts` (19) | Request ID, parse, status và response helpers | Thin transport helper |
| `.../shared/schema.ts` (4) | Shared mutation response schema | Không; contract |
| `.../shared/transaction.ts` (19) | Learning transaction wrapper trên pool client | Wrapper; trùng ý nghĩa với platform `tx.ts` |

### 2.3 Backend tests và project files

| File (dòng) | Việc thật | Wrapper? |
|---|---|---|
| `backend/test/integration/deck-progress.integration.test.ts` (141) | Deck hierarchy/concurrency và progress integration | Không |
| `backend/test/integration/integration.test.ts` (155) | Learning API integration | Không |
| `backend/test/integration/migration.test.ts` (108) | Migration/checksum/baseline/catalog validation | Không |
| `backend/test/support/response.ts` (5) | Typed response body helper | Test wrapper |
| `backend/test/unit/app.test.ts` (47) | Health/capabilities/error behavior | Không |
| `backend/test/unit/config.test.ts` (19) | Env parsing | Không |
| `backend/test/unit/quiz.test.ts` (15) | Quiz scoring fixtures | Không |
| `backend/test/unit/scheduler.test.ts` (36) | Scheduler deterministic fixtures | Không |
| `backend/package.json` (36), `tsconfig.json` (16), `eslint.config.js` (13) | Scripts/dependencies/compiler/lint contract | Cấu hình |
| `backend/README.md` (33) | Backend setup/commands | Tài liệu |

**Current finding:** `courses/library/quiz/srs/study` có `routes.ts` và `service.ts` 7 dòng chỉ chuyển tiếp, trong khi `repository.ts` 169–253 dòng lại đăng ký HTTP và giữ transaction/SQL. Tên layer không phản ánh việc thật và transaction boundary khó thấy. `content` và `progress` đã gần Target hơn vì transport/application/persistence được tách thực sự.

## 3. Current — kiểm kê frontend

| File (dòng) | Việc thật đã xác minh | Wrapper? |
|---|---|---|
| `frontend/src/main.tsx` (10) | React bootstrap | Thin entrypoint |
| `frontend/src/app/App.tsx` (224) | Recognition state/orchestration/history/capability và switch sang Learning | Không; đang là hai composition concerns |
| `frontend/src/App.css` (392) | Recognition/global visual rules | Không; stylesheet lớn |
| `frontend/src/index.css` (36) | Reset/base tokens | Không |
| `features/recognition/api.ts` (41) | Capability fetch + mock recognition adapter | Adapter, không pure wrapper |
| `features/recognition/mock-data.ts` (113) | Recognition fixture data | Không |
| `features/recognition/types.ts` (39) | Recognition view/DTO types | Không |
| `features/recognition/components/DrawCanvas.tsx` (168) | Canvas drawing/undo/clear/export lifecycle | Không |
| `features/recognition/components/InputPanel.tsx` (153) | Draw/upload controls and input state UI | Không |
| `features/recognition/components/ResultPanel.tsx` (211) | Result/loading/error/candidate UI | Không |
| `features/learning-shell/LearningApp.tsx` (57) | Local view switch và compose 9 learning screens | Composition root |
| `features/learning-shell/ShellLayout.tsx` (65) | Sidebar/header/main layout | Không |
| `features/learning-shell/components.tsx` (36) | Shared learning presentation primitives | Không |
| `features/learning-shell/useLearningWorkspace.ts` (47) | Fetch library/content/courses, debounce, aggregate loading/error/stats | Không; cross-context query orchestrator |
| `features/learning-shell/views.ts` (22) | View union/navigation metadata | Không; contract |
| `features/learning-shell/learning.css` (29) | Learning shell styles | Không |
| `features/content/api.ts` (17) | Content list/import calls | API adapter |
| `features/content/types.ts` (13) | Content types | Contract |
| `features/content/ImportView.tsx` (69) | Import form/status | Không |
| `features/content/NotebookView.tsx` (40) | Content notebook list | Không |
| `features/courses/api.ts` (28) | Course list/create/publish/save calls | API adapter |
| `features/courses/CoursesView.tsx` (48) | Courses UI | Không |
| `features/library/api.ts` (47) | Library/deck/item mutation calls | API adapter |
| `features/library/DeckTree.tsx` (35) | Recursive deck tree UI | Không |
| `features/library/LibraryView.tsx` (96) | Library list and deck mutations | Không |
| `features/progress/DashboardView.tsx` (42) | Derived dashboard presentation | Không |
| `features/quiz/api.ts` (52) | Quiz session/answer/complete/retry calls | API adapter |
| `features/quiz/QuizStates.tsx` (47) | Empty/loading/error/completed states | Không |
| `features/quiz/QuizView.tsx` (36) | Quiz composition | Thin view composition |
| `features/quiz/useQuiz.ts` (64) | Quiz state/effects/actions | Không |
| `features/study/api.ts` (65) | Study and SRS endpoints | API adapter đang gộp hai contexts |
| `features/study/StudyStates.tsx` (26) | Study loading/empty/error states | Không |
| `features/study/StudyView.tsx` (87) | Practice/SRS shared presentation | Không; đang gộp Study và SRS modes |
| `features/study/useStudySession.ts` (48) | Practice session behavior | Không |
| `features/study/useReviewQueue.ts` (29) | SRS due/rating behavior | Không |
| `frontend/src/shared/api/http-client.ts` (43) | Base HTTP/error/JSON parsing | Shared adapter |
| `frontend/package.json` (30), `tsconfig*.json` (7/26/23), `eslint.config.js` (22), `vite.config.ts` (12) | Build/type/lint/proxy contract | Cấu hình |
| `frontend/README.md` (75) | Frontend setup/commands | Tài liệu |

**Current finding:** frontend đã chia theo feature nhưng shell dùng enum/local state thay router; workspace hook kéo ba contexts; Study và SRS dùng chung API/view. Recognition vẫn nằm trong `App.tsx`, nhưng tác vụ này không chạm hay đề xuất di chuyển implementation recognition ở các giai đoạn đầu.

## 4. Target — bounded contexts phẳng và cây đích

Backend dùng các bounded context **phẳng, trực tiếp** dưới `backend/src/<context>/`: `identity`, `content`, `courses`, `library`, `study`, `srs`, `quiz`, `progress`. Không có tầng gom context. `platform/` là nơi duy nhất chứa hạ tầng dùng chung; không tạo shared business repository. Không áp một template layer cố định cho mọi context: mỗi context chỉ có các file/folder có ý nghĩa theo use case thực tế, context nhỏ có thể chỉ cần 2–3 file. Route mỏng, chỉ parse/map/dispatch và không chứa SQL; SQL nằm trong file use-case/query cùng context. Transaction boundary nằm ở use case sở hữu thay đổi.

```text
backend/src/
  app/
    build-app.ts
    register-contexts.ts
  identity/
    context-query.ts
    routes.ts
  content/
    routes.ts
    schema.ts
    list-content.ts
    import-content.ts
  courses/
    routes.ts
    schema.ts
    course-commands.ts
  library/
    routes.ts
    schema.ts
    library-commands.ts
    deck-hierarchy.ts
  study/
    routes.ts
    schema.ts
    session-commands.ts
  srs/
    routes.ts
    schema.ts
    review-commands.ts
    scheduler.ts
  quiz/
    routes.ts
    schema.ts
    quiz-commands.ts
    scoring.ts
  progress/
    routes.ts
    schema.ts
    progress-query.ts
    projector.ts
  platform/
    config/env.ts
    db/{kysely,migrations,pool,tx,types,pg-errors}.ts
    errors/app-error.ts
    http/{route-support,mutation-schema}.ts
  entrypoints/{cli,server}.ts
backend/test/{unit,contract,integration,support}
frontend/src/
  app/
  components/                  # presentation dùng chung
  features/
    recognition/               # giữ nguyên; mock ngoài capability read
    content/
    courses/
    library/
    study/
    srs/
    quiz/
    progress/
    learning-shell/
  shared/api/http-client.ts    # HTTP client dùng chung được giữ lại
```

Cây frontend tiếp tục tổ chức theo feature nhưng không bắt mỗi feature phải có `api/types/hooks` hay bất kỳ bộ thư mục cố định nào. File dùng chung thực sự chuyển về `components/`; HTTP client dùng chung có thể tiếp tục ở `shared/api/`.

### Target transaction boundaries

1. Library deck create/rename/archive/move/reorder: một use case, per-library advisory lock + optimistic version + audit/outbox cùng transaction.
2. Save/remove membership: canonical item + saved item + membership commit atomically; không copy image/ink.
3. Study start/quiz start: snapshot ordered items/questions atomically; order immutable sau commit.
4. Practice classify: event + cursor atomically, không mutate SRS.
5. SRS rate: immutable review event + state + cursor + outbox atomically; scheduler vẫn pure.
6. Quiz complete: lock answers + pinned scoring version + score + outbox atomically.
7. Progress: projector tiêu thụ event idempotently; rebuild phải tương đương.
8. Privacy delete: policy sau này phải sở hữu transaction/workflow rõ ràng; không tạo context ngoài tám context bắt buộc chỉ để chứa helper.

## 5. Target — mapping từng file hiện tại

Ký hiệu: **Move** = đổi vị trí không đổi hành vi trước; **Split** = cần tách trách nhiệm ở giai đoạn sau; **Keep** = giữ.

### Backend mapping

Tất cả đường dẫn Target dưới đây nằm dưới `backend/src/` trừ khi ghi rõ. **Stage 1 chỉ move/rename, không đổi logic:** chuyển file từ `modules/learning`, `modules/srs`, `modules/quiz`; xóa wrapper chuyển tiếp rỗng; file `repository.ts` đang trộn route + SQL được đổi tên tạm thành `routes.ts` trong đúng context, chưa tách SQL. Các hành động Split chỉ diễn ra ở stage context tương ứng sau đó.

| Current | Target | Stage/hành động |
|---|---|---|
| `app/build-app.ts` | `app/build-app.ts` | Keep |
| `config/env.ts` | `platform/config/env.ts` | Stage 1 Move |
| `entrypoints/{cli,server}.ts` | `entrypoints/{cli,server}.ts` | Keep |
| `platform/db/{kysely,migrations,pool,tx,types}.ts` | cùng đường dẫn | Keep |
| `platform/errors/app-error.ts` | cùng đường dẫn | Keep |
| `modules/learning/routes.ts` | `app/register-contexts.ts` | Stage 1 Move/rename |
| `modules/learning/content/schema.ts` | `content/schema.ts` | Stage 1 Move |
| `modules/learning/content/routes.ts` | `content/routes.ts` | Stage 1 Move |
| `modules/learning/content/service.ts` | `content/import-content.ts` | Stage 1 Move/rename, giữ logic; Stage 8 có thể tách theo use case |
| `modules/learning/content/repository.ts` | `content/content-query.ts` | Stage 1 Move/rename, giữ SQL cùng context |
| `modules/learning/courses/schema.ts` | `courses/schema.ts` | Stage 1 Move |
| `modules/learning/courses/repository.ts` | `courses/routes.ts` | Stage 1 Move/rename tạm, giữ route + SQL; Stage 9 tách `course-commands.ts` nếu có ích |
| `modules/learning/courses/{routes,service}.ts` | không có | Stage 1 xóa forwarding wrappers rỗng sau khi nối registration trực tiếp |
| `modules/learning/library/schema.ts` | `library/schema.ts` | Stage 1 Move |
| `modules/learning/library/repository.ts` | `library/routes.ts` | Stage 1 Move/rename tạm, giữ route + SQL; Stage 3 tách file theo use case/query cần thiết |
| `modules/learning/library/{routes,service}.ts` | không có | Stage 1 xóa forwarding wrappers rỗng |
| `modules/learning/study/schema.ts` | `study/schema.ts` | Stage 1 Move |
| `modules/learning/study/repository.ts` | `study/routes.ts` | Stage 1 Move/rename tạm, giữ route + SQL; Stage 4 tách file theo use case/query cần thiết |
| `modules/learning/study/{routes,service}.ts` | không có | Stage 1 xóa forwarding wrappers rỗng |
| `modules/learning/srs/schema.ts` | `srs/schema.ts` | Stage 1 Move |
| `modules/learning/srs/repository.ts` | `srs/routes.ts` | Stage 1 Move/rename tạm, giữ route + SQL; Stage 5 tách `review-commands.ts` nếu có ích |
| `modules/learning/srs/{routes,service}.ts` | không có | Stage 1 xóa forwarding wrappers rỗng |
| `modules/srs/scheduler.ts` | `srs/scheduler.ts` | Stage 1 Move, giữ pure API |
| `modules/learning/quiz/schema.ts` | `quiz/schema.ts` | Stage 1 Move |
| `modules/learning/quiz/repository.ts` | `quiz/routes.ts` | Stage 1 Move/rename tạm, giữ route + SQL; Stage 6 tách `quiz-commands.ts` nếu có ích |
| `modules/learning/quiz/{routes,service}.ts` | không có | Stage 1 xóa forwarding wrappers rỗng |
| `modules/quiz/scoring.ts` | `quiz/scoring.ts` | Stage 1 Move, giữ pure API |
| `modules/learning/progress/schema.ts` | `progress/schema.ts` | Stage 1 Move |
| `modules/learning/progress/routes.ts` | `progress/routes.ts` | Stage 1 Move |
| `modules/learning/progress/service.ts` | `progress/rebuild-progress.ts` | Stage 1 Move/rename; Stage 7 chỉ tách thêm khi có use case thật |
| `modules/learning/progress/repository.ts` | `progress/progress-query.ts` | Stage 1 Move/rename |
| `modules/learning/shared/context-repository.ts` | `identity/context-query.ts` | Stage 1 Move/rename; Stage 2 xác nhận ownership |
| `modules/learning/shared/deck-hierarchy.ts` | `library/deck-hierarchy.ts` | Stage 1 Move |
| `modules/learning/shared/idempotency.ts` | `platform/db/idempotency.ts` | Stage 1 Move tạm; Stage 2 duyệt primitive dùng chung |
| `modules/learning/shared/pg-errors.ts` | `platform/db/pg-errors.ts` | Stage 1 Move |
| `modules/learning/shared/progress-repository.ts` | `progress/projector.ts` | Stage 1 Move/rename |
| `modules/learning/shared/route-support.ts` | `platform/http/route-support.ts` | Stage 1 Move |
| `modules/learning/shared/schema.ts` | `platform/http/mutation-schema.ts` | Stage 1 Move |
| `modules/learning/shared/transaction.ts` | `platform/db/tx.ts` | Stage 2 hợp nhất sau khi xác nhận tương đương; Stage 1 không đổi logic |
| `test/unit/{app,config}.test.ts` | cùng đường dẫn | Keep |
| `test/unit/quiz.test.ts` | `test/unit/quiz/scoring.test.ts` | Move cùng Stage 6 hoặc sớm hơn nếu chỉ sửa import |
| `test/unit/scheduler.test.ts` | `test/unit/srs/scheduler.test.ts` | Move cùng Stage 5 hoặc sớm hơn nếu chỉ sửa import |
| `test/integration/integration.test.ts` | `test/integration/<context>/*.test.ts` | Tách ở stage context phù hợp, không thuộc Stage 1 |
| `test/integration/deck-progress.integration.test.ts` | test Library và Progress tương ứng | Tách ở Stage 3/7 |
| `test/integration/migration.test.ts`, `test/support/response.ts` | cùng đường dẫn | Keep |
| Backend manifests/config/README | giữ tại `backend/` | Keep; cập nhật path sau move |

### Frontend mapping

Frontend giữ organization theo feature và chỉ đổi khi stage 10–14 yêu cầu; không ép `api/types/hooks` hay template khác. Recognition không di chuyển, không refactor, tiếp tục mock ngoại trừ capability read hiện có.

| Current | Target | Hành động |
|---|---|---|
| `main.tsx`, `app/App.tsx`, `App.css`, `index.css` | giữ đường dẫn hiện tại | Stage 10 chỉ chỉnh composition/folder nếu cần; không kéo recognition ra khỏi `App.tsx` |
| `features/recognition/**` | giữ nguyên toàn bộ | Untouched/mocked; chỉ capability read hiện có được phép |
| `learning-shell/LearningApp.tsx` | `app/LearningApp.tsx` hoặc giữ tại feature | Stage 10 owner chọn vị trí composition; không bắt buộc router |
| `learning-shell/ShellLayout.tsx` | giữ tại shell nếu app-specific | Stage 10 Move only khi có lợi |
| `learning-shell/components.tsx` | `components/<meaningful-name>.tsx` cho phần thực sự dùng chung | Stage 10 tách theo usage, không tạo template |
| `learning-shell/useLearningWorkspace.ts` | các file truy vấn đặt cạnh feature sử dụng | Stage 10–14 tách dần theo use case, không bắt buộc folder hooks |
| `learning-shell/{views,learning.css}` | giữ/co-locate theo shell | Stage 10 Move only khi có lợi |
| `content/{api,types,ImportView,NotebookView}.*` | giữ dưới `features/content/` | Stage 14 notebook; Stage 10 chỉ structure |
| `courses/{api,CoursesView}.*` | giữ dưới `features/courses/` | Stage 14 courses |
| `library/{api,DeckTree,LibraryView}.*` | giữ dưới `features/library/` | Stage 11 |
| `progress/DashboardView.tsx` | giữ dưới `features/progress/` | Stage 14 dashboard |
| `quiz/{api,QuizStates,QuizView,useQuiz}.*` | giữ dưới `features/quiz/`, co-locate theo use case | Stage 13 |
| `study/api.ts` | `features/study/study-api.ts` + `features/srs/srs-api.ts` nếu việc tách có ý nghĩa | Stage 12 |
| `study/{StudyStates,StudyView,useStudySession}.*` | giữ dưới `features/study/` | Stage 12 |
| `study/useReviewQueue.ts` | `features/srs/useReviewQueue.ts` | Stage 12 Move |
| `shared/api/http-client.ts` | cùng đường dẫn | Keep; shared HTTP client được phép |
| Frontend manifests/config/README | giữ tại `frontend/` | Keep/update docs after migration |

## 6. Target — thứ tự giai đoạn bắt buộc

0. **Stage 0 — inventory:** kiểm kê, proposal, mapping, rủi ro và câu hỏi duyệt; chỉ tài liệu.
1. **Stage 1 — BE folder structure:** chỉ restructure/move từ `modules/learning`, `modules/srs`, `modules/quiz`; xóa forwarding wrappers rỗng; mixed repository route+SQL đổi tên tạm thành routes, tuyệt đối chưa split/chưa đổi logic.
2. **Stage 2 — foundation:** composition và primitive dùng chung dưới `platform/`; xử lý transaction/idempotency sau khi xác nhận tương đương.
3. **Stage 3 — library:** làm mỏng routes, chuyển SQL vào file use-case/query cùng `library/`, bảo toàn transaction.
4. **Stage 4 — study:** tách theo use case có ý nghĩa trong `study/`.
5. **Stage 5 — srs:** giữ scheduler thuần; tách queue/rating/event theo use case có ý nghĩa trong `srs/`.
6. **Stage 6 — quiz:** tách start/answer/complete/retry theo use case có ý nghĩa trong `quiz/`.
7. **Stage 7 — progress:** hoàn thiện query/projector/rebuild trong `progress/`.
8. **Stage 8 — content:** hoàn thiện list/import và SQL cùng `content/`.
9. **Stage 9 — courses:** hoàn thiện lifecycle/publish/save trong `courses/`.
10. **Stage 10 — FE folder structure:** giữ feature organization, chuyển component dùng chung thật sự sang `components/`, không áp template.
11. **Stage 11 — FE library:** chỉnh Library theo use case/UI thực tế.
12. **Stage 12 — FE study/SRS:** tách trách nhiệm Study và SRS nhưng không bắt buộc cấu trúc con cố định.
13. **Stage 13 — FE quiz:** chỉnh Quiz theo use case/UI thực tế.
14. **Stage 14 — FE courses/notebook/dashboard:** chỉnh ba khu vực tương ứng; recognition vẫn untouched/mocked ngoài capability read.
15. **Stage 15 — docs sync:** đồng bộ tài liệu/path/evidence sau refactor.

## 7. Rủi ro và biện pháp

| Rủi ro | Biện pháp Target |
|---|---|
| Working tree đã có nhiều thay đổi chưa commit, dễ misattribute/mất việc | Mỗi stage chụp status/diff, không bulk move khi tree chưa được owner xử lý |
| Đổi tên layer làm đổi route/transaction ngầm | Characterization + contract tests trước, route URL/DTO giữ nguyên |
| Tách repository phá atomicity/advisory lock/idempotency | Application transaction test bằng hai connection và failure injection |
| Circular dependency giữa Study/SRS/Progress | Domain events/ports rõ; Progress chỉ project event; Study không gọi scheduler |
| Courses bị nhập vào Content trái yêu cầu context phẳng | Giữ `courses/` và `content/` là hai context ngang hàng trong cây và mapping |
| Frontend bị ép vào template hoặc dependency mới | Giữ feature organization; chỉ tạo file/folder có ý nghĩa theo use case |
| Recognition regression | Không di chuyển/refactor recognition trong lộ trình 0–15; giữ mock ngoài capability read |
| Docs Current cũ mâu thuẫn working tree | Proposal ghi timestamp/evidence; canonical PRD phải được hiệu chỉnh bằng task riêng nếu cần |

## 8. Assumptions

1. **Assumption:** `ownerMode=local` hiện chỉ là implementation profile, không đóng `LS-OD-01` cho production.
2. **Assumption:** API routes/DTO hiện hữu phải giữ backward compatible trong refactor; chưa có version migration được duyệt.
3. **Assumption:** Fastify, PostgreSQL/Kysely và React/Vite được giữ trong các stage cấu trúc; đây không phải lựa chọn stack mới.
4. **Assumption:** `content` và `courses` có ownership nghiệp vụ liên quan nhưng vẫn là hai context phẳng ngang hàng theo yêu cầu bắt buộc.
5. **Assumption:** Không cần chạy build/test ở Stage 0 vì không sửa product code; validation docs và mapping là đủ cho proposal.

## 9. Câu hỏi quyết định

1. **Owner có duyệt nguyên trạng cây Target với tám context phẳng trực tiếp dưới `backend/src/` và shared infrastructure chỉ dưới `platform/` không?**
2. **Trong Stage 2, owner chọn `platform/db/tx.ts` làm transaction primitive duy nhất hay giữ tạm cả hai helper đến khi có bằng chứng tương đương?**
3. **`identity/context-query.ts` nên chỉ resolve owner/context hiện tại, hay cũng sở hữu bootstrap local-owner đang ở platform migration?**
4. **Idempotency là primitive kỹ thuật dùng chung dưới `platform/db/`, hay nên được co-locate riêng trong từng context sử dụng sau khi Stage 2 kiểm kê call site?**

## 10. Dependencies và exit gate Stage 0

- Dependency: owner duyệt cây Target và trả lời 4 lựa chọn chưa chốt; safety tests trước mọi move; DB decision/privacy/scheduler gates vẫn theo canonical plans.
- Stage 0 đạt khi proposal được review về inventory/mapping/boundaries. Tài liệu này **không** chứng minh PF-001 hoàn tất, không chứng minh Clean Code, runtime DB, browser, accessibility, security, privacy hay release readiness.
