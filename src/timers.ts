import type { Clock, Rest } from './model';
export const INACTIVITY_MS = 60 * 60 * 1000;
export function reconcileClock(clock: Clock, now: number): Clock {
  if (clock.runningSince === null || now < clock.lastInteractionAt + INACTIVITY_MS) return clock;
  const end = Math.max(clock.runningSince, clock.lastInteractionAt + INACTIVITY_MS);
  return { ...clock, accumulatedMs: clock.accumulatedMs + Math.max(0, end - clock.runningSince), runningSince: null, pauseReason: 'inactivity' };
}
export function elapsed(clock: Clock, now: number) {
  const c = reconcileClock(clock, now);
  return c.overrideMs ?? c.accumulatedMs + (c.runningSince === null ? 0 : Math.max(0, now - c.runningSince));
}
export function pauseClock(clock: Clock, now: number): Clock {
  const c = reconcileClock(clock, now);
  return { ...c, accumulatedMs: c.accumulatedMs + (c.runningSince === null ? 0 : Math.max(0, now - c.runningSince)), runningSince: null, pauseReason: 'manual' };
}
export function resumeClock(clock: Clock, now: number): Clock {
  const c = reconcileClock(clock, now);
  return { ...c, runningSince: now, lastInteractionAt: now, pauseReason: null, overrideMs: null };
}
export const restRemaining = (rest: Rest, now: number) => rest.status === 'running' && rest.deadline !== null ? Math.max(0, rest.deadline - now) : rest.remainingMs;
export const stoppedRest = (): Rest => ({ status: 'stopped', deadline: null, remainingMs: 0, durationMs: 0, setId: null });
export const startRest = (seconds: number, now: number, setId: string | null = null): Rest => ({ status: 'running', durationMs: seconds * 1000, remainingMs: seconds * 1000, deadline: now + seconds * 1000, setId });
export function pauseRest(rest: Rest, now: number): Rest { return { ...rest, status: 'paused', remainingMs: restRemaining(rest, now), deadline: null }; }
export function resumeRest(rest: Rest, now: number): Rest { return { ...rest, status: 'running', deadline: now + rest.remainingMs }; }
export function overrideRest(rest: Rest, seconds: number, now: number): Rest {
  const ms = Math.min(3600000, Math.max(0, seconds * 1000));
  return { ...rest, durationMs: ms, remainingMs: ms, deadline: rest.status === 'running' ? now + ms : null };
}
export function formatTime(ms: number) {
  const s = Math.floor(Math.max(0, ms) / 1000);
  return s >= 3600 ? `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
