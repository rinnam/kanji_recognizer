# Engineering Docs Integration Changelog

## 2026-10-01

Đã tích hợp bộ tài liệu engineering được đề xuất từ Claude vào docs chuẩn hóa.

### Được chấp nhận
- Definition of Done có evidence bắt buộc.
- Vertical-slice workflow và F0 foundation gate.
- PostgreSQL dev là runtime mặc định; không mock để che lỗi.
- Backend layer boundaries và aggregate-based file splitting.
- Frontend feature boundaries, API adapter và state model.
- Vite proxy + 502 diagnostic runbook.
- API error contract và FE error mapping.
- Unit / integration / contract / smoke test phân tầng.
- `AI_WORK_LOG.md` chỉ ghi evidence sau khi đã kiểm chứng.

### Không coi là bằng chứng runtime tự động
Các trạng thái `Current`, `đã chạy thật`, hoặc dấu `✅` trong tài liệu nguồn được giữ nguyên như tài liệu tham khảo của đề xuất. Khi AI chạy repo hiện tại, nó phải tạo evidence mới từ runtime hiện tại trước khi chuyển feature sang `Done`.
