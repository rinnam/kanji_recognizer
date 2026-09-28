# Thiết kế luồng UI — Kanji Recognizer

> Tài liệu này sở hữu màn hình, journey, transition và recovery UX. Product requirement: [PRD §8](./prd.md#8-yêu-cầu-ưu-tiên); acceptance criteria: [user stories](./user-stories.md); implementation internals: [feature specification](./feature-specification.md).

## 1. Màn hình và trạng thái UX

| Khu vực | Mục đích | Trạng thái đáng chú ý |
|---|---|---|
| Hero/giới thiệu | Định hướng tác vụ | Claim model/class/JLPT/tốc độ chỉ là **Unverified** nếu không có artifact |
| Input panel | Chọn Vẽ tay hoặc Tải ảnh | Empty/ready; đổi tab hiện làm mất nét vẽ nhưng giữ file upload |
| Canvas | Vẽ, chỉnh độ dày, hoàn tác, xóa | Empty/has input; undo có Current bug |
| Upload | Chọn/drop, preview, gỡ | Empty/preview/invalid; validation còn gap |
| Result | Hướng dẫn, loading, lỗi, danh sách/chi tiết | `idle/loading/error/success` |
| History | Kết quả gần đây | Tối đa 8 trong phiên; mất khi reload |

## 2. Journey tổng quát

```text
Chọn input mode
  -> tạo/chọn input
  -> submit hợp lệ
  -> loading
  -> success: xem/chọn candidate -> history
  -> error: hiểu lỗi -> sửa input hoặc retry khi phù hợp
```

Các CUJ và acceptance criteria không lặp tại đây: xem **CUJ-01..CUJ-04** cùng acceptance cấp hệ thống trong [PRD](./prd.md), và recognition stories **US-001..US-013** cùng learning stories **LUS-001..LUS-017** trong [user stories](./user-stories.md).

## 3. Transition nhận diện

```text
idle --submit(valid)--> loading --resolve--> success
                           └--failure--> error --retryable/retry--> loading
error --edit/replace input--> idle
success --edit/replace input--> input-ready (stale-result indication: TBD)
```

- Loading khóa gửi lặp và thông báo tiến trình.
- Success chọn candidate đầu theo thứ tự adapter cung cấp; người dùng có thể đổi candidate.
- Error giữ đường phục hồi rõ: retry chỉ khi phù hợp, hoặc quay lại sửa/thay input.
- Mock hiện trả fixture sau khoảng 1,4 giây; UI phải nói rõ đây là demo.

## 4. Journey vẽ và recovery

```text
Mở Vẽ tay -> vẽ -> [Hoàn tác | Xóa | Nhận diện]
```

- **Current bug:** Hoàn tác có thể bỏ quá một nét/đưa canvas trắng trong khi trạng thái vẫn báo có mực.
- **Target UX:** mỗi lần hoàn tác chỉ bỏ nét gần nhất; Xóa đưa về empty và khóa submit.
- Đổi sang Upload rồi quay lại hiện làm mất hình vẽ. Target giữ hay xóa cần quyết định rõ và phản hồi không gây bất ngờ.
- Chi tiết snapshot/component lifecycle thuộc [feature specification §3](./feature-specification.md#3-lifecycle-và-invariant-cần-adapter-bảo-vệ).

## 5. Journey upload và recovery

```text
Mở Tải ảnh -> click/Enter/Space/drop -> preview
  -> [Gỡ | Thay | Nhận diện]
  -> invalid -> thông báo -> chọn lại
```

- Gỡ phải đưa UI về empty, khóa submit và cho phép chọn lại cùng file.
- Validation cần thông báo loại/kích thước/nội dung không hợp lệ theo policy; không dựa riêng vào file extension.
- Chi tiết native input/object URL/cleanup thuộc [feature specification §3](./feature-specification.md#3-lifecycle-và-invariant-cần-adapter-bảo-vệ).

## 6. Kết quả, lịch sử và recovery

- Success hiển thị danh sách ứng viên và chi tiết mục đang chọn; metadata thiếu không làm mất toàn bộ màn hình.
- History chỉ là shortcut trong phiên; không ngụ ý persistence hay dữ liệu thật.
- Khi input thay đổi sau success, policy stale-result phải tránh khiến kết quả cũ bị hiểu là của input mới.
- Lỗi schema/network/timeout/auth/rate limit được map thành thông báo an toàn; schema/error internals xem [feature specification](./feature-specification.md).

## 7. Accessibility và responsive trong journey

- Mọi transition quan trọng cần focus/status feedback có thể nhận biết không chỉ bằng màu.
- Upload có đường bàn phím; canvas cần alternative input; candidate cần semantics chọn được.
- Recovery action phải còn truy cập được ở viewport/zoom/orientation hỗ trợ.
- Trạng thái vẫn **Unverified** đến khi có audit và ma trận kiểm thử; AC xem US-008/US-009.

## 8. Điểm tích hợp

UI chỉ biết adapter và view-model. API schema thuộc [PRD §10](./prd.md#10-hợp-đồng-apidata-đề-xuất--chưa-triển-khai); validation/mapping/cancel implications thuộc [feature specification](./feature-specification.md). Không có endpoint Current trong checkout.
