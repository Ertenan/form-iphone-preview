import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { exportBackup, FormDatabase, initialize, validateBackup } from './db';

let database: FormDatabase;
beforeEach(async () => { database = new FormDatabase(`preview-test-${crypto.randomUUID()}`); await database.open(); });
afterEach(async () => { await database.delete(); });

describe('opt-in synthetic iPhone preview', () => {
  it('keeps regular builds free of fabricated workouts or templates', async () => {
    await initialize(database, false);
    expect(await database.templates.count()).toBe(0); expect(await database.sessions.count()).toBe(0);
  });
  it('seeds a valid labeled journal with the three explicit load conventions', async () => {
    await initialize(database, true);
    const backup = validateBackup(await exportBackup(database));
    expect(backup.templates).toHaveLength(1); expect(backup.sessions).toHaveLength(1);
    expect(backup.templates[0].name).toMatch(/^SAMPLE/); expect(backup.sessions[0].name).toMatch(/^SAMPLE/);
    expect(backup.sessions[0].status).toBe('completed');
    expect(backup.templates[0].items.map(x => x.convention)).toEqual(['per-dumbbell', 'assistance', 'added']);
    expect(backup.sessions[0].items[0].sets[0].actual).toMatchObject({ load: 20, reps: 10, rir: 2 });
  });
  it('never re-seeds over an existing journal, including after a restore', async () => {
    await initialize(database, true);
    const template = (await database.templates.toArray())[0];
    await database.templates.update(template.id, { name: 'My iPhone test' });
    await database.sessions.clear();
    await initialize(database, true);
    expect(await database.templates.count()).toBe(1); expect(await database.sessions.count()).toBe(0);
    expect((await database.templates.get(template.id))!.name).toBe('My iPhone test');
  });
  it('does not retrofit fixtures into an already initialized regular journal', async () => {
    await initialize(database, false); await initialize(database, true);
    expect(await database.templates.count()).toBe(0); expect(await database.sessions.count()).toBe(0);
  });
});
