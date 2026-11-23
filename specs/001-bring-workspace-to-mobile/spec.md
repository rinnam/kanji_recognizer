# Feature Specification: Use the Kanji Nest Workspace on Mobile

**Feature Branch**: `feature/cross-platform`

**Created**: 2026-11-22

**Status**: Draft

The target app shares the workspace across browser, Android and iOS. The existing
Vite app remains the visual and behavioral reference until the replacement passes parity.

**Input**: Bring the existing Kanji Nest web experience to Android and iOS. Learners should recognize the workspace and obtain the same library and study outcomes on their phones.

## Clarifications

### Session 2026-11-22

- Q: How does a new phone receive vocabulary and review progress saved only in the old browser? → A: Sync the old browser successfully, then sync the new phone. Browser-only data stays on the source device until synchronization succeeds. A separate offline library transfer is outside this feature.
- Q: Can a learner add words on a newly installed phone before its first successful sync? → A: Yes. Open the workspace, indicate that the first sync is pending, and allow offline folder and word creation. Merge local and server changes when connectivity returns.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Open the familiar workspace (Priority: P1)

A learner opens the installed app from their phone and recognizes the workspace they use on the web.

**Why this priority**: The existing web experience is the product being delivered on mobile.

**Independent Test**: Open each mobile app and the running web app with the same sample library, theme and viewport. Compare the initial screen and navigate all three tabs.

**Acceptance Scenarios**:

1. Given a populated library, when the learner opens the app, then the Overview shows the same labels, colors, typography, columns, actions and initial selection as the web workspace at that width.
2. Given the compact layout, when the learner opens the folder drawer, chooses a folder and switches between Tổng quan, Flashcard and Quiz, then the drawer, active tab and folder scope behave as on the web.
3. Given a phone keyboard or screen reader is active, when the learner searches or navigates, then controls remain reachable, named and operable. System insets do not obscure actions.

### User Story 2 - Manage a vocabulary library (Priority: P1)

A learner organizes folders and words on their phone and can reopen their saved work.

**Why this priority**: The library determines which words the learner can study.

**Independent Test**: Create a folder, add a word, import a list containing a duplicate, edit a word and reopen the app. Compare the resulting entries, folder links and counts with the same actions on the web.

**Acceptance Scenarios**:

1. Given nested folders and a word linked to two folders, when the learner reorganizes the folders or removes the word from one scope, then the tree, surviving links and deletion outcomes match the web app.
2. Given a mixed list of new, duplicate and invalid entries, when the learner imports by paste or file, then preview, decisions and saved counts match the web flow. Cancelling file selection leaves the library intact.
3. Given a populated folder, when the learner searches, filters by JLPT, sorts and pages through it, then the same words appear in the same order for equivalent settings.

### User Story 3 - Review cards and complete a quiz (Priority: P1)

A learner studies a selected folder using familiar Flashcard and Quiz controls.

**Why this priority**: Moving between devices must preserve what the learner studies and when the next review is due.

**Independent Test**: With fixed study data, time and equivalent session choices, complete a review and a typing quiz on each target. Compare the next review and graded answers.

**Acceptance Scenarios**:

1. Given the same folder and study options, when the learner selects a flashcard mode, reveals a card and rates it where applicable, then the available controls, recorded progress and next review agree with the web result.
2. Given the same questions, when the learner requests a hint and submits the same answers, then grading, feedback and the session summary agree with the web result.
3. Given a word with a pronunciation action, when the learner activates it, then available audio plays for that word. If playback is unavailable, the learner can continue studying.

### User Story 4 - Keep work through an outage (Priority: P1)

A learner with a locally saved library can study while disconnected and reconcile changes when service returns.

**Why this priority**: An outage or upgrade must preserve saved study work.

**Independent Test**: Disconnect a device with a sample library, edit a word and rate a card, fully close and reopen the app, then reconnect and compare the reconciled library with the reference outcome.

**Acceptance Scenarios**:

1. Given the service is unavailable, when the app confirms a local save and the learner reopens the app offline, then the saved edit and review progress are available.
2. Given pending edits and deletions, when the learner reconnects or requests sync, then the displayed status reflects the outcome and conflicting changes follow the existing web conflict rules. Retrying a successful sync does not duplicate records.
3. Given a proposed upgrade could replace stored study data, when a verified backup or successful isolated restore is missing, then replacement is blocked and the original library remains accessible.

### Edge Cases

