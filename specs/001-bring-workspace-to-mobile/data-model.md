# Mobile workspace data model

The authoritative shapes are [web DTOs](../../frontend/src/shared/api/dto.ts). Keep field names, nullability and IDs through storage, transport and upgrades.

| Entity | Fields and relationships | Invariant |
| --- | --- | --- |
| LocalFolder | id, name, parentId, order, createdAt, updatedAt, deletedAt | A root has null parentId. Push parents before children. Preserve tombstones. |
| LocalVocabulary | id, word, meaning, reading, sinoVietnamese, example, exampleMeaning, note, tags, jlptLevel, folderIds, timestamps | Preserve Japanese content and all memberships. Deletion uses deletedAt; scoped removal follows current web semantics. |
| Review progress | srsInterval, srsRepetition, srsEaseFactor, srsNextReview on vocabulary | Rating and scheduling use existing web behavior. Retain nullable legacy values and sync the same vocabulary identity. |
| Quiz session and attempt | Session id, mode, score, total, start/finish times and ordered attempts; each attempt has vocabularyId, prompt, userAnswer, isCorrect and answeredAt | Keep existing scoring and session save/failure feedback. Folder/vocabulary sync does not transport quiz history. |
| Device sync progress | Existing metadata lastPushedAt and lastPulledAt | Track durable progress separately from online/offline and in-flight/error UI. Fresh storage starts with neither cursor. |

**Transitions.** A local edit commits immediately and becomes eligible for push. Push acknowledgement can advance the push cursor only after all batches succeed. Pull applies winners against the latest local state, retaining tombstones, then advances the pull cursor in the same commit. A fresh installation is pending until the first full reconciliation commits. Empty successful pulls count. On failure reuse the last committed progress. Restart, repeated reconnects and retries must yield the same final records. Preserve existing device metadata on upgrade.
