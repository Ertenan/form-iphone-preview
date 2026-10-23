import { describe, expect, it } from 'vitest';
import { defaults, effortDisplay, toRir, valuesSchema } from './model';
import { elapsed, INACTIVITY_MS, overrideRest, pauseClock, pauseRest, reconcileClock, restRemaining, resumeClock, resumeRest, startRest } from './timers';

const clock = () => ({ accumulatedMs: 0, runningSince: 1000, lastInteractionAt: 1000, pauseReason: null, overrideMs: null });
describe('persisted workout duration', () => {
  it('caps duration at 60 idle minutes, including a suspended app', () => {
    expect(elapsed(clock(), 1000 + INACTIVITY_MS * 4)).toBe(INACTIVITY_MS);
    const recovered = reconcileClock(clock(), INACTIVITY_MS * 4);
    expect(recovered.runningSince).toBeNull(); expect(recovered.pauseReason).toBe('inactivity');
  });
  it('cuts off at the exact boundary', () => {
    expect(reconcileClock(clock(), 1000 + INACTIVITY_MS - 1).runningSince).toBe(1000);
    expect(reconcileClock(clock(), 1000 + INACTIVITY_MS).runningSince).toBeNull();
  });
  it('does not include time during a manual pause', () => {
    const paused = pauseClock(clock(), 31000);
    expect(elapsed(paused, INACTIVITY_MS * 3)).toBe(30000);
    const resumed = resumeClock(paused, 50000);
    expect(elapsed(resumed, 60000)).toBe(40000);
  });
  it('reconciles inactivity before resuming and does not double count', () => {
    const resumed = resumeClock(clock(), INACTIVITY_MS * 3);
    expect(elapsed(resumed, INACTIVITY_MS * 3 + 5000)).toBe(INACTIVITY_MS + 5000);
  });
  it('moves the cutoff after meaningful activity', () => {
    const c = { ...clock(), lastInteractionAt: 2000 };
    expect(elapsed(c, 2000 + INACTIVITY_MS * 2)).toBe(INACTIVITY_MS + 1000);
  });
  it('retains the recorded clock under manual duration correction', () => {
    const c = { ...pauseClock(clock(), 31000), overrideMs: 180000 };
    expect(elapsed(c, 999999)).toBe(180000); expect(c.accumulatedMs).toBe(30000);
  });
});
describe('persisted rest timer', () => {
  it('recovers deadline after JSON serialization and suspension', () => {
    const rest = JSON.parse(JSON.stringify(startRest(90, 1000)));
    expect(restRemaining(rest, 31000)).toBe(60000); expect(restRemaining(rest, 200000)).toBe(0);
  });
  it('preserves remaining time during pause and resumes with a new deadline', () => {
    const paused = pauseRest(startRest(90, 1000), 31000);
    expect(restRemaining(paused, 200000)).toBe(60000);
    const resumed = resumeRest(paused, 300000);
    expect(restRemaining(resumed, 320000)).toBe(40000);
  });
  it('supports running and paused manual overrides, clamped to bounds', () => {
    expect(restRemaining(overrideRest(startRest(90, 0), 45, 20000), 25000)).toBe(40000);
    const paused = overrideRest(pauseRest(startRest(90, 0), 20000), 45, 20000);
    expect(restRemaining(paused, 999999)).toBe(45000);
    expect(overrideRest(paused, -20, 0).remainingMs).toBe(0);
    expect(overrideRest(paused, 99999, 0).remainingMs).toBe(3600000);
  });
});
describe('canonical effort and numeric values', () => {
  it('round trips half-step RPE through RIR without changing effort', () => {
    expect(toRir(8.5, 'RPE')).toBe(1.5); expect(effortDisplay(1.5, 'RPE')).toBe(8.5);
    expect(effortDisplay(1.5, 'RIR')).toBe(1.5); expect(toRir(null, 'RPE')).toBeNull();
  });
  it('rejects negative assistance and malformed effort, preserving null versus zero', () => {
    const values = { reps: 10, load: 0, unit: defaults.unit, rir: 0, seconds: null, meters: null };
    expect(valuesSchema.parse(values).load).toBe(0);
    expect(valuesSchema.safeParse({ ...values, load: -10 }).success).toBe(false);
    expect(valuesSchema.safeParse({ ...values, rir: 1.2 }).success).toBe(false);
    expect(valuesSchema.safeParse({ ...values, load: Infinity }).success).toBe(false);
  });
});
