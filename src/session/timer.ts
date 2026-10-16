import type { ActiveSession } from '../state/personal-state';

const MAX_SESSION_SECONDS = 3_600;

export function elapsedSeconds(session: ActiveSession, now: number): number {
  if (!session.isRunning) return Math.min(MAX_SESSION_SECONDS, session.accumulatedSeconds);
  const anchor = Date.parse(session.lastResumedAt ?? session.startedAt);
  const elapsedSinceAnchor = Math.max(0, Math.floor((now - anchor) / 1_000));
  return Math.min(MAX_SESSION_SECONDS, session.accumulatedSeconds + elapsedSinceAnchor);
}

export function pauseSession(session: ActiveSession, now: number): ActiveSession {
  if (!session.isRunning) return session;
  return {
    ...session,
    accumulatedSeconds: elapsedSeconds(session, now),
    isRunning: false,
    lastResumedAt: null,
  };
}

export function resumeSession(session: ActiveSession, now: number): ActiveSession {
  if (session.isRunning || session.accumulatedSeconds >= MAX_SESSION_SECONDS) return session;
  return {
    ...session,
    isRunning: true,
    lastResumedAt: new Date(now).toISOString(),
  };
}
