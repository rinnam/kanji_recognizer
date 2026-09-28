# Kanji_Smart — phân tích reference implementation

> **Status: Reference implementation — external, unverified.** Tài liệu này mô tả repository ngoài tại commit cố định; không phải Current của Kanji Recognizer, không phải quyết định kiến trúc, API hay model.

## 1. Provenance và giới hạn bằng chứng

- Repository: <https://github.com/VoGiaLuong/Kanji_Smart>
- Commit được phân tích: `dba80b70c19ec8ead3f734ab28d2fa1cf4e9cf89`
- Phạm vi bằng chứng: source và README tại commit trên.
- Chưa xác minh tái lập cục bộ, quyền sử dụng, domain fit hay chất lượng vận hành.

## 2. Pipeline quan sát được trong reference

Luồng được chứng minh ở mức source: ETL9B/JIS mapping → sinh class mapping → custom Dataset → transfer learning → checkpoint tự chứa mapping → Flask inference trả top-5.

Reference code dùng EfficientNet-B3, trong khi README reference ghi B0. Mâu thuẫn này phải được giải quyết khi tái lập; **B3 không phải quyết định của project hiện tại**. Endpoint và payload trong reference chỉ là evidence tích hợp của reference, không canonical cho project hiện tại.

## 3. Ma trận reuse / redesign / TBD

| Khu vực | Định hướng | Điều có thể kế thừa / điều kiện |
|---|---|---|
| Cách tiếp cận AI training | **Reuse candidate** | Học theo các stage pipeline và nguyên tắc đóng gói mapping cùng checkpoint; chỉ chuyển sang Current sau gate §5. |
| Dataset, mapping, checkpoint, metric | **TBD / Blocked** | Reference không kèm raw ETL9B, generated dataset/mapping/checkpoint hoặc metric tái lập. Không suy diễn class, JLPT hay accuracy. |
| Model architecture | **TBD** | B3 chỉ là chi tiết code reference và mâu thuẫn với B0 trong README; cần benchmark/decision riêng. |
| Inference endpoint/schema | **TBD** | Không coi endpoint reference là canonical; contract thuộc PRD hiện tại. |
| UI và design system | **Redesign** | Project hiện tại dùng reference để học định hướng, không sao chép UI; cần chuẩn UX, responsive và accessibility được duyệt. |
| Cơ chế học | **TBD / Redesign intent** | Ý nghĩa sản phẩm chưa được định nghĩa; không tự diễn giải từ reference. |
| Ngắt/quản lý quảng cáo | **TBD / Redesign intent** | Hành vi, quyền kiểm soát và policy chưa được định nghĩa; không tự diễn giải từ reference. |

## 4. Mismatch, artifact thiếu và rủi ro

- Không có raw ETL9B, generated dataset, generated mapping hoặc checkpoint để tái lập.
- Path giữa các script/artifact không nhất quán; dependency declaration chưa đầy đủ.
- README reference nói EfficientNet-B0 nhưng source dùng EfficientNet-B3.
- Không có metric có thể tái lập hoặc evaluation report đủ để công bố chất lượng.
- Không có file `LICENSE` được track dù README reference tuyên bố MIT; quyền dùng code, dữ liệu, weight và metadata phải được xác minh độc lập.
- Domain fit giữa dữ liệu/preprocessing reference và input thực tế của người dùng project hiện tại chưa được chứng minh.

## 5. Gate Reference → Current

Không được gọi bất kỳ phần nào của reference là Current cho đến khi có đủ evidence được review:

1. **Provenance/license:** xác minh quyền dùng code, dataset, mapping, checkpoint/weight và metadata; ghi attribution/obligation.
2. **Reproduction:** pin dependency và môi trường; sửa/ghi rõ path; tạo lại dataset/mapping/checkpoint từ nguồn hợp lệ; lưu lệnh, hash và log.
3. **Evaluation/domain fit:** chốt phạm vi và protocol; đánh giá trên ground truth phù hợp input mục tiêu; công bố limitation, không suy diễn accuracy/class/JLPT.
4. **Artifact integrity:** version/hash/provenance cho mapping, checkpoint và preprocessing; chứng minh mapping đi cùng artifact.
5. **Integration contract:** phê duyệt input/output/error/version/privacy/security; contract của project không kế thừa ngầm endpoint reference.
6. **Approval:** owner kỹ thuật/sản phẩm chấp thuận reuse candidate và cập nhật PRD/evidence; trước đó trạng thái vẫn **Reference implementation — external, unverified**.

## 6. Câu hỏi cần quyết định

- “Cơ chế học” là lesson progression, spaced repetition, quiz/review, feedback sau nhận diện, hay khái niệm khác?
- “Ngắt quảng” là tần suất/vị trí quảng cáo, quyền bỏ qua/tắt, không làm gián đoạn phiên học, subscription/consent, hay policy khác?
- Thành phần pipeline nào được phép reuse theo license và artifact provenance?
- Input domain, phạm vi ký tự, ground truth và evaluation protocol nào đại diện cho người dùng mục tiêu?
- Runtime/contract sẽ được thiết kế mới thế nào sau khi gate reproducibility và artifact đạt?
