# Kế hoạch triển khai frontend — Kanji Recognizer

> **Quyền ưu tiên:** [PRD sản phẩm](./prd.md) là nguồn chuẩn. Khi có mâu thuẫn, `docs/prd.md` được ưu tiên. FE-WS0..FE-WS5 tiếp tục tổ chức recognition theo **FR-001..FR-010**, **NFR-001..NFR-005**, **US-001..US-013** và **M0..M5**. Phần mở rộng learning tổ chức frontend theo **LS-FR-001..LS-FR-017**, các **NFR-001..NFR-005** áp dụng, **LUS-001..LUS-017** và **LS0..LS3**, dưới các gate của [master roadmap](./implementation-roadmap.md); kế hoạch không tạo requirement hay mốc sản phẩm mới.

## 1. Quy ước trạng thái

- **Not started:** chưa bắt đầu.
- **In progress:** đang thực hiện, chưa qua gate.
- **Blocked:** thiếu quyết định, contract hoặc dependency.
- **Ready for validation:** đã có thay đổi và bằng chứng để kiểm tra.
- **Validated:** đã qua gate áp dụng.
- **Deferred:** hoãn bằng quyết định được ghi nhận; không đồng nghĩa hoàn tất.

Không dùng phần trăm hoàn thành. Mỗi thay đổi trạng thái phải kèm bằng chứng hoặc lý do chặn.

## 2. Baseline, ràng buộc và phụ thuộc

### Baseline

