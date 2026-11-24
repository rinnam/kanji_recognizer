# Implementation Plan: Nâng cấp `mobile/` (Expo Cross-Platform) thành NihonGO Clone

**Branch**: `002-nihongo-app-clone` | **Date**: 2026-11-24 | **Spec**: [spec.md](./spec.md)

---

## 1. Bối cảnh Hiện tại & Chiến lược Tích hợp

Hiện tại `mobile/` đã là ứng dụng đa nền tảng **Expo Router (`~58.0`) + React Native (`0.88.1`) + React Native Web (`0.21.4`) + TypeScript `6.0.3`**, trùng khớp hoàn toàn với kiến trúc của `momonihongo.app`.

### Tài sản sẵn có trong `mobile/src/` ĐƯỢC TÁI SỬ DỤNG
| Module hiện có | Vai trò mới trong NihonGO Clone |
|---|---|
| `workspace-model.ts` (`LocalFolder`, `LocalVocabulary`) | Nguồn sự thật tầng client cho `flashcard_decks` (`Của tôi`) và `flashcard_cards`. Không đổi tên field cốt lõi. |
| `workspace-storage.ts` (`AsyncStorage`) | Tầng lưu trữ local-first cho Flashcard + mở rộng thêm key `auth`, `study`, `lookup_history`, `writing_drafts`. |
| `sync-merge.ts` | Logic merge Last-Write-Wins (`updated_at` + `deleted_at`) cho đồng bộ 2 chiều với backend. |
| `FlashcardStudy.tsx` & `use-study-keys(.web).ts` | Nâng cấp giao diện sang thẻ lật NihonGO + thanh 4 nút SRS (`Chưa nhớ`, `Mơ hồ`, `Nhớ`, `Rất nhớ`) + phím `Space`. |
| `TypingQuiz.tsx` | Tái sử dụng cho `Thử thách hôm nay` (5 câu/ngày) và chế độ `Đối kháng từ vựng` / `Nghe chép chính tả`. |
| `import-parser.ts` | Tái sử dụng cho tab `Nhập hàng loạt` tại `/flashcards/new`. |
| `expo-speech` | Phát âm TTS tiếng Nhật (`ja-JP`) trong Bài học, Flashcard và Tra cứu. |

---

## 2. Kiến trúc Routing mới trong `mobile/app/` (Expo Router)

Chuyển từ 1 màn hình duy nhất (`mobile/app/index.tsx`) sang cấu trúc route nhóm của Expo Router:

