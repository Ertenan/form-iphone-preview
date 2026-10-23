import Dexie, { type EntityTable } from 'dexie';
import { z } from 'zod';
import { defaults, exerciseSchema, templateSchema, sessionSchema, settingsSchema, meta, makeSet, blankValues, validCompletedSet, type Exercise, type Template, type Session, type Settings, type WorkoutItem } from './model';
import { elapsed, pauseClock, reconcileClock, startRest, stoppedRest } from './timers';
import { seedExercises } from './seed';
import { createPreviewRecords, IS_IPHONE_PREVIEW } from './preview';

export class FormDatabase extends Dexie {
  exercises!: EntityTable<Exercise, 'id'>;
  templates!: EntityTable<Template, 'id'>;
  sessions!: EntityTable<Session, 'id'>;
  settings!: EntityTable<Settings, 'id'>;
  constructor(name = 'form-workout') {
    super(name);
    this.version(1).stores({ exercises: 'id, name, muscle, deletedAt', templates: 'id, updatedAt, deletedAt', sessions: 'id, status, startedAt, deletedAt', settings: 'id' });
  }
}
export const db = new FormDatabase();
function bump<T extends { updatedAt: number; localRevision: number; dirty: boolean }>(value: T) {
  return { ...value, updatedAt: Date.now(), localRevision: value.localRevision + 1, dirty: true };
}
export async function initialize(database = db, preview = IS_IPHONE_PREVIEW) {
  await database.transaction('rw', [database.exercises, database.settings, database.templates, database.sessions], async () => {
    if (!(await database.settings.get('settings'))) {
      const exercises = seedExercises();
      await database.exercises.bulkAdd(exercises);
      await database.settings.put(defaults);
      if (preview) {
        const { template, session } = createPreviewRecords(exercises);
        await database.templates.add(template);
        await database.sessions.add(session);
      }
    }
  });
}
export function itemFromExercise(e: Exercise, settings: Settings): WorkoutItem {
  return { id: crypto.randomUUID(), exerciseId: e.id, name: e.name, convention: e.convention, instructions: e.instructions, restSeconds: settings.restSeconds, notes: '', sets: [makeSet(settings.unit), makeSet(settings.unit), makeSet(settings.unit)] };
}
export const repository = {
  async saveTemplate(template: Template) {
    await db.transaction('rw', db.templates, async () => {
      const existing = await db.templates.get(template.id);
      await db.templates.put(templateSchema.parse(bump({ ...template, localRevision: existing?.localRevision ?? template.localRevision })));
    });
  },
  async saveExercise(exercise: Exercise) { await db.exercises.put(exerciseSchema.parse(bump(exercise))); },
  async saveSettings(patch: Partial<Settings>) {
    await db.transaction('rw', db.settings, async () => {
      const previous = await db.settings.get('settings') ?? defaults;
      const next = { ...previous, ...patch, id: 'settings' };
      if (patch.unit && patch.unit !== previous.unit && previous.bodyweight !== null && patch.bodyweight === undefined) {
        next.bodyweight = Math.round(previous.bodyweight * (patch.unit === 'lb' ? 2.2046226218 : 1 / 2.2046226218) * 100) / 100;
      }
      await db.settings.put(settingsSchema.parse(next));
    });
  },
  async start(template?: Template): Promise<string> {
    return db.transaction('rw', db.sessions, db.settings, async () => {
      const active = await db.sessions.where('status').equals('active').filter(s => !s.deletedAt).first();
      if (active) return active.id;
      const settings = await db.settings.get('settings') ?? defaults;
      const now = Date.now();
      const session: Session = {
        ...meta(), name: template?.name ?? 'Open workout', status: 'active', sourceTemplateId: template?.id ?? null, sourceTemplateRevision: template?.localRevision ?? null,
        startedAt: now, finishedAt: null, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, bodyweight: settings.bodyweight, bodyweightUnit: settings.unit,
        notes: '', items: template ? template.items.map(i => ({ ...structuredClone(i), id: crypto.randomUUID(), sets: i.sets.map(s => ({ ...structuredClone(s), id: crypto.randomUUID(), actual: blankValues(s.target.unit), status: 'planned', completedAt: null })) })) : [],
        clock: { accumulatedMs: 0, runningSince: now, lastInteractionAt: now, pauseReason: null, overrideMs: null }, rest: stoppedRest(),
      };
      await db.sessions.add(sessionSchema.parse(session)); return session.id;
    });
  },
  async mutateSession(id: string, change: (s: Session, now: number) => void, meaningful = true) {
    await db.transaction('rw', db.sessions, async () => {
      const s = await db.sessions.get(id); if (!s) throw new Error('Workout not found.');
      const now = Date.now();
      if (s.status === 'active') s.clock = reconcileClock(s.clock, now);
      change(s, now);
      for (const item of s.items) for (const set of item.sets) {
        if (set.status === 'completed' && !validCompletedSet(item, set)) { set.status = 'planned'; set.completedAt = null; }
      }
      if (s.rest.setId && !s.items.some(i => i.sets.some(set => set.id === s.rest.setId))) s.rest = stoppedRest();
      if (meaningful && s.status === 'active') s.clock.lastInteractionAt = now;
      await db.sessions.put(sessionSchema.parse(bump(s)));
    });
  },
  async reconcile(id: string) {
    await db.transaction('rw', db.sessions, async () => {
      const s = await db.sessions.get(id); if (!s || s.status !== 'active') return;
      const next = reconcileClock(s.clock, Date.now());
      if (next !== s.clock) await db.sessions.put(bump({ ...s, clock: next }));
    });
  },
  async completeSet(id: string, itemId: string, setId: string) {
    await repository.mutateSession(id, (s, now) => {
      const item = s.items.find(i => i.id === itemId)!; const set = item.sets.find(x => x.id === setId)!;
      if (set.status === 'completed') { set.status = 'planned'; set.completedAt = null; return; }
      if (!validCompletedSet(item, set)) throw new Error('Enter reps and load, or a positive duration/distance, before completing this set.');
      set.status = 'completed'; set.completedAt = now;
      if (s.status === 'active') s.rest = startRest(item.restSeconds, now, set.id);
    });
  },
  async finish(id: string) {
    await repository.mutateSession(id, (s, now) => {
      if (!s.items.some(i => i.sets.some(set => set.status === 'completed'))) throw new Error('Complete at least one set before finishing.');
      s.clock = pauseClock(s.clock, now); s.status = 'completed'; s.finishedAt = now; s.rest = stoppedRest();
    });
  },
};

