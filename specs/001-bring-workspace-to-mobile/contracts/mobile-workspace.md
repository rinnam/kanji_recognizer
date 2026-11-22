# Mobile workspace contracts

## Launch and local storage

The installed package serves the same workspace and bundled assets locally. First launch offline opens Overview, indicates pending first sync and supports creating folders and vocabulary. Later restarts restore committed data and preferences within the same installation. Distinguish a pending first pull from a successfully synchronized empty library.

## Sync boundary

Use the existing owner-scoped POST /api/sync/push with folders and vocabularies. The response includes serverTime and applied/skipped counts per entity. Push parent folders, child folders, then vocabulary. GET /api/sync/pull takes the last committed pull time as optional since and returns serverTime, folders and vocabularies including tombstones. A fresh installation omits since. Preserve the [existing merge policy](../../../docs/adr/0001-two-way-smart-merge.md). Retry using stable IDs. Serialize overlapping sync runs and schedule another pass for edits made during a run.

Startup, reconnect and manual refresh must retain confirmed edits. Remove the automatic vocabulary reset and route normal refresh through reconciliation; any full re-read must merge without clearing local rows. A response timeout, malformed response or failed local commit must leave enough durable state for retry. Network availability alone cannot clear the pending-first-sync indication.

## User interactions

Use the web workspace at the same width and theme as the reference for tab order, folder drawer, actions, labels and selection. Native file selection supplies input to the same importer; cancellation makes no changes. Pronunciation failure leaves study usable. Keyboard, safe areas and assistive-technology focus must allow completing the four SC-004 actions. Store platform anomalies and owner-approved visual deviations alongside test evidence.
