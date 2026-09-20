# Äáº·c táº£ tÃ­nh nÄƒng

> **Current:** UI frontend/mock. **Target/Proposed:** service contract. Requirement chuáº©n: [PRD](./prd.md#8-yÃªu-cáº§u-Æ°u-tiÃªn).

## 1. Kiáº¿n trÃºc hiá»‡n táº¡i

```text
App.tsx
 â”œâ”€ InputPanel.tsx â”€â”€ DrawCanvas.tsx
 â”œâ”€ mockRecognize() â”€â”€ MOCK_PREDICTIONS
 â””â”€ ResultPanel.tsx + history state
```

KhÃ´ng cÃ³ network request. `mockRecognize` bá» qua ná»™i dung `_image`, chá» 1.400 ms vÃ  tráº£ dá»¯ liá»‡u cá»‘ Ä‘á»‹nh.

## 2. State machine UI hiá»‡n táº¡i

```text
input mode: draw | upload
recognition: idle --submit--> loading --resolve--> success
                                  â””--throw----> error --retry--> loading
```

### State vÃ  invariant

| State | Äiá»u kiá»‡n/UI | Chuyá»ƒn tiáº¿p |
|---|---|---|
| `idle` | Empty result guidance | Submit náº¿u tab draw cÃ³ `hasInk` hoáº·c upload cÃ³ `preview`. |
| `loading` | Skeleton/badge; submit bá»‹ khÃ³a | Mock resolve â†’ success; exception â†’ error. |
| `success` | Candidate list + selected details | Chá»n candidate; submit input khÃ¡c; thÃªm history. |
| `error` | Message + Thá»­ láº¡i | Retry gá»i submit vá»›i input hiá»‡n hÃ nh. |

Switch tab khÃ´ng tá»± xÃ³a state cá»§a tab kia. Clear chá»‰ Ã¡p dá»¥ng tab hiá»‡n hÃ nh. Káº¿t quáº£ cÅ© khÃ´ng bá»‹ xÃ³a ngay khi input Ä‘á»•i; quyáº¿t Ä‘á»‹nh target vá» stale-result indication lÃ  TBD.

## 3. Äáº§u vÃ o hiá»‡n táº¡i

### Draw

- Canvas logic 480Ã—480, scale theo device pixel ratio vÃ  hiá»ƒn thá»‹ responsive.
- Ná»n tráº¯ng, lÆ°á»›i tÃ¢m; pointer capture; nÃ©t trÃ²n mÃ u tá»‘i.
- Brush 4â€“36 px, máº·c Ä‘á»‹nh do `App.tsx` Ä‘áº·t 18 px.
- Snapshot trÆ°á»›c má»—i stroke; giá»¯ tá»‘i Ä‘a 30; undo quay vá» snapshot trÆ°á»›c; clear reset.
- `toDataURL("image/png")` Ä‘Æ°á»£c Ä‘Æ°a lÃªn `App`.

### Upload

- Hidden `<input type="file" accept="image/*">`.
- KÃ­ch hoáº¡t báº±ng click, Enter hoáº·c Space; há»— trá»£ drag/drop.
- Preview dÃ¹ng `URL.createObjectURL`; gá»¡ áº£nh reset input.
- **Known gap:** khÃ´ng revoke object URL; khÃ´ng validate MIME báº±ng ná»™i dung, dung lÆ°á»£ng, kÃ­ch thÆ°á»›c áº£nh hoáº·c sá»‘ kÃ½ tá»±.

## 4. Káº¿t quáº£ vÃ  lá»‹ch sá»­ hiá»‡n táº¡i

- Client copy/sort predictions giáº£m dáº§n theo `confidence`, chá»n index 0.
- UI hiá»ƒn thá»‹ confidence %, Kanji, JLPT, nghÄ©a, readings, strokes, radical, frequency, example, description vÃ  candidate list tá»« mock.
- Type hiá»‡n táº¡i á»Ÿ `types.ts` yÃªu cáº§u toÃ n bá»™ field; Ä‘iá»u nÃ y chÆ°a pháº£i contract backend Ä‘Æ°á»£c duyá»‡t.
- History lÆ°u top candidate, thumbnail, giá» local; prepend vÃ  cáº¯t 8; khÃ´ng persistence.
- Loading copy/header hiá»‡n nháº¯c EfficientNet-B3, 250 Kanji, JLPT N5/N4; cÃ¡c tuyÃªn bá»‘ nÃ y **khÃ´ng Ä‘Æ°á»£c artifact repository chá»©ng minh** vÃ  cáº§n sá»­a trong cÃ´ng viá»‡c source riÃªng, khÃ´ng pháº£i thay Ä‘á»•i tÃ i liá»‡u nÃ y.

## 5. Há»£p Ä‘á»“ng nháº­n diá»‡n Ä‘á» xuáº¥t â€” chÆ°a tá»“n táº¡i

Canonical shape: [PRD Â§10](./prd.md#10-há»£p-Ä‘á»“ng-apidata-Ä‘á»-xuáº¥t--chÆ°a-triá»ƒn-khai).

### Transport

- Method/path Ä‘á» xuáº¥t: `POST /api/recognitions`.
- Body Æ°u tiÃªn tháº£o luáº­n: multipart field `image`.
- JSON data URL, auth, API version, CORS, limit, timeout: **TBD/Open Decision**.

### Success schema

| Field | Kiá»ƒu Ä‘á» xuáº¥t | Nullability | Ghi chÃº |
|---|---|---|---|
| `request_id` | string | non-null | Äá»‹nh dáº¡ng TBD. |
| `model_version` | string | non-null | KhÃ´ng suy ra kiáº¿n trÃºc model. |
| `predictions` | array | non-null | Min/max TBD; sort giáº£m dáº§n. |
| `predictions[].kanji` | string | non-null | Quy táº¯c má»™t code point/kÃ½ tá»± TBD. |
| `predictions[].confidence` | number | non-null | Range/semantics/calibration TBD. |
| `reading_on`, `reading_kun` | string[] | non-null, cÃ³ thá»ƒ rá»—ng | Chá»‰ khi cÃ³ nguá»“n metadata Ä‘Æ°á»£c duyá»‡t. |
| `meaning_vi` | string | nullable | Fallback UI báº¯t buá»™c. |
| `jlpt` | string | nullable | KhÃ´ng cam káº¿t coverage. |
| `strokes` | integer | nullable | Range validation TBD. |

CÃ¡c field mock `id`, `json_id`, `train_index`, `meaning_hv`, `meaning_en`, `example`, `description`, `tags`, `radical_number`, `frequency`, `hiragana` **khÃ´ng tá»± Ä‘á»™ng trá»Ÿ thÃ nh API**; giá»¯/bá» cáº§n use case vÃ  data governance.

## 6. Validation vÃ  lá»—i Ä‘á» xuáº¥t

### Validation nhiá»u lá»›p

1. Client hint cho UX, khÃ´ng pháº£i boundary báº£o máº­t.
2. Gateway/server giá»›i háº¡n body vÃ  timeout â€” giÃ¡ trá»‹ TBD.
3. Kiá»ƒm tra content type vÃ  magic bytes/decode thá»±c táº¿.
4. Giá»›i háº¡n dimension/pixel/decompression â€” TBD.
5. Chuáº©n hÃ³a áº£nh trong sandbox/resource budget â€” thiáº¿t káº¿ TBD.

### Error taxonomy

| Code | Khi nÃ o | Retryable máº·c Ä‘á»‹nh Ä‘á» xuáº¥t |
|---|---|---|
| `INVALID_REQUEST` | Thiáº¿u/sai field | false |
| `UNSUPPORTED_MEDIA_TYPE` | Loáº¡i ná»™i dung khÃ´ng há»— trá»£ | false |
| `IMAGE_TOO_LARGE` | VÆ°á»£t limit TBD | false |
| `INVALID_IMAGE` | KhÃ´ng decode/khÃ´ng Ä‘Ã¡p á»©ng input rule | false |
| `TIMEOUT` | Háº¿t thá»i gian | true, cÃ³ backoff |
| `RATE_LIMITED` | VÆ°á»£t quota TBD | true theo hÆ°á»›ng dáº«n server |
| `SERVICE_UNAVAILABLE` | Phá»¥ thuá»™c/service chÆ°a sáºµn sÃ ng | true |
| `INTERNAL_ERROR` | Lá»—i khÃ´ng dá»± kiáº¿n | false hoáº·c theo chÃ­nh sÃ¡ch TBD |

HTTP status mapping, localization message vÃ  retry budget: TBD. Client khÃ´ng hiá»ƒn thá»‹ stack trace hoáº·c dá»¯ liá»‡u nháº¡y cáº£m.

## 7. Accessibility

### Current evidence

- Upload dropzone cÃ³ `role="button"`, `tabIndex=0`, `aria-label`, Enter/Space.
- Tabs cÃ³ `role="tablist"`, `role="tab"`, `aria-selected`; chÆ°a xÃ¡c minh keyboard pattern Ä‘áº§y Ä‘á»§ (`aria-controls`, roving focus, arrow keys).
- Brush cÃ³ accessible label; preview cÃ³ alt.

### Target/Proposed

- Focus rÃµ, thá»© tá»± logic vÃ  focus recovery sau lá»—i/thay tab.
- `aria-live` phÃ¹ há»£p cho loading/error/success, trÃ¡nh thÃ´ng bÃ¡o quÃ¡ má»©c.
- Candidate lÃ  control cÃ³ tÃªn/tráº¡ng thÃ¡i selected; khÃ´ng chá»‰ dá»±a mÃ u.
- Canvas cÃ³ instruction vÃ  phÆ°Æ¡ng Ã¡n upload tÆ°Æ¡ng Ä‘Æ°Æ¡ng.
- Audit keyboard, screen reader, contrast, 200%/400% zoom vÃ  reduced motion theo chuáº©n/pháº¡m vi TBD.

## 8. Responsive

CSS hiá»‡n cÃ³ breakpoint/layout responsive, nhÆ°ng chÆ°a cÃ³ ma tráº­n chá»©ng nháº­n. Target cáº§n Ä‘á»‹nh nghÄ©a viewport, browser, orientation, touch target, zoom vÃ  tiÃªu chÃ­ khÃ´ng overflow/khÃ´ng che CTA. GiÃ¡ trá»‹ cá»¥ thá»ƒ: TBD.

## 9. BiÃªn tÃ­ch há»£p

- Thay `mockRecognize` báº±ng adapter cÃ³ interface á»•n Ä‘á»‹nh; khÃ´ng Ä‘á»ƒ component biáº¿t transport.
- Validate response trÆ°á»›c khi Ä‘Æ°a vÃ o UI; mapping nullable fields sang view model.
- Cáº¥u hÃ¬nh mock/service pháº£i rÃµ theo mÃ´i trÆ°á»ng; production gate theo FR-010.
- KhÃ´ng log image/data URL. Object URL cáº§n revoke khi thay/gá»¡/unmount.
- Contract tests dÃ¹ng fixture Ä‘Ã£ kiá»ƒm soÃ¡t; E2E bao phá»§ state machine vÃ  lá»—i taxonomy.

## 10. Giá»›i háº¡n vÃ  quyáº¿t Ä‘á»‹nh má»Ÿ

Dung lÆ°á»£ng, dimension, format, candidate count, confidence semantics, metadata fields, endpoint/version/auth, retention, timeout/retry/rate limit, browser matrix vÃ  accessibility standard Ä‘á»u TBD. KhÃ´ng dÃ¹ng sá»‘ trong mock lÃ m cam káº¿t target.

Xem [PRD frontend](./frontend-prd.md) cho phạm vi UX và [kế hoạch triển khai frontend](./frontend-implementation-plan.md) cho workstream/gate; [PRD sản phẩm](./prd.md) vẫn được ưu tiên.
