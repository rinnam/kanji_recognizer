# User stories vÃ  tiÃªu chÃ­ cháº¥p nháº­n

> Persona/CUJ lÃ  táº¡m thá»i cho Ä‘áº¿n khi cÃ³ nghiÃªn cá»©u. Requirement chuáº©n náº±m trong [PRD](./prd.md#8-yÃªu-cáº§u-Æ°u-tiÃªn).

## P1 â€” NgÆ°á»i cáº§n tra kÃ½ tá»± tá»« hÃ¬nh dáº¡ng Â· CUJ-01

### US-001 â€” Váº½ má»™t kÃ½ tá»±
**LiÃªn káº¿t:** FR-001

- **Given** tab Váº½ tay Ä‘ang má»Ÿ vÃ  canvas rá»—ng, **When** ngÆ°á»i dÃ¹ng váº½ báº±ng pointer, **Then** nÃ©t xuáº¥t hiá»‡n vÃ  hÃ nh Ä‘á»™ng Nháº­n diá»‡n trá»Ÿ nÃªn kháº£ dá»¥ng.
- **Given** canvas chÆ°a cÃ³ nÃ©t, **When** ngÆ°á»i dÃ¹ng xem hÃ nh Ä‘á»™ng Nháº­n diá»‡n, **Then** hÃ nh Ä‘á»™ng bá»‹ vÃ´ hiá»‡u hÃ³a.

### US-002 â€” Sá»­a Ä‘áº§u vÃ o váº½
**LiÃªn káº¿t:** FR-002

- **Given** Ä‘Ã£ cÃ³ nhiá»u nÃ©t, **When** chá»n HoÃ n tÃ¡c, **Then** snapshot gáº§n nháº¥t bá»‹ bá» vÃ  pháº§n cÃ²n láº¡i Ä‘Æ°á»£c giá»¯.
- **Given** cÃ³ nÃ©t, **When** chá»n XÃ³a, **Then** canvas trá»Ÿ vá» giáº¥y trá»‘ng vÃ  khÃ´ng thá»ƒ gá»­i.
- **Given** thanh Ä‘á»™ dÃ y, **When** thay giÃ¡ trá»‹, **Then** nÃ©t má»›i dÃ¹ng kÃ­ch thÆ°á»›c hiá»ƒn thá»‹ trong khoáº£ng 4â€“36 px.

### US-003 â€” Nháº­n pháº£n há»“i theo tráº¡ng thÃ¡i
**LiÃªn káº¿t:** FR-004

- **Given** cÃ³ Ä‘áº§u vÃ o, **When** gá»­i, **Then** UI chuyá»ƒn sang loading vÃ  cháº·n gá»­i láº·p.
- **Given** xá»­ lÃ½ thÃ nh cÃ´ng, **When** response Ä‘Æ°á»£c nháº­n, **Then** UI chuyá»ƒn success.
- **Given** xá»­ lÃ½ nÃ©m lá»—i, **When** lá»—i Ä‘Æ°á»£c báº¯t, **Then** UI hiá»ƒn thá»‹ error vÃ  hÃ nh Ä‘á»™ng Thá»­ láº¡i.

### US-004 â€” Xem vÃ  chá»n á»©ng viÃªn
**LiÃªn káº¿t:** FR-005

- **Given** danh sÃ¡ch mock thÃ nh cÃ´ng, **When** hiá»ƒn thá»‹, **Then** á»©ng viÃªn Ä‘Æ°á»£c sort confidence giáº£m dáº§n vÃ  pháº§n tá»­ Ä‘áº§u Ä‘Æ°á»£c chá»n.
- **Given** nhiá»u á»©ng viÃªn, **When** chá»n má»™t hÃ ng khÃ¡c, **Then** tháº» chi tiáº¿t chuyá»ƒn sang á»©ng viÃªn Ä‘Ã³.
- **Current caveat:** káº¿t quáº£ lÃ  dá»¯ liá»‡u cá»‘ Ä‘á»‹nh, khÃ´ng phá»¥ thuá»™c nÃ©t váº½/áº£nh.

## P1 Â· CUJ-02 â€” áº¢nh táº£i lÃªn

### US-005 â€” Chá»n, kÃ©o-tháº£, thay hoáº·c gá»¡ áº£nh
**LiÃªn káº¿t:** FR-003

- **Given** tab Táº£i áº£nh, **When** click hoáº·c nháº¥n Enter/Space trÃªn dropzone, **Then** file picker Ä‘Æ°á»£c má»Ÿ.
- **Given** file Ä‘Æ°á»£c chá»n/drop, **When** client táº¡o object URL, **Then** preview vÃ  nÃºt gá»¡ hiá»ƒn thá»‹.
- **Given** cÃ³ preview, **When** gá»¡ áº£nh, **Then** preview vÃ  input Ä‘Æ°á»£c reset, hÃ nh Ä‘á»™ng gá»­i bá»‹ khÃ³a.
- **Unverified:** loáº¡i ná»™i dung, kÃ­ch thÆ°á»›c vÃ  áº£nh há»£p lá»‡ chÆ°a Ä‘Æ°á»£c kiá»ƒm tra thá»±c cháº¥t.

### US-006 â€” Hiá»ƒu vÃ  phá»¥c há»“i lá»—i
**LiÃªn káº¿t:** FR-004, NFR-003

- **Given** xá»­ lÃ½ tháº¥t báº¡i, **When** UI chuyá»ƒn error, **Then** cÃ³ thÃ´ng bÃ¡o vÃ  nÃºt Thá»­ láº¡i.
- **Target/Proposed:** **Given** lá»—i dá»‹ch vá»¥ cÃ³ code, **When** client nháº­n lá»—i, **Then** thÃ´ng bÃ¡o phÃ¹ há»£p, khÃ´ng rÃ² dá»¯ liá»‡u vÃ  chá»‰ retry khi `retryable=true`.

## P1 Â· CUJ-03 â€” Lá»‹ch sá»­

### US-007 â€” Xem káº¿t quáº£ gáº§n Ä‘Ã¢y trong phiÃªn
**LiÃªn káº¿t:** FR-006

- **Given** má»™t lÆ°á»£t success, **When** lá»‹ch sá»­ cáº­p nháº­t, **Then** top candidate Ä‘Æ°á»£c thÃªm Ä‘áº§u danh sÃ¡ch cÃ¹ng thumbnail/thá»i gian hiá»‡n táº¡i.
- **Given** hÆ¡n 8 lÆ°á»£t, **When** thÃªm lÆ°á»£t má»›i, **Then** chá»‰ 8 má»¥c má»›i nháº¥t cÃ²n láº¡i.
- **Given** reload trang, **When** á»©ng dá»¥ng khá»Ÿi táº¡o láº¡i, **Then** lá»‹ch sá»­ máº¥t; Ä‘Ã¢y lÃ  Current behavior, khÃ´ng pháº£i persistence.

## P2 â€” NgÆ°á»i dÃ¹ng bÃ n phÃ­m/thiáº¿t bá»‹ Ä‘a dáº¡ng

### US-008 â€” HoÃ n táº¥t báº±ng bÃ n phÃ­m vÃ  cÃ´ng nghá»‡ há»— trá»£
**LiÃªn káº¿t:** NFR-001

- **Given** chá»‰ dÃ¹ng bÃ n phÃ­m, **When** Ä‘i qua tab/upload/actions/candidates, **Then** thá»© tá»± focus, tÃªn vÃ  tráº¡ng thÃ¡i Ä‘á»u hiá»ƒu Ä‘Æ°á»£c. **Status: Unverified.**
- **Given** tráº¡ng thÃ¡i loading/error/success Ä‘á»•i, **When** dÃ¹ng screen reader, **Then** thay Ä‘á»•i quan trá»ng Ä‘Æ°á»£c thÃ´ng bÃ¡o. **Status: Proposed; live region chÆ°a Ä‘Æ°á»£c xÃ¡c minh.**
- **Given** khÃ´ng thá»ƒ váº½ canvas, **When** cáº§n nháº­p liá»‡u, **Then** upload lÃ  con Ä‘Æ°á»ng tÆ°Æ¡ng Ä‘Æ°Æ¡ng. Cháº¥t lÆ°á»£ng tÆ°Æ¡ng Ä‘Æ°Æ¡ng: TBD.

### US-009 â€” HoÃ n táº¥t trÃªn viewport há»— trá»£
**LiÃªn káº¿t:** NFR-004

- **Given** viewport/zoom trong ma tráº­n há»— trá»£ TBD, **When** hoÃ n táº¥t CUJ-01/02, **Then** khÃ´ng máº¥t ná»™i dung hoáº·c action vÃ  khÃ´ng cÃ³ scroll ngang ngoÃ i Ã½ muá»‘n. **Status: Unverified.**

## P3 â€” Ká»¹ sÆ° tÃ­ch há»£p Â· CUJ-04 (future service)

### US-010 â€” Gá»­i request tháº­t
**LiÃªn káº¿t:** FR-007, NFR-003

- **Given** contract Ä‘Æ°á»£c phÃª duyá»‡t vÃ  service sáºµn sÃ ng, **When** submit áº£nh, **Then** client gá»i endpoint cáº¥u hÃ¬nh, xá»­ lÃ½ timeout/cancel vÃ  khÃ´ng gá»i mock.
- **Given** service unavailable, **When** nháº­n lá»—i retryable, **Then** client cho phÃ©p retry an toÃ n vÃ  khÃ´ng nhÃ¢n Ä‘Ã´i side effect.

### US-011 â€” Nháº­n á»©ng viÃªn cÃ³ truy váº¿t
**LiÃªn káº¿t:** FR-008, NFR-003

- **Given** response thÃ nh cÃ´ng, **When** validate schema, **Then** cÃ³ `request_id`, `model_version`, predictions Ä‘Ãºng thá»© tá»± vÃ  field báº¯t buá»™c.
- **Given** schema sai/empty ngoÃ i contract, **When** client xá»­ lÃ½, **Then** chuyá»ƒn lá»—i cÃ³ kiá»ƒm soÃ¡t thay vÃ¬ render dá»¯ liá»‡u khÃ´ng an toÃ n.

### US-012 â€” Metadata, quyá»n riÃªng tÆ° vÃ  an toÃ n
**LiÃªn káº¿t:** FR-009, NFR-002

- **Given** metadata thiáº¿u/null theo contract, **When** render, **Then** UI dÃ¹ng fallback, khÃ´ng crash vÃ  khÃ´ng bá»‹a giÃ¡ trá»‹.
- **Given** áº£nh Ä‘Æ°á»£c gá»­i, **When** xá»­ lÃ½, **Then** retention/access/logging tuÃ¢n theo chÃ­nh sÃ¡ch Ä‘Ã£ duyá»‡t. ChÃ­nh sÃ¡ch hiá»‡n TBD.

### US-013 â€” KhÃ´ng nháº§m mock vá»›i production
**LiÃªn káº¿t:** FR-010

- **Given** app á»Ÿ mock mode, **When** ngÆ°á»i dÃ¹ng xem káº¿t quáº£, **Then** nhÃ£n demo hiá»ƒn thá»‹ rÃµ.
- **Given** build production, **When** cáº¥u hÃ¬nh váº«n trá» mock, **Then** launch gate/build check pháº£i tháº¥t báº¡i. CÆ¡ cháº¿: Proposed.

Phạm vi UX frontend được tổng hợp tại [PRD frontend](./frontend-prd.md); thứ tự thực hiện nằm trong [kế hoạch frontend](./frontend-implementation-plan.md). Các story và PRD sản phẩm vẫn là nguồn chuẩn.