```text
mobile/app/
├── _layout.tsx                     # Root Stack: ThemeProvider + FloatingUtilityDock (không cần AuthGuard)
├── index.tsx                       # Redirect → /app (nếu đã onboarding) hoặc /onboarding (lần đầu)
├── onboarding.tsx                  # Stepper 3 bước (Trình độ → Mục tiêu → Xác nhận)
├── plan.tsx                        # Kế hoạch học tập cá nhân
├── (tabs)/                         # Floating Bottom Dock 5 tab (custom tabBar)
│   ├── _layout.tsx                 # Tab navigator: app, practice, lookup, lessons, profile
│   ├── app.tsx                     # Trang chủ (Hero Momo, Quick Search, Mục tiêu ngày, Heatmap, Cards)
│   ├── practice.tsx                # Trung tâm Luyện tập (3 pill Từ vựng + lưới 2×2 Kỹ năng)
│   ├── lookup.tsx                  # Tra cứu (Từ vựng, Hán tự, Video + Modal Viết tay)
│   ├── lessons.tsx                 # Thư viện Bài học JLPT (N5–N1)
│   └── profile.tsx                 # Cá nhân (4 thẻ thông tin + Đăng xuất)
├── lessons/
│   └── [id].tsx                    # Chi tiết bài học (Ẩn nghĩa, TTS, Yêu thích, Ví dụ)
├── flashcards/
│   ├── index.tsx                   # Trang chọn bộ thẻ (Hôm nay, Lịch 30 ngày, Có sẵn/Của tôi/Yêu thích)
│   ├── new.tsx                     # Tạo bộ thẻ (Từng thẻ / Nhập hàng loạt)
│   └── sessions/
│       └── [uuid].tsx              # Phiên học SRS 4 mức
├── games/
│   ├── index.tsx                   # Kho game (Công thành Momo, Giành mic, Đối kháng từ vựng)
│   ├── bot.tsx                     # Đấu máy Công thành Momo (HP, Combo, Q/E, Ôn từ sai)
│   └── [roomCode].tsx              # Phòng chờ & thi đấu Multiplayer (mã 6 ký tự)
├── practice/
│   ├── listening/
│   │   ├── index.tsx               # Thư viện video + Import YouTube URL
│   │   └── [uuid].tsx              # Trình học Shadowing / Dictation + Phụ đề Furigana bấm tra từ
│   ├── speaking/
│   │   ├── index.tsx               # Hội thoại gần đây + CTA Cuộc trò chuyện mới
│   │   ├── new.tsx                 # Chọn tình huống (lọc Chủ đề & JLPT)
│   │   └── scenarios/[uuid].tsx    # Cấu hình & Phiên hội thoại AI
│   ├── reading/
│   │   ├── index.tsx               # Thư viện bài đọc (lọc JLPT & 7 dạng bài)
│   │   └── [id].tsx                # Trình đọc Furigana + 3 tab (Câu hỏi, Phân tích, Tips)
│   └── writing/
│       └── index.tsx               # Thư viện đề + Giấy ô vuông Genkouyoushi (ngang ↔ dọc)
└── profile/
    └── learning.tsx                # Tái sử dụng stepper 3 bước để chỉnh sửa trình độ/mục tiêu
```

---

## 3. Cấu trúc Thư mục `mobile/src/` (Feature-Sliced cho React Native)

Tổ chức lại `mobile/src/` rõ ràng theo lớp (giữ nguyên các file cũ đang chạy rồi di trú dần):

```text
mobile/src/
├── theme/
│   └── nihongo-theme.ts            # Design tokens từ ui-design-system.md (màu kem-đào, cam #F48A34, shadow, radius)
├── components/                     # UI dùng chung toàn app
│   ├── AppShell.tsx                # Gradient nền + Container max-width 920px + SafeArea
│   ├── TopHeader.tsx               # Header trang chủ (Logo + chip JLPT/phút) & Header trang con (Back + Title)
│   ├── FloatingBottomDock.tsx      # Custom TabBar hình viên thuốc 5 tab + chấm cam active
│   ├── FloatingUtilityDock.tsx     # Cụm tiện ích góc dưới phải (?, Góp ý, Cà phê, Thu gọn)
│   ├── CoachmarkModal.tsx          # Modal hướng dẫn từng bước theo route
│   ├── FuriganaText.tsx            # Component hiển thị Kanji + Furigana chạy được trên cả Web & Native
│   └── InlineDictModal.tsx         # Popup tra từ nhanh + "+ Lưu vào flashcard" + "☆ Yêu thích"
├── features/
│   ├── auth/                       # AuthContext, localStorage/AsyncStorage 'auth', Login/Onboarding
│   ├── study-tracker/              # Hook đếm active intervals ('study'), Heatmap 52 tuần, Streak KPI
│   ├── lookup/                     # Dictionary service, Kanji detail, Handwriting canvas (SVG/WebView)
│   ├── lessons/                    # Data & UI bài học JLPT N5–N1
│   ├── flashcards/                 # Nâng cấp từ FlashcardStudy.tsx + FSRS/SM-2 4 mức + Lịch 30 ngày
│   ├── games/                      # Engine Công thành Momo (bot) + Lobby multiplayer
│   ├── listening/                  # YouTube embed, Shadowing/Dictation controller, Subtitle tokenizer
│   ├── speaking/                   # Scenario picker, Guided/Free AI chat, Audio recorder/player
│   ├── reading/                    # Passage filter, Sentence analyzer, Quiz A–D
│   └── writing/                    # Genkouyoushi grid (yokogaki/tategaki), Draft auto-save, AI rubric
└── legacy/                         # (Tạm giữ các file cũ trong quá trình chuyển đổi)
```

