import { blankValues, defaults, makeSet, meta, sessionSchema, templateSchema, type Exercise, type WorkoutItem } from './model';
import { stoppedRest } from './timers';

declare const __IPHONE_PREVIEW__: boolean;
export const IS_IPHONE_PREVIEW = __IPHONE_PREVIEW__;
export const PREVIEW_BUILD = 'iphone-core-2026-10-23.1';

/** Fictional fixtures for the dedicated test build. Never replaces an existing journal. */
export function createPreviewRecords(exercises: Exercise[], now = Date.now()) {
  const prescriptions: [string, number, number][] = [
    ['Dumbbell bench press', 20, 10],
    ['Assisted pull-up', 30, 8],
    ['Weighted pull-up', 5, 6],
  ];
  const items: WorkoutItem[] = prescriptions.map(([name, load, reps]) => {
    const e = exercises.find(x => x.name === name);
    if (!e) throw new Error(`Synthetic fixture is missing ${name}.`);
    return {
      id: crypto.randomUUID(), exerciseId: e.id, name: e.name, convention: e.convention,
      instructions: e.instructions, restSeconds: 90, notes: 'Synthetic test values only.',
      sets: Array.from({ length: 2 }, () => ({ ...makeSet(), target: { ...blankValues(), load, reps, rir: 2 } })),
    };
  });
  const template = templateSchema.parse({ ...meta(), name: 'SAMPLE · Upper body', notes: 'Fictional iPhone test routine. These values are not a training prescription.', items });
  const startedAt = now - 86400000;
  const finishedAt = startedAt + 12 * 60000;
  const session = sessionSchema.parse({
    ...meta(), name: 'SAMPLE · Previous session', status: 'completed',
    sourceTemplateId: template.id, sourceTemplateRevision: template.localRevision,
    startedAt, finishedAt, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    bodyweight: null, bodyweightUnit: defaults.unit, notes: 'Synthetic history for testing previous performance. No real workout was performed.',
    items: template.items.map(item => ({
      ...structuredClone(item), id: crypto.randomUUID(), sets: item.sets.map(set => ({
        ...structuredClone(set), id: crypto.randomUUID(), status: 'completed', actual: structuredClone(set.target), completedAt: finishedAt,
      })),
    })),
    clock: { accumulatedMs: 12 * 60000, runningSince: null, lastInteractionAt: finishedAt, pauseReason: 'manual', overrideMs: null },
    rest: stoppedRest(),
  });
  return { template, session };
}
