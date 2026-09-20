# PRD â€” Kanji Recognizer

> **Current:** prototype giao diá»‡n React dÃ¹ng dá»¯ liá»‡u mock. **Target/Proposed:** tráº£i nghiá»‡m nháº­n diá»‡n má»™t kÃ½ tá»± tá»« nÃ©t váº½ hoáº·c áº£nh. **TBD/Open Decision:** backend, mÃ´ hÃ¬nh, dá»¯ liá»‡u, pháº¡m vi kÃ½ tá»±, chá»‰ tiÃªu vÃ  káº¿ hoáº¡ch phÃ¡t hÃ nh.

## 1. Metadata

| Thuá»™c tÃ­nh | GiÃ¡ trá»‹ |
|---|---|
| Tráº¡ng thÃ¡i tÃ i liá»‡u | Báº£n chuáº©n hiá»‡n hÃ nh cho pháº¡m vi repository |
| PhiÃªn báº£n | 2.0 |
| NgÃ´n ngá»¯ | Tiáº¿ng Viá»‡t |
| Chá»§ sá»Ÿ há»¯u / ngÆ°á»i phÃª duyá»‡t | TBD/Open Decision |
| Nguá»“n báº±ng chá»©ng | `frontend/src/**`, `frontend/package.json`, cÃ¢y file repository |
| Cáº­p nháº­t gáº§n nháº¥t | Theo commit chá»©a thay Ä‘á»•i nÃ y; khÃ´ng suy diá»…n ngÃ y/owner |

TÃ i liá»‡u Ã¡p dá»¥ng cáº¥u trÃºc PRD theo thÃ´ng lá»‡ ngÃ nh; **khÃ´ng tuyÃªn bá»‘ lÃ  máº«u chÃ­nh thá»©c cá»§a Google**.

### Change log

| PhiÃªn báº£n | Thay Ä‘á»•i |
|---|---|
| 2.0 | Hiá»‡u chá»‰nh theo repository: tÃ¡ch Current/Proposed/TBD; thay tuyÃªn bá»‘ backend/model khÃ´ng cÃ³ báº±ng yÃªu cáº§u truy váº¿t. |
| 1.0 | TÃ i liá»‡u cÅ©; cÃ³ cÃ¡c kháº³ng Ä‘á»‹nh khÃ´ng Ä‘Æ°á»£c checkout hiá»‡n táº¡i chá»©ng minh. |

## 2. Bá»‘i cáº£nh vÃ  váº¥n Ä‘á»

UI hiá»‡n cho phÃ©p nháº­p hÃ¬nh dáº¡ng má»™t kÃ½ tá»± báº±ng canvas hoáº·c áº£nh vÃ  xem danh sÃ¡ch á»©ng viÃªn minh há»a. Äiá»u nÃ y chá»©ng minh luá»“ng tÆ°Æ¡ng tÃ¡c, khÃ´ng chá»©ng minh nhu cáº§u ngÆ°á»i dÃ¹ng hay kháº£ nÄƒng nháº­n diá»‡n. Váº¥n Ä‘á» cáº§n kiá»ƒm chá»©ng: ngÆ°á»i dÃ¹ng cÃ³ cáº§n tra kÃ½ tá»± tá»« hÃ¬nh dáº¡ng, vÃ  tráº£i nghiá»‡m nÃ o giÃºp há» xÃ¡c nháº­n á»©ng viÃªn phÃ¹ há»£p mÃ  khÃ´ng gÃ¢y hiá»ƒu nháº§m vá» Ä‘á»™ chÃ­nh xÃ¡c.

## 3. Hiá»‡n tráº¡ng vÃ  tráº¡ng thÃ¡i Ä‘Ã­ch