Dùng [PRD §3](./prd.md#3-hiện-trạng-và-trạng-thái-đích) cho baseline và [feature specification](./feature-specification.md) cho frontend implications; kế hoạch không lặp lại các định nghĩa này.

### Ràng buộc

- Bảo toàn hành vi Current trước khi thay đổi; không gọi mock là inference thật.
- Không phát minh endpoint/schema; không nối service trước contract/backend được duyệt.
- Không đổi requirement chuẩn trong task frontend; thay đổi phạm vi phải đi qua PRD.
- Không log hoặc lưu ảnh ngoài chính sách được duyệt.
- Mỗi gate yêu cầu bằng chứng tái lập; build/lint đơn lẻ không chứng minh accessibility hay hành vi end-to-end.
- **Redesign:** UI, design system, responsive và accessibility phải theo chuẩn được duyệt của project hiện tại; không sao chép UI reference.
- **Learning System:** semantics/acceptance được định nghĩa ở [PRD §18](./prd.md#18-learning-system--targetproposed-bounded). Learning không bị loại khỏi toàn bộ kế hoạch: FE-L0 có thể chuẩn bị shell/view-model/prototype được gắn nhãn local/mock; FE-L1..FE-L6 chỉ tiến theo gate tương ứng trong [master roadmap](./implementation-roadmap.md). Bất kỳ phần phụ thuộc persistence/backend/privacy hoặc `LS-OD-*` chưa đóng vẫn **Blocked**. Quảng cáo là non-goal của các slice hiện tại.
- **AI reuse candidate:** chỉ học theo cách tiếp cận pipeline trong [Kanji_Smart reference analysis](./reference-implementations/kanji-smart.md); FE-WS4 tiếp tục **Blocked** cho đến khi đạt gate reproducibility, license/provenance, artifact integrity, domain fit và contract.

### Bản đồ phụ thuộc

```text
FE-WS0 ──┬──> FE-WS1
         ├──> FE-WS2 ──┬──> FE-WS4 (Blocked: approved contract + backend)
         └──> FE-WS3 ──┘
FE-WS0/1/2/3/4 ───────> FE-WS5
```

## 3. Workstreams

| ID | Workstream | Requirement/story tham chiếu | Đầu ra và điều kiện hoàn tất |
|---|---|---|---|
| **FE-WS0** | Safeguard baseline | FR-001..FR-006, NFR-005; US-001..US-007 | Ghi fixture/hành vi baseline; bảo vệ state, sort, selection, history; không regression qua Gate B. |
| **FE-WS1** | Demo truthfulness | FR-010; US-013; G4 | Nhãn mock nhất quán; loại/giảm claim chưa xác minh; production mock guard; qua review nội dung và Gate C. |
| **FE-WS2** | Input lifecycle/validation | FR-001..FR-004; NFR-002, NFR-003; US-001..US-006 | Quy tắc lifecycle, object URL cleanup, validation/error UX, chống duplicate/race theo quyết định đã duyệt; qua Gate D. |
| **FE-WS3** | Accessibility/responsive | NFR-001, NFR-004; US-008, US-009 | Keyboard/focus/status/candidate/canvas alternative và ma trận viewport/zoom/touch có bằng chứng; qua Gate D. |
| **FE-WS4** | Integration seam | FR-007..FR-009; NFR-002, NFR-003; US-010..US-012 | Adapter + runtime validation + DTO/error mapping + cancel/timeout/retry theo contract. **Blocked** đến khi contract và backend được duyệt; qua Gate E. |
| **FE-WS5** | Automated quality/release evidence | NFR-005; các story bị tác động | Test pyramid phù hợp, CI gates, evidence index và release checklist; qua Gate F. |

## 4. Các pha và gate A–F

Các pha không hàm ý ngày, owner hoặc estimate. Không được bỏ gate chỉ vì thay đổi nhỏ; chỉ thu hẹp ma trận khi có lý do ghi nhận.

### Gate A — Canonical alignment

- Xác nhận PRD sản phẩm vẫn là chuẩn; phạm vi thay đổi truy được về requirement/story/mốc hiện hữu.
- Ghi quyết định mở, dependency và stop condition.
- **Exit:** không có requirement mới ẩn trong thiết kế frontend; link/ID hợp lệ.

### Gate B — Baseline safeguard

- Hoàn thành FE-WS0: đặc tả/test baseline cho draw, upload, state, mock, sort/selection và history.
- Ghi rõ claim EfficientNet-B3/250 Kanji/JLPT N5/N4 là unverified.
- **Exit:** hành vi Current có bằng chứng tái lập; regression quan trọng bị chặn.

### Gate C — Honest demo

- Hoàn thành FE-WS1; mock luôn được nhận biết là demo và không phụ thuộc input.
- Xác nhận cấu hình production không thể vô tình dùng mock.
- **Exit:** review nội dung + test mode guard đạt; FR-010/US-013 có bằng chứng.

### Gate D — Robust local UX

- Hoàn thành FE-WS2 và FE-WS3 theo các quyết định đã duyệt.
- Kiểm tra lifecycle/race/error, keyboard/screen reader, responsive/zoom/touch.
- **Exit:** ma trận áp dụng đạt; gap còn lại được chấp thuận rõ, không ẩn dưới nhãn Current.

### Gate E — Approved integration

- Chỉ mở khi contract/version/auth/limits/errors và backend testable đã được phê duyệt.
- Nếu dùng AI reuse candidate, phải có reproduction report, license/provenance, artifact hash/version và domain-fit evaluation được review; reference endpoint/model không được mặc định thành contract.
- Hoàn thành FE-WS4 mà không để component phụ thuộc transport DTO.
- **Exit:** contract/integration tests đạt; privacy/error/cancel/timeout/retry evidence đầy đủ. Nếu dependency thiếu, trạng thái vẫn **Blocked**.

### Gate F — Release evidence

- Hoàn thành FE-WS5; chạy toàn bộ validation matrix áp dụng trong môi trường sạch.
- Liên kết evidence với requirement/story và mốc chuẩn liên quan.
- **Exit:** không còn stop condition; quyết định mở ảnh hưởng release đã đóng hoặc được chấp thuận; release checklist được phê duyệt.

## 5. Mẫu task

```markdown
### <Task ID> — <Tên ngắn>
- Workstream: FE-WS<n>
- Status: Not started | In progress | Blocked | Ready for validation | Validated | Deferred
- Canonical references: FR-...; NFR-...; US-...; M...
- Current evidence:
- Intended change / non-scope:
- Dependencies and decisions:
- Acceptance checks:
- Validation evidence:
- Risks / rollback:
- Stop condition:
```

Task ID nội bộ không được mang dạng FR/NFR/US/M để tránh bị hiểu là requirement/mốc sản phẩm.

## 6. Ma trận validation

| Khu vực | Kiểm tra tối thiểu | Bằng chứng | Gate |
|---|---|---|---|
| Canonical/truy vết | Link tương đối, ID FR/NFR/US/M, không ID lạ | Link/ID report | A, F |
| Static quality | TypeScript build, lint, format/diff hygiene | Log lệnh + commit/change set | B–F |
| Draw | Empty/ink, brush 4–36, undo/clear, pointer/resize | Component/integration tests | B, D |
| Upload | Click/keyboard/drop, preview/remove/replace, invalid file, URL cleanup | Tests + manual edge-case record | B, D |
| State/concurrency | idle/loading/success/error, duplicate submit, retry, stale/late response | Deterministic tests | B, D, E |
| Result/history | Sort, selection, empty/malformed data, cap 8, reload volatility | Tests | B, E |
| Demo truthfulness | Mock label/copy/config guard; no unverified production claim | Snapshot/content review + config test | C, F |
| Accessibility | Keyboard, focus, names/roles/states, live announcements, contrast, zoom, canvas alternative | Automated scan + manual audit | D, F |
| Responsive | Viewport/orientation/touch/zoom matrix được duyệt | Screenshots/test report | D, F |
| Integration | Adapter, runtime schema, DTO mapping, error/cancel/timeout/retry, contract compatibility | Contract/integration tests | E |
| Privacy/security | File limits/content policy, redaction, no unintended persistence/logging | Security checklist/tests | D, E, F |
| Release | Clean install/build/lint/test/CI và artifact provenance | CI run + release checklist | F |

## 7. Mở rộng frontend cho Learning System

Phần này bổ sung có kiểm soát cho FE-WS0..FE-WS5; không đổi trạng thái hoặc gate recognition. Nguồn thứ tự cross-functional là [master roadmap](./implementation-roadmap.md); nguồn state/component/a11y là [Learning Experience UI Skill](./skills/learning-experience-ui-skill.md). Toàn bộ learning vẫn **Target/Proposed** cho đến khi có code và evidence.

### 7.1 Workstream và thứ tự tích hợp

| ID | Slice/màn hình theo thứ tự | Component/view-model seam | Requirement | Gate |
|---|---|---|---|---|
| **FE-L0** | App shell capability → IA/navigation → shared state gallery | Capability guard, route shell, async-state/freshness patterns | LS-FR-015..016 | LS0; chỉ local/mock prototype, không fake persistence |
| **FE-L1** | Library list/filter → deck management → item detail | Library/deck/item view models, empty/partial/error/offline states | LS-FR-001..004, 015..017 | L1 contract/identity/storage/metadata/privacy decisions |
| **FE-L2** | Confirmed recognition candidate → save sheet → saved/detail handoff | Immutable candidate ref, deck picker/create, pending/conflict/result | LS-FR-002, 005, 015..017 | FE-L1 repository/dedupe/idempotency ready |
| **FE-L3** | Practice setup → flashcard front/reveal/back → classification → summary/resume | Session snapshot/cursor/order; Know/Review again isolated from SRS | LS-FR-006..007, 015..016 | L2 metadata/session policy |
| **FE-L4** | Quiz setup → question/submit → feedback → summary/retry | Versioned scoring/normalization result model | LS-FR-008..009, 015..016 | L3 quiz/content decisions |
| **FE-L5** | Review queue → card/reveal → rating/preview → summary/resume/card controls | Due item, scheduler preview, commit/conflict model | LS-FR-010..012, 014..016 | L4 clock/scheduler/idempotency/offline decisions |
| **FE-L6** | Progress range → activity/recall/inventory/streak/forecast | Metric value + denominator/range/freshness; text/table chart alternative | LS-FR-013, 015..017 | L5 event/privacy/time-zone decisions |

Do not build later screens around guessed DTOs. A workstream may create typed local view-model fixtures for state/a11y review, but service adapters, success claims and durable navigation remain disabled until its gate closes.

### 7.2 Shared integration sequence per workstream

1. Link task to LS-FR and the detailed plan under [`plans/`](./plans/).
2. Record prerequisite decisions and capability state; unresolved dependency means **Blocked**, not an implicit default.
3. Define route/sheet boundary and view model before transport mapping.
4. Implement empty/loading/partial/error/offline/success plus destructive/pending/conflict states before happy-path sign-off.
5. Validate keyboard, screen reader, focus restoration/live status, touch, 200% zoom, orientation and reduced motion.
6. Add contract adapter only after approval; prove retry/idempotency and no false success.
7. Collect acceptance evidence from PRD §18.15 and update status without promoting Target to Current prematurely.

### 7.3 Learning frontend stop conditions

Stop when a task requires guessing identity, endpoint/schema, canonical item/dedupe, deck deletion, quiz normalization, scheduler/clock, offline conflict, event metric, retention/consent or locale policy. Also stop on cross-mode coupling: flashcard/quiz must not rate SRS; recognition confidence must not become quiz correctness; progress must not infer “mastered”.

## 8. Giao thức thay đổi

1. Gắn task với requirement/story/mốc chuẩn hiện hữu.
2. Nếu thay đổi mục tiêu, scope, acceptance hoặc contract: dừng frontend task; đề xuất cập nhật `docs/prd.md` và tài liệu truy vết trước.
3. Ghi Current evidence trước khi sửa; giới hạn file và non-scope.
4. Thực hiện thay đổi nhỏ, reviewable; không trộn refactor không liên quan.
5. Chạy validation theo ma trận và lưu evidence có thể tái lập.
6. Cập nhật trạng thái chỉ sau gate; gap phải là Blocked/Deferred/Unverified, không ghi “done”.
7. Khi rollback, khôi phục mode an toàn và không làm mất bằng chứng/decision log.

## 9. Stop conditions

Dừng hoặc giữ **Blocked** khi xảy ra một trong các điều kiện:

- Không truy được thay đổi recognition về FR-001..FR-010, NFR-001..NFR-005, US-001..US-013 hoặc learning về LS-FR-001..LS-FR-017, các NFR-001..NFR-005 áp dụng, LUS-001..LUS-017.
- Cần phát minh endpoint, schema, auth, model, dataset, coverage, metric hoặc SLO.
- Contract/backend chưa duyệt nhưng task yêu cầu gọi service thật.
- Chưa quyết định cách xử lý dữ liệu ảnh, validation, retention/logging hoặc privacy.
- Baseline/regression test thất bại; race tạo kết quả sai input; mock có thể lọt production.
- Accessibility/responsive critical path không dùng được theo ma trận đã duyệt.
- CI/evidence không tái lập hoặc release còn claim chưa xác minh.

## 10. Quyết định mở

Không định nghĩa lại quyết định tại đây. Nguồn canonical là [PRD §16](./prd.md#16-open-questions-và-decision-log); frontend implications nằm trong [feature specification §9](./feature-specification.md#9-decisionsdependencies-còn-mở). Task chỉ ghi decision ID, dependency và stop condition liên quan.

## 11. Liên kết mốc chuẩn

M0..M5 và exit criteria được định nghĩa duy nhất tại [PRD §13](./prd.md#13-milestone-theo-exit-criteria). Workstream/gate chỉ truy vết tới các ID đó; không đổi hoặc diễn giải lại milestone tại đây.
