# Báo cáo audit PRD theo prd-skill

> **Snapshot / non-canonical.** Phụ lục này ghi lại kết quả tại thời điểm audit; không phải nguồn requirement, status hay contract hiện hành. Xem [PRD](../prd.md) và [ownership map](../README.md#ownership-map).

> Phạm vi: `docs/prd.md` và các `docs/*.md` liên quan. Audit đối chiếu source ở chế độ read-only cho claim **Current**. Số dòng dưới đây là số dòng của PRD sau sửa.

## Kết quả checklist

| Quy tắc skill | Đạt/Thiếu/Sai | Bằng chứng mục + số dòng hiện tại trong PRD | Đề xuất sửa |
|---|---|---|---|
| PRD là nguồn chuẩn; docs khác chỉ tham chiếu | **Đạt** | Metadata dòng 5–16; `product-discovery.md` §3 liên kết canonical tới PRD §7; liên kết AC dòng 163; truy vết dòng 324–333 | Discovery chỉ quản lý evidence/cách kiểm chứng và không định nghĩa giả thuyết song song. |
| Quyết định Full/Lite | **Đạt** | “Quyết định Full/Lite…” dòng 26–34; chọn **Full** và nêu lý do | Không cần sửa. |
| Ba phase Define/Design/Deliver và gate | **Đạt** | Dòng 29–34; approval ghi **TBD/Open Decision** hoặc **Blocked** | Không được đổi gate sang approved nếu chưa có evidence. |
| Anchor/evidence status | **Đạt** | Bảng dòng 36–45 | Duy trì trạng thái khi có evidence mới. |
| Current truy source hoặc Unverified | **Đạt** | Current baseline dòng 51–61; nguyên tắc dòng 88–94; technical boundary dòng 210–217 | Mọi claim mới phải dẫn source/test; nội dung UI không tự là bằng chứng model. |
| Persona mô hình 5 cột | **Đạt** | Bảng persona dòng 96–105 | Persona vẫn **Unverified** đến khi có research evidence. |
| Persona/CUJ decision mapping | **Đạt** | Bảng CUJ dòng 107–111 | Không tạo CUJ mới nếu chưa qua quyết định phạm vi. |
| Đúng một NSM và metric contract | **Đạt** | Dòng 113–130; duy nhất “Tỷ lệ hoàn tất tác vụ tra ký tự có xác nhận” | Owner, window, baseline, target giữ **TBD/Open Decision**. |
| Structured hypothesis có in/out scope | **Đạt** | Dòng 132–139 | Kế hoạch kiểm chứng tham chiếu từ discovery; không định nghĩa song song. |
| Story/AC linkage | **Đạt** | Requirement dòng 141–161; AC owner/link dòng 163; traceability dòng 324–333 | AC chi tiết tiếp tục ở `user-stories.md`; PRD giữ requirement canonical. |
| MoSCoW mapping | **Đạt** | Dòng 165–174 | Không tạo requirement chỉ để lấp Could Have. |
| ID convention | **Đạt với deviation có chủ đích** | Dòng 174 | Giữ nguyên ID đã phát hành FR/NFR/US/CUJ/G/M; MoSCoW chỉ là lớp ánh xạ. |
| User flow | **Đạt** | Dòng 176–195 | Giữ flow đồng bộ với state machine/AC. |
| Business rules | **Đạt** | Dòng 197–206 | Các giá trị chưa duyệt tiếp tục là **TBD/Open Decision**. |
| Technical boundaries | **Đạt** | Dòng 208–217 | DTO mock không được gọi là backend contract canonical. |
| API/endpoint không bị gọi là Current/canonical | **Đạt** | Dòng 208–221 ghi rõ **TBD/Open Decision**, chưa triển khai/chưa canonical | Chỉ nâng trạng thái sau phê duyệt và implementation evidence. |
| Scope exclusions; Won't Do khác Won't Have | **Đạt** | Dòng 72–86 | Thay đổi phạm vi phải qua decision log; không tạo requirement ngầm. |
| Không bịa model/class/JLPT/metric/deadline/owner | **Đạt** | Dòng 72–86, 117–130, 300–312 | Mọi giá trị chưa rõ giữ **TBD/Open Decision/Unverified**. |
| Open questions có Owner/Due Date/Status | **Đạt** | Dòng 298–312 | Chỉ thay TBD bằng người/ngày khi có quyết định có thẩm quyền. |
| Phase approval không bị bịa | **Đạt** | Dòng 32–34 và 312 | Approval hiện **Unverified/Blocked**. |
| Milestone không được tạo mới/đổi ID | **Đạt** | M0..M5 dòng 281–288 | Giữ ID và exit criteria hiện hữu. |

## Bằng chứng đối chiếu source read-only

- `frontend/src/api.ts`: `mockRecognize` bỏ qua input, trả `MOCK_PREDICTIONS` sau 1.400 ms; route chỉ nằm trong comment TODO.
- `frontend/src/App.tsx`, `components/DrawCanvas.tsx`, `components/InputPanel.tsx`, `components/ResultPanel.tsx`: xác nhận state, draw/upload, candidate selection và history phiên.
- `frontend/src/types.ts`: kiểu hiện tại phục vụ view-model/mock; không phải contract backend đã duyệt.
- `frontend/package.json`: xác nhận React 19, TypeScript và Vite.
- Không dùng source làm nơi ghi sửa; không sửa comment/type.

## Kiểm tra tự động

| Kiểm tra | Kết quả |
|---|---|
| UTF-8 strict, không BOM, không U+FFFD, không dấu hiệu mojibake | **Đạt:** 10/10 file `docs/*.md`. |
| ID definitions/references | **Đạt:** FR-001..010, NFR-001..005, US-001..013, CUJ-01..04, G1..G4, M0..M5; không có reference chưa định nghĩa. |
| Endpoint status | **Đạt:** mọi mention `POST /api/kanji/recognize` đều là stub hoặc **Target/Proposed/TBD**, chưa duyệt, không phải API Current/canonical. |
| Internal file links | **Đạt:** không phát hiện file đích thiếu. |
| Heading anchors | **Đạt:** không phát hiện anchor đích thiếu sau khi giữ nguyên các heading đánh số chính. |
| Phạm vi diff | **Đạt cho bước này:** chỉ cập nhật `docs/prd.md`, `docs/product-discovery.md` và báo cáo audit. Các thay đổi `frontend/src/**` đã tồn tại ở baseline; SHA-256 trước/sau của các source đang dirty không đổi. |

## Finding còn mở

1. Owner/approver, phase-gate approval, persona ưu tiên, NSM baseline/target/window, contract/API, privacy/security, model/data/class/JLPT, accessibility target, SLO và launch plan đều **TBD/Open Decision** hoặc **Blocked/Unverified**; audit không tự quyết.

## File thay đổi bởi phiên audit

- `docs/prd.md` (đồng bộ heading canonical §7 với anchor đã công bố)
- `docs/product-discovery.md`
- `docs/prd-skill-audit.md`
