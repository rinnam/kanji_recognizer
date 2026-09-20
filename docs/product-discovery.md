# KhÃ¡m phÃ¡ sáº£n pháº©m

> TÃ i liá»‡u nÃ y quáº£n lÃ½ giáº£ thuyáº¿t vÃ  báº±ng chá»©ng; khÃ´ng biáº¿n giáº£ thuyáº¿t thÃ nh sá»± tháº­t. Pháº¡m vi chuáº©n xem [PRD](./prd.md).

## 1. CÃ¢u há»i khÃ¡m phÃ¡

Liá»‡u má»™t tráº£i nghiá»‡m nháº­p hÃ¬nh dáº¡ng má»™t kÃ½ tá»± báº±ng váº½ hoáº·c áº£nh cÃ³ giÃºp nhÃ³m ngÆ°á»i dÃ¹ng má»¥c tiÃªu hoÃ n thÃ nh tÃ¡c vá»¥ tra cá»©u tá»‘t hÆ¡n cÃ¡c cÃ¡ch há» Ä‘ang dÃ¹ng, vá»›i má»©c tin cáº­y vÃ  chi phÃ­ cháº¥p nháº­n Ä‘Æ°á»£c?

NhÃ³m ngÆ°á»i dÃ¹ng, hÃ nh vi hiá»‡n táº¡i, táº§n suáº¥t, â€œtá»‘t hÆ¡nâ€ vÃ  má»©c cháº¥p nháº­n Ä‘á»u **TBD** vÃ¬ repository khÃ´ng chá»©a nghiÃªn cá»©u ngÆ°á»i dÃ¹ng.

## 2. Evidence register

| E-ID | Báº±ng chá»©ng | Nguá»“n | Äiá»u chá»©ng minh | KhÃ´ng chá»©ng minh |
|---|---|---|---|---|
| E-001 | UI React/TypeScript/Vite cháº¡y nhÆ° prototype | `frontend/package.json`, `src/**` | CÃ³ thá»ƒ dá»±ng luá»“ng tÆ°Æ¡ng tÃ¡c | Nhu cáº§u, usability, production readiness |
| E-002 | Canvas draw/brush/undo/clear | `DrawCanvas.tsx`, `InputPanel.tsx` | NÄƒng lá»±c frontend hiá»‡n táº¡i | Accessibility Ä‘áº§y Ä‘á»§, cháº¥t lÆ°á»£ng recognition |
| E-003 | Upload click/keyboard/drop vÃ  preview | `InputPanel.tsx` | Interaction hiá»‡n há»¯u | Content validation/security |
| E-004 | Fixed mock candidates, latency 1,4 s | `api.ts`, `mockData.ts` | Loading/result UI demo Ä‘Æ°á»£c | Backend/model/accuracy/latency tháº­t |
| E-005 | State/result/history | `App.tsx`, `ResultPanel.tsx` | UI state vÃ  history session | Persistence/analytics |
| E-006 | KhÃ´ng cÃ³ backend/model/test/CI/analytics | CÃ¢y file checkout | Khoáº£ng trá»‘ng repository | KhÃ´ng kháº³ng Ä‘á»‹nh cÃ¡c artifact khÃ´ng tá»“n táº¡i á»Ÿ nÆ¡i khÃ¡c |

## 3. Giáº£ thuyáº¿t Æ°u tiÃªn

