# Catalogue phÃ¢n tÃ­ch yÃªu cáº§u

> Nguá»“n chuáº©n vá» ná»™i dung/tráº¡ng thÃ¡i yÃªu cáº§u: [PRD](./prd.md#8-yÃªu-cáº§u-Æ°u-tiÃªn). TÃ i liá»‡u nÃ y táº­p trung vÃ o báº±ng chá»©ng, phá»¥ thuá»™c vÃ  truy váº¿t.

## Quy Æ°á»›c

- **Implemented (frontend):** cÃ³ mÃ£ UI; khÃ´ng Ä‘á»“ng nghÄ©a cÃ³ dá»‹ch vá»¥ tháº­t.
- **Implemented (mock):** cháº¡y báº±ng dá»¯ liá»‡u cá»‘ Ä‘á»‹nh.
- **Partially implemented / Proposed / Blocked / Unverified:** theo [chÃº giáº£i](./README.md#chÃº-giáº£i-tráº¡ng-thÃ¡i).
- Æ¯u tiÃªn P0/P1 khÃ´ng hÃ m Ã½ deadline.

## Catalogue

| ID | Tráº¡ng thÃ¡i | Báº±ng chá»©ng / khoáº£ng trá»‘ng | Acceptance chi tiáº¿t | LiÃªn káº¿t |
|---|---|---|---|---|
| FR-001 | Implemented (frontend) | `DrawCanvas.tsx`: canvas logic 480, pointer events, data URL | Given tab Váº½ tay, when pointer táº¡o nÃ©t, then `hasInk=true`, cÃ³ PNG data URL vÃ  nÃºt gá»­i kháº£ dá»¥ng náº¿u khÃ´ng loading. | CUJ-01; US-001 |
| FR-002 | Implemented (frontend) | `DrawCanvas.tsx`, `InputPanel.tsx` | Brush nháº­n 4â€“36; undo bá» snapshot gáº§n nháº¥t; clear xÃ³a lá»‹ch sá»­ vÃ  bÃ¡o rá»—ng. Undo cÃ³ tá»‘i Ä‘a 30 snapshot trong mÃ£. | CUJ-01; US-002 |
| FR-003 | Implemented (frontend); validation Unverified | `InputPanel.tsx`: file input `image/*`, click/drop, Enter/Space, preview/gá»¡ | Chá»n hoáº·c drop file táº¡o preview; gá»¡ reset preview/input. KhÃ´ng Ä‘Æ°á»£c coi `accept` lÃ  security validation. | CUJ-02; US-005 |
| FR-004 | Implemented (frontend) | `App.tsx`, `ResultPanel.tsx` | Tráº¡ng thÃ¡i chá»‰ thuá»™c `idle/loading/success/error`; gá»­i bá»‹ khÃ³a náº¿u thiáº¿u input/Ä‘ang loading; lá»—i cÃ³ retry. | CUJ-01/02; US-003, US-006 |
| FR-005 | Implemented (mock) | `api.ts`, `mockData.ts`, `ResultPanel.tsx` | Mock tráº£ fixed candidates sau 1,4 giÃ¢y; client sort confidence giáº£m dáº§n; máº·c Ä‘á»‹nh index 0; chá»n row Ä‘á»•i tháº» chi tiáº¿t. | CUJ-01; US-004 |
| FR-006 | Implemented (frontend) | `App.tsx` | Sau success, thÃªm top candidate vÃ o Ä‘áº§u; slice 8; chá»‰ React state, khÃ´ng persistence. | CUJ-03; US-007 |
| FR-007 | Proposed; Blocked | `App.tsx`/`api.ts` chá»‰ cÃ³ TODO; khÃ´ng backend | Khi contract PRD Â§10 Ä‘Æ°á»£c duyá»‡t, gá»­i input tháº­t; timeout/cancel/error mapping pass contract tests. | CUJ-04; US-010 |
| FR-008 | Proposed; Blocked | KhÃ´ng model/checkpoint/service | Response cÃ³ schema Ä‘Ã£ version; rank/confidence semantics vÃ  evaluation protocol Ä‘Æ°á»£c phÃª duyá»‡t. | CUJ-04; US-011 |
| FR-009 | Proposed; Blocked | Metadata hiá»‡n lÃ  mock | Nguá»“n/license/locale/nullability Ä‘Æ°á»£c duyá»‡t; thiáº¿u metadata khÃ´ng lÃ m UI crash. | CUJ-04; US-012 |
| FR-010 | Proposed | Mock hiá»‡n cÃ³ message demo; header/loading cÃ²n nÃªu chi tiáº¿t model chÆ°a kiá»ƒm chá»©ng | Cháº¿ Ä‘á»™ demo cÃ³ nhÃ£n nháº¥t quÃ¡n; production khÃ´ng thá»ƒ vÃ´ tÃ¬nh dÃ¹ng mock; ná»™i dung UI khÃ´ng tuyÃªn bá»‘ model chÆ°a xÃ¡c minh. | G4; US-013 |
| NFR-001 | Unverified | Upload cÃ³ keyboard handler/ARIA; chÆ°a audit toÃ n luá»“ng | Tab/focus/name/status announcement/contrast/zoom/canvas alternative Ä‘áº¡t chuáº©n Ä‘Æ°á»£c chá»n (TBD). | US-008 |
| NFR-002 | Proposed | KhÃ´ng backend/control Ä‘á»ƒ kiá»ƒm tra | Threat model, content validation, limit, transport/auth/log redaction/retention Ä‘Æ°á»£c quyáº¿t Ä‘á»‹nh vÃ  test. | US-012 |
| NFR-003 | Proposed | KhÃ´ng telemetry/service | SLO, timeout, retry, error code, request correlation, logs/metrics/alerts vÃ  runbook Ä‘áº¡t gate TBD. | US-010/011 |
| NFR-004 | Partially implemented | Responsive CSS trong `App.css`; chÆ°a cÃ³ ma tráº­n test | Luá»“ng hoÃ n táº¥t á»Ÿ viewport/zoom/orientation Ä‘Ã£ chá»n, khÃ´ng che action hoáº·c máº¥t ná»™i dung. | US-009 |
| NFR-005 | Unverified | CÃ³ script build/lint; khÃ´ng test/CI | Build/lint pass táº¡i gate; test strategy vÃ  CI lÃ  exit criteria trÆ°á»›c launch. | M0/M4 |

## Ma tráº­n nÄƒng lá»±c

| NÄƒng lá»±c | Frontend | Dá»‹ch vá»¥ | Kiá»ƒm thá»­/Ä‘o lÆ°á»ng |
|---|---|---|---|
| Váº½/undo/clear | Implemented | KhÃ´ng Ã¡p dá»¥ng | Manual/code inspection; automated tests absent |
| Upload/preview | Implemented | Absent | MIME/content/limit unverified |
| Recognition | Mock only | Absent | Accuracy/evaluation absent |
| Candidate details | Mock UI | Metadata service absent | Schema/quality unverified |
| History | Session-only | Persistence absent/non-goal | Reload loss is expected current behavior |
| Responsive/accessibility | Partial | KhÃ´ng Ã¡p dá»¥ng | Audit absent |
| Analytics/observability | Absent | Absent | Plan only |

## Dependency vÃ  test cáº§n cÃ³

- FR-007â€“009 phá»¥ thuá»™c quyáº¿t Ä‘á»‹nh contract, backend, model artifact, evaluation set vÃ  metadata source.
- Contract tests pháº£i bao phá»§ success, empty predictions, nullable fields vÃ  má»i error code.
- E2E cáº§n bao phá»§ CUJ-01â€“04; accessibility vÃ  responsive lÃ  gate riÃªng.
- KhÃ´ng cÃ³ automated test suite/CI trong checkout; má»i káº¿t luáº­n ngoÃ i build/lint pháº£i giá»¯ **Unverified**.

## Quy táº¯c thay Ä‘á»•i

KhÃ´ng Ä‘á»•i ID Ä‘Ã£ phÃ¡t hÃ nh; yÃªu cáº§u bá» Ä‘i Ä‘Æ°á»£c Ä‘Ã¡nh dáº¥u Deprecated thay vÃ¬ tÃ¡i sá»­ dá»¥ng ID. Thay schema pháº£i cáº­p nháº­t Ä‘á»“ng thá»i [PRD](./prd.md), [feature spec](./feature-specification.md), stories liÃªn quan vÃ  `frontend/src/types.ts` khi tÃ­ch há»£p tháº­t. Việc triển khai frontend theo gate được tổ chức tại [kế hoạch frontend](./frontend-implementation-plan.md), không tạo ID yêu cầu mới.
