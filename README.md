# Form — local-first workout journal

React, TypeScript, Vite and Dexie. All workout records stay in this browser's IndexedDB. No account or running cloud sync engine.

## Run

Requires Node 22.12+ (or a compatible current release).

```sh
npm install
npm run dev
```

For the installable/offline build:

```sh
npm run build
npm run preview
```

Use the preview URL printed by Vite. Development mode intentionally does not register a service worker. Deployment requires HTTPS (localhost is allowed for desktop testing). An iPhone opening a plain HTTP LAN URL cannot install the service worker. No external fonts, images, or API requests are required after installation.

```sh
npm test
```

See [foundation and complete phased roadmap](docs/FOUNDATION.md) and [verification record](docs/VERIFICATION.md).

For the dedicated synthetic iPhone HTTPS preview, see the [device test guide](docs/IPHONE-TEST.md). Build it with `npm run build:iphone-preview`. Only that build seeds labeled fictional history/templates, and only in a new journal. Normal builds still begin empty. `.openai/hosting.json` retains the dedicated owner-private Sites identity for future fixes on the same origin.

## Core loop

Train starts an empty workout or resumes an active one. Library creates standalone templates with targets and custom/searchable exercises. Workouts keep independent snapshots and immediately save valid edits. Each set supports warm-up/working/drop types, skip, target/previous copying, RIR/RPE, kg/lb, and convention-aware load fields. Rest and workout duration are separately persisted. Finished workouts remain editable in History. Profile exports and validates JSON backups before an explicit atomic replacement restore.

Five tabs: Train, Library, Progress, History, Profile. Programs, analytics, and cloud sync are clearly marked unavailable. There are no fictitious performance numbers or example workouts in your journal.

## Data and privacy

Browser storage is not a remote backup. Export regularly. A backup contains your complete journal in plain JSON; store it privately. Restoring replaces all records and preferences in this browser. The app does not send workout data anywhere.

Database schema v1 uses independent exercise, template and session aggregates. Stable IDs, tombstones, local/server revisions and dirty metadata reserve a path to future outbox-based sync. Program-day copies and account ownership are documented but not implemented in this milestone.
