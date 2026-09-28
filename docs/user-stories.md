# User stories và tiêu chí chấp nhận

> Persona/CUJ là tạm thời cho đến khi có nghiên cứu. Requirement chuẩn và acceptance criteria cấp hệ thống nằm trong [PRD](./prd.md), gồm learning tại [§18](./prd.md#18-learning-system--targetproposed-bounded). Tài liệu này sở hữu acceptance criteria cấp story theo Given/When/Then; toàn bộ learning story dưới đây là **Target/Proposed**, không phải hành vi Current.

## PER-1 — Người cần tra ký tự từ hình dạng · CUJ-01

### US-001 — Vẽ một ký tự
**Liên kết:** FR-001

- **Given** tab Vẽ tay đang mở và canvas rỗng, **When** người dùng vẽ bằng pointer, **Then** nét xuất hiện và hành động Nhận diện trở nên khả dụng.
- **Given** canvas chưa có nét, **When** người dùng xem hành động Nhận diện, **Then** hành động bị vô hiệu hóa.

### US-002 — Sửa đầu vào vẽ
**Liên kết:** FR-002

- **Current bug:** với nhiều nét, Hoàn tác có thể làm mất hai nét/đưa canvas về giấy trắng trong khi `hasInk` vẫn `true`.
- **Target:** **Given** đã có nhiều nét, **When** chọn Hoàn tác, **Then** chỉ nét gần nhất bị bỏ, phần còn lại được giữ và `hasInk` phản ánh đúng nội dung canvas; phải có kiểm thử hồi quy.
- **Given** có nét, **When** chọn Xóa, **Then** canvas trở về giấy trống và không thể gửi.
- **Given** thanh độ dày, **When** thay giá trị, **Then** nét mới dùng kích thước hiển thị trong khoảng 4–36 px.

### US-003 — Nhận phản hồi theo trạng thái
**Liên kết:** FR-004

- **Given** có đầu vào, **When** gửi, **Then** UI chuyển sang loading và chặn gửi lặp.
- **Given** xử lý thành công, **When** response được nhận, **Then** UI chuyển success.
- **Given** xử lý ném lỗi, **When** lỗi được bắt, **Then** UI hiển thị error và hành động Thử lại.

### US-004 — Xem và chọn ứng viên
**Liên kết:** FR-005

- **Given** danh sách mock thành công, **When** hiển thị, **Then** ứng viên được sort confidence giảm dần và phần tử đầu được chọn.
- **Given** nhiều ứng viên, **When** chọn một hàng khác, **Then** thẻ chi tiết chuyển sang ứng viên đó.
- **Current caveat:** kết quả là dữ liệu cố định, không phụ thuộc nét vẽ/ảnh.

## PER-1 · CUJ-02 — Ảnh tải lên

### US-005 — Chọn, kéo-thả, thay hoặc gỡ ảnh
**Liên kết:** FR-003

- **Given** tab Tải ảnh, **When** click hoặc nhấn Enter/Space trên dropzone, **Then** file picker được mở.
- **Given** file được chọn/drop, **When** client tạo object URL, **Then** preview và nút gỡ hiển thị.
- **Current bug:** **Given** có preview, **When** gỡ ảnh, **Then** preview và `fileObj` bị xóa, hành động gửi bị khóa, nhưng `fileInputRef.value` không được reset nên chọn lại cùng file có thể không phát sinh `change`.
- **Target:** gỡ ảnh phải reset cả preview, `fileObj` và giá trị file input; cần kiểm thử chọn lại cùng file.
- **Unverified:** loại nội dung, kích thước và ảnh hợp lệ chưa được kiểm tra thực chất.

### US-006 — Hiểu và phục hồi lỗi
**Liên kết:** FR-004, NFR-003

- **Given** xử lý thất bại, **When** UI chuyển error, **Then** có thông báo và nút Thử lại.
- **Target/Proposed:** **Given** lỗi dịch vụ có code, **When** client nhận lỗi, **Then** thông báo phù hợp, không rò dữ liệu và chỉ retry khi `retryable=true`.

## PER-1 · CUJ-03 — Lịch sử

### US-007 — Xem kết quả gần đây trong phiên
**Liên kết:** FR-006

- **Given** một lượt success, **When** lịch sử cập nhật, **Then** top candidate được thêm đầu danh sách cùng thumbnail/thời gian hiện tại.
- **Given** hơn 8 lượt, **When** thêm lượt mới, **Then** chỉ 8 mục mới nhất còn lại.
- **Given** reload trang, **When** ứng dụng khởi tạo lại, **Then** lịch sử mất; đây là Current behavior, không phải persistence.

## PER-2 — Người dùng bàn phím/thiết bị đa dạng

### US-008 — Hoàn tất bằng bàn phím và công nghệ hỗ trợ
**Liên kết:** NFR-001

- **Given** chỉ dùng bàn phím, **When** đi qua tab/upload/actions/candidates, **Then** thứ tự focus, tên và trạng thái đều hiểu được. **Status: Unverified.**
- **Given** trạng thái loading/error/success đổi, **When** dùng screen reader, **Then** thay đổi quan trọng được thông báo. **Status: Proposed; live region chưa được xác minh.**
- **Given** không thể vẽ canvas, **When** cần nhập liệu, **Then** upload là con đường tương đương. Chất lượng tương đương: TBD.

### US-009 — Hoàn tất trên viewport hỗ trợ
**Liên kết:** NFR-004

- **Given** viewport/zoom trong ma trận hỗ trợ TBD, **When** hoàn tất CUJ-01/02, **Then** không mất nội dung hoặc action và không có scroll ngang ngoài ý muốn. **Status: Unverified.**

## PER-3 — Kỹ sư tích hợp · CUJ-04 (future service)

### US-010 — Gửi request thật
**Liên kết:** FR-007, NFR-003

- **Given** contract được phê duyệt và service sẵn sàng, **When** submit ảnh, **Then** client gọi endpoint cấu hình, xử lý timeout/cancel và không gọi mock.
- **Given** service unavailable, **When** nhận lỗi retryable, **Then** client cho phép retry an toàn và không nhân đôi side effect.

### US-011 — Nhận ứng viên có truy vết
**Liên kết:** FR-008, NFR-003

- **Given** response thành công, **When** validate schema, **Then** có `request_id`, `model_version`, predictions đúng thứ tự và field bắt buộc.
- **Given** schema sai/empty ngoài contract, **When** client xử lý, **Then** chuyển lỗi có kiểm soát thay vì render dữ liệu không an toàn.

### US-012 — Metadata, quyền riêng tư và an toàn
**Liên kết:** FR-009, NFR-002

- **Given** metadata thiếu/null theo contract, **When** render, **Then** UI dùng fallback, không crash và không bịa giá trị.
- **Given** ảnh được gửi, **When** xử lý, **Then** retention/access/logging tuân theo chính sách đã duyệt. Chính sách hiện TBD.

### US-013 — Không nhầm mock với production
**Liên kết:** FR-010

- **Given** app ở mock mode, **When** người dùng xem kết quả, **Then** nhãn demo hiển thị rõ.
- **Given** build production, **When** cấu hình vẫn trỏ mock, **Then** launch gate/build check phải thất bại. Cơ chế: Proposed.

## Learning System — Target/Proposed

Các story `LUS-*` triển khai acceptance cấp story cho `LS-FR-001..LS-FR-017`. Chúng không đóng các quyết định `LS-OD-*`; nếu điều kiện liên quan chưa được duyệt, story vẫn **Blocked/Target**.

### LUS-001 — Quản lý deck
**Liên kết:** LS-FR-001, LS-FR-015, LS-FR-016; LP-1; LS-OD-01, LS-OD-03

- **Given** capability persistence được phê duyệt, **When** người dùng tạo hoặc đổi tên deck bằng tên hợp lệ, **Then** mutation chỉ báo thành công sau commit và count được cập nhật chính xác.
- **Given** deck có membership, **When** người dùng archive/xóa, **Then** UI xác nhận tác động, giữ ReviewLog theo policy và phục hồi focus sau dialog.
- **Given** persistence chưa sẵn sàng, **When** xem prototype, **Then** UI ghi rõ local/mock và không ngụ ý account hoặc sync.

### LUS-002 — Lưu và bỏ mục trong nhiều deck
**Liên kết:** LS-FR-002, LS-FR-015, LS-FR-016; LP-1; A1; LS-OD-01..03, LS-OD-06

- **Given** một item và hai deck, **When** lưu item vào từng deck hoặc retry cùng mutation, **Then** chỉ một membership cho mỗi cặp tồn tại và kết quả nêu đúng deck.
- **Given** mutation timeout/conflict, **When** trạng thái commit chưa xác nhận, **Then** UI không báo thành công, giữ ngữ cảnh và cho retry/refetch idempotent.

### LUS-003 — Tìm, lọc và sắp xếp thư viện
**Liên kết:** LS-FR-003, LS-FR-015; LP-1, LP-4

- **Given** thư viện có dữ liệu, **When** áp dụng text/deck/study-state/due filter hoặc sort, **Then** danh sách và count phản ánh đúng query và có hành động reset rõ.
- **Given** không có kết quả, dữ liệu partial hoặc offline, **When** danh sách render, **Then** UI phân biệt no-results với empty library và hiển thị freshness/recovery.

### LUS-004 — Xem chi tiết mục học
**Liên kết:** LS-FR-004, LS-FR-015; LP-1; LS-OD-02, LS-OD-10

- **Given** metadata thiếu trường tùy chọn, **When** mở detail, **Then** kanji, reading, meaning, provenance và trạng thái có fallback an toàn, không crash hay bịa dữ liệu.
- **Given** item thuộc nhiều deck, **When** xem detail, **Then** membership và trạng thái SRS được trình bày riêng, có thể hiểu bằng bàn phím và công nghệ hỗ trợ.

### LUS-005 — Lưu candidate đã xác nhận từ recognition
**Liên kết:** LS-FR-005, LS-FR-015..LS-FR-017; LP-1; A1, A6, A8; LS-OD-01, LS-OD-02, LS-OD-06, LS-OD-08

- **Given** người dùng đã chọn candidate, **When** mở save sheet rồi đổi candidate phía sau, **Then** draft vẫn trỏ immutable candidate/item ban đầu cho đến khi hủy hoặc mở lại.
- **Given** chọn/tạo deck và lưu, **When** commit thành công hoặc item đã tồn tại, **Then** UI nêu đúng memberships và không sao chép ảnh/nét vào learning record.
- **Given** canonical item service chưa có, **When** yêu cầu lưu, **Then** capability bị chặn trung thực thay vì biến fixture thành metadata thật.

### LUS-006 — Học bằng flashcard có thể tiếp tục
**Liên kết:** LS-FR-006, LS-FR-015, LS-FR-016; LP-2, LP-4; A2, A6, A7; LS-OD-01, LS-OD-06

- **Given** snapshot session hợp lệ, **When** xem card, **Then** answer không xuất hiện trước hành động reveal và thứ tự/cursor giữ ổn định khi resume.
- **Given** shuffle được chọn, **When** tái tạo session bằng cùng seed/version, **Then** thứ tự giống nhau.
- **Given** item bị xóa hoặc metadata không đủ, **When** session tiếp tục, **Then** UI xử lý stale/ineligible item mà không đổi ngầm thứ tự còn lại.

### LUS-007 — Phân loại practice không đổi SRS
**Liên kết:** LS-FR-007, LS-FR-015; LP-2; A2; LS-OD-06

- **Given** answer đã reveal, **When** chọn `Know`, `Review again` hoặc skip, **Then** lựa chọn chỉ cập nhật session practice và không tạo SRS ReviewLog.
- **Given** `Review again`, **When** các mục chưa xem đã đi qua một lần, **Then** item quay lại theo rule được duyệt; repeat cap/auto-advance chưa được suy đoán.

### LUS-008 — Làm quiz theo scope đã chọn
**Liên kết:** LS-FR-008, LS-FR-015, LS-FR-016; LP-2, LP-4; A3, A7; LS-OD-04, LS-OD-10

- **Given** mode, deck/scope và số câu hợp lệ, **When** bắt đầu, **Then** session snapshot có thứ tự ổn định và chỉ gồm item đủ điều kiện.
- **Given** không đủ content hoặc mode chưa được duyệt, **When** mở setup, **Then** UI nêu unavailable/partial thay vì tạo distractor hoặc answer giả.
- **Given** retry missed, **When** bắt đầu lại, **Then** một attempt mới được tạo và attempt gốc vẫn truy vết được.

### LUS-009 — Chấm quiz có thể giải thích
**Liên kết:** LS-FR-009, LS-FR-015; LP-2; A3; LS-OD-04, LS-OD-10

- **Given** reading/meaning được nhập, **When** submit, **Then** normalization/scoring version đã duyệt được áp dụng, answer khóa và accepted variants/giải thích hiển thị.
- **Given** confidence recognition cao hoặc thấp, **When** chấm quiz, **Then** confidence không ảnh hưởng correctness và quiz không tạo SRS rating.

### LUS-010 — Xem due queue xác định
**Liên kết:** LS-FR-010, LS-FR-015; LP-2; A4, A6; LS-OD-05..07

- **Given** fixed clock và card states, **When** mở Review, **Then** chỉ card đến hạn được xếp relearning/learning trước review rồi new theo limit được duyệt.
- **Given** không có card due, **When** queue render, **Then** UI phân biệt zero due với lỗi/stale/offline và không tạo cảm giác khẩn cấp giả.

### LUS-011 — Reveal, rate và xem lịch kế tiếp
**Liên kết:** LS-FR-011, LS-FR-015; LP-2, LP-4; A4, A7; LS-OD-05..07

- **Given** answer chưa reveal, **When** người dùng xem card, **Then** Again/Hard/Good/Easy và shortcut 1–4 chưa khả dụng.
- **Given** answer đã reveal, **When** chọn rating, **Then** interval preview và state sau commit dùng cùng scheduler/version; UI không tự ước lượng.

### LUS-012 — Tiếp tục review không double-apply
**Liên kết:** LS-FR-012, LS-FR-015, LS-FR-016; LP-2; A4, A6; LS-OD-05, LS-OD-06

- **Given** rating đã commit, **When** reload/resume hoặc request được gửi lại, **Then** cùng `reviewId` không áp dụng lần hai và cursor tiếp tục sau item đã commit.
- **Given** version conflict/offline, **When** commit thất bại, **Then** UI dừng success, giữ context an toàn và refetch/queue chỉ theo policy được duyệt.

### LUS-013 — Xem tiến độ có mẫu số rõ
**Liên kết:** LS-FR-013, LS-FR-015..LS-FR-017; LP-3, LP-4; A5, A7, A8; LS-OD-07..LS-OD-10

- **Given** event fixture và time zone cố định, **When** đổi range, **Then** activity, quiz accuracy, review success, inventory, streak và forecast tái lập với range/denominator/freshness hiển thị.
- **Given** không có event hoặc một widget stale/partial, **When** dashboard render, **Then** no-data khác zero, widget lỗi không làm sai widget khác và chart có bảng/text tương đương.
- **Given** hôm nay chưa active nhưng hôm qua có, **When** xem streak, **Then** UI nói có thể tiếp tục hôm nay thay vì reset sớm hoặc dùng ngôn ngữ trừng phạt.

### LUS-014 — Suspend hoặc reset card có kiểm soát
**Liên kết:** LS-FR-014, LS-FR-015; LP-2; A4, A6; LS-OD-05, LS-OD-08

- **Given** một card có lịch sử, **When** suspend/reset, **Then** UI xác nhận tác động, chuyển state theo policy và không xóa ReviewLog.
- **Given** undo policy chưa được duyệt, **When** xem hành động, **Then** undo bị ẩn/vô hiệu hóa trung thực thay vì áp dụng logic phỏng đoán.

### LUS-015 — Phục hồi ở mọi trạng thái học
**Liên kết:** LS-FR-015, NFR-001..NFR-005; LP-4; A6, A7; LS-OD-06

- **Given** bất kỳ surface learning nào, **When** ở empty/loading/error/offline/partial/success, **Then** trạng thái có tên, hành động hợp lệ và recovery tại chỗ.
- **Given** duplicate/late response hoặc concurrent mutation, **When** kết quả tới, **Then** UI không ghi đè state mới hoặc báo success sai.

### LUS-016 — Hiển thị capability trung thực
**Liên kết:** LS-FR-016, NFR-004, NFR-005; LP-1..LP-4; A6; LS-OD-01, LS-OD-06

- **Given** backend, identity, persistence hoặc sync chưa được duyệt/sẵn sàng, **When** người dùng mở capability phụ thuộc, **Then** UI ghi rõ local/mock/blocked và không dùng từ “Synced” hay “Saved” trước commit.
- **Given** capability được bật theo slice, **When** release kiểm tra, **Then** contract/evidence tương ứng tồn tại; build xanh đơn lẻ không đủ nâng Target thành Current.

### LUS-017 — Xem và xóa dữ liệu học
**Liên kết:** LS-FR-017, NFR-003, NFR-005; LP-3, LP-4; A8; LS-OD-01, LS-OD-08

- **Given** policy retention/deletion đã duyệt, **When** người dùng xem phạm vi dữ liệu, **Then** UI nêu loại dữ liệu, phạm vi, freshness và hệ quả xóa.
- **Given** người dùng xác nhận xóa, **When** operation hoàn tất hoặc thất bại, **Then** outcome kiểm chứng được, không rò nội dung trong log/telemetry và recovery tuân policy.
- **Given** export chưa được quyết định, **When** xem data controls, **Then** UI không hứa export.

Phạm vi UX frontend recognition được tổng hợp tại [PRD frontend](./frontend-prd.md); learning UI theo [Learning Experience UI Skill](./skills/learning-experience-ui-skill.md). Thứ tự thực hiện nằm trong [kế hoạch frontend](./frontend-implementation-plan.md) và [master roadmap](./implementation-roadmap.md). PRD vẫn là nguồn chuẩn cho product intent, requirement và acceptance cấp hệ thống.
