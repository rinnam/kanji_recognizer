# Validation quickstart

> For Expo setup and execution use [the Expo migration guide](expo-migration.md). The
> Capacitor commands below are historical. The acceptance runs still apply.

Use a disposable browser profile, test installations and an isolated backend/database containing synthetic data. Preserve the user's installed app and private library. Prepare Node/npm per frontend/package.json, Android Studio and an Android phone, and macOS with Xcode, signing and an iPhone. Use an HTTPS test API reachable and trusted by both devices. Check API access from the app origin, including CORS. Use the existing backend environment setup with disposable credentials.

## Run the web reference now

From the repository root in separate terminals:

~~~powershell
npm ci --prefix backend
npm run dev --prefix backend
~~~

~~~powershell
npm ci --prefix frontend
npm test --prefix frontend
npm run dev --prefix frontend
~~~

## Run the mobile build after packaging is implemented

Capacitor core, CLI, Android and iOS are pinned to 8.6.2. Dependency installation was verified
with Node 24.14.1 and npm 11.11.0 on Windows. Use Android Studio 2025.2.1 or later with the
compile SDK 36 declared by the generated Android project. Use macOS with Xcode 26.0 or later
and Xcode Command Line Tools for iOS. See the [Capacitor environment guide](https://capacitorjs.com/docs/getting-started/environment-setup).

The configured app ID is `app.kanjinest.workspace`. The packaged origins are
`https://localhost` on Android and `capacitor://localhost` on iOS. Configure the testing HTTPS
gateway to allow those exact origins, including OPTIONS preflight for JSON POST requests.
Keep the test service private. Use an isolated owner and database for the drill.
The browser development build can keep using the Vite proxy without a mobile API base.

From frontend/ with dependencies installed, set VITE_API_BASE_URL to the complete reachable test API base (including /api) before building. The following assumes the planned native projects exist and Capacitor CLI is installed locally.

~~~powershell
npm run typecheck
npm test
npm run build
npx cap sync
npx cap open android
~~~

On the Mac build host, build the same source and sync assets, then run `npx cap open ios`. Select the physical target in each IDE and install the development build. Launch from the home screen with the development web server stopped.

## Acceptance runs

| Criteria | Procedure and expected result |
| --- | --- |
| SC-001/002 | Match fixture, theme and compact viewport. Capture Overview, Flashcard and Quiz on all targets. Exercise folder CRUD and links, search, sort, paging, file/paste import including cancel and duplicate, pronunciation, fixed-time rating and quiz grading. Compare labels, layout, actions, counts, schedule and score with the web reference. |
| SC-003 | On a populated device disconnect, edit a word, rate a card and restart. Both changes survive. Reconnect, retry and verify one copy, expected schedule and no reactivated deleted items. |
| SC-004 | On web use keyboard; on Android use TalkBack and on iOS VoiceOver. Select a folder, add a word, rate a card and submit a quiz answer. Check focus and keyboard/inset visibility. |
| SC-006 | Add and rate a word offline in the reference browser. Sync browser successfully, then sync a fresh phone. Compare ID, membership and review fields exactly on each target. |
| SC-007 | Start each clean installation offline. Create a folder and word, restart offline and confirm pending status. Reconnect to a test server with a different folder and word, then retry. Verify both pairs exactly once on both sides and clear pending only after successful reconciliation. |
| SC-005 | Upgrade a populated test installation in place. Compare records and study access. Before a data-replacing step, verify backup integrity and rehearse restore in a separate compatible installation. Compare IDs, links, schedules, timestamps, tombstones and pending work, then reopen and study. Block replacement if recovery fails. |

Record target, build, OS, device, viewport, theme, fixture, steps, expected and actual outcomes. Record unavailable hardware as unverified. Keep credentials and learner content outside shared evidence.

### Late arrival and in-flight acknowledgement (SC-003)

1. Disconnect device A. Create a word and delete a different previously synced word. On B complete a sync after A's edits but before A reconnects. Reconnect A and let its push finish. On B perform an ordinary sync. The new word must appear exactly once and the deleted word must disappear. Repeat with the mobile targets exchanging roles.
2. In the deterministic sync suite freeze the clock, save a word, pause its push, edit it again and modify another word. Release the acknowledgement and restart before the next push. Resume sync and compare both records on a second client. Require the second content of the first word and the change to the other word. Repeat sync and check stable counts.

3. Give two clients different content for the same ID at the same timestamp. Push sequentially in both orders, sync again and verify both devices match the stored server row. Repeat for edit versus tombstone; check both deletion state and memberships. Pause pull, save a fresh local change, then release the response. Verify the pending revision survives and both devices converge after retry. Record results for SC-003.

### Build A to build B recovery drill (SC-005)

1. On each platform retain a signed test build A from the packaging milestone. Produce build B from the release candidate with a higher build number, the same package or bundle ID, signing identity and local asset origin. Record both build identifiers. Use a separate test installation and synthetic backend.
2. On A create nested folders, a linked word, a tombstone and a scheduled review. Disconnect and make another edit so pending work exists. Pause writes and sync. Use the T019 test-only driver to capture the actual local stores, sync metadata and pending revisions in one consistent snapshot. Record artifact hash and an independent expected field-by-field inventory.
3. Install B over A without uninstalling or clearing storage. Reopen offline. Compare IDs, links, review fields, timestamps, deletion state and pending work exactly; verify the library opens and a scheduled card can be viewed.
4. On a separate disposable device/container install a compatible build, verify backup integrity, restore offline, reopen and recapture. Require exact inventory equality and usable study access. Corrupt a copy and verify restore rejects it before modifying the destination. Preserve the intact backup and record evidence for each platform. No real installation is a drill target.