| KhÃ­a cáº¡nh | Current â€” báº±ng chá»©ng repository | Target/Proposed |
|---|---|---|
| Client | React 19, TypeScript, Vite; `frontend/package.json` | Client tÃ­ch há»£p dá»‹ch vá»¥ sau khi há»£p Ä‘á»“ng Ä‘Æ°á»£c duyá»‡t. |
| Nháº­p liá»‡u | Canvas logic 480Ã—480; chá»‰nh nÃ©t, hoÃ n tÃ¡c, xÃ³a; chá»n/kÃ©o-tháº£ áº£nh | XÃ¡c thá»±c Ä‘áº§u vÃ o vÃ  pháº£n há»“i lá»—i nháº¥t quÃ¡n. |
| Nháº­n diá»‡n | `mockRecognize` chá» 1,4 giÃ¢y vÃ  tráº£ háº±ng `MOCK_PREDICTIONS` | Dá»‹ch vá»¥ nháº­n áº£nh vÃ  tráº£ á»©ng viÃªn cÃ³ thá»© háº¡ng. |
| Káº¿t quáº£ | UI idle/loading/error/success; chá»n á»©ng viÃªn | Dá»¯ liá»‡u tháº­t, cÃ³ kháº£ nÄƒng giáº£i thÃ­ch nguá»“n vÃ  cháº¥t lÆ°á»£ng. |
| Lá»‹ch sá»­ | State trong phiÃªn, tá»‘i Ä‘a 8 má»¥c | ChÃ­nh sÃ¡ch lÆ°u giá»¯ chá»‰ Ä‘Æ°á»£c thÃªm sau quyáº¿t Ä‘á»‹nh riÃªng tÆ°. |
| Ná»n táº£ng | Responsive CSS; vÃ¹ng upload thao tÃ¡c báº±ng chuá»™t/bÃ n phÃ­m | ÄÃ¡nh giÃ¡ accessibility vÃ  thiáº¿t bá»‹ má»¥c tiÃªu. |
| Backend/model/API/test/CI/analytics | KhÃ´ng cÃ³ trong checkout | Thiáº¿t káº¿, triá»ƒn khai vÃ  kiá»ƒm chá»©ng riÃªng. |

## 4. Má»¥c tiÃªu vÃ  ngoÃ i pháº¡m vi

### Má»¥c tiÃªu

- **G1:** Kiá»ƒm chá»©ng luá»“ng nháº­p má»™t kÃ½ tá»± â†’ yÃªu cáº§u nháº­n diá»‡n â†’ xem/chá»n á»©ng viÃªn.
- **G2:** Thiáº¿t láº­p há»£p Ä‘á»“ng tÃ­ch há»£p cÃ³ phiÃªn báº£n, xÃ¡c thá»±c vÃ  lá»—i rÃµ rÃ ng trÆ°á»›c khi triá»ƒn khai dá»‹ch vá»¥.
- **G3:** Äo cháº¥t lÆ°á»£ng tÃ¡c vá»¥ vÃ  cháº¥t lÆ°á»£ng há»‡ thá»‘ng báº±ng baseline/target Ä‘Æ°á»£c phÃª duyá»‡t.
- **G4:** KhÃ´ng trÃ¬nh bÃ y mock nhÆ° káº¿t quáº£ mÃ´ hÃ¬nh tháº­t.

### Non-goals hiá»‡n táº¡i

- Cam káº¿t kiáº¿n trÃºc/thuáº­t toÃ¡n mÃ´ hÃ¬nh, bá»™ dá»¯ liá»‡u, class hoáº·c pháº¡m vi JLPT.
- XÃ¢y tá»« Ä‘iá»ƒn, tÃ i khoáº£n, Ä‘á»“ng bá»™ lá»‹ch sá»­ hoáº·c lÆ°u áº£nh lÃ¢u dÃ i.
- CÃ´ng bá»‘ accuracy, latency, SLA, deadline hoáº·c launch date khi chÆ°a Ä‘o.
- Nháº­n diá»‡n chuá»—i nhiá»u kÃ½ tá»± hay dá»‹ch vÄƒn báº£n.

## 5. NguyÃªn táº¯c

