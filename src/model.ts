import { z } from 'zod';

const id = z.string().uuid();
const number = z.number().finite().nonnegative();
const effort = z.number().min(0).max(10).multipleOf(0.5).nullable();
export const unitSchema = z.enum(['kg', 'lb']);
export type Unit = z.infer<typeof unitSchema>;
export const metaShape = {
  id, createdAt: number, updatedAt: number, deletedAt: number.nullable(),
  localRevision: z.number().int().nonnegative(), serverRevision: z.string().nullable(), dirty: z.boolean(),
};
export const conventionSchema = z.enum(['total', 'per-dumbbell', 'assistance', 'added', 'bodyweight', 'timed', 'distance']);
export const exerciseSchema = z.object({
  ...metaShape, name: z.string().trim().min(1).max(120), muscle: z.string().max(120), equipment: z.string().max(120),
  convention: conventionSchema, instructions: z.string().max(2000), custom: z.boolean(),
});
export type Exercise = z.infer<typeof exerciseSchema>;
export const valuesSchema = z.object({
  reps: number.int().max(10000).nullable(), load: number.max(100000).nullable(), unit: unitSchema,
  rir: effort, seconds: number.max(604800).nullable(), meters: number.max(1000000).nullable(),
});
export type Values = z.infer<typeof valuesSchema>;
export const setSchema = z.object({
  id, kind: z.enum(['working', 'warmup', 'drop']), status: z.enum(['planned', 'completed', 'skipped']),
  target: valuesSchema, actual: valuesSchema, completedAt: number.nullable(),
});
export type WorkoutSet = z.infer<typeof setSchema>;
export const itemSchema = z.object({
  id, exerciseId: id, name: z.string().min(1), convention: conventionSchema,
  instructions: z.string(), restSeconds: number.max(3600), notes: z.string().max(5000), sets: z.array(setSchema).max(100),
});
export type WorkoutItem = z.infer<typeof itemSchema>;
export const templateSchema = z.object({
  ...metaShape, name: z.string().trim().min(1).max(120), notes: z.string().max(5000), items: z.array(itemSchema).max(100),
});
export type Template = z.infer<typeof templateSchema>;
export const clockSchema = z.object({
  accumulatedMs: number, runningSince: number.nullable(), lastInteractionAt: number,
  pauseReason: z.enum(['manual', 'inactivity']).nullable(), overrideMs: number.nullable(),
});
export type Clock = z.infer<typeof clockSchema>;
export const restSchema = z.object({
  status: z.enum(['running', 'paused', 'stopped']), durationMs: number.max(3600000), remainingMs: number.max(3600000),
  deadline: number.nullable(), setId: id.nullable(),
});
export type Rest = z.infer<typeof restSchema>;
export const sessionSchema = z.object({
  ...metaShape, name: z.string().trim().min(1).max(120), status: z.enum(['active', 'completed', 'discarded']),
  sourceTemplateId: id.nullable(), sourceTemplateRevision: number.nullable(),
  startedAt: number, finishedAt: number.nullable(), timezone: z.string(), bodyweight: number.nullable(), bodyweightUnit: unitSchema,
  notes: z.string().max(5000), items: z.array(itemSchema).max(100), clock: clockSchema, rest: restSchema,
});
export type Session = z.infer<typeof sessionSchema>;
export const settingsSchema = z.object({
  id: z.literal('settings'), unit: unitSchema, effort: z.enum(['RIR', 'RPE']), restSeconds: number.max(3600),
  bodyweight: number.max(1000).nullable(), lastBackupAt: number.nullable(),
});
export type Settings = z.infer<typeof settingsSchema>;
export const defaults: Settings = { id: 'settings', unit: 'kg', effort: 'RIR', restSeconds: 90, bodyweight: null, lastBackupAt: null };
export const blankValues = (unit: Unit = 'kg'): Values => ({ reps: null, load: null, unit, rir: null, seconds: null, meters: null });
export const meta = () => ({ id: crypto.randomUUID(), createdAt: Date.now(), updatedAt: Date.now(), deletedAt: null, localRevision: 1, serverRevision: null, dirty: true });
export const makeSet = (unit: Unit = 'kg'): WorkoutSet => ({ id: crypto.randomUUID(), kind: 'working', status: 'planned', target: blankValues(unit), actual: blankValues(unit), completedAt: null });
export const conventionLabel: Record<Exercise['convention'], string> = {
  total: 'Total load · include the bar', 'per-dumbbell': 'Load per dumbbell · reps per side', assistance: 'Positive assistance · more is easier',
  added: 'Added load only · excludes bodyweight', bodyweight: 'Bodyweight · reps only', timed: 'Duration in seconds', distance: 'Distance in meters + duration',
};
export const toRir = (value: number | null, display: Settings['effort']) => value === null ? null : display === 'RPE' ? 10 - value : value;
export const effortDisplay = (rir: number | null, display: Settings['effort']) => rir === null ? null : display === 'RPE' ? 10 - rir : rir;
export function validCompletedSet(item: WorkoutItem, set: WorkoutSet) {
  const a = set.actual;
  if (['timed', 'distance'].includes(item.convention)) return item.convention === 'distance' ? a.meters !== null && a.meters > 0 : a.seconds !== null && a.seconds > 0;
  return a.reps !== null && a.reps > 0 && (item.convention === 'bodyweight' || a.load !== null);
}
