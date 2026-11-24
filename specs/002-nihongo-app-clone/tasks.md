# Tasks: Nâng cấp `mobile/` thành NihonGO Clone (`002-nihongo-app-clone`)

**Input**: [spec.md](./spec.md) · [plan.md](./plan.md) · [ui-design-system.md](./ui-design-system.md) · [data-model.md](./data-model.md)

---

## Phase 1: Design System & App Shell (Nền tảng Giao diện)

- [ ] **T001** Tạo `mobile/src/theme/nihongo-theme.ts` định nghĩa đầy đủ bảng màu kem-đào (`#FFFDF9` → `#FCECE3`), màu cam `#F48A34`, semantic colors, bo góc và đổ bóng theo `ui-design-system.md`.
- [ ] **T002** Tạo `mobile/src/components/AppShell.tsx` (gradient nền, container `max-width: 920px`, SafeArea, padding đáy chừa chỗ cho Bottom Dock).
- [ ] **T003** Tạo `mobile/src/components/FloatingBottomDock.tsx` (thanh pill trắng nổi 5 tab: `Trang chủ`, `Luyện tập`, `Tra cứu`, `Bài học`, `Cá nhân` + chấm cam active) và `mobile/src/components/TopHeader.tsx`.
- [ ] **T004** Tạo `mobile/src/components/FloatingUtilityDock.tsx` (`?`, `Góp ý beta`, `Mời mình ly cà phê`, thu gọn `×` ↔ `⋯`) và `mobile/src/components/CoachmarkModal.tsx`.
- [ ] **T005** Cấu trúc lại `mobile/app/_layout.tsx` và tạo `mobile/app/(tabs)/_layout.tsx` kết nối 5 tab chính với `FloatingBottomDock`.

---

## Phase 2: Onboarding, Trang chủ & Hồ sơ (US1 & US6 — P1, Single-User không Auth)

- [ ] **T006** Tạo `mobile/src/features/profile/profile-store.ts` quản lý hồ sơ 1 người dùng (`display_name`, `jlpt_level`, `primary_goal`, `daily_goal_minutes`, `onboarding_completed_at`) trong `AsyncStorage` / `localStorage`.
- [ ] **T007** Xây dựng `mobile/app/onboarding.tsx` (stepper 3 bước `Trình độ` → `Mục tiêu` → `Xác nhận` + tái sử dụng tại `mobile/app/profile/learning.tsx`) và `mobile/app/index.tsx` tự điều hướng thẳng vào `/app` nếu đã hoàn tất onboarding.
- [ ] **T008** Tạo `mobile/src/features/study-tracker/use-study-tracker.ts` ghi nhận `intervals` khi foreground (key `study`), tính `%` mục tiêu ngày, `current_streak`, `total_days`, `longest_streak`.
- [ ] **T009** Xây dựng `mobile/app/(tabs)/app.tsx` (Hero Momo, Quick Search, thẻ `Mục tiêu hôm nay`, Heatmap 52 tuần × 7 ngày, 2 thẻ `Ôn tập hôm nay` & `Thử thách hôm nay`, nút `Bài học từ vựng`, lưới 2×2 `Luyện kỹ năng`, banner `HỌC CÙNG MOMO`).
- [ ] **T010** Xây dựng `mobile/app/(tabs)/practice.tsx`, `mobile/app/plan.tsx`, và `mobile/app/(tabs)/profile.tsx` (4 thẻ thông tin + đăng xuất).

---

## Phase 3: Tích hợp Flashcard cũ, Bài học JLPT & Tra cứu (US2 & US3 — P1)

- [ ] **T011** Di trú `mobile/src/FlashcardStudy.tsx` & `workspace-storage.ts` sang `mobile/app/flashcards/index.tsx`, `mobile/app/flashcards/new.tsx` (tái sử dụng `import-parser.ts`) và `mobile/app/flashcards/sessions/[uuid].tsx` với 4 nút SRS (`Chưa nhớ`, `Mơ hồ`, `Nhớ`, `Rất nhớ`) + modal lịch ôn 30 ngày.
- [ ] **T012** Tạo `mobile/src/components/FuriganaText.tsx` và `mobile/src/components/InlineDictModal.tsx` (hỗ trợ `+ Lưu vào flashcard` trực tiếp vào `LocalFolder`/`LocalVocabulary` và `☆ Yêu thích`).
- [ ] **T013** Xây dựng `mobile/app/(tabs)/lessons.tsx` (lọc `N5–N1`, lưới 3 cột) và `mobile/app/lessons/[id].tsx` (công tắc `Ẩn nghĩa để tự ôn`, phát âm `expo-speech`, Hán Việt, ví dụ & từ liên quan).
- [ ] **T014** Xây dựng `mobile/app/(tabs)/lookup.tsx` (3 tab `Từ vựng`, `Hán tự`, `Video`, lịch sử tra cứu) và modal canvas `Viết tay` dùng `react-native-svg` trả về 5 ứng viên Kanji.

---

## Phase 4: Bốn Kỹ năng Chuyên sâu (US4 — P2)

- [ ] **T015** **Đọc:** Xây dựng `mobile/app/practice/reading/index.tsx` (lọc JLPT + 7 dạng bài) và `mobile/app/practice/reading/[id].tsx` (bật/tắt Furigana, bấm từ mở `InlineDictModal`, bấm câu xem cấu trúc, 3 tab `Câu hỏi`, `Phân tích`, `Tips đọc hiểu`).
- [ ] **T016** **Viết:** Xây dựng `mobile/app/practice/writing/index.tsx` (3 tab `Bài tập` / `Bản nháp` / `Đã nộp`, lọc JLPT/chủ đề, `Viết tự do`, lưới giấy `Genkouyoushi` hỗ trợ ngang `yokogaki` ↔ dọc `tategaki`, tự lưu nháp, đồng hồ, rubric 100 điểm).
- [ ] **T017** **Nghe:** Xây dựng `mobile/app/practice/listening/index.tsx` (thư viện video + import URL YouTube ≤ 20 phút) và `mobile/app/practice/listening/[uuid].tsx` (player `.web.tsx`/`.tsx`, chế độ `Shadowing` & `Nghe chép chính tả`, phụ đề Furigana bấm tra từ, bản dịch song ngữ, lặp đoạn/tốc độ).
- [ ] **T018** **Nói:** Xây dựng `mobile/app/practice/speaking/index.tsx`, `mobile/app/practice/speaking/new.tsx` và `mobile/app/practice/speaking/scenarios/[uuid].tsx` (`Nói có gợi ý` vs `Tự nói`, lưu âm thanh nghe lại, lịch sử hội thoại).

---

## Phase 5: Kho Game Từ vựng & Đồng bộ Backend (US5 — P3)

- [ ] **T019** Xây dựng `mobile/app/games/index.tsx` (3 game), `mobile/app/games/bot.tsx` (`Công thành Momo`: 100 HP, 3 phút / 60 câu, phím `1–4`, `Q`/`E`, combo 3/5/10, `Ôn từ sai`) và `mobile/app/games/[roomCode].tsx` (phòng chờ mã 6 ký tự).
- [ ] **T020** Nối API đồng bộ 2 chiều giữa `mobile/` và `backend/` (Fastify + Kysely + PostgreSQL 18) cho `daily_study_logs`, `flashcard_decks`, `flashcard_cards`, `writing_submissions` theo quy tắc Last-Write-Wins (`updated_at` + `deleted_at`).
- [ ] **T021** Kiểm thử `npm run typecheck` trong `mobile/`, kiểm tra chạy thực tế trên Web (`npm run web`) và Mobile (Expo Go) cho toàn bộ các route chính.
