# Tasks: Bring the Kanji Nest Workspace to Mobile

Use the [spec](spec.md), [plan](plan.md), [research](research.md), [data model](data-model.md), [contract](contracts/mobile-workspace.md) and [quickstart](quickstart.md). Code paths are relative to the repository root. Evidence paths beginning with `evidence/` are relative to this feature directory. Use disposable data and the current web UI as the reference.

## Phase 1: Setup

- [ ] T001 [P] Prepare synthetic fixtures in `frontend/tests/fixtures/mobile-workspace.ts` for nested folders, multi-folder words, nullable legacy fields, review state, pending edits and tombstones. Capture matched compact web reference screenshots and expected actions in `evidence/web-baseline.md` for all three tabs and both themes.
- [ ] T002 [P] Verify host/toolchain compatibility and pin compatible Capacitor CLI, core, Android and iOS dependencies in `frontend/package.json` and `frontend/package-lock.json`. Record tested SDK, Android Studio, macOS/Xcode and device prerequisites in `quickstart.md`.

## Phase 2: Foundational prerequisites

- [ ] T003 Characterize the sync risks before changing production code in `frontend/tests/unit/mobile-sync.test.ts`: fresh offline write, failing first pull, empty successful pull, partial push, concurrent edits during pull, retry after failed local commit and stale tombstones. Demonstrate the destructive-reset and stale-snapshot regressions with synthetic fixtures.
- [ ] T004 In `frontend/src/shared/lib/idb.ts` and `frontend/src/features/sync/model/runSync.ts`, reconcile incoming records with the latest local rows and commit winners and pull cursor atomically. Preserve the push-before-pull, parent-first and all-batches acknowledgement rules, stable IDs and ADR 0001 tie behavior. Apply [`Device sync progress.lastPushedAt`, `Device sync progress.lastPulledAt`](data-model.md).
- [ ] T005 In `frontend/src/features/sync/model/SyncProvider.tsx`, replace startup cleanup and destructive manual refresh with safe reconciliation, serialize overlapping runs and schedule another pass for edits made in flight. Verify T003 through startup, reconnect and refresh with the old cleanup flag both present and absent.
- [ ] T006 [P] Configure `frontend/capacitor.config.ts` for a stable installation identity, local asset origin and bundled `dist/index.html`. Document a device-reachable HTTPS API base in `quickstart.md` using `frontend/src/shared/config/env.ts`. Verify the disposable API permits the actual package origins while browser development still uses its existing proxy. Keep server credentials out of the bundle.

## Phase 3: US1 — Open the familiar workspace (P1)

Goal and independent check: Install each package, stop Vite, launch from the home screen and compare Overview, Flashcard and Quiz with the same web fixture, viewport and theme (FR-001/002/006, SC-001).

- [ ] T007 [P] [US1] Generate the Android project at `frontend/android/`, configure a development build in its generated Gradle files and install the bundled web build on a physical Android phone.
- [ ] T008 [P] [US1] Generate the iOS project at `frontend/ios/`, configure development signing in the generated Xcode project and install the same bundled web build on a physical iPhone. Use separate build-host checkouts or coordinate asset sync writes.
- [ ] T009 [US1] Exercise initial selection, folder drawer, shared folder scope, tabs, header search, JLPT and themes from `frontend/src/pages/Workspace/WorkspacePage.tsx`. Correct observed layout, inset, focus and keyboard issues in the existing layout and `frontend/src/pages/Workspace/WorkspacePage.css`. Record matched screenshots, keyboard and mobile screen-reader results in `evidence/navigation.md`.

## Phase 4: US2 — Manage a vocabulary library (P1)

Goal and independent check: Use an isolated library on each phone to add, organize, import, edit and reopen words. Compare counts, order, memberships and saved content with web (FR-003/006, SC-002/004).

- [ ] T010 [P] [US2] Verify and correct touch and accessible folder operations in `frontend/src/features/folder-tree/ui/FolderTree.tsx` and vocabulary operations in `frontend/src/features/vocabulary/ui/VocabularyOverview.tsx`. Exercise create, edit, reparent, remove, selection, search, JLPT, sort and page. Preserve [`LocalFolder.id`, `LocalFolder.name`, `LocalFolder.parentId`, `LocalFolder.order`, `LocalFolder.createdAt`, `LocalFolder.updatedAt`, `LocalFolder.deletedAt`](data-model.md) and [`LocalVocabulary.id`, `LocalVocabulary.word`, `LocalVocabulary.meaning`, `LocalVocabulary.reading`, `LocalVocabulary.sinoVietnamese`, `LocalVocabulary.example`, `LocalVocabulary.exampleMeaning`, `LocalVocabulary.note`, `LocalVocabulary.tags`, `LocalVocabulary.jlptLevel`, `LocalVocabulary.folderIds`, `LocalVocabulary.createdAt`, `LocalVocabulary.updatedAt`, `LocalVocabulary.deletedAt`](data-model.md).
- [ ] T011 [P] [US2] Exercise paste and device file import from `frontend/src/features/vocabulary/ui/ImportModal.tsx`. Preserve preview, invalid-row feedback, duplicate decisions, cancellation and final counts. Add a typed file capability only for a demonstrated device gap.
- [ ] T012 [US2] Record web and both physical-device results for T010–T011 in `evidence/library.md`, including offline save, restart, shared folder links, empty search, save failure with retained input and screen-reader word creation.

