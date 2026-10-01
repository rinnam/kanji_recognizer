# CONTEXT.md — Ngôn ngữ chung (Ubiquitous Language) của Kanji Nest

> Mục tiêu: để mọi AI/người dùng dùng **đúng và nhất quán** thuật ngữ qua các phiên làm việc, tránh đặt tên lệch nhau. Cập nhật file này mỗi khi domain model thay đổi (tinh thần skill *domain-modeling*).

## Thực thể lõi

- **Vocabulary (Từ vựng):** đơn vị học chính. Nguồn sự thật client = interface `LocalVocabulary`. Trường chính: `word`, `meaning`, `reading`, `sinoVietnamese` (âm Hán Việt), `example`/`exampleMeaning`, `note`, `folderIds[]`, `tags[]`, `jlptLevel`, nhóm `srs*`. ID dạng `vocab_<timestamp>_<random>`.
- **Folder (Thư mục):** cây lồng nhau để sắp xếp từ. Nguồn sự thật client = `LocalFolder`: `name`, `parentId` (null = gốc), `order`. ID dạng `folder_<timestamp>_<random>`. Một từ thuộc nhiều folder (`folderIds[]`).
- **Tag (Nhãn):** chuỗi tự do gắn vào từ (`tags[]`), để lọc nhanh.
- **Kanji entry:** mục từ điển cho một ký tự Kanji (on'yomi, kun'yomi, JLPT, số nét, nghĩa) — dùng ở giai đoạn nhận diện Kanji.

## Thuật ngữ học tập

- **SRS (Spaced Repetition System):** hệ thống ôn tập ngắt quãng theo **Anki SM-2**. Ba tham số: **Interval** (`srsInterval`, số ngày), **Repetition** (`srsRepetition`, số lần nhớ liên tiếp), **Ease Factor** (`srsEaseFactor`, mặc định **2.5**, tối thiểu **1.3**). **srsNextReview** = ngày ôn kế tiếp.
- **SRS phase / chế độ Flashcard:** **Normal** (lật thẻ thường), **Progress** (theo tiến độ), **Anki SRS** (áp công thức SM-2 + lịch ôn). Xem công thức ở `docs/reference/kotobase-feature-audit.md` §2.
- **Rating (q):** mức đánh giá sau khi lật thẻ; ánh xạ SM-2 **đã chốt**: **Again=0, Hard=3, Good=4, Easy=5** (chi tiết `docs/reference/kotobase-feature-audit.md` §2.4).
- **Typing Quiz:** bài kiểm tra người học gõ đáp án; lưu ở `quiz_sessions` / `quiz_attempts`.
- **Focus Recall:** chế độ ẩn nghĩa để tự kiểm tra.
- **Quick Add:** thêm nhanh một từ, **chống trùng** theo (`word`, `reading`) trong cùng người dùng.
- **JLPT level:** cấp độ năng lực tiếng Nhật, giá trị ∈ {N1, N2, N3, N4, N5}.

## Thuật ngữ đồng bộ / kiến trúc

- **Local-first:** client (IndexedDB) là nơi làm việc chính, chạy offline; server là nơi backup + đồng bộ, KHÔNG phải nguồn sự thật áp đặt.
- **Two-Way Smart Merge:** cơ chế hợp nhất hai chiều client ↔ server.
- **LWW (Last-Write-Wins):** quy tắc hợp nhất — cùng `id` thì giữ bản có `updatedAt`/`updated_at` **mới hơn**.
- **Tombstone (`deletedAt`/`deleted_at`):** đánh dấu xóa mềm thay vì xóa cứng, để "xóa" lan truyền khi merge và **không bị hồi sinh**.
- **Pull / Push:** pull = lấy thay đổi từ server theo delta `updated_at`; push = đẩy thay đổi cục bộ lên (có **debounce 3.5s**).
- **owner_id:** cột **chỉ có ở server** để tách dữ liệu theo người dùng; client local-first không có field này.

## Kiến trúc

- **FSD (Feature-Sliced Design):** cách tổ chức frontend theo lát cắt tính năng. Tầng: `app` → `pages` → `features` → `entities` → `shared` (+ các thư mục hiện có). Xem `docs/architecture/frontend.md`.
- **Layered Architecture (backend):** routes/controllers → services → repositories → DB. Xem `docs/architecture/backend.md`.
- **Feature mapping 1-1:** một tính năng (vd `flashcard`) có cả **FE slice** và **BE layer** cùng tên để map rõ ràng.

## Lưu ý tên dự án (đã chốt)

- **Kanji Nest** = tên **sản phẩm** (dùng trong tài liệu, UI). **`kanji_recognizer` / `kanji-recognizer-*`** = tên **repo/package**, **giữ nguyên**. Cùng một dự án; khác biệt là có chủ đích.
