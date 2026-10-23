import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db, exportBackup, initialize, itemFromExercise, repository, restoreBackup, validateBackup } from './db';
import { defaults, meta, validCompletedSet, type Template } from './model';
import { INACTIVITY_MS } from './timers';

beforeEach(async () => { await db.open(); await initialize(); });
afterEach(async () => { await db.delete(); });
const firstExercise = async () => (await db.exercises.where('name').equals('Barbell bench press').first())!;
async function templateFixture(): Promise<Template> {
  const t: Template = { ...meta(), name: 'Upper A', notes: '', items: [itemFromExercise(await firstExercise(), defaults)] };
  t.items[0].sets[0].target.reps = 8; t.items[0].sets[0].target.load = 40;
  await repository.saveTemplate(t); return (await db.templates.get(t.id))!;
}
describe('local-first repository', () => {
  it('seeds once and leaves user data intact on initialization', async () => {
    const count = await db.exercises.count(); await initialize(); expect(await db.exercises.count()).toBe(count);
  });
  it('allows only one active workout even with concurrent starts', async () => {
    const ids = await Promise.all([repository.start(), repository.start(), repository.start()]);
    expect(new Set(ids).size).toBe(1); expect(await db.sessions.count()).toBe(1);
  });
  it('snapshots templates and targets independently of actual results', async () => {
    const t = await templateFixture(); const id = await repository.start(t);
    const s = (await db.sessions.get(id))!;
    expect(s.items[0].sets[0].target.reps).toBe(8); expect(s.items[0].sets[0].actual.reps).toBeNull();
    expect(s.items[0].id).not.toBe(t.items[0].id);
    t.name = 'Changed'; t.items[0].name = 'Renamed'; t.items[0].sets[0].target.reps = 12; await repository.saveTemplate(t);
    expect((await db.sessions.get(id))!.items[0].sets[0].target.reps).toBe(8);
    expect((await db.sessions.get(id))!.name).toBe('Upper A');
  });
  it('serializes sibling edits without losing either edit and survives reopening', async () => {
    const id = await repository.start(await templateFixture());
    await Promise.all([
      repository.mutateSession(id, s => { s.items[0].sets[0].actual.reps = 10; }),
      repository.mutateSession(id, s => { s.items[0].sets[0].actual.load = 25; }),
    ]);
    db.close(); await db.open();
    const actual = (await db.sessions.get(id))!.items[0].sets[0].actual;
    expect(actual.reps).toBe(10); expect(actual.load).toBe(25);
  });
  it('starts rest on completion and freezes the clock on finish', async () => {
    const id = await repository.start(await templateFixture());
    await repository.mutateSession(id, s => { Object.assign(s.items[0].sets[0].actual, { reps: 8, load: 30 }); });
    const s = (await db.sessions.get(id))!;
    await repository.completeSet(id, s.items[0].id, s.items[0].sets[0].id);
    expect((await db.sessions.get(id))!.rest.status).toBe('running');
    await repository.finish(id); const finished = (await db.sessions.get(id))!;
    expect(finished.status).toBe('completed'); expect(finished.clock.runningSince).toBeNull(); expect(finished.rest.status).toBe('stopped');
  });
  it('rejects invalid completion without modifying persisted records', async () => {
    const id = await repository.start(await templateFixture()); const s = (await db.sessions.get(id))!;
    await expect(repository.completeSet(id, s.items[0].id, s.items[0].sets[0].id)).rejects.toThrow('Enter reps');
    expect((await db.sessions.get(id))!.localRevision).toBe(s.localRevision);
  });
  it('reconciles an idle clock before a new edit without silently resuming', async () => {
    const id = await repository.start(); const longAgo = Date.now() - 3 * INACTIVITY_MS;
    await db.sessions.update(id, { clock: { accumulatedMs: 0, runningSince: longAgo, lastInteractionAt: longAgo, pauseReason: null, overrideMs: null } });
    await repository.mutateSession(id, s => { s.notes = 'Back at it'; }); const s = (await db.sessions.get(id))!;
    expect(s.clock.accumulatedMs).toBe(INACTIVITY_MS); expect(s.clock.runningSince).toBeNull(); expect(s.clock.pauseReason).toBe('inactivity');
  });
  it('converts optional bodyweight when preferred units change', async () => {
    await repository.saveSettings({ unit: 'kg', bodyweight: 80 }); await repository.saveSettings({ unit: 'lb' });
    expect((await db.settings.get('settings'))!.bodyweight).toBe(176.37);
  });
  it('validates loaded, assisted, bodyweight and conditioning sets consistently', async () => {
    const item = itemFromExercise(await firstExercise(), defaults); const set = item.sets[0];
    Object.assign(set.actual, { load: 0, reps: 10 });
    for (const convention of ['total', 'per-dumbbell', 'assistance', 'added'] as const) {
      item.convention = convention; expect(validCompletedSet(item, set)).toBe(true);
      set.actual.load = null; expect(validCompletedSet(item, set)).toBe(false); set.actual.load = 0;
    }
    item.convention = 'bodyweight'; set.actual.load = null; expect(validCompletedSet(item, set)).toBe(true);
    item.convention = 'timed'; expect(validCompletedSet(item, set)).toBe(false); set.actual.seconds = 60; expect(validCompletedSet(item, set)).toBe(true);
    item.convention = 'distance'; set.actual.meters = 1000; expect(validCompletedSet(item, set)).toBe(true);
  });
  it('returns an edited incomplete result to planned and clears orphaned rest references', async () => {
    const id = await repository.start(await templateFixture());
    await repository.mutateSession(id, s => { Object.assign(s.items[0].sets[0].actual, { reps: 8, load: 30 }); });
    const s = (await db.sessions.get(id))!;
    await repository.completeSet(id, s.items[0].id, s.items[0].sets[0].id);
    await repository.mutateSession(id, s => { s.items[0].sets[0].actual.reps = null; });
    expect((await db.sessions.get(id))!.items[0].sets[0].status).toBe('planned');
    await repository.mutateSession(id, s => { s.items = []; });
    expect((await db.sessions.get(id))!.rest.status).toBe('stopped');
  });
});
describe('validated atomic backups', () => {
  it('round trips templates, partial workouts, preferences and timer state', async () => {
    const t = await templateFixture(); const id = await repository.start(t);
    await repository.mutateSession(id, s => { s.rest = { status: 'paused', remainingMs: 45000, durationMs: 90000, deadline: null, setId: null }; s.items[0].sets[0].actual.reps = 7; });
    const b = await exportBackup(); await repository.saveSettings({ effort: 'RPE' }); await restoreBackup(b);
    expect(await exportBackup()).toEqual({ ...b, exportedAt: expect.any(Number) });
  });
  it('rejects unknown versions, duplicate IDs and dangling references before changing data', async () => {
    await repository.start(await templateFixture()); const b = await exportBackup();
    expect(() => validateBackup({ ...b, version: 99 })).toThrow();
    expect(() => validateBackup({ ...b, exercises: [...b.exercises, b.exercises[0]] })).toThrow('duplicate');
    await expect(restoreBackup({ ...b, exercises: [] })).rejects.toThrow('reference');
    expect(await db.exercises.count()).toBe(b.exercises.length);
  });
  it('rejects multiple active sessions and invalid nested values', async () => {
    await repository.start(); const b = await exportBackup();
    expect(() => validateBackup({ ...b, sessions: [...b.sessions, { ...b.sessions[0], id: crypto.randomUUID() }] })).toThrow('more than one active');
    expect(() => validateBackup({ ...b, settings: { ...b.settings, restSeconds: -1 } })).toThrow();
  });
  it('rolls back an entire replacement when a storage write fails', async () => {
    await repository.start(await templateFixture()); const before = await exportBackup();
    const replacement = structuredClone(before); replacement.exercises[0].name = 'FAIL_RESTORE';
    const reject = (_key: unknown, value: { name?: string }) => { if (value.name === 'FAIL_RESTORE') throw new Error('Simulated quota error'); };
    db.exercises.hook('creating', reject);
    try { await expect(restoreBackup(replacement)).rejects.toThrow('Simulated quota'); }
    finally { db.exercises.hook('creating').unsubscribe(reject); }
    expect(await exportBackup()).toEqual({ ...before, exportedAt: expect.any(Number) });
  });
});
