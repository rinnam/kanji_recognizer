<!--
Sync Impact Report
Version change: unversioned scaffold to 1.0.0 (first constitution on this branch).
Principles: filled the five template slots with the project principles below.
Sections added: Project Boundaries and Delivery and Review.
Sections removed: none.
Follow-up: owner to confirm the formal ratification date.
-->
# Kanji Nest Constitution

## Core Principles

### I. One Web Interface Across Platforms

The existing web workspace in `frontend/` MUST be the source of the screens, styles and
interactions shipped on every platform. Mobile packages MUST run that web build. A change to
the folder tree, vocabulary table or Overview, Flashcard and Quiz tabs MUST reach each target
through the same frontend change. Compact layouts MUST follow the existing responsive web
behavior. An intentional change to that experience MUST be identified in the feature spec.

### II. Thin Platform Adapters

Platform shells MUST expose device capabilities through typed adapters when behavior differs
across targets. Storage, file selection and pronunciation are examples. Screens MUST use the
same study rules on every target. A wrapper MUST NOT implement a second scheduler, quiz grader
or import policy. This keeps a learner's results independent of the device used.

### III. Local-First Study and Reliable Sync

Learners MUST be able to use their locally saved library and review progress while the
backend is unreachable. A successful local save MUST survive an app restart. Synced records
MUST preserve the existing Last-Write-Wins rules, update timestamps and deletion tombstones
defined in [ADR 0001](../../docs/adr/0001-two-way-smart-merge.md). Reconnecting MUST preserve
pending changes according to those rules.

### IV. Recoverable User Data

Storage changes MUST preserve the field names of `LocalFolder` and `LocalVocabulary`, record
identities, folder links, review schedules and pending work. Before a migration can replace
user data, the operator MUST verify a backup and rehearse restoration on an isolated copy.
The restored library and review progress MUST be usable in a compatible app. Seed scripts
MUST run only against designated development or test data.

### V. Evidence of Parity

Each ported workflow MUST have an acceptance check against the running web app using the
same fixture, workspace state and viewport where applicable. Reviewers MUST compare visual
layout, labels, available actions and their results. Checks MUST cover keyboard access on web,
touch and assistive technology on mobile, and applicable loading, empty, error and success
states. A target without runtime evidence MUST be recorded as unverified.

## Project Boundaries

All clients MUST use the shared backend through its HTTP boundary. Client code MUST respect
Feature-Sliced Design imports. Backend requests MUST flow through routes and controllers,
services and repositories to the database. Database credentials MUST stay on the server.
The [cross-platform plan](../../docs/architecture/cross-platform.md) records packaging choices
and delivery phases, including Capacitor for Android and iOS.

## Delivery and Review

Feature specs MUST identify the existing user workflow and supported targets. Plans MUST
identify required adapters and any data migration. Tasks MUST include parity and recovery
checks where applicable. Changes to scheduling, grading or sync MUST include deterministic
regression tests. The existing web app MUST stay available until replacement workflows pass
their acceptance checks. Documentation and Spec Kit artifacts MUST use English and UTF-8
without a BOM. Japanese learning content MUST be preserved verbatim unless the owner requests
a translation or romanization.

## Governance

The owner MUST approve amendments. Each proposal MUST state the reason, affected principles
and impact on existing plans. Reviews MUST check compliance with the applicable principles
and link to supporting evidence. Incompatible changes to principles require a major version
increment, additional or expanded obligations a minor increment, and wording corrections a
patch increment. Each adopted amendment MUST update the version and amendment date.

**Version**: 1.0.0 | **Ratified**: TODO(RATIFICATION_DATE): owner confirmation pending | **Last Amended**: 2026-11-22
