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

## 9. Learning System UI flow — Target/Proposed

> Các flow dưới đây mở rộng [Learning Experience UI Skill](./skills/learning-experience-ui-skill.md), không phải hành vi Current. Persistence/account/sync vẫn bị `LS-OD-01/06/08` chặn. Từ vựng và ngữ pháp là đề xuất mới, cần requirement/content/license gate trước implementation.

### 9.1 Điều hướng tổng thể

```text
Recognize -> Confirm candidate -> Save sheet -> Library item/deck
Library -> Item detail -> Practice setup -> Flashcard | Quiz | Review
Review/Quiz/Practice -> Session summary -> Progress
Library -> Content type: Kanji | Vocabulary | Grammar (proposed)
```

Mọi màn hình có loading, empty, partial, stale/offline, conflict, forbidden, recoverable/fatal error và success. Capability chưa có persistence phải ghi rõ local/mock; không hiển thị saved/synced trước commit.

### 9.2 Library, deck và item CRUD

```text
Library list
  -> Create deck -> validate -> saving -> committed | conflict/error
  -> Deck detail -> Rename | Archive | Delete(confirm impact)
  -> Item detail -> Manage decks | Archive/Remove | Practice
  -> Add content -> Recognition handoff | Search reference content
```

- Filter theo text, deck, content type, study state, due; no-results khác empty library.
- Create/edit form giữ draft khi lỗi; trim/non-empty; duplicate policy chờ `LS-OD-03`.
- Xóa deck chỉ bỏ membership theo policy và không xóa review history. Xóa item toàn cục phải trình bày card/session/history impact và bị privacy/product gate chặn.
- Item detail dùng tab/section `Overview`, `Decks`, `Study`, `History`; provenance và metadata unavailable luôn thấy được.
- Kanji/từ vựng/ngữ pháp dùng chung shell nhưng form khác nhau. Chỉ cho sửa field được policy `LS-OD-02` cho phép; reference revision không bị ghi đè âm thầm.

### 9.3 Recognition-to-save

```text
Selected candidate -> Save to library
  -> freeze candidateRef -> resolve canonical item
  -> choose/create deck -> submit once
  -> Saved | Already saved | Pending offline(only if approved) | Failed
```

Đổi candidate phía sau không đổi draft. Failure giữ selection/deck; retry dùng idempotency key. Không copy ảnh/nét vào learning record.

### 9.4 Flashcard

```text
Setup(scope/deck/type/order) -> snapshot session
  -> Front(prompt) -> Reveal -> Back(answer/context)
  -> Know | Review again | Skip -> next/repeat by approved rule
  -> Pause/resume | Complete -> Summary
```

Không classify trước reveal; classification không tạo SRS review. Resume giữ order/cursor; item stale/ineligible được giải thích, không đổi thứ tự ngầm. Exit xác nhận nếu có trạng thái chưa commit.

### 9.5 Quiz

```text
Setup(mode/scope/count) -> snapshot questions
  -> Prompt -> IME-safe answer/choice -> Submit(lock)
  -> Correct/Incorrect + accepted answer + explanation -> Next
  -> Summary -> Review missed(new attempt)
```

Meaning và reading là scope canonical Target; grammar mode chỉ sau gate. Score dùng normalization/scoring version; retry không sửa attempt cũ; quiz không mutate SRS.

### 9.6 SRS Review

```text
Due overview -> Start -> Prompt -> Reveal
  -> Again | Hard | Good | Easy with server/scheduler preview
  -> atomic commit -> next
  -> conflict: stop/refetch/reconcile; completed -> Summary
```

Không cho rating trước reveal hoặc khi preview/state stale. Suspend/reset có confirm impact; undo/bury/leech chỉ xuất hiện khi `LS-OD-05` duyệt. Offline rating bị disable hoặc queue theo policy đã duyệt, không giả success.

### 9.7 Progress và privacy

Progress hiển thị range, timezone, freshness và denominator; review accuracy tách quiz accuracy; no-data khác zero; chart có bảng/text equivalent. Export/Delete đi qua scope review -> confirm -> processing -> completed/failed; UI nêu rõ backup/retention caveat theo policy, không hứa xóa tức thì khi chưa duyệt.

### 9.8 Phương án học ngữ pháp — đề xuất cần gate

```text
Grammar library -> Pattern detail
  -> Discover: meaning + formation + usage caution
  -> Observe: reviewed examples with highlighted structure
  -> Guided practice: cloze/choose form
  -> Independent recall: produce/select in context
  -> Mixed review -> Summary/Progress
```

Mỗi grammar item gồm pattern, formation, meanings theo locale, level/tag nếu có nguồn, caution và ví dụ có provenance. UX cho thêm/sửa/archive theo quyền editable đã duyệt; xóa reference content không được phép từ user library, chỉ remove/archive membership. Không sinh ví dụ/distractor chưa review; không coi một câu đúng là “mastered”. Việc tạo grammar flashcard/SRS card, accepted variants và locale bị `LS-OD-02/04/05/10` chặn.

### 9.9 Accessibility và recovery chung

Focus chuyển tới heading/status hợp lý sau route/mutation; dialog trả focus; action không phụ thuộc swipe/màu; live region không đọc lặp; shortcut bị vô hiệu trong input/IME; 200% zoom và mobile vẫn giữ primary/recovery action. Conflict hiển thị giá trị mới nhất và lựa chọn refetch/reapply an toàn, không tự ghi đè.
