# Learning Experience UI Skill â€” Ink Desk

> **Audience:** future design and implementation agents. **Status:** Target/Proposed instructions, not implemented behavior. **Canonical product rules:** [`../prd.md` Â§18](../prd.md#18-learning-system--targetproposed-bounded). If this skill conflicts with the PRD, the PRD wins. Recognition UI foundation: [`../kanji-recognizer-ui-direction.md`](../kanji-recognizer-ui-direction.md).

## 1. Mission and boundaries

Design one coherent loop: **recognize â†’ confirm â†’ save â†’ practice â†’ review when due â†’ understand progress**. Extend Ink Desk rather than creating a separate visual product. Do not imply that account, persistence, backend, sync, metadata, scheduler or analytics exists until evidence proves it.

This system transforms publicly described KotoBase mechanicsâ€”organized collections, active recall, flashcards, typing quiz, four-rating SRS and progressâ€”into an original flat-deck model, explicit scheduler and recognition handoff. Do not copy KotoBase layout, wording, artwork, token values, component structure or code. Cite inspiration in design artifacts.

## 2. Operating instructions

Before designing or implementing:

1. Read PRD Â§18, then the recognition UI direction and current frontend evidence.
2. Identify the release slice (`LS0..LS3`) and requirement IDs (`LS-FR-*`) affected.
3. Mark every unavailable capability as blocked, local-only or mock; never fake persistence.
4. Resolve applicable `LS-OD-*` decisions or preserve them visibly as open.
5. Produce all states, responsive variants, keyboard paths, view-model fields and acceptance evidence togetherâ€”not only a happy-path frame.

## 3. Design principles

1. **Continuation, not a portal.** Saving begins from the confirmed candidate and preserves context.
2. **Recall before judgment.** Hide answers until deliberate reveal; ratings are unavailable before reveal.
3. **One semantic per action.** Practice classification, quiz correctness and SRS rating never mutate one another implicitly.
4. **Truth over celebration.** Distinguish saved, pending, due, reviewed and forecast; never use â€œmasteredâ€ without evidence.
5. **Explain scheduling.** Show what each rating means and its next interval without exposing implementation noise.
6. **Quiet momentum.** Progress supports decisions; streaks are neutral and never shame, punish or use loss aversion.
7. **Recover in place.** Preserve deck choice, answer or session cursor when safe; retry must be idempotent.
8. **Access is structural.** Every hover, gesture, chart and canvas interaction has keyboard, touch and non-visual equivalents.
9. **Japanese content leads.** Kanji is visually prominent, but reading, meaning, provenance and ambiguity remain legible.
10. **Data restraint.** Do not display or collect data that the current task does not need.

## 4. Information architecture and navigation

Primary destinations when the learning system is approved:

- **Recognize:** existing input/result workbench.
- **Library:** items and decks; item detail and deck management live here.
- **Practice:** flashcard and quiz setup/session/history summary.
- **Review:** SRS due queue; badge shows due count, never a motivational alarm.
- **Progress:** activity, recall and forecast.

Desktop may use a compact left rail plus contextual secondary navigation. Mobile uses a bottom destination bar only when the learning shell exists; respect safe areas and virtual keyboard. Keep Recognize centrally accessible. Deep links restore destination, selected deck/item and safe filters; they do not restore revealed answers or uncommitted ratings.

Do not place settings, deck CRUD and study-mode selection in the same navigation level. Item detail is a route or sheet depending viewport, with a stable deep link. Save-to-deck is a focused modal/sheet, not an app destination.

## 5. Ink Desk visual-system extension

Use the existing paper, graphite, registration-grid, vermilion and indigo language. Extend tokens semantically rather than inventing feature colors:

- paper surfaces for content and cards;
- graphite for primary text and structure;
- indigo for selected/informational state;
- vermilion for attention, destructive actions and proof-mark accentsâ€”not every due item;
- success/error/warning tokens that pass contrast in every theme.

Kanji uses the approved Japanese display face; UI controls use the existing UI face. Keep line length readable. Prefer typographic hierarchy, whitespace and subtle elevation over nested bordered cards. SRS phases must include text/icon labels; color is supplemental. Charts reuse these tokens but must remain distinguishable in monochrome.

## 6. Global shell and shared components

### `LearningAppShell`

Contains destination navigation, page title, optional scope switcher, freshness/offline indicator and main landmark. On mobile, action bars never cover content or the OS safe area.

### `DeckPicker`

Searchable list with selected membership state, item counts and â€œCreate deckâ€. Supports zero, one or many selection according to context. Creating a deck returns focus and selects it. Never use nested-folder UI.

### `LearningStateBadge`

Allowed values: New, Learning, Review, Relearning, Suspended, Due. Include accessible text; do not label â€œMasteredâ€.

### `AsyncBoundary`

Standardizes skeleton, partial, stale, offline, error and retry states. Skeletons mirror structure and carry no fabricated values. Retry keeps context and prevents duplicates.

### `MetadataField`

Renders label, value, optional provenance and unavailable state. Missing reading/meaning is â€œNot availableâ€, not an empty dash without context.

### `SessionHeader`

Shows mode, scope, progress (`current of total`), exit/pause and optional keyboard-help. Do not show accuracy during an active recall card unless the mode requires immediate feedback.

### `SessionSummary`

Shows completion, observed results, missed items and next actions. Separate quiz score, practice classification and SRS ratings.

## 7. Screen and component anatomy

### 7.1 Library

**Header:** title, total active items, primary â€œAdd from recognitionâ€ route, deck manage action.
**Deck rail/chips:** All items, each deck, Archived; counts reflect active filter.
**Toolbar:** search, study-state filter, due filter, sort, clear filters, view toggle only if both views are supported.
**Collection:** `LibraryItemRow/Card` with kanji, primary reading/meaning, deck memberships, state/due label and overflow menu.
**Bulk actions:** excluded until explicitly approved; do not expose nonfunctional selection.

Variants: first-use empty, empty deck, no filter results, loading, partial metadata, stale/offline snapshot, recoverable/fatal error and populated. Empty state offers Recognize and optional create-deck actions; no-results offers clear filters.

### 7.2 Item detail

**Identity block:** kanji, readings, meanings, provenance/version, metadata unavailable treatment.
**Membership block:** deck chips and Manage decks.
**Study block:** card templates, state, due time, last reviewed and suspend/reset actions.
**History preview:** recent ratings only if privacy/product scope allows.
**Actions:** Practice, Review now only when eligible/policy permits, Remove/Archive.

Destructive actions explain impact on memberships, cards and history per PRD. Never display recognition confidence as learning correctness.

### 7.3 Recognition handoff and save-to-deck

Add `Save to library` only on the user-selected/confirmed candidate. On activation:

1. Freeze the `candidateRef/itemRef` represented in the sheet.
2. Resolve canonical item and current memberships.
3. Show compact character summary, deck picker and create-deck path.
4. Submit once; indicate `Saving`, `Saved`, `Already saved`, `Pending offline` or `Failed` precisely.
5. Success offers `View item` and `Continue recognizing`; it does not auto-navigate.

If data is fixture or canonical resolution is unavailable, disable or label the prototype behavior; never persist fabricated metadata as real. Candidate changes behind an open sheet must not swap the target.

### 7.4 Flashcard setup and session

**Setup:** scope/deck, eligible count, order/shuffle, optional card template, batch size only if approved. Explain that Practice does not change SRS.
**Front:** one prompt, optional instruction, Reveal answer.
**Back:** answer, reading/meaning/context, `Know` and `Review again`; optional report-data action.
**Footer:** previous only when undo policy supports it, progress and exit.

Rules: no classification before reveal; no swipe-only flip; preserve a deterministic session order; â€œReview againâ€ returns after unseen cards; skipped is distinct. Do not imitate a physical 3D card if it harms readability or reduced motion.

### 7.5 Quiz setup, question and summary

**Setup:** scope, supported mode, question count bounded by eligible items, explanation of answer format.
**Meaning recall:** show kanji; render the approved answer control (choice or text).
**Reading input:** labelled text field, IME-safe composition, submit button and normalization help.
**Feedback:** correct/incorrect label, submitted answer, accepted answer(s), concise explanation and Next.
**Summary:** score with denominator, skipped count, missed list, Retry missed and Return to practice.

Never auto-submit during IME composition. Do not reveal correctness by color alone. Retry missed creates a new attempt and does not alter SRS.

### 7.6 Review/SRS queue

**Queue landing:** due count by Learning/Relearning/Review, optional new count and Start review. â€œNothing dueâ€ distinguishes zero cards from completion.
**Card front/back:** same recall anatomy as flashcards, but back replaces practice controls with four SRS ratings.
**Rating rail:** Again, Hard, Good, Easy; each includes semantic help and interval preview from the scheduler. Buttons appear/enable only after reveal.
**Commit state:** lock choices while pending; on success move to next card and announce result; on conflict refetch without double-apply.
**Completion:** reviewed counts by rating, remaining due, next due forecast and Continue new cards only if policy permits.

Keyboard: Space/Enter reveals; 1â€“4 rate only after reveal; shortcuts are ignored in editable controls. Provide an always-visible shortcut reference on desktop and discoverable help on mobile.

### 7.7 Progress dashboard

**Range and freshness:** 7/30/custom if approved, local time zone and â€œupdatedâ€ timestamp.
**Summary:** reviews completed, review success rate with denominator, quiz accuracy separately, active days/current streak.
**Inventory:** New/Learning/Review/Relearning/Suspended and due now.
**Activity:** daily counts; distinguish no data from zero.
**Forecast:** due cards over next seven days, labelled as schedule not prediction.
**Accessible detail:** table or prose summary for every chart.

Do not combine quiz accuracy with SRS success. Explain current streak behavior; if today is incomplete but yesterday active, say it can continue today rather than showing a loss state.

## 8. State and variant checklist

Every applicable surface must specify:

- initial/first-use empty;
- filtered empty;
- loading with stable layout;
- partial metadata;
- stale cached data with freshness;
- offline read-only;
- offline pending mutation only when supported;
- validation error;
- retryable service error;
- authorization/session error if accounts exist;
- concurrency/conflict;
- success/idempotent-already-complete;
- destructive confirmation and completion;
- reduced motion, high zoom and long translated content.

Never use a generic toast as the only record of a save, rating or failure. The affected object retains durable inline state.

## 9. Responsive behavior

- **<768 px:** one task column; bottom navigation; sheets for deck picker/detail; sticky session action region; answer input stays above keyboard; chart cards stack.
- **768â€“1023 px:** collapsible deck rail; detail may be a side sheet; controls wrap without reordering semantics.
- **â‰¥1024 px:** persistent navigation and optional deck rail; main reading column remains bounded; detail can occupy a secondary pane.
- Very wide screens add whitespace, not more simultaneous panels.
- At 200% zoom, layouts reflow; no horizontal page scroll except intentionally scrollable tables with labels.
- Touch targets are at least 44Ã—44 CSS px and rating buttons remain fully visible without precision gestures.

## 10. Keyboard, touch and accessibility rules

- Use native buttons, links, inputs, lists, dialogs and tables before ARIA composites.
- One H1; landmarks; logical DOM/focus order independent of visual columns.
- Route change focuses H1 or managed main target. Dialog opens on heading/first field and restores trigger focus.
- Announce loading completion, save outcome, answer reveal, quiz feedback and committed rating via concise live regions; do not announce every timer/count mutation.
- Use `lang="ja"` for Japanese text and appropriate ruby semantics/fallback.
- IME composition must not trigger quiz submit or shortcuts.
- Drag/drop, swipe and hover are optional accelerators with button alternatives.
- Visible focus meets contrast; selected, due and error states use text/icon/structure in addition to color.
- Support reduced motion, forced colors where feasible and text resizing. Charts provide data table/prose.
- Canvas-based future quiz requires an equivalent non-canvas answer path and is currently deferred.

## 11. Motion

Motion clarifies state only:

- 120â€“180 ms reveal/fade/slide using existing easing tokens;
- no mandatory card flip, confetti, streak flame or celebratory interruption;
- rating commit uses subtle exit only after confirmed persistence;
- skeleton shimmer is optional and disabled under reduced motion;
- no timer-driven auto-advance unless explicitly enabled and pausable.

## 12. Content and microcopy

Voice: calm, exact, encouraging without judgment.

Preferred:

- â€œSave to libraryâ€, â€œSaved in 2 decksâ€, â€œAlready in Daily reviewâ€.
- â€œReveal answerâ€, â€œReview againâ€, â€œNothing due right nowâ€.
- â€œ8 of 10 reviewedâ€, â€œReview success: 75% (6 of 8 ratings)â€.
- â€œYou can continue your 4-day streak today.â€
- â€œCouldnâ€™t confirm the save. Your deck selection is still here.â€

Avoid:

- â€œMasteredâ€, â€œperfect memoryâ€, â€œAI knowsâ€, â€œfailedâ€, â€œlazyâ€, â€œstreak lostâ€.
- â€œSyncedâ€ or â€œsavedâ€ before commit.
- Unexplained SRS jargon, model confidence as correctness, or unsupported privacy promises.
- Raw error codes, scheduler formulas, technical IDs or metadata-source claims without evidence.

## 13. Forbidden patterns

- Copying KotoBase page composition, theme tokens, illustrations, wording or component code.
- Turning every page into a dashboard of nested cards.
- Automatically saving the top recognition result.
- Making one item belong to only one deck without a product decision.
- Rating before reveal; hidden gesture ratings; accidental key ratings in inputs.
- Letting quiz score mutate SRS or calling practice classification a review rating.
- Randomized scheduling in UI, client-only interval guesses or countdown urgency.
- Streak punishment, leaderboard, loot/confetti loops or deceptive engagement prompts.
- Color-only study state, inaccessible chart, hover-only actions or canvas-only quiz.
- Optimistic success when idempotency/offline sync is unresolved.
- Inventing account/backend readiness, metadata, source, retention or analytics consent.

## 14. Conceptual view models

These are presentation contracts, not backend schemas.

```text
LearningItemVM
  id, character, readings[], meanings[], provenanceLabel?
  memberships[{ deckId, deckName }]
  studyState, dueLabel?, metadataStatus, actions

DeckVM
  id, name, description?, activeItemCount, dueCount?, archived, permissions

SaveToDeckVM
  itemSummary, selectedDeckIds[], existingDeckIds[]
  status: idle|resolving|saving|saved|pending|conflict|error
  canCreateDeck, errorMessage?, recoveryAction?

StudySessionVM
  id, kind: practice|quiz|review, scopeLabel
  currentIndex, total, prompt, answer?, isRevealed
  commitStatus, canResume, keyboardHelp

SrsRatingOptionVM
  rating: again|hard|good|easy
  label, semanticHelp, nextDueLabel, enabled

ProgressVM
  range, timeZone, freshness
  activitySeries[], reviewSuccess{ numerator, denominator }
  quizAccuracy{ numerator, denominator }
  inventoryByPhase, dueNow, forecast[], streak
```

Rules:

- IDs are opaque; display labels are separate.
- Dates carry instant + time-zone context; do not preformat in domain state.
- Missing/partial/error status is explicit, not inferred from empty strings.
- Mutations carry idempotency/conflict status; the view never manufactures success.
- Scheduler returns rating previews and next state; UI does not calculate them independently.
- Analytics payloads are separate from view models and exclude raw learning content by default.

## 15. Definition of done

### Product and traceability

- [ ] Slice and every affected `LS-FR-*`, acceptance criterion and open decision are linked.
- [ ] Current/Proposed/Blocked status is accurate; no backend or persistence is invented.
- [ ] Practice, quiz and SRS semantics remain separate.
- [ ] KotoBase inspiration is credited and visibly transformed.

### IA and screens

- [ ] Library, detail/save, flashcard, quiz, review, progress and recognition handoff are covered where in scope.
- [ ] Navigation and deep-link/back behavior work across viewport classes.
- [ ] All required state variants and destructive/recovery flows exist.

### Data and behavior

- [ ] Conceptual view models include partial/freshness/conflict/idempotency state.
- [ ] Save dedupe, session snapshot/resume and scheduler preview/commit use one source of truth.
- [ ] Fixed-clock scheduler examples match PRD Â§18.8; duplicate ratings do not double-apply.
- [ ] Metrics disclose range, denominator and freshness; streak follows PRD semantics.

### Accessibility and responsive QA

- [ ] Keyboard-only and screen-reader paths complete every essential task.
- [ ] IME, focus, live announcements, zoom, touch targets, orientation and reduced motion are tested.
- [ ] No state depends only on color, hover, drag, swipe, chart or canvas.
- [ ] Mobile keyboard/safe-area and desktop bounded reading layouts are verified.

### Content, privacy and quality

- [ ] Microcopy does not shame, overclaim learning, or promise unverified save/sync/privacy.
- [ ] Telemetry excludes prohibited content and remains consent/policy gated.
- [ ] Empty/loading/error/offline/partial copy gives a truthful next step.
- [ ] Internal links and requirement references pass validation.
- [ ] Implementation evidence, tests and accessibility audit are attached before any status becomes Current.
