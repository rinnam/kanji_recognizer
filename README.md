# Kanji Recognizer

> Tài liệu frontend: [PRD frontend](./docs/frontend-prd.md) và [kế hoạch triển khai frontend](./docs/frontend-implementation-plan.md). [PRD sản phẩm](./docs/prd.md) luôn được ưu tiên.

> **Tráº¡ng thÃ¡i: prototype giao diá»‡n frontend dÃ¹ng dá»¯ liá»‡u mock.** Repository hiá»‡n khÃ´ng chá»©a backend, API hoáº¡t Ä‘á»™ng, mÃ´ hÃ¬nh/checkpoint, dataset/training code, dictionary service, automated test suite, CI hay analytics. Káº¿t quáº£ hiá»ƒn thá»‹ khÃ´ng pháº£i suy luáº­n tháº­t.

## Hiá»‡n cÃ³

- React 19 + TypeScript + Vite.
- Canvas logic 480Ã—480 Ä‘á»ƒ váº½ má»™t kÃ½ tá»±; chá»‰nh Ä‘á»™ dÃ y, hoÃ n tÃ¡c, xÃ³a.
- Chá»n áº£nh báº±ng click, bÃ n phÃ­m hoáº·c kÃ©o-tháº£; preview/gá»¡ áº£nh.
- UI `idle`, `loading`, `error`, `success`.
- Sáº¯p xáº¿p/chá»n á»©ng viÃªn tá»« dá»¯ liá»‡u mock cá»‘ Ä‘á»‹nh.
- Lá»‹ch sá»­ trong phiÃªn, tá»‘i Ä‘a 8 má»¥c.
- CSS responsive vÃ  cáº£i thiá»‡n thao tÃ¡c upload báº±ng bÃ n phÃ­m trong working tree hiá»‡n táº¡i.

## Giá»›i háº¡n quan trá»ng

- `mockRecognize` khÃ´ng Ä‘á»c ná»™i dung áº£nh vÃ  khÃ´ng gá»i máº¡ng; chá» khoáº£ng 1,4 giÃ¢y rá»“i tráº£ `MOCK_PREDICTIONS`.
- CÃ¡c nhÃ£n/model/class/JLPT trong UI lÃ  ná»™i dung prototype, khÃ´ng Ä‘Æ°á»£c artifact repository xÃ¡c minh.
- KhÃ´ng cÃ³ accuracy/latency/security/privacy/SLA Ä‘Ã£ Ä‘o.
- Upload chÆ°a cÃ³ validation phÃ­a server; lá»‹ch sá»­ máº¥t khi reload.
- KhÃ´ng cÃ³ automated tests hoáº·c CI trong checkout.

## Cháº¡y frontend

YÃªu cáº§u Node.js/npm tÆ°Æ¡ng thÃ­ch vá»›i dependencies trong lockfile.

```bash
cd frontend
npm install
npm run dev
```

Kiá»ƒm tra cá»¥c bá»™:

```bash
npm run build
npm run lint
```

Xem [hÆ°á»›ng dáº«n frontend](./frontend/README.md) Ä‘á»ƒ biáº¿t scripts vÃ  biÃªn tÃ­ch há»£p.

## Cáº¥u trÃºc repository Ä‘Ã£ kiá»ƒm chá»©ng

```text
kanji_recognizer/
â”œâ”€â”€ README.md
â”œâ”€â”€ docs/
â”‚   â”œâ”€â”€ README.md
â”‚   â”œâ”€â”€ prd.md
â”‚   â”œâ”€â”€ requirements-analysis.md
â”‚   â”œâ”€â”€ user-stories.md
â”‚   â”œâ”€â”€ feature-specification.md
â”‚   â””â”€â”€ product-discovery.md
â”œâ”€â”€ frontend/
â”‚   â”œâ”€â”€ public/
â”‚   â”œâ”€â”€ src/
â”‚   â”‚   â”œâ”€â”€ assets/
â”‚   â”‚   â”œâ”€â”€ components/
â”‚   â”‚   â”œâ”€â”€ api.ts
â”‚   â”‚   â”œâ”€â”€ App.tsx
â”‚   â”‚   â”œâ”€â”€ mockData.ts
â”‚   â”‚   â””â”€â”€ types.ts
â”‚   â”œâ”€â”€ package.json
â”‚   â””â”€â”€ README.md
â””â”€â”€ postman/
```

`frontend/dist` vÃ  `frontend/node_modules` cÃ³ thá»ƒ tá»“n táº¡i cá»¥c bá»™ nhÆ°ng khÃ´ng pháº£i source Ä‘Æ°á»£c mÃ´ táº£.

## TÃ i liá»‡u

Báº¯t Ä‘áº§u táº¡i [docs/README.md](./docs/README.md). [PRD](./docs/prd.md) lÃ  nguá»“n sá»± tháº­t; catalogue yÃªu cáº§u, stories, feature spec vÃ  discovery táº­p trung vÃ o má»¥c Ä‘Ã­ch riÃªng.

## Kiáº¿n trÃºc Ä‘Ã­ch Ä‘á» xuáº¥t â€” chÆ°a triá»ƒn khai

```text
Browser frontend â†’ versioned recognition API â†’ recognition component
                                      â””â”€â”€â”€â”€â”€â”€â†’ optional metadata source
```

Endpoint, model, preprocessing, class coverage, metadata source, limits, authentication, deployment vÃ  performance Ä‘á»u **TBD/Open Decision**. Há»£p Ä‘á»“ng tháº£o luáº­n náº±m táº¡i [PRD Â§10](./docs/prd.md#10-há»£p-Ä‘á»“ng-apidata-Ä‘á»-xuáº¥t--chÆ°a-triá»ƒn-khai); khÃ´ng xem Ä‘Ã³ lÃ  API Ä‘ang tá»“n táº¡i.