---

## 4. Lộ trình Triển khai theo 5 Giai đoạn (Phases)

| Giai đoạn | Mục tiêu | Kết quả kiểm chứng được |
|---|---|---|
| **Phase 1: Design System & App Shell** | Tạo `nihongo-theme.ts`, `AppShell`, `FloatingBottomDock` 5 tab, `TopHeader`, `FloatingUtilityDock`, cấu trúc `(tabs)/_layout.tsx`. | Chạy `npm run web` & Expo Go thấy đúng giao diện kem-đào, 5 tab điều hướng mượt. |
| **Phase 2: Auth, Onboarding, Home & Study Tracker** | Triển khai `/login`, `/onboarding`, `/app` (Hero, Quick Search, Mục tiêu hôm nay, Heatmap 52 tuần, 2 thẻ hành động, lưới 4 kỹ năng), `/plan`, `/profile`. | Hoàn tất US1 & US6; bộ đếm thời gian học và heatmap hoạt động thật. |
| **Phase 3: Tích hợp Flashcard cũ + Bài học + Tra cứu** | Di trú `FlashcardStudy.tsx` & `workspace-storage.ts` vào `/flashcards/*`, bổ sung 4 mức SRS + lịch 30 ngày; xây `/lessons/*` và `/lookup` (3 tab + Viết tay + `InlineDictModal`). | Hoàn tất US2 & US3; không mất dữ liệu flashcard cũ của người dùng. |
| **Phase 4: Bốn Kỹ năng Chuyên sâu (`/practice/*`)** | Xây dựng lần lượt `Đọc` → `Viết (Genkouyoushi)` → `Nghe (YouTube + Shadowing)` → `Nói (AI Roleplay)`. | Hoàn tất US4; `InlineDictModal` lưu từ thẳng vào Flashcard từ Nghe và Đọc. |
| **Phase 5: Kho Game Từ vựng & Đồng bộ Backend** | Xây `/games`, `/games/bot` (`Công thành Momo`), `/games/:roomCode`, và nối API đồng bộ PostgreSQL qua `backend/`. | Hoàn tất US5 & toàn bộ hệ thống đồng bộ đa thiết bị. |

---

## 5. Rủi ro Kỹ thuật Đa nền tảng (Web vs iOS/Android) & Cách xử lý

1. **YouTube Player trên Web vs Native:** Tách component theo đuôi `.web.tsx` (dùng `<iframe>`) và `.tsx` (dùng `react-native-youtube-iframe` hoặc `WebView`), giống mẫu `FolderDragItem.web.tsx` đang có sẵn trong `mobile/src/`.
2. **Viết dọc (`tategaki`) trên Giấy Genkouyoushi:** Web hỗ trợ CSS `writing-mode: vertical-rl`; trên Native dùng lưới cột dựng từ phải sang trái (`flexDirection: 'row-reverse'` + mỗi cột `flexDirection: 'column'`) để đảm bảo hiển thị đồng nhất 100% trên cả 3 nền tảng.
3. **Phím tắt bàn phím (`Space`, `1–4`, `Q`, `E`, `Esc`):** Dùng pattern `.web.ts` / `.ts` giống `use-study-keys.web.ts` hiện có để chỉ gắn `window.addEventListener('keydown')` trên Web.
4. **Canvas Viết tay Kanji:** Dùng `react-native-svg` (`Path` + `PanResponder`) đã cài sẵn trong `mobile/package.json` — chạy mượt trên cả Web, iOS và Android mà không cần thêm thư viện native nặng.