1. **Báº±ng chá»©ng trÆ°á»›c tuyÃªn bá»‘:** Current pháº£i truy vá» mÃ£ hoáº·c kiá»ƒm tra.
2. **Mock minh báº¡ch:** dá»¯ liá»‡u demo pháº£i Ä‘Æ°á»£c nháº­n diá»‡n lÃ  demo.
3. **Má»™t tÃ¡c vá»¥, tráº¡ng thÃ¡i rÃµ:** luÃ´n phÃ¢n biá»‡t chÆ°a nháº­p, sáºµn sÃ ng, Ä‘ang xá»­ lÃ½, thÃ nh cÃ´ng vÃ  lá»—i.
4. **Privacy by design:** tá»‘i thiá»ƒu hÃ³a dá»¯ liá»‡u; chÆ°a lÆ°u/persist trÆ°á»›c khi cÃ³ quyáº¿t Ä‘á»‹nh.
5. **Accessible by default:** khÃ´ng phá»¥ thuá»™c riÃªng mÃ u sáº¯c, chuá»™t hoáº·c mÃ n hÃ¬nh rá»™ng.

## 6. Persona táº¡m thá»i vÃ  CUJ

ChÆ°a cÃ³ nghiÃªn cá»©u ngÆ°á»i dÃ¹ng. CÃ¡c persona sau lÃ  **Provisional**:

- **P1 â€” NgÆ°á»i cáº§n tra kÃ½ tá»± tá»« hÃ¬nh dáº¡ng:** muá»‘n nháº­p hÃ¬nh nhanh vÃ  xÃ¡c nháº­n á»©ng viÃªn.
- **P2 â€” NgÆ°á»i dÃ¹ng bÃ n phÃ­m/thiáº¿t bá»‹ cáº£m á»©ng:** cáº§n luá»“ng nháº­p vÃ  chá»n khÃ´ng phá»¥ thuá»™c chuá»™t.
- **P3 â€” Ká»¹ sÆ° tÃ­ch há»£p:** cáº§n há»£p Ä‘á»“ng á»•n Ä‘á»‹nh, lá»—i cÃ³ cáº¥u trÃºc vÃ  kháº£ nÄƒng quan sÃ¡t.

CUJ:

- **CUJ-01:** váº½ má»™t kÃ½ tá»±, sá»­a nÃ©t, gá»­i, xem vÃ  chá»n á»©ng viÃªn.
- **CUJ-02:** chá»n hoáº·c kÃ©o-tháº£ áº£nh, gá»¡/thay áº£nh, gá»­i vÃ  xá»­ lÃ½ lá»—i.
- **CUJ-03:** xem láº¡i káº¿t quáº£ gáº§n Ä‘Ã¢y trong phiÃªn.
- **CUJ-04 (future):** client gá»i dá»‹ch vá»¥ tháº­t vÃ  xá»­ lÃ½ success/error an toÃ n.

## 7. Khung chá»‰ sá»‘ thÃ nh cÃ´ng

KhÃ´ng cÃ³ analytics/baseline/target hiá»‡n táº¡i.

| Metric | Äá»‹nh nghÄ©a Ä‘á» xuáº¥t | Baseline | Target | Káº¿ hoáº¡ch Ä‘o |
|---|---|---|---|---|
| Task completion | PhiÃªn cÃ³ Ä‘áº§u vÃ o há»£p lá»‡ vÃ  ngÆ°á»i dÃ¹ng xem/chá»n káº¿t quáº£ | TBD | TBD | Event funnel sau consent/duyá»‡t analytics. |
| Input abandonment | Báº¯t Ä‘áº§u nháº­p nhÆ°ng khÃ´ng gá»­i | TBD | TBD | `input_started` â†’ khÃ´ng cÃ³ `recognition_submitted`. |
| Correction/retry | Láº§n xÃ³a/hoÃ n tÃ¡c/thay áº£nh/thá»­ láº¡i trÃªn má»—i tÃ¡c vá»¥ | TBD | TBD | Event khÃ´ng chá»©a áº£nh/nÃ©t váº½. |
| Candidate selection | Vá»‹ trÃ­ á»©ng viÃªn Ä‘Æ°á»£c chá»n | TBD | TBD | Ghi rank, khÃ´ng ghi kÃ½ tá»± náº¿u chÆ°a duyá»‡t dá»¯ liá»‡u. |
| Service success rate | Response há»£p lá»‡ / request há»£p lá»‡ | TBD | TBD | Telemetry phÃ­a dá»‹ch vá»¥ Ä‘á» xuáº¥t. |
| Latency | PhÃ¢n phá»‘i thá»i gian end-to-end | TBD | TBD | Äo client vÃ  server; percentile/nguá»¡ng TBD. |
| Recognition quality | Metric vÃ  táº­p Ä‘Ã¡nh giÃ¡ | TBD | TBD | Cáº§n quyáº¿t Ä‘á»‹nh pháº¡m vi class, ground truth vÃ  protocol. |
| Accessibility completion | Tá»· lá»‡ hoÃ n táº¥t báº±ng bÃ n phÃ­m/cÃ´ng nghá»‡ há»— trá»£ | TBD | TBD | Kiá»ƒm thá»­ thá»§ cÃ´ng + tá»± Ä‘á»™ng; tiÃªu chÃ­ TBD. |

