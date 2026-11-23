# Mobile workspace data model

The authoritative shapes are [web DTOs](../../frontend/src/shared/api/dto.ts). Keep field names, nullability and IDs through storage, transport and upgrades.

| Entity | Fields and relationships | Invariant |
| --- | --- | --- |
| LocalFolder | id, name, parentId, order, createdAt, updatedAt, deletedAt | A root has null parentId. Push parents before children. Preserve tombstones. |
| LocalVocabulary | id, word, meaning, reading, sinoVietnamese, example, exampleMeaning, note, tags, jlptLevel, folderIds, timestamps | Preserve Japanese content and all memberships. Deletion uses deletedAt; scoped removal follows current web semantics. |
| Review progress | srsInterval, srsRepetition, srsEaseFactor, srsNextReview on vocabulary | Rating and scheduling use existing web behavior. Retain nullable legacy values and sync the same vocabulary identity. |
| Quiz session and attempt | Session id, mode, score, total, start/finish times and ordered attempts; each attempt has vocabularyId, prompt, userAnswer, isCorrect and answeredAt | Keep existing scoring and session save/failure feedback. Folder/vocabulary sync does not transport quiz history. |
| Device sync progress | lastPushedAt, lastPulledAt | Preserve legacy metadata on upgrade. Neither timestamp filters outgoing or incoming records. A successful atomic full pull records durable completion, including an empty result. |
| Pending local revision | entityKind, recordId, revision | One durable entry per local record with unacknowledged changes. Assign a fresh unique revision on every local mutation, including deletion. Commit the entry and record in one transaction. Remote merges do not create pending entries. |

**Transitions.** On first adoption, atomically enroll all existing local rows including tombstones for one idempotent reconciliation and mark initialization complete. Preserve existing newer server values under LWW. Capture pending revisions together with their row snapshots. Successful push clears only matching revisions, never a later edit. For two successive local writes to the same record, assign updatedAt strictly later than that record's previous value even if the clock returns the same millisecond. This preserves the server's strict newer-wins rule. Always pull the complete owner library. Record successful reconciliation only after committing the merge. Restart or retry resumes pending work. For equal timestamps, adopt the server row only when the current record has no pending revision at merge commit. Otherwise retain and retry the pending revision.