| H-ID | Giáº£ thuyáº¿t | Báº±ng chá»©ng hiá»‡n cÃ³ | CÃ¡ch kiá»ƒm chá»©ng | Quyáº¿t Ä‘á»‹nh sau thá»­ nghiá»‡m |
|---|---|---|---|---|
| H-001 | NgÆ°á»i dÃ¹ng má»¥c tiÃªu cÃ³ váº¥n Ä‘á» tra kÃ½ tá»± tá»« hÃ¬nh dáº¡ng Ä‘á»§ thÆ°á»ng xuyÃªn | KhÃ´ng cÃ³ | Phá»ng váº¥n theo tÃ¡c vá»¥ + diary/contextual inquiry; máº«u/segment TBD | Tiáº¿p tá»¥c, Ä‘á»•i segment hoáº·c dá»«ng |
| H-002 | Váº½ vÃ  upload bao phá»§ input mode quan trá»ng | Prototype | Usability test so sÃ¡nh mode; ghi completion/error/preference | Giá»¯ cáº£ hai, Æ°u tiÃªn má»™t, hoáº·c thÃªm phÆ°Æ¡ng Ã¡n khÃ¡c |
| H-003 | Danh sÃ¡ch á»©ng viÃªn giÃºp phá»¥c há»“i khi top-1 sai | UI mock | Wizard-of-Oz vá»›i ground truth; Ä‘o rank selected vÃ  confidence hiá»ƒu Ä‘Ãºng | Chá»n candidate count/presentation |
| H-004 | Hiá»ƒn thá»‹ confidence há»¯u Ã­ch, khÃ´ng gÃ¢y hiá»ƒu nháº§m | KhÃ´ng cÃ³ | A/B concept test + comprehension interview | Hiá»‡n, Ä‘á»•i cÃ¡ch diá»…n Ä‘áº¡t hoáº·c áº©n |
| H-005 | Metadata há»— trá»£ quyáº¿t Ä‘á»‹nh/chuyá»‡n há»c | Chá»‰ mock | Card sorting/task test cho field | Chá»‘t schema tá»‘i thiá»ƒu |
| H-006 | Dá»‹ch vá»¥ cÃ³ thá»ƒ Ä‘áº¡t cháº¥t lÆ°á»£ng/latency Ä‘á»§ dÃ¹ng | KhÃ´ng model/dataset | Technical spike + evaluation protocol Ä‘Æ°á»£c review | Go/no-go cho integration |
| H-007 | Luá»“ng dÃ¹ng Ä‘Æ°á»£c vá»›i bÃ n phÃ­m/screen reader/mobile | Má»™t pháº§n mÃ£ | Accessibility audit + moderated test | Fix trÆ°á»›c integration/launch |

## 4. Alternatives cáº§n xem xÃ©t

KhÃ´ng máº·c Ä‘á»‹nh nháº­n diá»‡n model lÃ  Ä‘Ã¡p Ã¡n duy nháº¥t. CÃ¡c lá»±a chá»n cáº§n nghiÃªn cá»©u:

- Tra theo bá»™ thá»§/sá»‘ nÃ©t hoáº·c tÃ¬m kiáº¿m text khi ngÆ°á»i dÃ¹ng cÃ³ thÃ´ng tin Ä‘Ã³.
- OCR/nháº­n diá»‡n trÃªn thiáº¿t bá»‹ so vá»›i dá»‹ch vá»¥ tá»« xa.
- Chá»‰ upload, chá»‰ váº½, hoáº·c cáº£ hai.
- Wizard-of-Oz/manual matching cho discovery trÆ°á»›c khi Ä‘áº§u tÆ° model.
- Hiá»ƒn thá»‹ má»™t káº¿t quáº£, nhiá»u á»©ng viÃªn, hoáº·c yÃªu cáº§u ngÆ°á»i dÃ¹ng xÃ¡c nháº­n.
- KhÃ´ng lÆ°u lá»‹ch sá»­, lá»‹ch sá»­ trong phiÃªn, hoáº·c persistence cÃ³ consent.

TiÃªu chÃ­ so sÃ¡nh: task completion, time-on-task, error recovery, comprehension, accessibility, privacy, cost vÃ  feasibility; baseline/weight TBD.

## 5. Káº¿ hoáº¡ch nghiÃªn cá»©u vÃ  thá»­ nghiá»‡m

### Pha D0 â€” Hiá»ƒu váº¥n Ä‘á»

- XÃ¡c Ä‘á»‹nh segment vÃ  recruiting criteria.
- Phá»ng váº¥n theo tÃ¬nh huá»‘ng tháº­t; thu artifact Ä‘Æ°á»£c phÃ©p.
- Exit: problem statement/persona/CUJ Ä‘Æ°á»£c xÃ¡c nháº­n hoáº·c sá»­a; khÃ´ng Ä‘áº·t sá»‘ máº«u khi chÆ°a cÃ³ owner/budget.

### Pha D1 â€” Concept/usability

