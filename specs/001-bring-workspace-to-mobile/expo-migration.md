# Expo workspace migration

Use the running Vite workspace and its synthetic captures as the reference. Keep existing
routes and data unchanged while the new app is tested. This replaces the Capacitor-specific
steps in the plan and tasks. The requirements and data protection gates remain in force.

1. Extract shared study DTOs, vocabulary filtering and quiz grading. Reuse the same tested
   rules in both clients.
2. Port the overview incrementally. Compare header, folder tree, vocabulary table, responsive
   behavior and both themes against the existing captured workspace.
3. Port durable storage, local writes, import, sync and first-run behavior behind platform
   adapters. Run the existing revision, tombstone and recovery scenarios against each target.
4. Port Flashcard and Quiz from the web workflows using canonical shared rules.
5. Run the full acceptance matrix on Expo web and on physical Android and iOS devices.

## Run the first Expo slice

From the repository root:

```powershell
npm ci --prefix mobile
npm run web --prefix mobile
```

For native development, use `npm run start --prefix mobile` with a supported SDK 58 runtime.
Use a device-reachable test API URL in `EXPO_PUBLIC_KANJI_API_BASE_URL`, including `/api`.
The first Overview slice reads data only. Offline persistence, editing and study flows are
tracked by the port and acceptance work above.

## Implementation evidence

- The former web DTO, vocabulary filter and quiz grading modules now re-export their
  canonical implementations in `packages/`. The Expo overview consumes the same DTO
  and filter modules. The grading module is ready for the Expo Quiz port.
- Expo 58 passed dependency validation and TypeScript checking. On Edge at 360 px
  using synthetic pull data, the overview loaded a live word, hid a tombstone and
  matched search and JLPT filters. The test used an intercepted response.
- Vite production build and 254 frontend tests passed after extraction.
- The captured Vite workspace remains the reference for the table, drawer, full folder
  scope, tabs and platform styling. Feature parity and real-device acceptance are pending.