export const backupSchema = z.object({
  format: z.literal('form-backup'), version: z.literal(1), exportedAt: z.number(),
  exercises: z.array(exerciseSchema).max(20000), templates: z.array(templateSchema).max(5000), sessions: z.array(sessionSchema).max(50000), settings: settingsSchema,
});
export type Backup = z.infer<typeof backupSchema>;
export function validateBackup(raw: unknown): Backup {
  const b = backupSchema.parse(raw);
  const unique = (ids: string[]) => { if (new Set(ids).size !== ids.length) throw new Error('Backup contains duplicate IDs.'); };
  unique(b.exercises.map(x => x.id)); unique(b.templates.map(x => x.id)); unique(b.sessions.map(x => x.id));
  const exercises = new Set(b.exercises.map(x => x.id));
  for (const aggregate of [...b.templates, ...b.sessions]) {
    unique(aggregate.items.map(x => x.id));
    unique(aggregate.items.flatMap(i => i.sets.map(s => s.id)));
    for (const item of aggregate.items) if (!exercises.has(item.exerciseId)) throw new Error('Backup has an unknown exercise reference.');
  }
  const templates = new Set(b.templates.map(t => t.id));
  for (const s of b.sessions) {
    if (s.sourceTemplateId && !templates.has(s.sourceTemplateId)) throw new Error('Backup has an unknown template reference.');
    if ((s.status === 'completed') !== (s.finishedAt !== null)) throw new Error('Backup has inconsistent workout completion state.');
    if (s.clock.runningSince !== null && s.status !== 'active') throw new Error('Finished workout has a running duration clock.');
    if (s.rest.status === 'running' && s.rest.deadline === null) throw new Error('Running rest timer has no deadline.');
    if (s.rest.status !== 'running' && s.rest.deadline !== null) throw new Error('Inactive rest timer has an unexpected deadline.');
    if (s.rest.setId && !s.items.some(i => i.sets.some(set => set.id === s.rest.setId))) throw new Error('Rest timer references an unknown set.');
    for (const item of s.items) for (const set of item.sets) {
      if ((set.status === 'completed') !== (set.completedAt !== null)) throw new Error('Backup has inconsistent set completion state.');
      if (set.status === 'completed' && !validCompletedSet(item, set)) throw new Error('Backup contains an incomplete completed set.');
    }
  }
  if (b.sessions.filter(s => s.status === 'active' && !s.deletedAt).length > 1) throw new Error('Backup contains more than one active workout.');
  return b;
}
export async function exportBackup(database = db): Promise<Backup> {
  return database.transaction('r', [database.exercises, database.templates, database.sessions, database.settings], async () => ({
    format: 'form-backup', version: 1, exportedAt: Date.now(), exercises: await database.exercises.toArray(), templates: await database.templates.toArray(), sessions: await database.sessions.toArray(), settings: await database.settings.get('settings') ?? defaults,
  }));
}
export async function restoreBackup(raw: unknown, database = db) {
  const b = validateBackup(raw);
  await database.transaction('rw', [database.exercises, database.templates, database.sessions, database.settings], async () => {
    await database.exercises.clear(); await database.templates.clear(); await database.sessions.clear(); await database.settings.clear();
    await database.exercises.bulkPut(b.exercises); await database.templates.bulkPut(b.templates); await database.sessions.bulkPut(b.sessions); await database.settings.put(b.settings);
  });
}
export function sessionDuration(s: Session, now = Date.now()) { return elapsed(s.clock, now); }
