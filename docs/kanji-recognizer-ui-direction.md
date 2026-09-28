# Kanji Recognizer UI Direction â€” **Ink Desk**

> **Status:** Target/Proposed design specification; not evidence of implemented behavior.
> **Scope:** Documentation-only UI direction. This file does not approve open product, API, model, accessibility-target, privacy, or launch decisions.
> **Canonical requirements:** [`prd.md`](./prd.md), especially Â§Â§3, 8â€“11 and Â§18. Learning-screen instructions live in the [Learning Experience UI Skill](./skills/learning-experience-ui-skill.md). Where this document conflicts with the PRD, the PRD wins.

## 1. Purpose and provenance

This document proposes an original interface variant for the Kanji Recognizer. It is grounded in the local product documents and current React prototype, informed by two design/PRD skills, and selectively inspired by KotoBase's public source and preview material.

### Sources reviewed

#### Local sources

- [`README.md`](./README.md), [`prd.md`](./prd.md), [`frontend-prd.md`](./frontend-prd.md), [`feature-specification.md`](./feature-specification.md), [`frontend-implementation-plan.md`](./frontend-implementation-plan.md), [`ui-flow-design.md`](./ui-flow-design.md), [`user-stories.md`](./user-stories.md), [`requirements-analysis.md`](./requirements-analysis.md), [`product-discovery.md`](./product-discovery.md), the documentation audit, and the reference-implementation analysis.
- Current authored frontend under `frontend/src/**`, including `App.tsx`, `App.css`, `index.css`, `InputPanel.tsx`, `DrawCanvas.tsx`, `ResultPanel.tsx`, `api.ts`, `mockData.ts`, and `types.ts`.

#### External sources