## 8. YÃªu cáº§u Æ°u tiÃªn

Tráº¡ng thÃ¡i: **Implemented (frontend)**, **Proposed**, **Blocked**, **Unverified**. P0/P1 lÃ  Æ°u tiÃªn tÆ°Æ¡ng Ä‘á»‘i, khÃ´ng pháº£i deadline.

| ID | P | Tráº¡ng thÃ¡i | YÃªu cáº§u | TiÃªu chÃ­ cháº¥p nháº­n tÃ³m táº¯t |
|---|---:|---|---|---|
| FR-001 | P0 | Implemented (frontend) | Váº½ má»™t kÃ½ tá»± trÃªn canvas. | Pointer táº¡o nÃ©t; dá»¯ liá»‡u áº£nh Ä‘Æ°á»£c cáº­p nháº­t; cÃ³ nÃ©t má»›i báº­t gá»­i. |
| FR-002 | P0 | Implemented (frontend) | Chá»‰nh Ä‘á»™ dÃ y, hoÃ n tÃ¡c má»™t nÃ©t, xÃ³a toÃ n bá»™. | Range 4â€“36 px; undo quay láº¡i snapshot; clear Ä‘Æ°a canvas vá» rá»—ng. |
| FR-003 | P0 | Implemented (frontend) | Chá»n/kÃ©o-tháº£ áº£nh vÃ  xem preview. | Click, Enter/Space hoáº·c drop má»Ÿ/chá»n áº£nh; cÃ³ thá»ƒ gá»¡ áº£nh. Kiá»ƒm tra Ä‘á»‹nh dáº¡ng ná»™i dung: Unverified. |
| FR-004 | P0 | Implemented (frontend) | Quáº£n lÃ½ tráº¡ng thÃ¡i nháº­n diá»‡n. | UI cÃ³ idle/loading/success/error; khÃ´ng gá»­i khi thiáº¿u Ä‘áº§u vÃ o hoáº·c Ä‘ang loading. |
| FR-005 | P0 | Implemented (mock) | Hiá»ƒn thá»‹, sáº¯p xáº¿p vÃ  chá»n á»©ng viÃªn. | Mock Ä‘Æ°á»£c sort giáº£m dáº§n theo `confidence`; chá»n á»©ng viÃªn cáº­p nháº­t chi tiáº¿t. |
| FR-006 | P1 | Implemented (frontend) | Lá»‹ch sá»­ trong phiÃªn. | ThÃªm káº¿t quáº£ Ä‘áº§u tiÃªn, má»›i nháº¥t trÆ°á»›c, tá»‘i Ä‘a 8; reload lÃ m máº¥t dá»¯ liá»‡u. |
| FR-007 | P0 | Proposed; Blocked | Gá»­i áº£nh tá»›i dá»‹ch vá»¥ nháº­n diá»‡n. | Há»£p Ä‘á»“ng Â§10 Ä‘Æ°á»£c phÃª duyá»‡t; khÃ´ng gá»i mock; má»i tráº¡ng thÃ¡i/lá»—i Ä‘Æ°á»£c Ã¡nh xáº¡. |
| FR-008 | P0 | Proposed; Blocked | Dá»‹ch vá»¥ tráº£ danh sÃ¡ch á»©ng viÃªn cÃ³ thá»© háº¡ng. | Response Ä‘áº¡t schema; thá»© tá»±/range/confidence semantics Ä‘Æ°á»£c quyáº¿t Ä‘á»‹nh vÃ  kiá»ƒm thá»­. |
| FR-009 | P1 | Proposed; Blocked | Cung cáº¥p metadata há»c táº­p. | Nguá»“n, báº£n quyá»n, nullability vÃ  locale Ä‘Æ°á»£c duyá»‡t; UI xá»­ lÃ½ thiáº¿u trÆ°á»ng. |
| FR-010 | P0 | Proposed | PhÃ¢n biá»‡t demo vÃ  dá»¯ liá»‡u tháº­t. | Má»i mÃ´i trÆ°á»ng mock hiá»ƒn thá»‹ nhÃ£n rÃµ; production gate cháº·n mock ngoÃ i Ã½ muá»‘n. |
| NFR-001 | P0 | Unverified | Accessibility. | Äiá»u hÆ°á»›ng bÃ n phÃ­m, tÃªn truy cáº­p, focus, tÆ°Æ¡ng pháº£n vÃ  thÃ´ng bÃ¡o Ä‘á»™ng Ä‘Æ°á»£c audit theo chuáº©n TBD. |
| NFR-002 | P0 | Proposed | Privacy vÃ  báº£o máº­t Ä‘áº§u vÃ o. | ChÃ­nh sÃ¡ch dá»¯ liá»‡u, giá»›i háº¡n, MIME/content validation, transport/auth Ä‘Æ°á»£c duyá»‡t vÃ  test. |
| NFR-003 | P0 | Proposed | Reliability/observability. | Timeout, retry, correlation/error code, logs/metrics vÃ  SLO Ä‘á»u TBD trÆ°á»›c launch. |
| NFR-004 | P1 | Partially implemented | Responsive. | UI cÃ³ CSS responsive; ma tráº­n viewport/thiáº¿t bá»‹ vÃ  pass criteria cÃ²n TBD. |
| NFR-005 | P0 | Unverified | Cháº¥t lÆ°á»£ng build. | Build/lint pass; cáº§n bá»• sung chiáº¿n lÆ°á»£c test vÃ  CI trÆ°á»›c launch. |

