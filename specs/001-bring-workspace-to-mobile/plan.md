# Implementation Plan: Bring the Kanji Nest Workspace to Mobile

**Branch**: `feature/cross-platform` | **Date**: 2026-11-22 | **Spec**: [Mobile workspace](spec.md)

## Summary

Package the existing responsive web workspace as locally installed Android and iOS apps. Keep the browser release available. First make initial sync safe for a phone that already contains offline work, then verify identical library and study outcomes on real devices.

## Technical Context

- Existing frontend: React 19, React DOM, React Router, Vite 8 and TypeScript 6.0.3. Use Node 24 and npm 11 with the existing per-package lockfiles.
- Native packaging: Capacitor configuration in frontend, webDir set to dist, bundled entry index.html. Android Studio and macOS/Xcode build and sign development apps for physical devices.
- Persistence: existing IndexedDB stores and sync API backed by Fastify, Kysely and PostgreSQL. No database schema change planned.
- Tests: Vitest fixtures for sync conflicts, retry, grading and scheduling; browser/physical-device comparisons for interactions and accessibility. Local launch, reads and saves must progress without waiting for API availability.
- Scope: current workspace, one browser reference and two mobile targets. PWA, desktop, publication and new study modes are separate.

## Constitution Check

| Gate | Before research | Post-design decision and verification |
| --- | --- | --- |
| One interface | Required | One Vite build feeds both packages. Compare tabs, labels, themes and actions at matched widths. |
| Thin adapters | Required | Device-specific capability handling stays below features. Existing scheduler, import and grading stay authoritative. |
| Local-first and sync | Required | Commit locally before confirming. Replace destructive startup and exercise offline-first, stale pull and retry tests. |
| Recoverable data | Required | Preserve identifiers, relationships, schedules and deletion state. Use isolated fixtures. Require verified backup and compatible-app restore before any replacement. |
| Parity evidence | Required | Record Android, iOS and web evidence separately. Missing runtime evidence keeps the target unverified. |

All five design gates pass subject to implementing and validating these obligations.

## Project Structure

### Documentation (this feature)

[Research decisions](research.md), [data model](data-model.md), [interface contracts](contracts/mobile-workspace.md) and [validation quickstart](quickstart.md).

### Source Code (repository root)

- `frontend/`: existing app, tests and build entry. Proposed packaging files: capacitor.config.ts, android/ and ios/ inside this package.
- `frontend/src/pages/Workspace/`: retain existing composition. Keep platform differences in shared infrastructure, including shared/config for API origin and shared/lib for storage.
- `frontend/src/features/sync/`: startup, refresh, status, cursor management and reconciliation. Retain downward feature imports.
- `backend/`: existing owner-scoped HTTP boundary. Limit changes to evidenced connectivity/configuration gaps. Preserve routes, services, repositories and current wire format.

## Delivery sequence

1. Capture fixture-based web baselines for SC-001, SC-002 and SC-004. Characterize sync behavior before modifying it.
2. Add failing cases for offline-first edits, interrupted push/pull, concurrent local edits during pull, stale tombstones and retry. Replace startup reset and make normal refresh reconcile safely. Verify SC-003, SC-006 and SC-007 in isolation.
3. Generate the native packages from the same build. Configure the service origin, safe-area handling and keyboard behavior. Verify first launch with networking disabled.
4. Exercise folder/library/import, Flashcard, Quiz, audio, both themes and accessibility on physical devices. Address evidenced platform gaps in the shared app or a narrow adapter.
5. Validate in-place upgrade and recovery under SC-005. Record results per target before sign-off.

## Complexity Tracking

No constitution exceptions proposed.
