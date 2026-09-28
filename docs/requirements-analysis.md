# Catalogue phân tích yêu cầu

> Nội dung/trạng thái requirement và acceptance criteria cấp hệ thống được định nghĩa trong [PRD](./prd.md); acceptance criteria cấp story theo Given/When/Then thuộc [user stories](./user-stories.md). Catalogue này chỉ giữ evidence, traceability, dependency và gap.

## Quy ước

- **Implemented (frontend):** có mã UI; không đồng nghĩa có dịch vụ thật.
- **Implemented (mock):** chạy bằng dữ liệu cố định.
- Các trạng thái còn lại theo [chú giải](./README.md#chú-giải-trạng-thái); ưu tiên P0/P1 không hàm ý deadline.

## Catalogue evidence và gap

| ID | Trạng thái quan sát | Bằng chứng / khoảng trống | Truy vết |
|---|---|---|---|
| FR-001 | Implemented (frontend) | `DrawCanvas.tsx`: canvas, pointer events, PNG data URL | CUJ-01; US-001 |
| FR-002 | Partially implemented / Current bug | `DrawCanvas.tsx`, `InputPanel.tsx`: brush 4–36, snapshot/clear. **Current bug:** undo có thể bỏ quá một nét và để `hasInk` lệch canvas. **Target expectation:** chỉ bỏ nét gần nhất, giữ phần còn lại, đồng bộ `hasInk` và có regression test. | CUJ-01; US-002 |
| FR-003 | Partially implemented; validation Unverified | `InputPanel.tsx`: `image/*`, click/drop, Enter/Space, preview/gỡ; content validation và reset chọn lại cùng file còn gap | CUJ-02; US-005 |
| FR-004 | Implemented (frontend) | `App.tsx`, `ResultPanel.tsx`: `idle/loading/success/error`, submit guard, retry | CUJ-01/02; US-003, US-006 |
| FR-005 | Implemented (mock) | `api.ts`, `mockData.ts`, `ResultPanel.tsx`: fixed candidates, sort/select | CUJ-01; US-004 |
| FR-006 | Implemented (frontend) | `App.tsx`: history React state, prepend/slice 8, không persistence | CUJ-03; US-007 |
| FR-007 | Proposed; Blocked | Chỉ có TODO; không backend/network contract đã duyệt | CUJ-04; US-010 |
| FR-008 | Proposed; Blocked | Không model/checkpoint/service/evaluation evidence | CUJ-04; US-011 |
| FR-009 | Proposed; Blocked | Metadata hiện là fixture; source/license/locale/nullability chưa duyệt | CUJ-04; US-012 |
| FR-010 | Proposed | Demo có mock message nhưng UI còn claim model chưa kiểm chứng | G4; US-013 |
| NFR-001 | Unverified | Có một phần keyboard/ARIA; chưa accessibility audit | US-008 |
| NFR-002 | Proposed | Chưa có threat model, content validation, limit, retention/control | US-012 |
| NFR-003 | Proposed | Chưa telemetry/service/SLO/error observability | US-010/011 |
| NFR-004 | Partially implemented | Có responsive CSS; chưa có ma trận viewport/zoom/orientation | US-009 |
| NFR-005 | Unverified | Có build/lint; không automated tests/CI | M0/M4 |

## Evidence/dependency mapping cho reuse candidate

Nguồn chi tiết: [Kanji_Smart reference analysis](./reference-implementations/kanji-smart.md), trạng thái **Reference implementation — external, unverified**. Bảng này không tạo requirement mới và không đổi trạng thái canonical.

| Requirement hiện hữu | Evidence liên quan | Dependency/gate trước khi reuse |
|---|---|---|
| FR-007 | Reference có một integration shape cho inference | Contract project phải được duyệt; không kế thừa endpoint/schema reference. |
| FR-008 | Reference source thể hiện pipeline ETL9B/JIS mapping → Dataset → transfer learning → checkpoint mapping → top-5 inference | License/provenance, reproduction, artifact integrity, evaluation/domain fit; model B3 của code reference không phải quyết định project. |
| FR-009 | Reference ghép mapping/metadata trong luồng inference | Xác minh nguồn/quyền/schema/nullability và tách metadata contract khỏi giả định reference. |
| NFR-002 | Reference nhận dữ liệu ảnh qua service | Threat model, validation, privacy/retention và quyền dữ liệu phải được duyệt độc lập. |
| NFR-003 | Reference cho thấy service boundary khả thi ở mức source | Chưa có SLO/metric tái lập; cần observability, failure tests và environment evidence. |
| NFR-005 | Thiếu dependency/artifact/metric tái lập trong reference | Pin environment, lưu hash/log, contract/evaluation tests và provenance report. |

## Ma trận năng lực và gap

| Năng lực | Frontend | Dịch vụ | Kiểm thử/đo lường |
|---|---|---|---|
| Vẽ/undo/clear | Implemented, undo có bug | Không áp dụng | Automated regression absent |
| Upload/preview | Implemented một phần | Absent | MIME/content/limit unverified |
| Recognition | Mock only | Absent | Accuracy/evaluation absent |
| Candidate details | Mock UI | Metadata service absent | Schema/quality unverified |
| History | Session-only | Persistence là non-goal hiện tại | Reload loss là Current |
| Accessibility/responsive | Partial | Không áp dụng | Audit/matrix absent |

## Quy tắc truy vết

- Wording/priority/status canonical: [PRD §8](./prd.md#8-yêu-cầu-ưu-tiên).
- AC chi tiết và Current bug/Target expectation: [user stories](./user-stories.md).
- Journey: [UI flow](./ui-flow-design.md); frontend implications: [feature specification](./feature-specification.md).
- Không đổi ID đã phát hành. Evidence mới có thể đổi trạng thái chỉ khi PRD được cập nhật cùng thay đổi.
