# Verification record

## GitHub Pages preparation — 29 October 2026

- Added a separate GitHub Pages build under `/form-iphone-preview/`, preserving the regular and original root-hosted build modes.
- Manifest identity, launch URL, scope, icons, HTML asset paths and offline fallback follow the project path. The build command checks these outputs before deployment.
- 29 existing domain/repository/fixture tests passed. Device checks remain pending.
- Public source repository: https://github.com/Ertenan/form-iphone-preview . Target HTTPS site: https://ertenan.github.io/form-iphone-preview/ . The final handoff confirms the workflow/deployment outcome.
- GitHub Actions publishes from `main` after tests and build checks. No cloud sync or advanced training features were added.

Earlier preview records below refer to the previous hosting origin and earlier builds.

## iPhone HTTPS preparation — 23 October 2026

- Added a separate `iphone-preview` build with clearly labeled synthetic template/history and an always-visible test banner. The regular build remains empty on first use.
- 29 tests passed, including new checks that preview seeding is valid, opt-in, and never overwrites an existing/restored journal.
- Timer displays now refresh immediately on visibility restoration and pageshow without counting those events as workout activity.
- Service-worker setup errors are visible; existing active registrations contribute to offline-readiness reporting. Backup download anchors are attached for Safari and blob URLs remain available for 60 seconds.
- Dedicated owner-private Sites identity is retained in `.openai/hosting.json`; publication status/URL is verified through native Sites deployment tools at handoff.
- Physical iPhone results remain pending. The exact sequence and expected values are in [IPHONE-TEST.md](IPHONE-TEST.md). Do not begin the program/insights phases until reported core-loop issues are fixed and the affected device checks pass.

The older desktop record below remains historical evidence, not proof of physical iPhone behavior.

Implementation checks are recorded here as they run. A build is not evidence of iPhone behavior.

## Completed on 23 October 2026

- TypeScript check and production Vite build passed. Generated manifest, standalone icons (192/512, maskable and Apple touch icon), service worker and precache were inspected. The app shell precaches approximately 530 KiB.
- 25 automated tests passed (11 domain/timer tests and 14 repository/backup tests). IndexedDB tests use fake-indexeddb, not an iOS storage engine.
- npm audit reported zero vulnerabilities after upgrading Vitest and Sharp to patched releases.
- HTTP checks returned 200 for the production root, manifest, service worker, 192/512 icons, maskable icon and Apple touch icon.
- In-app Chromium browser checked at a requested 390 × 844 viewport; the embedded browser scales its capture. DOM bounds showed no horizontal page overflow. Inspected mobile screenshots, including logger and Train.
- Created a standalone template, searched exercises by name/equipment, entered target values, started a fresh session, logged decimal load/reps/effort, completed a set, paused rest, and changed 1.5 RIR to 8.5 RPE.
- Reloaded the browser and recovered the active session, entries, settings, and paused rest timer.
- Finished a session, saw it in History, started another session, and saw previous performance with its original load/unit and converted effort.
- Exported a real JSON download and inspected its header. Re-selected that file and confirmed validation/restore preview with counts and replacement warning. UI replacement was not executed; atomic restore and rollback were exercised in automated tests.
- Stopped the production preview server, reloaded the cached app, logged/copied previous values, and completed another session while the server was unavailable. This verifies desktop offline shell behavior; it does not verify iOS airplane-mode behavior.
- Restarted the server with a new build, observed an update prompt between sessions, applied it, and verified both synthetic sessions/template were retained. Profile confirmed the offline shell was ready. Browser error log was empty.
- The preview browser contains one template and two explicitly QA-labeled synthetic sessions created by verification. These are browser-local data, not shipped seed history. A downloaded QA backup was created in the user's Downloads folder by the export test.

Final review also changed logger edits/reordering to resolve exercise/set UUIDs inside each transaction, so a concurrent reorder cannot redirect an edit to a different row.

Source build warnings are limited to upstream Zod comment annotations that Rollup strips. No compile or test failures remain.

## Automated coverage

- Persisted rest deadline, pause/resume, override bounds, serialization/suspension recovery.
- Workout duration pause/resume, exact 60-minute inactivity boundary, long suspension, meaningful activity, manual duration override.
- Canonical RIR/RPE conversion, half-step effort validation, positive assistance and null versus zero.
- Database initialization, concurrent active-session prevention, independent template snapshots, serialized edits, close/reopen persistence.
- Completion validation/rest start, finish clock freezing, inactivity reconciliation before editing, unit/bodyweight conversion.
- Backup round-trip including partial workout/timer state; invalid versions, duplicate IDs, dangling references, active-session count, malformed values; atomic rollback after simulated write failure.

## Physical iPhone checks still required

- HTTPS installation with Safari → Share → Add to Home Screen; launch in standalone mode, correct icon/name.
- Safe areas, Dynamic Type, portrait/landscape, touch targets, numeric keyboard, VoiceOver navigation and dialog focus.
- Initial online preparation, airplane mode cold launch, full logging offline, force-close/reopen and recover partial input.
- Persisted timer pause/resume through screen lock and app switching; workout duration paused at the defined inactivity boundary.
- Files/Share handling for JSON export, backup selection, preview and restore, including a large journal.
- Storage persistence request and behavior under iOS storage pressure; backups remain necessary.
- Safe service-worker update between sessions, no forced reload during an active workout, data retained across update.
- Multiple Home Screen/browser contexts may have separate storage; verify chosen installation context before trusting it with a real journal.

No background alarms, vibration, or lock-screen notifications are promised. No real iPhone checks have been performed by the agent.
