# PRD — Kanji Nest

> Repo/codebase: `kanji_recognizer`. Sản phẩm: **Kanji Nest**. Tài liệu tiếng Việt, UTF-8.

## 1. Metadata

| Thuộc tính | Giá trị |
|---|---|
| Ngôn ngữ tài liệu | Tiếng Việt |
| Nền tảng | Web responsive (Android/iOS qua Capacitor: tương lai) |
| Mô hình | Local-first (IndexedDB) + đồng bộ PostgreSQL |
| Trạng thái | Thiết kế / lập kế hoạch |

## 2. Mục tiêu

- Giúp người học tiếng Nhật **ghi nhớ từ vựng hiệu quả** bằng flashcard + SRS (Anki SM-2) và quiz.
- Dữ liệu **thuộc về người dùng**, chạy offline, đồng bộ an toàn nhiều thiết bị.
- Mở đường cho tính năng **nhận diện Kanji** (vẽ tay/ảnh) ở giai đoạn cuối.

## 3. Persona

- **Người tự học N5–N3:** cần sắp xếp từ theo chủ đề và ôn đều mỗi ngày.
- **Người ôn thi JLPT:** cần lọc theo cấp JLPT, luyện quiz, theo dõi tiến độ.
- **Người gặp Kanji lạ:** muốn tra nhanh và lưu vào thư viện (giai đoạn 3).

## 4. Non-goals (ngoài phạm vi hiện tại)

- TTS phát âm bằng GPU (VOICEVOX), luyện nghe — có ở dự án tham khảo nhưng **không làm**.
- App native Android/iOS — chỉ web responsive; Capacitor để tương lai.
- Mạng xã hội / chia sẻ bộ từ công khai.

## 5. Yêu cầu chức năng (theo giai đoạn — chi tiết ở `docs/roadmap.md`)

- **GĐ1 (MVP):** Folder cây lồng nhau; Vocabulary CRUD (local-first + sync); Quick Add chống trùng; Flashcard 3 chế độ (Normal/Progress/Anki SRS); Typing Quiz.
- **GĐ2:** mở rộng quiz; cải thiện SRS + Focus Recall; tối ưu (debounce, dynamic import, phân trang server); (tùy chọn) AI bulk vocab; nâng TypeScript 7.
- **GĐ3:** nhận diện Kanji (vẽ tay/ảnh) + tra từ điển + lưu vào thư viện.

## 6. Yêu cầu phi chức năng (NFR)

- **Hiệu năng:** thao tác cục bộ phản hồi gần tức thì (ưu tiên offline); Overview chịu được hàng nghìn từ (phân trang/lọc server).
- **Đồng bộ tin cậy:** merge không mất/nhân đôi dữ liệu; xóa không hồi sinh (tombstone — ADR 0001).
- **Bảo mật:** không hardcode secret; `DATABASE_URL` qua `.env` (trong `.gitignore`).
- **Khả chuyển:** version lock (ADR 0002); tài liệu tiếng Việt UTF-8 không BOM.
- **Chất lượng code — 12 quy tắc Clean Code (bắt buộc review theo):**
  1. Đặt tên có nghĩa — 2. Single Responsibility — 3. Tránh magic number/string — 4. Hàm nhỏ — 5. Tránh lồng sâu — 6. Tránh type assertion thừa — 7. Hạn chế disable ESLint — 8. Tách test helper khỏi test case — 9. Test tất định — 10. Assertion tường minh — 11. Format dễ đọc — 12. Cấu trúc thư mục rõ ràng.
- **Accessibility & responsive:** đủ 4 trạng thái UI (loading/empty/error/success); dùng được mobile→desktop (xem skill `ui-design`).

## 7. Rủi ro

- Logic merge/tombstone sai → dữ liệu lỗi (giảm thiểu: test kỹ, ADR 0001).
- Thang điểm SRS: **đã chốt** (feature-audit §2.4).
- Nhận diện Kanji: độ chính xác & bản quyền nguồn từ điển (TBD license).
- Tên sản phẩm vs repo: **đã chốt** — sản phẩm "Kanji Nest", repo giữ `kanji_recognizer` (có chủ đích).

## 8. Liên kết

Roadmap: `docs/roadmap.md` · Kiến trúc: `docs/architecture/*` · Dữ liệu: `docs/database/*` · Thuật ngữ: `CONTEXT.md` · Quyết định: `docs/adr/*`.