- [Anthropic frontend-design skill](https://github.com/anthropics/claude-code/blob/main/plugins/frontend-design/skills/frontend-design/SKILL.md)
- [prd-skill repository](https://github.com/carollrollroll/prd-skill), particularly [prd-write](https://github.com/carollrollroll/prd-skill/blob/main/skills/prd-write/SKILL.md) and [prd-review](https://github.com/carollrollroll/prd-skill/blob/main/skills/prd-review/SKILL.md)
- [KotoBase repository](https://github.com/Vcoch27/kotobase), including [DESIGN.md](https://github.com/Vcoch27/kotobase/blob/main/DESIGN.md), [README.md](https://github.com/Vcoch27/kotobase/blob/main/README.md), [KanjiPageClient](https://github.com/Vcoch27/kotobase/blob/main/src/components/KanjiPageClient.tsx), [KanjiDictionaryView](https://github.com/Vcoch27/kotobase/blob/main/src/components/KanjiDictionaryView.tsx), [KanjiLookupResults](https://github.com/Vcoch27/kotobase/blob/main/src/components/KanjiLookupResults.tsx), [MobileBottomNav](https://github.com/Vcoch27/kotobase/blob/main/src/components/MobileBottomNav.tsx), [global styles](https://github.com/Vcoch27/kotobase/blob/main/src/app/globals.css), and its [study-theme previews](https://github.com/Vcoch27/kotobase/tree/main/docs/previews/study-theme).

### Inspiration versus this new variant

| Useful lesson from KotoBase | Transformation for Ink Desk | Explicitly not copied |
|---|---|---|
| Japanese-learning content is made scannable through prominent kanji, readings, meanings, metadata, and related vocabulary. | Recognition remains the single primary task; candidate evidence is progressively disclosed around one confirmed character. | KotoBase's dashboard, folder tree, study modes, data model, exact detail modal, and page chrome. |
| Search/results use clear loading, saved, empty, and detail states. | The recognition state machine is visible in-place and recovery stays adjacent to the input. | Search-driven dictionary behavior, save-to-library actions, and toast wording. |
| Mobile navigation accounts for safe areas and the virtual keyboard. | A compact mobile action dock respects safe areas and disappears when unnecessary; no app-wide bottom navigation is introduced. | KotoBase's six-item bottom navigation and icon/color assignments. |
| A Japanese-study visual system uses a serif face for characters and a restrained UI face for controls. | Ink Desk uses a paper-and-graphite editorial workspace with vermilion proof marks and indigo status cues. | KotoBase's amber/blue palette, exact OKLCH values, shadows, radii, study artwork, and token names. |
| Public previews demonstrate responsive study cards and dark-mode treatment. | Recognition panels recompose by task priority rather than preserving card geometry. | Preview compositions, frog/sakura artwork, flashcard aspect ratios, and decorative backgrounds. |

The result is not a KotoBase skin. KotoBase is a broad study and knowledge-management product; Ink Desk is a focused recognition workbench.

## 2. Product and design goals

1. **Complete one lookup without ambiguity.** Help a person draw or upload one character, submit it, inspect ranked candidates, and confirm the best match (`CUJ-01`, `CUJ-02`; `FR-001..FR-005`).
2. **Make system truth visible.** The current fixture must read as a demo (`FR-010`); confidence is model likelihood, not correctness, and its semantics remain TBD for a real service.
3. **Make correction cheaper than restarting.** Undo, clear, replace, remove, retry, and candidate selection remain close to the object they affect (`US-002`, `US-005`, `US-006`).
4. **Treat access paths as first-class.** Upload is an equivalent route when drawing is unavailable; keyboard, touch, zoom, focus, and announcements are designed in rather than appended (`NFR-001`, `NFR-004`; `US-008`, `US-009`).
5. **Hand off recognition into the bounded learning system.** Keep lookup primary on this workbench, then offer a truthful save path for the confirmed candidate. Library, flashcard, quiz, SRS/review and progress behavior is canonical in [`prd.md` Â§18](./prd.md#18-learning-system--targetproposed-bounded) and operationalized by the [Learning Experience UI Skill](./skills/learning-experience-ui-skill.md); all remain Target/Proposed until implementation evidence exists.
6. **Preserve implementation seams.** Reframe existing `InputPanel`, `DrawCanvas`, `ResultPanel`, state, and history rather than coupling components to an unapproved transport contract.

### Design success signals

The canonical NSM, baseline, target, owner, and measurement window remain **TBD/Open Decision** in the PRD. For concept testing, collect non-canonical diagnostic evidence only: task completion, time to valid submission, wrong-mode submissions, recovery success, candidate-selection comprehension, keyboard completion, and qualitative confidence. Do not silently promote these to product targets.

## 3. Target users and tasks

### Primary: shape-first lookup user (`PER-1`, Unverified)

- Has a visible character but cannot type or name it.
- Needs to draw a single kanji or upload a clear image.
- Wants a ranked answer, reading, and meaning quickly.
- Must understand when output is illustrative rather than recognized from their input.

### Access modality: keyboard/touch/assistive-technology user (`PER-2`, Unverified)

- Needs every essential action without a mouse.
- May be unable to draw accurately and therefore uses upload.
- Needs focus order, selected-state semantics, target sizes, non-color cues, and live status updates.

### Core tasks

1. Choose **Draw** or **Upload**.
2. Create, correct, or replace one input.
3. Submit only when the active input is ready.
4. Wait without accidentally submitting twice.
5. Recover from a validation or service error.
6. Compare ranked candidates and select one.
7. Read available character details.
8. Review recent successful results in the current session (`FR-006`) without assuming persistence.

## 4. Design principles learned from the two skills

### From frontend-design

- **Start with the subject's characteristic interaction.** The opening visual is a live ink workspace, not a generic marketing hero.
- **Use deliberate typography and content.** Kanji is an active visual object; interface prose is plain Vietnamese, short, and task-oriented.
- **Make structure carry meaning.** Sequence markers appear only for the actual three-step task; dividers, rank, and selection marks communicate state rather than decorate cards.
- **Choose a specific aesthetic.** Paper, graphite, registration-grid lines, and vermilion editorial marks arise from handwriting and character studyâ€”not from generic gradient-card conventions.
- **Use motion only to explain change.** Ink follows the pointer, the selected candidate's detail swaps, and status transitions announce; there is no cascade of decorative entrances.
- **Avoid template tells.** No oversized slogan-first hero, glass-card stack, arbitrary pill overload, single highlighted headline word, all-caps labels, or decorative numbering.

### From prd-skill

- **Why/Who â†’ What/If â†’ How/Next.** Keep user problem and evidence ahead of visual polish; map every recommendation to a requirement, state, or open decision.
- **Human anchors and phase gates matter.** Personas, metric targets, API/model choices, privacy, and launch gates remain unverified or open until explicitly approved.
- **Logic before polish.** Resolve contradictory states, missing-input behavior, stale-result policy, retryability, and tab lifecycle before visual refinement.
- **Make alternatives and trade-offs explicit.** Mode switching, result persistence, metadata density, and responsive composition are named decisions, not hidden assumptions.
- **Acceptance criteria must be verifiable.** Component states below use observable entry, display, action, and exit behavior.
- **Respect PMâ€“engineering boundaries.** This document specifies experience, state, content, and component contractsâ€”not API implementation or model architecture.

## 5. Information architecture

This document scopes Ink Desk's **recognition workbench** as one task page. The wider Target/Proposed learning application and its navigation are defined in [PRD Â§18](./prd.md#18-learning-system--targetproposed-bounded) and the [Learning Experience UI Skill](./skills/learning-experience-ui-skill.md); they do not become Current merely by being documented.

```text
Recognition workbench
â”œâ”€â”€ Context bar
â”‚   â”œâ”€â”€ Product identity
â”‚   â””â”€â”€ Honest environment/demo status
â”œâ”€â”€ Task introduction
â”‚   â”œâ”€â”€ One-sentence job
â”‚   â””â”€â”€ Real sequence: Input â†’ Recognize â†’ Confirm
â”œâ”€â”€ Active workspace
â”‚   â”œâ”€â”€ Input mode switcher
â”‚   â”œâ”€â”€ Draw surface OR upload surface
â”‚   â”œâ”€â”€ Input controls and readiness
â”‚   â””â”€â”€ Primary recognition action
â”œâ”€â”€ Result workspace
â”‚   â”œâ”€â”€ Idle guidance / loading / error / success
â”‚   â”œâ”€â”€ Candidate rail
â”‚   â””â”€â”€ Selected-candidate detail
â”œâ”€â”€ Session history
â””â”€â”€ Data/source note
```

**Recognition-page navigation boundary:** do not crowd the workbench with deck management, study modes, progress, authentication, advertisements or model settings. When the learning shell is implemented, it owns Library, Practice, Review and Progress navigation as specified by the UI skill; account and backend-dependent controls remain blocked until approved.

## 6. Page and screen structure

### 6.1 Context bar

- Left: ink-mark symbol + **Kanji Recognizer**.
- Supporting line on wide screens: **Nháº­n diá»‡n má»™t kÃ½ tá»± tá»« nÃ©t váº½ hoáº·c áº£nh**.
- Right: persistent status tag. Current prototype: **Báº£n demo Â· káº¿t quáº£ minh há»a**. A real-service label is allowed only after `FR-007/008/010` gates pass.
- No unrelated navigation. Keep the primary task dominant.

### 6.2 Task introduction

A compact editorial heading, not a tall hero:

- H1: **Báº¡n Ä‘ang nhÃ¬n tháº¥y chá»¯ nÃ o?**
- Body: **Váº½ má»™t chá»¯ hoáº·c táº£i áº£nh rÃµ nÃ©t. ChÃºng tÃ´i sáº½ xáº¿p háº¡ng cÃ¡c kháº£ nÄƒng Ä‘á»ƒ báº¡n xÃ¡c nháº­n.**
- Three factual steps: **1 Nháº­p kÃ½ tá»± â†’ 2 Nháº­n diá»‡n â†’ 3 Chá»n káº¿t quáº£**.
- On returning sessions, this block may collapse to a single line after the first successful lookup; no persistence is implied.

### 6.3 Active workspace

#### Desktop, â‰¥1024 px

A 12-column composition inside a maximum 1280 px content width:

- Input: columns 1â€“6.
- Results: columns 7â€“12.
- Both begin on the same baseline. Input remains visible while candidates are compared.
- Session history spans the content width below; do not introduce a permanent third sidebar.

#### Tablet, 768â€“1023 px

- Input and results stack in task order.
- During success, a compact candidate rail sits above details; input collapses to a summary row with **Sá»­a Ä‘áº§u vÃ o**.
- Primary action remains visible at the end of the active input panel, not fixed over content.

#### Mobile, <768 px

- Single column with 16 px edge padding.
- Header supporting text disappears, but demo status stays visible.
- The active input surface appears first; results replace guidance immediately beneath it.
- When input is valid, a safe-area-aware action dock may pin **Nháº­n diá»‡n kÃ½ tá»±** to the bottom. It must not cover canvas controls, validation, or keyboard content, and should unpin when the result is in view.
- Candidate list uses horizontal snap only if every candidate remains reachable by keyboard and screen reader; otherwise use a vertical list.

### 6.4 Session history

- Titled **Gáº§n Ä‘Ã¢y trong phiÃªn nÃ y** to encode volatility (`FR-006`, `US-007`).
- Newest first, maximum eight.
- Item: thumbnail/character, primary meaning if available, confidence label, local time.
- Selecting an item may restore its displayed result only after stale-input behavior is approved. Until then, history is read-only.

## 7. Detailed component inventory and states

### 7.1 `AppFrame`

**Responsibility:** page landmarks, max width, environment truth, and responsive composition.
**States:** demo, proposed-live, offline/service-unavailable.
**Current mapping:** replaces the visual structure inside `App.tsx`; preserves its recognition and history state boundary.
**Requirement mapping:** `FR-004`, `FR-010`, `NFR-004`.

### 7.2 `EnvironmentBadge`

- **Demo:** neutral paper tag + flask icon + **Káº¿t quáº£ minh há»a**.
- **Live:** only after approved integration; text must name behavior accurately.
- **Degraded:** warning icon + **Dá»‹ch vá»¥ táº¡m giÃ¡n Ä‘oáº¡n**; never rely on amber/red alone.
- Must be text-visible at all viewport sizes and not masquerade as a control.

### 7.3 `TaskSteps`

- Exactly three steps because the content is a real sequence.
- States: upcoming, current, completed.
- Current step uses shape + text + color; completed uses a check.
- On mobile, use a compact sentence rather than three cramped cards.

### 7.4 `InputModeTabs`

**Modes:** `draw`, `upload`, matching `InputTab` in `types.ts`.
**States:** default, hover, focus-visible, selected, disabled-during-submit.
**Behavior:** proper tablist keyboard behavior: Arrow keys move tabs; selected tab controls a named tabpanel.
**Open decision:** preserve or clear inactive input. Current canvas unmounts and loses drawing while upload may remain. The UI must not imply preservation until policy is approved and tested.

### 7.5 `DrawWorkspace`

Contains `DrawCanvas`, brush control, undo, and clear.

- **Empty:** faint registration grid, central prompt **Váº½ má»™t chá»¯ trong khung**, submit disabled.
- **Drawing:** live ink; prompt disappears; readiness text **ÄÃ£ cÃ³ nÃ©t váº½**.
- **Ready:** undo/clear available according to actual history; submit enabled.
- **Undoing:** immediate visual rollback with state synchronized to canvas.
- **Cleared:** empty state restored and submit disabled.
- **Pointer unavailable:** upload alternative is directly linked.

**Current mapping:** `DrawCanvas.tsx` uses a 480Ã—480 logical surface, 4â€“36 px brush, up to 30 snapshots. Preserve the useful square workspace and brush range. Correct the documented undo/`hasInk` inconsistency before claiming the target state (`FR-002`, `US-002`).

**Canvas presentation:** warm-white drawing sheet, subtle crosshair/grid, graphite ink. The grid is decorative and hidden from assistive technology. Canvas needs an accessible name and instructions; upload remains the equivalent non-drawing path.

### 7.6 `BrushControl`

- Label: **Äá»™ dÃ y nÃ©t**; value is visible, e.g. **18 px**.
- Slider plus three visual stroke samples (thin/current/thick), with no semantic dependence on samples.
- States: enabled, focus-visible, disabled during loading.
- Minimum touch target 44Ã—44 px around the thumb/control affordance.

### 7.7 `CanvasActions`

- **HoÃ n tÃ¡c:** disabled when no confirmed prior stroke exists.
- **XÃ³a háº¿t:** destructive-secondary; requires no confirmation because it is reversible only if explicitly supportedâ€”otherwise use a short inline undo opportunity.
- Icon plus text on desktop; icon plus accessible name on narrow mobile only when space is genuinely constrained.

### 7.8 `UploadWorkspace`

- **Empty:** button-like drop area, image icon, **Chá»n áº£nh kÃ½ tá»±**, secondary **hoáº·c kÃ©o tháº£ vÃ o Ä‘Ã¢y**.
- **Drag active:** emphasized outline and **Tháº£ áº£nh Ä‘á»ƒ xem trÆ°á»›c**.
- **Preview:** contained image, filename if safe, **Thay áº£nh**, **Gá»¡ áº£nh**.
- **Invalid type/size/content:** inline error adjacent to chooser; specific corrective action.
- **Ready:** submit enabled.

**Current mapping:** retains click, Enter/Space, and drop behavior from `InputPanel.tsx`. Target must reset preview, `fileObj`, object URL, and native file-input value so selecting the same file again works (`FR-003`, `US-005`). Browser `accept="image/*"` is guidance, not security validation (`NFR-002`). Size/MIME limits remain TBD.

### 7.9 `RecognitionAction`

- Label: **Nháº­n diá»‡n kÃ½ tá»±**.
- Empty: disabled with nearby reason **HÃ£y váº½ hoáº·c chá»n má»™t áº£nh trÆ°á»›c**.
- Ready: primary vermilion action.
- Loading: disabled, progress indicator, **Äang phÃ¢n tÃ­châ€¦**.
- Error retryable: **Thá»­ láº¡i**.
- Error not retryable: directs user to fix/replace input; no misleading retry.
- Prevent repeated submit while loading (`FR-004`, `US-003`).

### 7.10 `ResultStage`

A stable region whose heading remains **Káº¿t quáº£ nháº­n diá»‡n** through all states. The container should not disappear or cause large layout jumps.

#### Idle

- Character watermark **èª** or a simple crop-mark motif, decorative only.
- Text: **Káº¿t quáº£ sáº½ xuáº¥t hiá»‡n á»Ÿ Ä‘Ã¢y**.
- Three brief input tips; no fake output.

#### Loading

- Preserve panel dimensions.
- Show an ink-line progress motif and text, not a fake percentage.
- `role="status"`/live announcement: **Äang nháº­n diá»‡n kÃ½ tá»±.**
- Existing input stays visible; controls that could invalidate the request follow the approved cancel/stale policy.

#### Error

- Error summary receives focus or is announced without unexpectedly moving focus.
- Safe message, corrective instruction, and one primary recovery action.
- Technical error code may be available in a disclosure for support only after contract approval; never expose internals by default.

#### Success

- Demo truth note appears before candidates in current mode.
- Candidate rail + selected detail.
- Announce count and selected top candidate: **ÄÃ£ tÃ¬m tháº¥y 5 kháº£ nÄƒng. Káº¿t quáº£ Ä‘áº§u tiÃªn lÃ  å­¦.**
- Metadata absence degrades field by field, never blanking the entire result (`FR-009`).

**Current mapping:** these are the existing `RecognizeStatus = idle | loading | success | error` states in `types.ts` and `ResultPanel.tsx`, refined for semantics and continuity.

### 7.11 `CandidateList`

- Ordered list because rank has meaning.
- Each option contains rank, large kanji, primary meaning/reading when available, and confidence label.
- Selected state uses a vermilion proof mark, tinted surface, `aria-selected` (within an appropriate selection pattern), and a visible text cue **Äang xem**.
- Keyboard: Up/Down moves; Enter/Space selects; focus is never indicated by color alone.
- Confidence wording: **Äá»™ tin cáº­y mÃ´ hÃ¬nh 91%** only if the service contract defines `[0,1]` probability semantics. Until then use **Äiá»ƒm mÃ´ hÃ¬nh** or the approved label. Do not call it â€œÄ‘á»™ chÃ­nh xÃ¡c.â€
- Do not assign JLPT colors by rank unless metadata source, semantics, and contrast are approved.

### 7.12 `CharacterDetail`

Priority order:

1. Character + primary Vietnamese meaning.
2. On/Kun readings.
3. HÃ¡nâ€“Viá»‡t and example.
4. Optional metadata: JLPT, stroke count, radical, frequency, tags, English meaning, description.

States:

- **Complete:** all approved fields.
- **Partial:** omit unavailable groups; use **ChÆ°a cÃ³ dá»¯ liá»‡u** only where absence matters.
- **Changing selection:** swap content without page scroll reset; heading identifies the new character.
- **Source unavailable:** keep recognition candidate visible and show metadata-specific error.

**Current mapping:** reorganizes fields already present in `KanjiPrediction`/`mockData.ts`; it does not validate their source or make them canonical.

### 7.13 `SessionHistory`

- Empty, populated (1â€“8), and session-reset states.
- Empty copy: **CÃ¡c káº¿t quáº£ thÃ nh cÃ´ng trong láº§n má»Ÿ nÃ y sáº½ xuáº¥t hiá»‡n á»Ÿ Ä‘Ã¢y.**
- No account/sync/save affordance.
- History only updates after success and uses the top candidate, matching current `App.tsx`; candidate-confirmed history is a future product decision.

### 7.14 `InlineNotice`

Variants: information, warning, error, success. Every variant has icon, heading/text, and optional action. Use for demo disclosure, upload validation, service status, and metadata gaps. Toasts are not used for critical recognition state because they expire and separate cause from recovery.

## 8. Responsive behavior

| Concern | Desktop | Tablet | Mobile |
|---|---|---|---|
| Task layout | Input/results side by side | Stacked; input summary after submit | Single task stream |
| Drawing surface | Up to 520 px, square | Up to available width, square | Full container width, square; never wider than viewport |
| Candidate list | Vertical rail beside detail | Compact row above detail or vertical | Vertical preferred; horizontal only with equivalent access |
| Primary action | End of input panel | End of panel | Optional safe-area dock while input is ready |
| History | Full-width row/list below | Full-width list | Compact vertical list |
| Header | Brand + descriptor + status | Brand + status | Compact brand + status |
| Metadata | Two-column groups | Two columns where space permits | One column; optional groups collapsed |

### Responsive invariants

- No horizontal page scroll at approved viewport/zoom combinations (`US-009`; matrix remains TBD).
- Canvas coordinates remain correct after CSS resize and device-pixel-ratio changes.
- Minimum target 44Ã—44 px; 8 px minimum separation for adjacent destructive actions.
- Content remains operable at 200% zoom; text does not clip at browser text enlargement.
- Orientation changes retain active input only if the approved lifecycle supports it.
- Mobile fixed actions include `env(safe-area-inset-bottom)` and never obscure errors or file controls.
- Virtual-keyboard behavior is tested for file chooser and any future text alternative; unlike KotoBase, no persistent app navigation needs keyboard-aware hiding.

## 9. Visual direction and tokens

### Concept: Ink Desk

A contemporary editorial proofing table: warm fiber paper, graphite writing, indigo annotations, and a restrained vermilion stamp showing selection and action. It should feel precise and tactile without imitating calligraphy software or a themed Japanese souvenir.

### Color tokens

| Token | Value | Use |
|---|---:|---|
| `paper-0` | `#FCFAF5` | Page background |
| `paper-1` | `#F4EFE5` | Recessed surfaces, empty canvas grid |
| `ink-900` | `#1E2327` | Primary text and drawn ink |
| `ink-600` | `#586066` | Secondary text |
| `indigo-700` | `#263B59` | Informational state, links, focus support |
| `vermilion-600` | `#C6402D` | Primary action and selected proof mark |
| `moss-700` | `#3F684F` | Success, always paired with text/icon |
| `error-700` | `#A52D2D` | Error, always paired with text/icon |
| `line-300` | `#D8D0C3` | Functional separators and canvas grid |
| `focus` | `#176B87` | 3 px focus ring with 2 px paper offset |

These values are proposed and require contrast verification in actual font/size combinations. Dark mode is not required by the local PRD; do not add it at the cost of core task quality. If later approved, derive a separate ink-at-night system rather than inverting these colors.

### Typography

- **Character/display:** `Noto Serif JP` or an approved Japanese serif with full glyph coverage.
- **UI/body:** `IBM Plex Sans` or an approved humanist sans with Vietnamese coverage.
- Fall back to platform Japanese and sans-serif stacks without breaking layout.
- H1: 40/44 desktop, 30/36 mobile; restrained, one line where possible.
- Kanji result: 88â€“112 px desktop, 72â€“88 px mobile.
- Body: 16/26; supporting: 14/21; never below 12 px.
- Prose measure: 60â€“72 characters. No forced uppercase UI labels.

### Spacing, shape, elevation

- Base spacing: 4 px; primary rhythm: 8, 12, 16, 24, 32, 48, 64.
- Radius: 6 px controls, 10 px panels, 14 px primary workspace. Avoid universal pill shapes.
- Use 1 px lines where they encode input bounds, rank, or grouping; use subtle tonal separation elsewhere.
- One low paper shadow for floating mobile action only. Avoid stacked card shadows.

### Iconography and imagery

- Simple 1.75 px line icons; text remains on consequential controls.
- No flags, torii, sakura, mascots, or brush-stroke decoration unless user research justifies them.
- The only dominant image is the person's input or recognized character.

### Motion

- 120â€“180 ms for direct state feedback; selected-detail crossfade â‰¤160 ms.
- No autonomous looping animation except an essential loading indicator.
- Honor `prefers-reduced-motion`; status must remain understandable without motion.

## 10. Key user flows

### Flow A â€” Draw and confirm (`CUJ-01`)

1. Page opens in Draw/Empty; focus starts at H1, then mode tabs and canvas instructions.
2. User draws. Readiness changes and submit enables.
3. User adjusts brush or undoes/clears; canvas and `hasInk` remain synchronized.
4. User submits. Action locks; ResultStage announces loading.
5. Success: demo disclosure (current), ranked candidates, top candidate selected.
6. User compares and selects another candidate; detail updates in place.
7. Successful top result is added to session history according to current behavior.

### Flow B â€” Upload and confirm (`CUJ-02`)

1. User selects Upload via pointer or keyboard.
2. User chooses or drops an image.
3. Client presents preview and performs approved presence/type/size guidance; service still owns authoritative content validation.
4. User replaces/removes as needed; removing resets all file state.
5. Submit follows the same recognition state machine as Flow A.

### Flow C â€” Recover from error (`US-006`)

1. ResultStage announces a safe, specific error.
2. If retryable, **Thá»­ láº¡i** resubmits the same normalized input.
3. If not retryable, primary action points to **Chá»n áº£nh khÃ¡c** or **Sá»­a nÃ©t váº½**.
4. Error clears when input materially changes; stale error/result policy is made explicit.
5. Timeout/rate-limit/auth/unknown handling follows the eventual approved taxonomy, not ad hoc strings.

### Flow D â€” Keyboard-only completion (`US-008`)

1. Tab to mode tablist; Arrow keys switch mode.
2. Choose Upload with Enter/Space.
3. Select a file, submit, hear loading and result count.
4. Move through candidate options and select one.
5. Read details in logical DOM order; retry or start another lookup without a focus trap.

## 11. Accessibility requirements

`NFR-001` is currently **Unverified**; these are target acceptance expectations, not a claim of compliance.

- Landmarks: header, main, named input region, named result region, and history region.
- One H1; headings descend logically.
- Tabs expose selected state, owned tabpanel, and full keyboard pattern.
- Upload dropzone is a native button/label pattern where possible; drag-and-drop is optional enhancement.
- Canvas has an accessible name, concise instructions, and an adjacent equivalent upload route.
- Dynamic `loading`, `error`, and `success` messages use appropriately scoped live regions; avoid repeating every progress frame.
- Candidate selection exposes rank and selected state; DOM order follows visual order.
- Focus-visible is always present. On error, announce summary and keep recovery predictable. On success, announce summary without stealing focus from the submit button unless usability testing supports it.
- Color is never the only signal. Icons are decorative when adjacent text already names the state.
- Validate text/UI contrast to WCAG 2.2 AA once the canonical standard is approved; large kanji must also remain legible under high contrast/forced colors.
- Support reduced motion, text enlargement, 200% zoom, touch targets, and screen-reader review in the approved matrix.
- Images have purposeful alternative text; a history thumbnail alt describes its role without duplicating adjacent character text.
- Vietnamese/Japanese spans use correct `lang` values for pronunciation.

## 12. Empty, loading, error, and success state matrix

| Area | Empty | Loading | Error | Success |
|---|---|---|---|---|
| Draw | Prompt + disabled submit | Input visible; edit policy follows request decision | Canvas-local initialization error offers Upload | Ink ready for submission |
| Upload | Choose/drop guidance | File processing guidance only when real | Type/size/content message + correction | Preview + replace/remove |
| Recognition | Honest instruction | Indeterminate progress + locked duplicate submit | Safe message + retry/fix action | Candidate count + selected detail |
| Metadata | Hidden until candidate | Detail skeleton only if fetched separately | Preserve candidate; metadata-specific notice | Available fields, missing fields tolerated |
| History | Session explanation | No loading in current local state | No persistence error because persistence is absent | Newest-first, max eight |

### Edge conditions

- **Zero candidates:** treat as a recoverable no-match outcome, not a generic crash: **ChÆ°a tÃ¬m tháº¥y káº¿t quáº£ phÃ¹ há»£p. HÃ£y viáº¿t lá»›n hÆ¡n hoáº·c dÃ¹ng áº£nh rÃµ hÆ¡n.**
- **Malformed response:** generic safe error; do not partially trust unknown fields.
- **Input changed after success:** visibly mark result **Tá»« Ä‘áº§u vÃ o trÆ°á»›c** or clear it, based on the unresolved stale-result policy.
- **Late response after mode/input change:** ignore or cancel according to approved concurrency policy.
- **Offline:** if detection requires a service, explain that recognition is unavailable; never fabricate a result.
- **Demo:** fixture disclosure remains adjacent to results on every success, not only in the header.

## 13. Content and microcopy guidance

### Voice

Calm, precise, encouraging, and honest. Address the person's task, not the model architecture. Use familiar Vietnamese first; show Japanese where it is the content being learned.

### Preferred patterns

| Purpose | Recommended copy | Avoid |
|---|---|---|
| Primary action | **Nháº­n diá»‡n kÃ½ tá»±** | â€œRun inferenceâ€ |
| Empty draw | **Váº½ má»™t chá»¯ trong khung** | â€œInput canvasâ€ |
| Empty upload | **Chá»n áº£nh kÃ½ tá»±** | â€œUpload fileâ€ alone |
| Loading | **Äang phÃ¢n tÃ­ch nÃ©t vÃ  hÃ¬nh dáº¡ngâ€¦** | Fake percentages |
| Demo disclosure | **ÄÃ¢y lÃ  báº£n demo. Káº¿t quáº£ hiá»‡n táº¡i lÃ  dá»¯ liá»‡u minh há»a vÃ  chÆ°a Ä‘Æ°á»£c táº¡o tá»« áº£nh cá»§a báº¡n.** | Claims about an unverified model |
| No match | **ChÆ°a tÃ¬m tháº¥y káº¿t quáº£ phÃ¹ há»£p. HÃ£y viáº¿t lá»›n hÆ¡n hoáº·c dÃ¹ng áº£nh rÃµ hÆ¡n.** | â€œUnknown errorâ€ |
| Retryable error | **ChÆ°a thá»ƒ nháº­n diá»‡n lÃºc nÃ y. Äáº§u vÃ o cá»§a báº¡n váº«n Ä‘Æ°á»£c giá»¯.** | Blaming the user |
| Session history | **Gáº§n Ä‘Ã¢y trong phiÃªn nÃ y** | â€œSaved historyâ€ |
| Confidence | **Äiá»ƒm mÃ´ hÃ¬nh** until semantics are approved | â€œÄá»™ chÃ­nh xÃ¡câ€ |

- Buttons use verbs; headings name the object/state.
- Error messages answer: what happened, whether input was kept, and what to do next.
- Do not use emoji as the sole iconography or status signal.
- Avoid technical identifiers, stack traces, model names, latency promises, dataset/class/JLPT claims, or privacy assurances without approved evidence.

## 14. Explicit mapping to local PRD and existing frontend

| Recommendation | PRD/story link | Current frontend evidence | Direction/gap |
|---|---|---|---|
| Square live drawing workspace | `FR-001`, `US-001` | `DrawCanvas.tsx` 480Ã—480 pointer canvas | Retain; add instruction and access semantics. |
| Brush, undo, clear | `FR-002`, `US-002` | `InputPanel.tsx`, snapshot history in `DrawCanvas.tsx` | Retain controls; fix one-stroke undo and `hasInk` sync before target claim. |
| Draw/upload modes | `FR-003`, `CUJ-01/02` | `InputTab`, conditional `InputPanel` rendering | Retain; make tab semantics complete and decide inactive-input lifecycle. |
| Keyboard/drop upload | `FR-003`, `US-005`, `US-008` | Click/drop/Enter/Space already present | Retain; normalize native semantics and full reset. |
| Four-state result stage | `FR-004`, `US-003/006` | `RecognizeStatus`, `ResultPanel.tsx` branches | Retain state model; stabilize layout and add live announcements/focus policy. |
| Ranked selectable candidates | `FR-005`, `US-004` | Sorted by `confidence`; `selected` index | Retain; express ordered/selectable semantics and avoid unapproved accuracy wording. |
| Session-only history | `FR-006`, `US-007` | `App.tsx` prepends/slices eight | Keep read-only and label volatility; no persistence. |
| Honest demo label | `FR-010`, `US-013` | Header chip and `MOCK_MESSAGE` | Strengthen near result; remove any unsupported model claim. |
| Input/result adapter seam | `FR-007..009`, frontend feature spec | `mockRecognize`, component-facing `KanjiPrediction` | Visual design remains transport-neutral; blocked fields stay optional. |
| Responsive recomposition | `NFR-004`, `US-009` | Existing CSS breakpoints, unverified matrix | Specify invariants; validate only after matrix approval. |
| Accessible status/candidates/input | `NFR-001`, `US-008` | Partial ARIA on tabs/upload; no verified audit | Target behavior only; audit and evidence required. |
| Privacy-safe upload copy | `NFR-002` | Object URL/client state; no approved service | Do not promise retention/deletion; limits and policy remain open. |

### Recommended component boundary evolution (descriptive, not implementation code)

- `App.tsx` remains the orchestration owner for input mode, readiness, request status, selected candidate, and session history.
- `InputPanel.tsx` becomes the visual **InputWorkspace**, preserving draw/upload subpanels and emitting normalized readiness/change events.
- `DrawCanvas.tsx` remains isolated drawing logic; its public state must reflect actual visible ink.
- `ResultPanel.tsx` becomes **ResultStage**, with state-specific children and one accessible region.
- Candidate list and character detail should be separable presentation components so absent metadata and selection states are testable independently.
- No component should directly adopt an unapproved transport DTO; continue the adapter boundary described in `feature-specification.md`.

## 15. Boundaries and non-goals

This direction does **not**:

- implement or modify frontend code;
- approve a backend endpoint, model, dataset, checkpoint, class count, confidence semantics, quality target, latency SLO, or metadata source;
- claim that KotoBase behavior or the Kanji_Smart reference is Current for this project;
- duplicate or redefine the library, deck, flashcard, quiz, SRS/review or progress rules owned by [PRD Â§18](./prd.md#18-learning-system--targetproposed-bounded) and the [Learning Experience UI Skill](./skills/learning-experience-ui-skill.md);
- treat accounts, cloud sync, persistence, analytics or any learning backend as Current before implementation evidence; exports, sharing, lesson progression and pronunciation/TTS remain outside the bounded learning scope;
- add advertisements or ad-management behavior;
- define analytics collection before consent, taxonomy, retention, and privacy review;
- make dark mode a release requirement;
- replace upload with canvas-only interaction;
- treat browser file filters as security validation;
- promise device/browser/accessibility conformance before the support matrix and standard are approved;
- copy KotoBase's page shell, mobile navigation, exact tokens, artwork, cards, or dictionary workflows.

## 16. Handoff checklist

### Product and evidence

- [ ] PRD remains canonical; this file is linked as Target/Proposed only.
- [ ] Persona and CUJ assumptions are validated or still labeled Unverified.
- [ ] Demo versus live behavior is approved and testable (`FR-010`).
- [ ] Inactive-tab input and stale-result policies are decided.
- [ ] Confidence label/semantics, metadata source/nullability, and zero-candidate behavior are approved.
- [ ] File limits, privacy, retention, timeout, retry, and error taxonomy are approved before live integration.

### UX and content

- [ ] Wireframes cover Draw/Upload Ã— Empty/Ready and Result Ã— Idle/Loading/Error/Success.
- [ ] Every error has a corrective action; retry only appears when retryable.
- [ ] Demo disclosure is visible in header and successful result context.
- [ ] Session history is labeled non-persistent.
- [ ] Vietnamese copy is reviewed; Japanese glyphs/readings use correct language metadata.

### Components and states

- [ ] Component state table is reflected in design files and acceptance tests.
- [ ] Undo removes exactly one stroke and synchronizes visible ink/readiness.
- [ ] Remove upload resets preview, file object, object URL, and native input value.
- [ ] Duplicate submit is blocked; late/stale response behavior is deterministic.
- [ ] Missing metadata does not collapse the result stage.
- [ ] Candidate order, selected state, and detail synchronization are verifiable.

### Responsive and accessibility

- [ ] Approved viewport/browser/device/zoom matrix exists.
- [ ] Keyboard walkthrough completes Upload â†’ Submit â†’ Select candidate â†’ Retry.
- [ ] Tabs, upload, candidate selection, and live regions use validated semantics.
- [ ] Focus order and focus return are documented for every transition.
- [ ] Contrast, forced-colors, reduced-motion, 200% zoom, touch targets, orientation, and screen-reader checks have evidence.
- [ ] Mobile fixed action does not cover controls, messages, or safe areas.

### Visual quality

- [ ] Final tokens pass contrast testing and remain distinct from KotoBase.
- [ ] Japanese and Vietnamese font coverage is verified under fallbacks.
- [ ] No decorative element competes with input or selected character.
- [ ] Motion explains a state change and is disabled/reduced appropriately.
- [ ] Screenshots demonstrate desktop, tablet, and mobile for every critical state.

### Engineering/QA boundary

- [ ] Component-facing view model remains separate from transport DTO.
- [ ] Build/lint and focused component/state regression tests pass.
- [ ] Contract/integration tests wait for approved API and service gates.
- [ ] No analytics captures image, strokes, character content, or identity before privacy approval.
- [ ] Documentation and implementation status are updated only with reproducible evidence.

## 17. Definition of design-document completion

This document is complete when it remains consistent with the canonical PRD, covers the required page/component/state/responsive/accessibility content, clearly labels inspiration versus original direction, and is the only file added or changed **by this documentation task**. Existing unrelated working-tree changes must not be attributed to or overwritten by this task.
