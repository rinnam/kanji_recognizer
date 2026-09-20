# HÆ°á»›ng dáº«n phÃ¡t triá»ƒn frontend

> **Current:** React 19 + TypeScript + Vite prototype, cháº¡y hoÃ n toÃ n báº±ng mock. KhÃ´ng cÃ³ backend/model/API Ä‘Æ°á»£c tÃ­ch há»£p.

## Thiáº¿t láº­p

Tá»« thÆ° má»¥c `frontend`:

```bash
npm install
npm run dev
```

DÃ¹ng `npm ci` khi cáº§n cÃ i chÃ­nh xÃ¡c theo `package-lock.json` trong mÃ´i trÆ°á»ng sáº¡ch.

## Scripts

| Lá»‡nh | Chá»©c nÄƒng |
|---|---|
| `npm run dev` | Vite development server/HMR. |
| `npm run build` | `tsc -b` rá»“i Vite production build. |
| `npm run lint` | ESLint toÃ n frontend. |
| `npm run preview` | Preview output Ä‘Ã£ build. |

KhÃ´ng cÃ³ script test vÃ  khÃ´ng cÃ³ automated test suite trong checkout.

## Mock mode hiá»‡n táº¡i

- `src/api.ts::mockRecognize` nháº­n tham sá»‘ áº£nh nhÆ°ng cá»‘ Ã½ khÃ´ng dÃ¹ng.
- HÃ m chá» 1.400 ms Ä‘á»ƒ trÃ¬nh diá»…n loading rá»“i tráº£ `MOCK_PREDICTIONS` tá»« `src/mockData.ts`.
- Má»i input cho cÃ¹ng candidate; Ä‘Ã¢y khÃ´ng pháº£i accuracy hoáº·c model inference.
- `App.tsx` sort candidate theo confidence vÃ  lÆ°u top candidate vÃ o history phiÃªn.

## Bá»‘ cá»¥c mÃ£

| Path | Vai trÃ² |
|---|---|
| `src/main.tsx` | Bootstrap React. |
| `src/App.tsx` | State, submit mock, selection vÃ  history. |
| `src/components/InputPanel.tsx` | Tab váº½/upload, toolbar, dropzone. |
| `src/components/DrawCanvas.tsx` | Canvas/pointer, snapshot, undo/clear. |
| `src/components/ResultPanel.tsx` | Idle/loading/error/success vÃ  candidate details. |
| `src/api.ts` | BiÃªn gá»i dá»¯ liá»‡u hiá»‡n lÃ  mock. |
| `src/mockData.ts` | Fixture UI cá»‘ Ä‘á»‹nh. |
| `src/types.ts` | Kiá»ƒu view-model hiá»‡n táº¡i; chÆ°a pháº£i contract backend Ä‘Æ°á»£c duyá»‡t. |
| `src/App.css`, `src/index.css` | Layout/theme/responsive. |

## Luá»“ng state

- Input mode: `draw | upload`.
- Recognition: `idle â†’ loading â†’ success | error`.
- Submit chá»‰ báº­t khi tab hiá»‡n hÃ nh cÃ³ nÃ©t hoáº·c preview vÃ  khÃ´ng loading.
- History lÃ  React state, tá»‘i Ä‘a 8, máº¥t khi reload.

## BiÃªn tÃ­ch há»£p Ä‘á» xuáº¥t

Khi service Ä‘Æ°á»£c phÃª duyá»‡t:

1. Giá»¯ adapter táº¡i `api.ts`; khÃ´ng gá»i `fetch` trá»±c tiáº¿p tá»« component.
2. Implement contract canonical trong [PRD Â§10](../docs/prd.md#10-há»£p-Ä‘á»“ng-apidata-Ä‘á»-xuáº¥t--chÆ°a-triá»ƒn-khai), sau khi cÃ¡c TBD Ä‘Æ°á»£c quyáº¿t Ä‘á»‹nh.
3. Validate response runtime vÃ  map nullable API DTO sang view model; khÃ´ng giáº£ Ä‘á»‹nh mock fields luÃ´n cÃ³.
4. Ãnh xáº¡ error taxonomy sang UI; há»— trá»£ timeout/cancel/retry policy Ä‘Ã£ duyá»‡t.
5. KhÃ´ng log áº£nh/data URL; revoke object URL khi thay/gá»¡/unmount.
6. Cáº¥u hÃ¬nh mock/service rÃµ theo mÃ´i trÆ°á»ng vÃ  cháº·n production dÃ¹ng mock ngoÃ i Ã½ muá»‘n.
7. ThÃªm contract tests/E2E/accessibility tests trÆ°á»›c launch.

KhÃ´ng sao chÃ©p endpoint cÅ© tá»« comment thÃ nh cam káº¿t: repository khÃ´ng cÃ³ API hoáº¡t Ä‘á»™ng.

## Accessibility vÃ  responsive

Current evidence: dropzone dÃ¹ng click/Enter/Space, cÃ³ ARIA label; tab cÃ³ role/selected; brush cÃ³ label; CSS responsive. ChÆ°a cÃ³ audit. Cáº§n kiá»ƒm tra focus pattern cá»§a tabs, live announcements, candidate selection semantics, canvas alternative, contrast, zoom, screen reader, touch vÃ  viewport matrix theo [feature spec](../docs/feature-specification.md#7-accessibility).

## Known status/gaps

- Header/loading copy Ä‘ang nÃªu model/class/JLPT chÆ°a Ä‘Æ°á»£c repository chá»©ng minh.
- Upload chá»‰ dÃ¹ng browser hint `accept="image/*"`; khÃ´ng pháº£i content/security validation.
- Object URL chÆ°a Ä‘Æ°á»£c revoke.
- Káº¿t quáº£ cÃ³ thá»ƒ cÃ²n hiá»ƒn thá»‹ khi input thay Ä‘á»•i; behavior target TBD.
- Type `KanjiPrediction` pháº£n Ã¡nh mock phong phÃº, khÃ´ng pháº£i schema Ä‘Ã£ duyá»‡t.
- KhÃ´ng backend, model, test, CI, analytics hoáº·c telemetry.

## TÃ i liá»‡u liÃªn quan

- [Chá»‰ má»¥c](../docs/README.md)
- [PRD](../docs/prd.md) — nguồn chuẩn, được ưu tiên khi có mâu thuẫn.
- [PRD frontend](../docs/frontend-prd.md)
- [Kế hoạch triển khai frontend](../docs/frontend-implementation-plan.md)
- [Catalogue yÃªu cáº§u](../docs/requirements-analysis.md)
- [Feature specification](../docs/feature-specification.md)
