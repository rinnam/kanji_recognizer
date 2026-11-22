# Validation quickstart

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
