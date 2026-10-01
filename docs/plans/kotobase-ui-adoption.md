# Kế hoạch tiếp nhận UI KotoBase — Target/Proposed

> **Status:** Target/Proposed research and planning only. **Current:** checkout này chỉ có prototype React 19 + Vite dùng mock; chưa có backend, persistence, router, state library, UI kit hay test framework. Không có product code trong phạm vi này.

## 1. Nguồn, giới hạn và bản quyền

Nguồn tham khảo công khai được kiểm tra: [KotoBase repository](https://github.com/Vcoch27/kotobase), `README.md`, `DESIGN.md`, và cây file công khai. Chỉ tiếp nhận ý tưởng về information architecture, layout, flow và feature. Không sao chép code, CSS, token/value thiết kế, asset, icon hay prose.

GitHub không trả về license cho repository (license endpoint trả 404); README chỉ mô tả mục đích học tập/nghiên cứu cá nhân. Vì vậy mọi implementation phải là thiết kế độc lập từ PRD của dự án này; không tái sử dụng artifact KotoBase nếu chưa có quyền rõ ràng.

## 2. Những mẫu có thể học hỏi

- Shell học tập với sidebar/library ở trái và workspace chính; responsive chuyển sidebar thành drawer.
- Điều hướng tác vụ: Overview, Focus Recall, Flashcard/SRS, Kanji dictionary, Typing Quiz.
- Tìm kiếm/debounce, lọc, quick add, bulk import, detail panel, dark/light theme.
- Trạng thái học rõ ràng: prompt → reveal/answer → feedback/rating → summary.
- Phân cấp Kanji/vocabulary folder nhiều tầng với drag/drop persistence đã được chọn làm **Target/Proposed**; keyboard move controls và thông báo vị trí là bắt buộc để không phụ thuộc gesture.

## 3. Feature → requirement → dữ liệu

| Ý tưởng feature | PRD / story | Mapping DB Target | Quyết định |
|---|---|---|---|
| Library overview, search/filter | LS-FR-003/004; LUS-003/004 | `library`, `saved_item`, `content_item`, normalized metadata | Fit |
| Quick add / recognition-to-save | LS-FR-002/005; LUS-002/005 | `saved_item`, `deck_membership`, idempotency/outbox | Adapt; provenance bắt buộc |
| Deck navigation | LS-FR-001..003; LUS-001..003 | `deck`, `deck_membership` | Nested multi-level Target |
| Nested folders + drag/drop | LS-FR-001/003 | `deck.parent_id`, `sort_position`, tree integrity trigger | Selected Target; persist move/reorder atomically |
| Item/Kanji detail | LS-FR-004; LUS-004 | `content_item/revision/reading/meaning/example` | Fit, partial metadata safe |
| Focus Recall | LS-FR-006/007 | `study_session`, `session_item`, `practice_event` | Adapt; không mutate SRS |
| Flashcard normal/progress | LS-FR-006/007 | study snapshot/events, `card` | Fit |
| SRS four ratings | LS-FR-010..012/014 | `srs_state`, append-only `review_event` | Conditional on LS-OD-05/06 |
| Typing quiz | LS-FR-008/009 | `quiz_attempt/question/response` | Fit; IME-safe normalization TBD |
| Progress | LS-FR-013 | `daily_progress`, `metric_snapshot` | Fit; semantics gated |
| Bulk import | LS-FR-018/019; DB-003/006; LL-003A | profile, revision, course hierarchy | Adapt via validated publish boundary |
| Theme/responsive/a11y | LS-FR-015/016; NFR-001 | No domain table | Independent implementation |

## 4. SM-2 fit và gaps

The selected Target is a **versioned Anki-style SM-2 family contract** with Again/Hard/Good/Easy mapped respectively to forgotten/incorrect, difficult recall, normal correct recall, and immediate confident recall. This names the family and interaction, not exact Anki parity. Interval/ease constants, learning/relearning steps, rounding/clamps, day boundary, bury/leech/undo, authority clock, offline conflict, scheduler migration, and golden fixtures remain specification/validation gates under LS-OD-05/06; no SRS implementation is Current.

## 5. Stack gap và conditional substitutions

Keep Current React 19 + TypeScript 6 + Vite 8; do not downgrade to KotoBase’s Next.js/React stack and do not assume Tailwind, Firestore, Capacitor, icon package or theme library. Current gaps include routing, server data/cache, forms, drag/drop, virtualization, accessibility tests, unit/E2E tests and durable API adapter.

**Target stack decisions:** frontend remains React 19 + Vite; backend runtime is Node.js. The Node framework is deliberately **unspecified** and must not be inferred. Conditional architecture paths:

- If a server backend is selected, expose typed HTTP contracts backed by PostgreSQL transactions, authorization and repository services.
- If a local PostgreSQL service is selected, retain the same adapter/view-model contracts and make capability/offline truth explicit.
- If hybrid is selected, add approved outbox/conflict/authority-clock behavior before optimistic mutation UI.

No backend framework, route framework, state library or UI library is selected by this plan. Quick lookup for Jisho/Mazii remains a Target concept only: terms/license/provenance/attribution/cache/privacy/rate-limit review is deferred and mandatory before any call. Japanese TTS uses capability-gated Web Speech API/TTS with explicit unavailable/error fallback.

## 6. UI slices, states và acceptance criteria

1. **Shell + Library read-only:** sidebar/drawer, overview, search/filter, item detail. States: loading, empty, no-results, partial metadata, error, stale. AC: keyboard/focus/zoom pass; unavailable metadata explicit; no saved/synced claim.
2. **Deck mutations + save handoff:** create/rename/archive, choose/create deck, idempotent save. States: draft, validating, pending, committed, duplicate, conflict, forbidden, failed. AC: failure preserves context; success only after commit; owner isolation tested.
3. **Practice/Focus Recall:** immutable session snapshot, reveal/classify, pause/resume, summary. AC: no classification before reveal; practice never changes SRS.
4. **Quiz/Typing:** setup, IME-safe answer, locked submit, explainable feedback, summary/retry. AC: pinned normalization/scoring version; retry creates a new attempt; SRS unchanged.
5. **SRS Review:** due overview, prompt/reveal, four ratings, preview, atomic commit, conflict stop. AC: duplicate rating rejected; authority time visible through contract; ledger/state reconcile.
6. **Progress:** range/timezone/freshness/denominator plus text/table alternative. AC: no-data differs from zero; aggregates reconcile to committed events.
7. **Optional import/course UI:** profile/policy selection, validation report, publish/rollback. AC: arbitrary uneven lessons accepted when policy allows; no N3 cardinality hardcode.

Each slice also covers offline/capability unavailable, destructive confirmation, responsive layout, screen-reader status, reduced motion and safe retry.

## 7. Mâu thuẫn với `ui-flow-design.md`

- Earlier documents treated decks as flat owner-managed groups. The selected Target is now nested multi-level Kanji/vocabulary folders; the reference model extends `deck` minimally with parent/order fields, while implementation and migration remain future gated work.
- Existing flow starts from Recognize and hands off to Library; KotoBase is dashboard/library-first. Proposed resolution: shared shell with both primary entry points, without hiding recognition.
- Existing flow separates Practice classification, Quiz and SRS semantics; KotoBase presentation can blur “progress” and SRS modes. Preserve separate event contracts and labels.
- Existing flow requires partial/offline/conflict/forbidden/fatal states; KotoBase README emphasizes happy-path features. Our state matrix remains authoritative.
- Existing policy makes provenance/metadata absence visible; external dictionary enrichment cannot silently overwrite versioned reference content.

## 8. Jisho/Mazii integration terms and data gate

**Current public evidence:** Jisho’s public JSON endpoint responds and includes per-result attribution (for example JMdict/JMnedict/DBpedia), but this is not proof of a stable supported commercial API or redistribution grant. Underlying datasets have their own licenses/attribution. Mazii is described publicly as a dictionary product, but no verified public integration license or stable official API terms were found in this review.

Therefore treat both as discovery candidates only: obtain written API/redistribution terms, rate limits, attribution requirements, privacy terms and dataset provenance before integration. Prefer licensing source datasets directly when appropriate. Never scrape or proxy undocumented endpoints into production; cache/store only fields allowed by source terms and record `source_ref`/`license_ref`.

## 9. DDL visibility risk

`docs/database-schema.sql` is present locally but ignored/untracked; this task intentionally does not alter its tracking/ignore state or root file `0)`. **Risk:** collaborators/CI may not receive the synchronized DDL. Resolution requires a separate owner decision (track it, generate it from a tracked source, or document a secure distribution mechanism) before DB-002 evidence can be shared.

## 10. Open decisions (max 5)

1. Select the Node.js backend framework and deployment shape; runtime is chosen but framework remains deliberately unspecified.
2. Ratify the selected nested deck/folder depth, child-first lifecycle, migration, concurrency, and drag/drop/keyboard semantics before implementation.
3. Approve scheduler algorithm/version and whether the UI may use the “SM-2” label.
4. Approve licensed dictionary/data sources and Jisho/Mazii integration terms.
5. Decide how the ignored/untracked reference DDL becomes reproducible for collaborators/CI.
