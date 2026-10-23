# Form: foundation and phased roadmap

Updated before implementation, 23 October 2026. The supplied handoff is the two requests in this chat; no other handoff files exist in the workspace. Every feature mentioned there is retained below.

## Architecture

React / TypeScript / Vite. Dexie over IndexedDB is the local source of truth. UI calls repository commands; commands validate and transact. Database-backed reactive queries render committed records. UI state is only transient navigation/dialog/input state. Sessions and templates are aggregate documents: ordered exercise and set children are embedded, with stable UUIDs, to permit atomic saving and future aggregate-level sync. Exercises are shared catalog records. Programs will use separately editable day-template aggregates. Schema versioning and validation apply to database migrations and backups. No network call in a logging transaction.

Mutable aggregates have UUID, timestamps, nullable deletion tombstone, local revision, acknowledged server revision, and dirty status. Future authenticated sync uses an atomic outbox, operation IDs for deduplication, compare-and-swap server revisions, server download cursors, and account partitioning. Cloud acknowledgements must not clear dirtiness for a newer local revision. Conflict copies preserve both versions; never resolve workout conflicts with device clocks. The current dirty metadata is a migration foundation, not a running sync engine. Sync will run on foreground/reconnect/manual retry; background delivery is optional. Device identity is not authentication.

## Records

- Exercise: ID, name, muscles, equipment, tracking mode (reps/load, bodyweight, duration, distance), load convention, instructions, built-in/custom source, metadata.
- Template: ID, name, notes, ordered exercise prescriptions (stable ID, catalog reference, display/convention snapshot, rest default), ordered set prescriptions (stable ID, kind, target reps/load/unit, canonical target RIR, duration/distance), metadata.
- Program (phase 2): ID, name, description, revision, ordered days, repeat policy. Each day points to an independent template copy with new child IDs and an optional source-template ID/revision for provenance. Editing a standalone template never changes a program day. Editing a day never changes the source or another day. An explicit replace/copy action can make further copies.
- Enrollment (phase 2): program ID, status, start date, next day ID; completion advances once, discard does not. Calendar scheduling and automatic progression are later phases.
- Session: ID, title, state, source template/program/day/enrollment IDs and revisions, start/end UTC timestamps, start time zone, notes, ordered exercise and prescription snapshots, actual sets, duration clock, rest timer, metadata. Referenced catalog or template changes never rewrite history.
- Actual set: ID, kind (working/warmup/drop), status (planned/completed/skipped), reps, load and unit, canonical RIR, seconds/meters when applicable, completion time, separate prescription snapshot. Null means missing; zero is real data. One active session enforced transactionally across tabs.
- Settings: default unit/rest, preferred effort display, optional bodyweight, backup timestamp. Future account ownership is separate from local device identity.

## Effort and load conventions

Store effort as nullable RIR in [0, 10], half-step precision. RPE is an alternate input/display: RIR = 10 − RPE, RPE = 10 − RIR. This is an explicit app convention, not a claim that subjective effort scales are physiologically exact. Switching display converts the same stored value. Target effort and actual effort are separate. V1 accepts 0–10 for either scale, labeled consistently.

- Barbell/machine: total external load, including the bar for barbells.
- Dumbbells: load **per dumbbell**, including unilateral exercises; do not silently double entries or volume. Each exercise states this clearly. Aggregate tonnage comparisons across conventions are deferred.
- Assisted: positive assistance magnitude; more assistance means easier. Do not store negative weight. Best-performance ranking cannot simply maximize this field.
- Weighted bodyweight: positive additional load only, excluding bodyweight. Zero means unweighted. Optional bodyweight is snapshotted on a session for later derived analytics, never silently added to the logged load.
- Pure bodyweight: reps, no external-load field. Timed/distance exercise: seconds and meters. Reps for unilateral exercises are per side and explicitly labeled in exercise instructions.
- Preserve entered kg/lb and normalize only for comparisons. Previous performance displays its original unit and convention; different variants have distinct exercise IDs.

