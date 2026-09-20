# Bộ tài liệu Kanji Recognizer

## Trạng thái và phạm vi

Bộ tài liệu này mô tả repository tại thời điểm kiểm tra. Nguồn sự thật sản phẩm là [PRD](./prd.md). Repository hiện chỉ có **prototype giao diện frontend dùng dữ liệu mock**; chưa có backend, API hoạt động, mô hình/checkpoint, dữ liệu huấn luyện, dịch vụ từ điển, analytics, CI hoặc bộ kiểm thử tự động.

## Thứ tự đọc

1. [PRD](./prd.md) — mục tiêu, phạm vi, yêu cầu chuẩn và quyết định.
2. [Phân tích yêu cầu](./requirements-analysis.md) — danh mục truy vết và mức triển khai.
3. [User stories](./user-stories.md) — hành trình và tiêu chí Given/When/Then.
4. [Đặc tả tính năng](./feature-specification.md) — hành vi UI hiện tại và biên tích hợp đề xuất.
5. [Khám phá sản phẩm](./product-discovery.md) — giả thuyết, bằng chứng và kế hoạch nghiên cứu.
6. [PRD frontend](./frontend-prd.md) — baseline, phạm vi và yêu cầu UX frontend; PRD sản phẩm vẫn được ưu tiên.
7. [Kế hoạch triển khai frontend](./frontend-implementation-plan.md) — workstream FE-WS0..FE-WS5 và gate A–F.
8. [Hướng dẫn frontend](../frontend/README.md) — chạy và phát triển prototype.

## Chú giải trạng thái

| Nhãn | Ý nghĩa |
|---|---|
| **Current** | Được kiểm chứng trong mã nguồn hiện có. |
| **Target/Proposed** | Hướng đích hoặc hợp đồng đề xuất; chưa phải năng lực đang chạy. |
| **TBD/Open Decision** | Chưa đủ bằng chứng hoặc cần quyết định. |
| **Blocked** | Phụ thuộc thành phần chưa tồn tại. |
| **Unverified** | Chưa có kiểm thử/bằng chứng để xác nhận. |

## Quy tắc sở hữu và cập nhật

- PRD giữ định nghĩa chuẩn của thuật ngữ, ID yêu cầu, trạng thái và hợp đồng đề xuất; tài liệu khác liên kết thay vì sao chép dài dòng.
- Chủ sở hữu tài liệu, người phê duyệt và nhịp rà soát: **TBD/Open Decision**.
- Mọi tuyên bố “Current” phải dẫn được tới file trong repository hoặc kết quả kiểm tra cục bộ.
- Không chuyển mục Proposed thành Current trước khi có mã, kiểm thử và bằng chứng vận hành.
- Khi đổi hợp đồng, cập nhật PRD, đặc tả, catalogue yêu cầu và kiểu frontend trong cùng thay đổi.
- Không tạo tài liệu thiết kế hệ thống mô hình khi repository chưa có artifact mô hình được kiểm chứng.