Chi tiáº¿t vÃ  báº±ng chá»©ng: [requirements-analysis.md](./requirements-analysis.md).

## 9. UX vÃ  tráº¡ng thÃ¡i

- **Input:** `draw` hoáº·c `upload`; má»—i tab giá»¯ state riÃªng trong component hiá»‡n táº¡i.
- **Readiness:** nÃºt gá»­i chá»‰ kháº£ dá»¥ng khi tab hiá»‡n táº¡i cÃ³ nÃ©t/preview vÃ  khÃ´ng loading.
- **Recognition:** `idle â†’ loading â†’ success | error`; retry gá»i láº¡i cÃ¹ng hÃ nh Ä‘á»™ng.
- **Result:** á»©ng viÃªn Ä‘áº§u tiÃªn Ä‘Æ°á»£c chá»n máº·c Ä‘á»‹nh; ngÆ°á»i dÃ¹ng cÃ³ thá»ƒ chá»n á»©ng viÃªn khÃ¡c.
- **History:** chá»‰ thÃªm sau success vÃ  chá»‰ tá»“n táº¡i trong React state.
- **Empty/invalid:** frontend hiá»‡n dá»±a vÃ o browser `accept="image/*"`; chÆ°a xÃ¡c thá»±c ná»™i dung, kÃ­ch thÆ°á»›c hay áº£nh trá»‘ng.

## 10. Há»£p Ä‘á»“ng API/data Ä‘á» xuáº¥t â€” chÆ°a triá»ƒn khai

> Endpoint, transport, authentication vÃ  giá»›i háº¡n Ä‘á»u **TBD/Open Decision**. VÃ­ dá»¥ dÆ°á»›i Ä‘Ã¢y lÃ  biÃªn thiáº¿t káº¿ Ä‘á»ƒ tháº£o luáº­n, khÃ´ng pháº£i API tá»“n táº¡i.

### Request Ä‘á» xuáº¥t