## Timer contract and 60-minute inactivity policy

Rest is persisted as running/paused/stopped with duration, deadline, remaining milliseconds, and optional associated set ID. Completing a set starts its exercise's rest default. Pause captures remaining time, resume creates a new deadline. +/−15 seconds and a manual seconds override update persisted state; reset/stop is explicit. Expiry is computed from timestamps after suspension, never from missed interval ticks. No promised lock-screen alarms or background sound.

Workout duration stores accumulated milliseconds, running-since, last meaningful interaction, paused state, and pause reason (manual/inactivity). Set edits, session edits, and timer actions are meaningful interactions; scrolling, visibility events, automatic ticks, and passive viewing are not. At >=60 minutes without meaningful interaction, duration automatically pauses at lastInteraction + 60 minutes. The 60-minute window is included, later idle time is excluded. The session remains recoverable, never auto-completed/deleted. This is a proposed precise interpretation of the requested cutoff. On return, show a notice and explicit Resume; manual pause remains paused until resumed. Rest deadlines remain independent of workout duration. Completion freezes elapsed time; the summary can correct duration manually, retaining the recorded clock separately. The first new edit after a cutoff reconciles the cutoff before applying changes and does not silently restart duration.

## Reliability and backup

Persist every valid edit without waiting for blur or workout completion. Incomplete fields can be null, but invalid numbers are not stored. Serialize commands through IndexedDB read/write transactions to avoid lost sibling edits. Show saving/saved/failure accurately and retain editable input on failure. Backups include all local domain aggregates/settings and schema version; validate size, shape, IDs, referential integrity, active-session count, and schema version before showing a restore preview. V1 restore is explicit atomic replacement with a warning and backup recommendation; duplicate IDs are rejected, no implicit merge. No data written on parse/validation failure. Request persistent storage; clearly distinguish local save from backup/cloud sync.

## Roadmap: no features removed

1. **Core loop (this milestone):** polished five tabs (Train, Library, Progress, History, Profile); seeded searchable exercises and custom exercises; standalone template creation/edit/duplicate/archive, ordering exercises and sets, targets/rest; empty or template workouts, exercise substitutions/add/remove/reorder, flexible sets/types, actual RIR/RPE and explicit load conventions; previous completed performance; persisted rest and workout clocks, overrides and inactivity cutoff; immediate local saving/recovery; finish/review/edit history/notes; units/default rest; validated JSON backup export/restore; installable offline shell, safe update prompts, storage persistence request and failure reporting.
2. **Programs:** independent editable day copies, program/enrollment editor, ordered routines, next-workout display, explicit progress override, completion advancement. Extend exact-rep targets to min/max rep ranges and optional per-set notes. Retain standalone templates. Progress tab identifies unavailability until this ships.
3. **Insights:** exercise history charts, volume with explicit convention-aware calculations, personal records, advanced analytics. Progress becomes functional. No invented progress numbers in v1.
4. **Cloud:** authentication, ownership/import of pre-account data, PostgreSQL and sync API, transactional outbox, foreground/reconnect/manual retry, idempotence, server revisions/cursors, deletion tombstones, conflict recovery, backup/multiple devices, status UI. Never require cloud for logging.
5. **Expanded training/platform:** calendar scheduling, automatic progression, sharing, exercise videos, HealthKit/Apple Watch evaluation and integration (may require a native companion). Duration/distance tracking already modeled and usable in the core logger.

## Validation boundary

Automate domain, clock/cutoff/conversion and repository/backup tests using fake IndexedDB; build and type-check; browser-check interaction, persistence/reload, responsive layout, service worker and offline shell where tools permit. Physical iPhone required for Add to Home Screen, standalone safe areas/keyboard, Safari storage persistence/eviction behavior, force-close/resume and locked-device timing, install/update lifecycle, touch/VoiceOver quality and offline cold launch on iOS. Serve via HTTPS for iPhone: LAN HTTP is not a service-worker secure context.