## Phase 5: US3 — Review cards and complete a quiz (P1)

Goal and independent check: Start with equivalent populated fixtures, fixed study time and session choices. Complete a review and quiz on each target and compare schedules and graded results (FR-004/006, SC-002/004).

- [ ] T013 [P] [US3] Exercise existing modes, reveal, rating, scope and replay in `frontend/src/features/flashcard/ui/FlashcardStudy.tsx` and `frontend/src/shared/ui/SpeakButton.tsx`. Correct demonstrated mobile input/audio gaps and preserve usable study after playback failure. Preserve [`Review progress.srsInterval`, `Review progress.srsRepetition`, `Review progress.srsEaseFactor`, `Review progress.srsNextReview`](data-model.md).
- [ ] T014 [P] [US3] Exercise hint, answer entry, grading, summary and save/failure feedback in `frontend/src/features/quiz/ui/QuizRunner.tsx`. Preserve [`QuizSessionDto.id`, `QuizSessionDto.mode`, `QuizSessionDto.score`, `QuizSessionDto.total`, `QuizSessionDto.startedAt`, `QuizSessionDto.finishedAt`, `QuizSessionDto.createdAt`, `QuizSessionDto.attempts`](data-model.md) and [`QuizAttemptDto.id`, `QuizAttemptDto.vocabularyId`, `QuizAttemptDto.prompt`, `QuizAttemptDto.userAnswer`, `QuizAttemptDto.isCorrect`, `QuizAttemptDto.answeredAt`](data-model.md) using the DTO definitions linked from the model. Keep deterministic regression coverage for any changed grading or scheduling rule.
- [ ] T015 [US3] Record equivalent fixtures, expected and observed review/quiz outcomes, accessible rating and answer submission on web and both devices in `evidence/study.md`.

## Phase 6: US4 — Keep work through an outage (P1)

Goal and independent check: Compare independently prepared stores through a full offline restart, first reconciliation and repeated sync on each platform (FR-005/007/008/009, SC-003/005/006/007).

- [ ] T016 [US4] Expose first-sync progress from `frontend/src/features/sync/model/cursor.ts` through `frontend/src/features/sync/ui/SyncStatus.tsx`. Distinguish pending first sync, failed attempt and confirmed empty library. Allow edits before initial sync and announce state changes. Clear pending only after successful durable reconciliation.
- [ ] T017 [P] [US4] Execute SC-003/006/007 on Android and record build, fixture IDs, folder membership, schedules, tombstones and cursor outcomes in `evidence/android-sync.md`. Include confirmed edits from the offline browser, phone-first offline creation, restart and duplicate-free retry.
- [ ] T018 [P] [US4] Repeat SC-003/006/007 on iPhone against independent test data and record the same comparisons in `evidence/ios-sync.md`.
- [ ] T019 [US4] Rehearse an in-place upgrade with unchanged app identity and populated disposable storage on both devices. In `evidence/recovery.md`, record backup integrity, isolated restore, exact field and pending-work comparisons, usable library/review access and a blocked replacement on failed verification. Apply the same gate before any data-replacing rollout.

## Phase 7: Polish and release evidence

- [ ] T020 Run frontend typecheck, tests and production build from `frontend/package.json`, plus relevant backend sync regressions from `backend/package.json`. Reconcile runnable build, install and acceptance commands in `quickstart.md`.
- [ ] T021 Map FR-001–009 and SC-001–007 to evidence in `evidence/acceptance.md`. Check applicable loading, empty, failure and success states and all four SC-004 actions. Record approved visual differences and outstanding issues. Keep each unavailable platform unverified and retain the existing web release until parity passes.

## Dependencies and parallel execution

T001 and T002 can overlap. T003 follows T001, then T004 and T005 run sequentially. T006 follows T002 and can overlap sync work. Complete both foundation tracks before story integration.

| Story | Dependencies | Parallel example |
| --- | --- | --- |
| US1 | Foundation → T007/T008 → T009 | Build Android and iOS on separate hosts. |
| US2 | Installed packages → T010/T011 → T012 | Exercise folder/word operations and file/paste import using separate fixture copies. |
| US3 | Installed packages → T013/T014 → T015 | Validate flashcards/audio and quiz independently with seeded test libraries. |
| US4 | Installed packages → T016 → T017/T018 → T019 | Run Android and iOS reconciliation drills against separate test scopes. |

US2, US3 and US4 can proceed independently after packaging with fixtures. T020 and T021 close the feature after all four story checks. Record blocked physical checks separately from completed code or browser evidence.

## Implementation strategy

Deliver US1 with its safety prerequisites as the first demonstrable increment. Then verify library, study and offline continuity incrementally. A successful build is sufficient to begin device testing; release acceptance requires the runtime comparisons and recovery evidence above.