`POST /api/recognitions`, `multipart/form-data`, field `image`; há»— trá»£ JSON data URL lÃ  quyáº¿t Ä‘á»‹nh TBD. Chá»‰ má»™t kÃ½ tá»± má»—i request lÃ  giáº£ Ä‘á»‹nh sáº£n pháº©m cáº§n kiá»ƒm chá»©ng.

### Response thÃ nh cÃ´ng Ä‘á» xuáº¥t

```json
{
  "request_id": "string",
  "predictions": [
    {
      "kanji": "string",
      "confidence": 0.0,
      "reading_on": ["string"],
      "reading_kun": ["string"],
      "meaning_vi": "string",
      "jlpt": null,
      "strokes": null
    }
  ],
  "model_version": "string"
}
```

- `predictions`: máº£ng, thá»© tá»± giáº£m dáº§n; min/max item **TBD**.
- `kanji`, `confidence`: báº¯t buá»™c náº¿u semantic Ä‘Æ°á»£c duyá»‡t; range/diá»…n giáº£i confidence pháº£i Ä‘Æ°á»£c tÃ i liá»‡u hÃ³a.
- `reading_on`, `reading_kun`: máº£ng cÃ³ thá»ƒ rá»—ng.
- `meaning_vi`, `jlpt`, `strokes`: nullable/required cuá»‘i cÃ¹ng **TBD**, phá»¥ thuá»™c nguá»“n metadata.
- `request_id`, `model_version`: Ä‘á» xuáº¥t cho truy váº¿t; Ä‘á»‹nh dáº¡ng TBD.

### Lá»—i Ä‘á» xuáº¥t

```json
{
  "request_id": "string",
  "error": { "code": "INVALID_IMAGE", "message": "string", "retryable": false }
}
```

Taxonomy tá»‘i thiá»ƒu Ä‘á» xuáº¥t: `INVALID_REQUEST`, `UNSUPPORTED_MEDIA_TYPE`, `IMAGE_TOO_LARGE`, `INVALID_IMAGE`, `TIMEOUT`, `RATE_LIMITED`, `SERVICE_UNAVAILABLE`, `INTERNAL_ERROR`. HTTP mapping, limit, timeout vÃ  retry policy: TBD.

## 11. NFR, accessibility, privacy vÃ  vÃ²ng Ä‘á»i dá»¯ liá»‡u

- **Accessibility:** tab semantics/focus behavior, canvas alternative, live announcements cho loading/error/result, target size vÃ  contrast cáº§n audit; canvas váº½ tay cÃ³ thá»ƒ cáº§n phÆ°Æ¡ng Ã¡n upload tÆ°Æ¡ng Ä‘Æ°Æ¡ng.
- **Responsive:** kiá»ƒm thá»­ viewport/zoom/orientation; breakpoint hiá»‡n há»¯u khÃ´ng Ä‘á»“ng nghÄ©a Ä‘áº¡t chuáº©n.
- **Privacy:** áº£nh/nÃ©t váº½ cÃ³ thá»ƒ lÃ  dá»¯ liá»‡u ngÆ°á»i dÃ¹ng. Hiá»‡n chá»‰ xá»­ lÃ½ trÃªn client mock; object URL vÃ  state sá»‘ng trong phiÃªn. Vá»›i dá»‹ch vá»¥ tháº­t, má»¥c Ä‘Ã­ch, retention, vá»‹ trÃ­ xá»­ lÃ½, xÃ³a, consent vÃ  quyá»n truy cáº­p Ä‘á»u TBD.
- **Security:** khÃ´ng cÃ³ control backend Ä‘á»ƒ xÃ¡c minh. Cáº§n threat model cho upload, validation theo ná»™i dung, giá»›i háº¡n tÃ i nguyÃªn, auth/rate limit náº¿u phÃ¹ há»£p, dependency review vÃ  log redaction.
- **Reliability/performance:** baseline, SLO, timeout, concurrency vÃ  budget Ä‘á»u TBD; khÃ´ng cÃ´ng bá»‘ sá»‘ liá»‡u trÆ°á»›c khi Ä‘o.

## 12. Phá»¥ thuá»™c vÃ  rá»§i ro

