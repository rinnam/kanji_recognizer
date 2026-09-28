# Plan LL — Learning data, library and recognition-to-save

## Purpose and coverage
Deliver LS1 persistence, flat decks, item detail, confirmed-candidate handoff, and validated reference-content import. Covers LS-FR-001..005 and LS-FR-015..019; UI follows the [Learning Experience UI Skill](../skills/learning-experience-ui-skill.md).

## Prerequisites
PF completion; LS0 prototype evidence; LS-OD-01..03 plus applicable LS-OD-06/08/10 resolved; canonical metadata/provenance, repository/persistence, authorization, migration, deletion and offline policies approved. Backend/local/remote choice remains open until decision. Use the Target [database design](../database-design.md) and [Plan DB](./database-implementation-plan.md) only after those gates close. Vocabulary/N3 structure is canonical Target per LS-FR-018/019; actual 880-word corpus still requires approved source/license and import evidence. Grammar remains separately gated.

## Ordered tasks
| ID | Task | Acceptance/evidence |
|---|---|---|
| LL-001 | Validate domain invariants and lifecycle | Library/deck/item/membership conceptual model reviewed; archive/delete impact explicit |
| LL-002 | Approve repository and mutation contracts | Version/nullability/errors/idempotency/concurrency/auth/deletion examples and contract tests |
| LL-003 | Prepare versioned storage migration and rollback | Dry-run on fixtures; compatibility, backup/restore and deletion implications recorded |
| LL-003A | Implement reference-content publish boundary | Reject vocabulary missing Hán Việt/meaning/hiragana/example; reject N3 course unless 11 lessons × 80 ordered, 880 distinct active N3 vocabulary; transaction rollback and idempotent import proven |
| LL-004 | Implement library/deck read states | Search/filter/sort/reset, counts, empty/loading/partial/error/offline/freshness and keyboard evidence |
| LL-005 | Implement deck mutations | Trim/empty validation, confirm impact, pending/success/conflict/failure; reload consistency |
| LL-006 | Implement item detail and membership mutation | Partial metadata safe; provenance visible; multi-deck and duplicate retry idempotent |
| LL-007 | Implement recognition-to-save handoff | Immutable confirmed candidate/item reference; deck select/create; context retained on failure; no image/ink copied |
| LL-008 | Implement user data view/delete controls | Scope and irreversible effects match approved policy; auditable outcome without leaking content |
| LL-009 | Cross-functional validation and rollout | A1/A6/A7/A8, migration/rollback, auth and observability evidence |

## Discipline considerations
- **FE/UX:** shell → library list → deck/detail → save sheet; no success before commit; destructive dialogs restore focus.
- **BE/data:** canonical dedupe, unique membership, atomic mutations, provenance, safe partial records and migration.
- **QA:** double-submit/reload/concurrent edit/offline/partial/delete matrices.
- **Security/privacy/ops:** object authorization, input limits, shared-device cache, retention/backup deletion, redacted logs and recovery runbook.

## Completion gate
All included requirements map to passing tests; persisted state survives reload under the approved model; duplicate save yields one membership; failure preserves safe context; deletion is verifiable; rollout and rollback pass. Otherwise remain **Blocked/Target**, never “implemented”.
