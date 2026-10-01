# ADR 0004 — License cho repo public: MIT

- **Trạng thái:** Accepted
- **Ngày:** 2026-10-01
- **Liên quan:** `LICENSE` (gốc repo), `docs/reference/kotobase-feature-audit.md`

## Bối cảnh

Repo là **public** (`github.com/rinnam/kanji_recognizer`). Cần một license rõ ràng để người khác biết quyền sử dụng/sửa/phân phối. Dự án có **tham khảo Kotobase** (repo không có license mã nguồn mở rõ ràng) nhưng **chỉ học ý tưởng/kiến trúc và viết lại**, KHÔNG copy nguyên văn code/văn bản của họ.

## Quyết định

Phát hành dự án theo **MIT License** — file [`LICENSE`](../../LICENSE) ở gốc repo (bản quyền: rinnam, 2026).

## Lý do

- MIT **đơn giản, phổ biến**, cho phép dùng/sửa/phân phối rộng rãi — phù hợp với một dự án học tập/cá nhân công khai.
- So với Apache-2.0 (có điều khoản patent, dài hơn), MIT gọn và đủ dùng cho nhu cầu hiện tại.
- MIT chỉ áp cho **mã nguồn & tài liệu của chính dự án này**.

## Hệ quả

- Người khác có thể fork/sử dụng theo điều khoản MIT (giữ lại thông báo bản quyền).
- **Nguồn/dữ liệu bên thứ ba** dùng ở Giai đoạn 3 (vd từ điển Kanji: KanjiDic2, JMdict, KanjiVG — thường CC BY-SA…) có **license riêng**; khi tích hợp phải **giữ credit** theo license nguồn — MIT của repo KHÔNG ghi đè các license đó.
- Vì chỉ học hỏi (không copy) từ Kotobase nên việc Kotobase thiếu license rõ ràng không ràng buộc license của repo này.

## Phương án đã cân nhắc

- **Apache-2.0:** mạnh hơn (patent grant) nhưng rườm rà hơn nhu cầu → chưa chọn.
- **Không có license:** khiến người khác không rõ quyền dùng (mặc định "all rights reserved") → không phù hợp mục tiêu công khai/học tập.