Phá»¥ thuá»™c Ä‘á» xuáº¥t: backend, artifact mÃ´ hÃ¬nh, mapping class, táº­p Ä‘Ã¡nh giÃ¡, nguá»“n metadata cÃ³ quyá»n sá»­ dá»¥ng, háº¡ táº§ng váº­n hÃ nh vÃ  quan sÃ¡t.

| Rá»§i ro | TÃ¡c Ä‘á»™ng | Giáº£m thiá»ƒu Ä‘á» xuáº¥t |
|---|---|---|
| Mock bá»‹ hiá»ƒu lÃ  AI tháº­t | Máº¥t niá»m tin | NhÃ£n demo; FR-010; gate production. |
| ChÆ°a biáº¿t pháº¡m vi kÃ½ tá»±/cháº¥t lÆ°á»£ng | KhÃ´ng thá»ƒ Ä‘áº·t ká»³ vá»ng | Chá»‘t dataset/evaluation protocol trÆ°á»›c target. |
| Upload Ä‘á»™c háº¡i hoáº·c quÃ¡ lá»›n | Báº£o máº­t/á»•n Ä‘á»‹nh | Validation nhiá»u lá»›p vÃ  limit sau threat model. |
| Metadata sai/khÃ´ng cÃ³ quyá»n | Sai tráº£i nghiá»‡m/phÃ¡p lÃ½ | XÃ¡c minh nguá»“n, schema vÃ  license. |
| Canvas khÃ³ tiáº¿p cáº­n | Loáº¡i trá»« ngÆ°á»i dÃ¹ng | Duy trÃ¬ upload tÆ°Æ¡ng Ä‘Æ°Æ¡ng; audit trá»£ nÄƒng. |
| TÃ i liá»‡u lá»‡ch code | TÃ­ch há»£p lá»—i | Traceability vÃ  review cÃ¹ng thay Ä‘á»•i contract. |

## 13. Milestone theo exit criteria

1. **M0 â€” Baseline tÃ i liá»‡u:** Current/Proposed tÃ¡ch rÃµ; link/ID nháº¥t quÃ¡n; build/lint Ä‘Æ°á»£c ghi nháº­n.
2. **M1 â€” Discovery:** giáº£ thuyáº¿t Æ°u tiÃªn cÃ³ nghiÃªn cá»©u; persona/CUJ Ä‘Æ°á»£c xÃ¡c nháº­n hoáº·c sá»­a; metric cÃ³ Ä‘á»‹nh nghÄ©a.
3. **M2 â€” Contract ready:** API/error/nullability/limits/privacy/security Ä‘Æ°á»£c quyáº¿t Ä‘á»‹nh; contract tests Ä‘Æ°á»£c thiáº¿t káº¿.
4. **M3 â€” Service validated:** cÃ³ artifact vÃ  dá»‹ch vá»¥; evaluation reproducible; observability vÃ  failure tests Ä‘áº¡t gate TBD.
5. **M4 â€” Integration ready:** bá» mock á»Ÿ cháº¿ Ä‘á»™ target; E2E, accessibility, responsive vÃ  rollback rehearsal Ä‘áº¡t.
6. **M5 â€” Launch decision:** owner phÃª duyá»‡t metrics, risk acceptance, support/incident/rollback; ngÃ y phÃ¡t hÃ nh váº«n TBD.

## 14. Analytics Ä‘á» xuáº¥t

Event: `input_started`, `input_cleared`, `image_selected`, `recognition_submitted`, `recognition_succeeded`, `recognition_failed`, `candidate_selected`, `retry_requested`. Thuá»™c tÃ­nh tá»‘i thiá»ƒu: input mode, candidate rank, duration bucket, error code, client version. KhÃ´ng thu áº£nh, nÃ©t váº½, ná»™i dung kÃ½ tá»± hoáº·c Ä‘á»‹nh danh ngÆ°á»i dÃ¹ng trÆ°á»›c privacy review. Schema, consent, retention vÃ  cÃ´ng cá»¥: TBD.

## 15. Launch vÃ  rollback gate

