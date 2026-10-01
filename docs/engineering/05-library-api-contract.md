# 05 — Library API Contract (v1)

Nguồn: đọc `routes/controllers/services/repositories/validators` và **chạy thật** backend trên PostgreSQL với schema `0001_init.sql`. Mọi thay đổi route/DTO/mã lỗi phải sửa file này trong cùng thay đổi (playbook §6, mục 6 của `AGENTS.md`).

Trạng thái kiểm chứng: ✅ đã chạy thật · ⚠️ đọc code, chưa chạy · ❌ lệch contract/quy tắc.

## 1. Quy ước chung

- Base: `/v1/library`. Content-Type `application/json`.
- Owner: header tùy chọn `x-owner-id`; nếu có phải bằng `LOCAL_OWNER_ID`, sai → `403 OWNER_SCOPE_FORBIDDEN`. Không có thì server tự gán.
- `version`, `sortPosition`, `expectedVersion`, `expectedLibraryVersion` là **chuỗi số** (bigint). Backend nhận được cả số lẫn chuỗi.
- Thời gian: ISO 8601 UTC.
- Lỗi: `{ code, message, details? }` — danh sách mã ở `02-backend-standards.md` §5. (Mục tiêu F0.7: thêm `requestId`.)

## 2. Kiểu dữ liệu

```ts
interface Deck {
  id: string; libraryId: string; ownerId: string;
  parentId: string | null; sortPosition: string;
  name: string; description: string | null;
  version: string; archivedAt: string | null; deletedAt: string | null;
}
interface LibraryItem {
  id: string; contentItemId: string;
  kind: 'kanji' | 'vocabulary' | 'grammar';
  canonicalKey: string; jlptLevel: number | null;
  sourceKind: 'recognition' | 'import' | 'manual' | 'reference';
  sourceRef: string | null; savedAt: string; version: string; deckIds: string[];
}
interface LibraryResponse {
  id: string; ownerId: string; version: string;
  decks: Deck[]; items: LibraryItem[]; nextCursor: string | null;
}
```

## 3. Endpoint

| Method & path | Mô tả | Thành công | Lỗi có thể gặp | TT |
|---|---|---|---|---|
| `GET /v1/library` | Thư viện + cây deck + trang mục đã lưu. Lần gọi đầu tự tạo owner và library | `200 LibraryResponse` | 400 query sai, 404 `deckId` không có | ✅ |
| `POST /v1/library/decks` | Tạo deck | `201 Deck` | 400, 404 `parentId` không có, 422 vượt độ sâu 8 | ✅ (gốc) ⚠️ (con) |
| `PATCH /v1/library/decks/:deckId` | Sửa tên/mô tả/đổi cha, bắt buộc `expectedVersion` | `200 Deck` (version +1) | 400, 404, 409 lệch version, 422 chu trình/độ sâu | ✅ (tên) ⚠️ (đổi cha) |
| `DELETE /v1/library/decks/:deckId?expectedVersion=N` | Soft-delete, phải xóa con trước | `204` | 404, 409 còn con hoặc lệch version | ✅ (204, 409) ⚠️ (còn con) |
| `PUT /v1/library/decks/rebalance` | Đặt lại `parentId`/`sortPosition` hàng loạt, cần `expectedLibraryVersion` | `200 { libraryVersion, placements[] }` | 404, 409, 422 | ⚠️ (FE chưa dùng) |
| `POST /v1/library/items` | Lưu một `content_item` đã tồn tại, tùy chọn gắn deck; lưu lại cùng mục là idempotent | `201` | 400, 404 content/deck không có | ✅ ❌ |

### Query của `GET /v1/library`

| Tham số | Kiểu | Mặc định | Ghi chú |
|---|---|---|---|
| `q` | string 1–200 | — | LIKE không phân biệt hoa/thường trên `canonicalKey` |
| `kind` | `kanji\|vocabulary\|grammar` | — | |
| `deckId` | uuid | — | Lọc theo deck (không gồm deck con) |
| `jlptLevel` | 1–5 | — | |
| `sort` | `saved-desc\|saved-asc\|key-asc\|key-desc` | `saved-desc` | |
| `limit` | 1–100 | 24 | |
| `cursor` | string | — | Lấy từ `nextCursor`; phải đi cùng đúng `sort` |

### Body

```jsonc
// POST /decks
{ "name": "N5", "description": null, "parentId": null }          // name 1–200 ký tự (đã trim)

// PATCH /decks/:deckId — cần ít nhất một trong name | description | parentId
{ "name": "N5 cơ bản", "expectedVersion": "1" }

// POST /items
{ "contentItemId": "<uuid>", "deckId": "<uuid>?", "sourceKind": "manual|import|reference",
  "sourceRef": "string?", "sourceContext": { } }                 // sourceKind mặc định "manual"
```

## 4. Mẫu phản hồi đã kiểm chứng

```jsonc
// GET /v1/library (DB vừa tạo)
{ "id":"91ec…","ownerId":"00000000-0000-4000-8000-000000000000","version":"1","decks":[],"items":[],"nextCursor":null }

// POST /v1/library/decks → 201
{ "id":"6829…","libraryId":"91ec…","ownerId":"0000…","parentId":null,"sortPosition":"1024",
  "name":"N5","description":null,"version":"1","archivedAt":null,"deletedAt":null }

// DELETE với expectedVersion cũ → 409
{ "code":"CONFLICT","message":"Deck was changed by another request" }

// POST /decks với {"name":""} → 400
{ "code":"INVALID_REQUEST","message":"Request validation failed","details":[ { "path":["name"], "code":"too_small", … } ] }
```

## 5. Sai lệch đã biết (phải sửa)

| ID | Mô tả | Hướng sửa |
|---|---|---|
| ❌ C-01 | `POST /library/items` trả **nguyên hàng DB** dạng `snake_case` (`library_id`, `content_item_id`, `source_kind`, …), khác mọi DTO còn lại | Thêm `saved-item.mapper.ts`, trả `LibraryItem` (camelCase), cập nhật mục này (F0.8) |
| ❌ C-02 | FE chỉ map `VALIDATION_ERROR`, nhưng lỗi Zod trả `INVALID_REQUEST` | Bảng map ở `03` §6 (F0.7) |
| ❌ C-03 | Lỗi 500 chỉ có `INTERNAL_ERROR` chung, lỗi DB (mất kết nối, thiếu bảng) không phân biệt | `DB_UNAVAILABLE`, `DB_SCHEMA_MISMATCH` (F0.5) |
| ⚠️ C-04 | `GET` có `deckId` chỉ lọc đúng deck đó, không gồm deck con | Chốt hành vi với owner rồi ghi vào đây |
| ⚠️ C-05 | FE hiện **không có** thao tác Lưu mục (form bị gỡ) nên `POST /items` chưa được dùng từ UI | Làm lại UI chọn từ danh sách nội dung dev (`GET /v1/content` — chưa có) rồi lưu |

## 6. Bổ sung cần có để người dùng thêm được mục

Hiện chỉ có API **lưu** `content_item` đã tồn tại, chưa có API **duyệt nội dung** để chọn. Cần thêm trước khi làm UI Lưu:

| Endpoint đề xuất | Mô tả |
|---|---|
| `GET /v1/content?q=&kind=&jlptLevel=&limit=&cursor=` | Danh sách `content_item` `status='active'` kèm cờ `saved: boolean` cho owner hiện tại |

Dữ liệu nguồn: seed dev (`04` §6). Khi có nguồn thật được duyệt (`LS-OD-02`), thay seed, giữ nguyên contract.