- DÃ¹ng prototype hiá»‡n táº¡i nhÆ°ng gáº¯n nhÃ£n mock rÃµ.
- Nhiá»‡m vá»¥: draw, undo/clear, upload/drop, submit, Ä‘á»c/chá»n candidate, retry, xem history; bao gá»“m keyboard/mobile.
- Thu completion, Ä‘iá»ƒm vÆ°á»›ng, mental model vÃ  qualitative confidence; target TBD.
- Exit: quyáº¿t Ä‘á»‹nh input/result/history vÃ  danh sÃ¡ch lá»—i UX.

### Pha D2 â€” Technical feasibility

- Chá»‰ báº¯t Ä‘áº§u khi cÃ³ artifact há»£p lá»‡ vÃ  data governance.
- Chá»‘t pháº¡m vi kÃ½ tá»±, split/ground truth, metric, subgroup/error analysis, latency environment vÃ  reproducibility.
- So sÃ¡nh vá»›i baseline/alternative; target khÃ´ng Ä‘áº·t trong tÃ i liá»‡u nÃ y khi chÆ°a cÃ³ báº±ng chá»©ng.
- Exit: go/no-go cÃ³ report, limitation vÃ  owner.

### Pha D3 â€” Integration experiment

- Contract test trong mÃ´i trÆ°á»ng kiá»ƒm soÃ¡t; feature flag; telemetry tá»‘i thiá»ƒu sau privacy review.
- Dogfood/pilot population, thá»i lÆ°á»£ng vÃ  stop condition: TBD.
- Exit: launch gate PRD Â§15 hoáº·c rollback.

## 6. Instrumentation Ä‘á» xuáº¥t

DÃ¹ng event plan táº¡i [PRD Â§14](./prd.md#14-analytics-Ä‘á»-xuáº¥t). TrÆ°á»›c khi instrument cáº§n quyáº¿t Ä‘á»‹nh consent, data classification, retention vÃ  access. KhÃ´ng thu áº£nh, nÃ©t váº½, text kÃ½ tá»± hoáº·c PII theo máº·c Ä‘á»‹nh.

## 7. Bias vÃ  giá»›i háº¡n nghiÃªn cá»©u

- Prototype cÃ³ copy tuyÃªn bá»‘ model/class/JLPT chÆ°a Ä‘Æ°á»£c chá»©ng minh, cÃ³ thá»ƒ táº¡o expectation bias.
- Mock luÃ´n tráº£ cÃ¹ng káº¿t quáº£ nÃªn khÃ´ng Ä‘Ã¡nh giÃ¡ recognition.
- Máº«u thuáº­n tiá»‡n cÃ³ thá»ƒ khÃ´ng Ä‘áº¡i diá»‡n ká»¹ nÄƒng viáº¿t, thiáº¿t bá»‹ hoáº·c nhu cáº§u accessibility.
- â€œChá»n Ä‘Ãºng candidateâ€ cáº§n ground truth Ä‘á»™c láº­p; self-report khÃ´ng Ä‘á»§.
- Káº¿t quáº£ ká»¹ thuáº­t khÃ´ng tá»± chá»©ng minh product-market fit.

## 8. Decision log

| D-ID | Quyáº¿t Ä‘á»‹nh | Tráº¡ng thÃ¡i | CÄƒn cá»© / bÆ°á»›c tiáº¿p |
|---|---|---|---|
| D-001 | DÃ¹ng prototype Ä‘á»ƒ kiá»ƒm tra luá»“ng, khÃ´ng Ä‘á»ƒ chá»©ng minh AI | Accepted | E-001â€“E-005 |
| D-002 | Persona/CUJ giá»¯ provisional | Accepted | ChÆ°a cÃ³ research evidence |
| D-003 | KhÃ´ng chá»‘t model, class/JLPT, performance | Accepted | E-006 |
| D-004 | CÃ³ giá»¯ confidence trÃªn UI hay khÃ´ng | Open | Test H-004 |
| D-005 | Candidate count vÃ  metadata tá»‘i thiá»ƒu | Open | Test H-003/H-005 |
| D-006 | Service/on-device/alternative | Open | D2 + privacy/cost review |
| D-007 | Lá»‹ch sá»­ persistence | Open | Research + data lifecycle decision |

Má»i quyáº¿t Ä‘á»‹nh Accepted lÃ m thay Ä‘á»•i scope/requirement pháº£i cáº­p nháº­t [PRD](./prd.md#16-open-questions-vÃ -decision-log).
