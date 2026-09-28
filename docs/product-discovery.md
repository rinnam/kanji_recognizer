# Khám phá sản phẩm

> Tài liệu này quản lý giả thuyết và bằng chứng; không biến giả thuyết thành sự thật. Phạm vi chuẩn xem [PRD](./prd.md).

## 1. Câu hỏi khám phá

Problem statement canonical nằm tại [PRD §2](./prd.md#2-bối-cảnh-và-vấn-đề). Discovery chỉ kiểm chứng các phần chưa biết: segment, hành vi hiện tại, tần suất, lựa chọn thay thế, mức tin cậy và chi phí chấp nhận được; không định nghĩa lại problem, metric hoặc hypothesis.

## 2. Evidence register

| E-ID | Bằng chứng | Nguồn | Điều chứng minh | Không chứng minh |
|---|---|---|---|---|
| E-001 | UI React/TypeScript/Vite chạy như prototype | `frontend/package.json`, `src/**` | Có thể dựng luồng tương tác | Nhu cầu, usability, production readiness |
| E-002 | Canvas draw/brush/undo/clear | `DrawCanvas.tsx`, `InputPanel.tsx` | Năng lực frontend hiện tại | Accessibility đầy đủ, chất lượng recognition |
| E-003 | Upload click/keyboard/drop và preview | `InputPanel.tsx` | Interaction hiện hữu | Content validation/security |
| E-004 | Fixed mock candidates, latency 1,4 s | `api.ts`, `mockData.ts` | Loading/result UI demo được | Backend/model/accuracy/latency thật |
| E-005 | State/result/history | `App.tsx`, `ResultPanel.tsx` | UI state và history session | Persistence/analytics |
| E-006 | Không có backend/model/test/CI/analytics | Cây file checkout | Khoảng trống repository | Không khẳng định các artifact không tồn tại ở nơi khác |
| E-REF-01 | Pipeline và giới hạn Kanji_Smart tại commit cố định | [Reference register](./reference-implementations/kanji-smart.md) | Có một **Reference implementation — external, unverified** để nghiên cứu cách tiếp cận AI | Không chứng minh reproducibility, license, domain fit, model/endpoint phù hợp hay năng lực Current |

### Kế hoạch xác minh reference

Evidence chi tiết chỉ được lưu tại [Kanji_Smart reference analysis](./reference-implementations/kanji-smart.md); discovery không tái định nghĩa hypothesis canonical.

1. **Reproduction:** lấy đúng commit, pin môi trường/dependency, đối soát path và tái tạo dataset/mapping/checkpoint từ nguồn hợp lệ; lưu lệnh, hash, log và failure.
2. **License/provenance:** xác minh quyền dùng source, ETL9B, mapping, checkpoint/weight và metadata. README nói MIT nhưng không có `LICENSE` được track nên chưa đủ căn cứ reuse.
3. **Domain fit:** chốt input domain/ground truth/protocol của project hiện tại rồi đánh giá độc lập; không dùng claim class/JLPT/accuracy của reference.
4. **Decision:** chỉ đề xuất chuyển một phần pipeline sang Current khi đạt gate trong reference analysis và PRD; nếu không đạt, giữ **Reference implementation — external, unverified** hoặc loại bỏ candidate.

## 3. Giả thuyết ưu tiên

Định nghĩa canonical của các giả thuyết có cấu trúc nằm tại [PRD §7](./prd.md#7-giả-thuyết-có-cấu-trúc). Tài liệu discovery này chỉ quản lý evidence và cách kiểm chứng; không định nghĩa giả thuyết song song.

## 4. Alternatives cần xem xét

Không mặc định nhận diện model là đáp án duy nhất. Các lựa chọn cần nghiên cứu:

- Tra theo bộ thủ/số nét hoặc tìm kiếm text khi người dùng có thông tin đó.
- OCR/nhận diện trên thiết bị so với dịch vụ từ xa.
- Chỉ upload, chỉ vẽ, hoặc cả hai.
- Wizard-of-Oz/manual matching cho discovery trước khi đầu tư model.
- Hiển thị một kết quả, nhiều ứng viên, hoặc yêu cầu người dùng xác nhận.
- Không lưu lịch sử, lịch sử trong phiên, hoặc persistence có consent.

Tiêu chí so sánh: task completion, time-on-task, error recovery, comprehension, accessibility, privacy, cost và feasibility; baseline/weight TBD.

## 5. Kế hoạch nghiên cứu và thử nghiệm

### Pha D0 — Hiểu vấn đề

- Xác định segment và recruiting criteria.
- Phỏng vấn theo tình huống thật; thu artifact được phép.
- Exit: problem statement/persona/CUJ được xác nhận hoặc sửa; không đặt số mẫu khi chưa có owner/budget.

### Pha D1 — Concept/usability

- Dùng prototype hiện tại nhưng gắn nhãn mock rõ.
- Nhiệm vụ: draw, undo/clear, upload/drop, submit, đọc/chọn candidate, retry, xem history; bao gồm keyboard/mobile.
- Thu completion, điểm vướng, mental model và qualitative confidence; target TBD.
- Exit: quyết định input/result/history và danh sách lỗi UX.

### Pha D2 — Technical feasibility

- Chỉ bắt đầu khi có artifact hợp lệ và data governance.
- Chốt phạm vi ký tự, split/ground truth, metric, subgroup/error analysis, latency environment và reproducibility.
- So sánh với baseline/alternative; target không đặt trong tài liệu này khi chưa có bằng chứng.
- Exit: go/no-go có report, limitation và owner.

### Pha D3 — Integration experiment

- Contract test trong môi trường kiểm soát; feature flag; telemetry tối thiểu sau privacy review.
- Dogfood/pilot population, thời lượng và stop condition: TBD.
- Exit: launch gate PRD §15 hoặc rollback.

## 6. Instrumentation đề xuất

Dùng event plan tại [PRD §14](./prd.md#14-analytics-đề-xuất). Trước khi instrument cần quyết định consent, data classification, retention và access. Không thu ảnh, nét vẽ, text ký tự hoặc PII theo mặc định.

## 7. Bias và giới hạn nghiên cứu

- Prototype có copy tuyên bố model/class/JLPT chưa được chứng minh, có thể tạo expectation bias.
- Mock luôn trả cùng kết quả nên không đánh giá recognition.
- Mẫu thuận tiện có thể không đại diện kỹ năng viết, thiết bị hoặc nhu cầu accessibility.
- “Chọn đúng candidate” cần ground truth độc lập; self-report không đủ.
- Kết quả kỹ thuật không tự chứng minh product-market fit.

## 8. Decision log

| D-ID | Quyết định | Trạng thái | Căn cứ / bước tiếp |
|---|---|---|---|
| D-001 | Dùng prototype để kiểm tra luồng, không để chứng minh AI | Accepted | E-001–E-005 |
| D-002 | Persona/CUJ giữ provisional | Accepted | Chưa có research evidence |
| D-003 | Không chốt model, class/JLPT, performance | Accepted | E-006 |
| D-004 | Có giữ confidence trên UI hay không | Open | Test H-004 |
| D-005 | Candidate count và metadata tối thiểu | Open | Test H-003/H-005 |
| D-006 | Service/on-device/alternative | Open | D2 + privacy/cost review |
| D-007 | Lịch sử persistence | Open | Research + data lifecycle decision |

Mọi quyết định Accepted làm thay đổi scope/requirement phải cập nhật [PRD](./prd.md#16-open-questions-và-decision-log).