Launch chá»‰ Ä‘Æ°á»£c cÃ¢n nháº¯c khi: khÃ´ng cÃ²n mock ngoÃ i mÃ´i trÆ°á»ng demo; contract/evaluation/security/privacy/accessibility/operations Ä‘Æ°á»£c phÃª duyá»‡t; build/lint/test/CI Ä‘áº¡t; dashboards/alerts vÃ  owner trá»±c váº­n hÃ nh Ä‘Æ°á»£c xÃ¡c Ä‘á»‹nh; metric threshold Ä‘Æ°á»£c Ä‘iá»n. Rollback cáº§n feature flag hoáº·c cÆ¡ cháº¿ vÃ´ hiá»‡u hÃ³a tÃ­ch há»£p, tráº¡ng thÃ¡i client há»¯u Ã­ch khi service táº¯t, vÃ  rehearsal cÃ³ báº±ng chá»©ng. CÆ¡ cháº¿ cá»¥ thá»ƒ: TBD.

## 16. Open questions vÃ  decision log

### Open questions

- Ai lÃ  ngÆ°á»i dÃ¹ng Æ°u tiÃªn vÃ  tÃ¡c vá»¥ thÆ°á»ng gáº·p?
- Pháº¡m vi kÃ½ tá»±, ngÃ´n ngá»¯ metadata vÃ  nguá»“n dá»¯ liá»‡u nÃ o Ä‘Æ°á»£c phÃ©p?
- Input/API format, limit, timeout, authentication vÃ  retention lÃ  gÃ¬?
- Confidence cÃ³ Ä‘Æ°á»£c hiá»ƒn thá»‹ khÃ´ng, vÃ  diá»…n giáº£i tháº¿ nÃ o?
- Chuáº©n accessibility, browser/device support, SLO vÃ  metric target lÃ  gÃ¬?
- Owner, approver, deadline vÃ  launch channel lÃ  ai/cÃ¡i gÃ¬?

### Decision log

| Quyáº¿t Ä‘á»‹nh | Tráº¡ng thÃ¡i | LÃ½ do/báº±ng chá»©ng |
|---|---|---|
| PRD lÃ  nguá»“n sá»± tháº­t | Accepted | Giáº£m trÃ¹ng láº·p vÃ  lá»‡ch thuáº­t ngá»¯. |
| Gá»i sáº£n pháº©m hiá»‡n táº¡i lÃ  prototype/mock | Accepted | `api.ts` vÃ  `mockData.ts`. |
| KhÃ´ng kháº³ng Ä‘á»‹nh model/backend/class/JLPT | Accepted | KhÃ´ng cÃ³ artifact tÆ°Æ¡ng á»©ng trong checkout. |
| Há»£p Ä‘á»“ng Â§10 chá»‰ lÃ  Proposed | Accepted | ChÆ°a cÃ³ API triá»ƒn khai. |
| CÃ¡c quyáº¿t Ä‘á»‹nh sáº£n pháº©m/ká»¹ thuáº­t cÃ²n láº¡i | Open | Cáº§n evidence vÃ  owner. |

## 17. Truy váº¿t

| Má»¥c tiÃªu/CUJ | YÃªu cáº§u | Stories | Äáº·c táº£ |
|---|---|---|---|
| G1, CUJ-01 | FR-001, FR-002, FR-004, FR-005 | US-001â€“US-004 | UI state machine, input/result specs |
| G1, CUJ-02 | FR-003, FR-004 | US-005, US-006 | Upload/validation taxonomy |
| G1, CUJ-03 | FR-006 | US-007 | Session history |
| G2, CUJ-04 | FR-007â€“FR-010, NFR-002â€“003 | US-010â€“US-012 | Proposed API contract |
| G3 | NFR-001, NFR-004â€“005 | US-008, US-009 | Accessibility/responsive/quality |

Xem catalogue Ä‘áº§y Ä‘á»§ táº¡i [requirements-analysis.md](./requirements-analysis.md) vÃ  story táº¡i [user-stories.md](./user-stories.md). Phạm vi và thứ tự triển khai frontend được diễn giải tại [PRD frontend](./frontend-prd.md) và [kế hoạch triển khai frontend](./frontend-implementation-plan.md); tài liệu này vẫn là nguồn chuẩn và được ưu tiên.
