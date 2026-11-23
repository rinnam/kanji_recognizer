# Mobile workspace contracts

## Launch and local storage

The installed package serves the same workspace and bundled assets locally. First launch offline opens Overview, indicates pending first sync and supports creating folders and vocabulary. Later restarts restore committed data and preferences within the same installation. Distinguish a pending first pull from a successfully synchronized empty library.

## Sync boundary

Use the existing owner-scoped POST /api/sync/push with folders and vocabularies. Push a captured set of pending local revisions, parents before children and folders before words. Keep stable record IDs across retries. After all batches return valid acknowledgement counts for every submitted record, clear only pending entries whose current revision still equals the captured revision. A skipped record is reconciled with the authoritative winner on pull. A failed or incomplete batch leaves the captured work eligible for replay.

For this release, both updated clients request GET /api/sync/pull **without since on every reconciliation**, including reconnect and manual refresh. The complete owner-scoped response includes live records and tombstones. This ensures that an old edit committed on the server after an earlier pull is discoverable next time. Use updatedAt only to choose the winning version of the same record under [ADR 0001](../../../docs/adr/0001-two-way-smart-merge.md). Merge against current local rows and commit winners and completion metadata atomically. Absence from a response does not delete a local row. A malformed or incomplete response cannot complete first sync. Serialize runs and schedule another pass for edits made in flight.

Startup, reconnect and manual refresh must retain confirmed edits. Remove the automatic vocabulary reset and route normal refresh through reconciliation; any full re-read must merge without clearing local rows. A response timeout, malformed response or failed local commit must leave enough durable state for retry. Network availability alone cannot clear the pending-first-sync indication.

Equal timestamps use the server's stored row as the tie winner, including its deletion state ([ADR 0005](../../../docs/adr/0005-personal-library-sync.md)). Read current pending state inside the pull-commit transaction. If a revision is still pending for a tied row, preserve it and schedule another sync. Otherwise apply the complete server row, including its memberships. Identical rows are a no-op. This rule also recovers after a crash between a successful push acknowledgement and pull.

## User interactions

Use the web workspace at the same width and theme as the reference for tab order, folder drawer, actions, labels and selection. Native file selection supplies input to the same importer; cancellation makes no changes. Pronunciation failure leaves study usable. Keyboard, safe areas and assistive-technology focus must allow completing the four SC-004 actions. Store platform anomalies and owner-approved visual deviations alongside test evidence.