- On a fresh installation, a pending browser edit cannot appear on the phone until both the browser upload and the phone sync succeed. The original browser must retain the edit through a failed upload.

- A first launch with an empty library or a search with zero matches shows the corresponding web empty state.
- Until the first successful sync, an empty local view MUST distinguish an unknown server library from a confirmed empty library. A failed sync keeps the first-sync status pending and preserves work saved on the phone.
- A failed save retains the learner's input and gives an actionable outcome. Pending work remains distinguishable from completed synchronization.
- Compare light and dark appearance, long Japanese entries, compact folder navigation and controls above the on-screen keyboard.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-008**: On first use with a reachable service, the phone MUST synchronize the learner's server-synced folders, vocabulary and review progress. To bring over browser-only changes, the learner MUST be able to sync the source browser and then sync the phone through the existing workflow.

- **FR-001**: Learners MUST be able to open Kanji Nest as an installed Android or iOS app and reach the current web workspace directly.
- **FR-002**: The workspace MUST preserve the existing responsive layout, themes, Vietnamese interface labels, Japanese content, navigation and available actions at equivalent screen widths.
- **FR-003**: Folder and vocabulary operations, selection, search, filtering, sorting, pagination and file/paste import MUST produce the existing web outcomes.
- **FR-004**: Flashcard modes, scope, pronunciation, review scheduling, quiz hints, grading and results MUST retain their existing user-visible behavior.
- **FR-005**: Locally saved library changes and review progress MUST remain available after offline restart. Sync and refresh MUST preserve pending work according to the existing conflict and deletion rules.
- **FR-006**: Learners MUST be able to complete the primary workflows using touch and mobile screen readers. The web experience MUST retain keyboard access. Loading, empty, failure and success states MUST remain distinguishable wherever applicable.
- **FR-007**: Before any data-replacing change, an operator MUST verify a backup and restore it in isolation. A compatible app MUST reopen the recovered library with its folder relationships, review schedules, pending work and deletion state intact.

- **FR-009**: On first launch offline, learners MUST be able to open the workspace and save folders and words. The first successful sync MUST reconcile these edits with existing server data under the normal conflict rules.

### Key Entities

- **Library**: Vocabulary, folders, memberships and deletion state.
- **Study session**: Selected scope, study options, cards or questions, responses and results.
- **Review progress**: Saved ratings, current learning state and next review time.
- **Pending change**: Local work awaiting reconciliation, including deletions.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-006**: Create a word in a folder and rate it offline in the source browser. After a successful browser sync and the first successful sync on a fresh phone, verify exactly one copy of the word with the same folder membership and review schedule. Repeat on Android and iOS.

- **SC-001**: Both installed mobile apps pass the workspace comparison in both themes at matching compact widths. Every difference in labels, layout or available actions is resolved or documented and accepted by the owner.
- **SC-002**: All scripted library, Flashcard and Quiz scenarios produce equivalent records, memberships, review schedules and grades on Android, iOS and the reference web app.
- **SC-003**: On each mobile target, the outage scenario loses zero confirmed edits or ratings after restart. Reconnection introduces zero duplicate records or incorrectly reactivated deletions. Include a receiver that synced before another device uploaded an older offline edit or deletion, and two edits saved within the same clock tick while a sync was in flight. When devices change the same word at the same timestamp, both must converge to the server-retained version after all pending work settles, including edit versus deletion.
- **SC-004**: A tester can select a folder, add a word, rate a card and submit a quiz answer on each phone using touch and its screen reader, and on web using the keyboard.
- **SC-005**: Any required restore drill has zero missing or changed study records relative to its backup. Results identify the platform and runtime tested. A target without a runtime result remains unverified.

- **SC-007**: On fresh Android and iOS installations, start offline, save a folder and word, and reopen offline. Verify both survive and the first sync is shown as pending. Reconnect to a server containing a different folder and word. After sync and retry, verify both libraries contain each item exactly once with the original memberships, and the pending-first-sync indication has cleared.

## Assumptions

- The running web workspace supplies the expected behavior. Comparisons use disposable data, the same selected scope and equivalent device settings. Safe-area spacing, the system keyboard and the system file picker may differ by device.
- First-launch comparisons use a sample library prepared for each target. A new phone cannot assume access to private data stored only in another browser or installation.
- The current web app stays available during rollout. Desktop packaging, browser installation and offline browser startup belong to separate features. Store publication and new study features are outside this specification.
