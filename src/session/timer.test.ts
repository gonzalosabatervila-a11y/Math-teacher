import { describe, expect, it } from 'vitest';

import type { ActiveSession } from '../state/personal-state';
import { elapsedSeconds, pauseSession, resumeSession } from './timer';

const session = (overrides: Partial<ActiveSession> = {}): ActiveSession => ({
  id: 'active-1',
  week: 2,
  session: 1,
  startedAt: '2026-10-16T10:00:00.000Z',
  lastResumedAt: '2026-10-16T10:10:00.000Z',
  accumulatedSeconds: 120,
  isRunning: true,
  phaseId: 'recall',
  activeProtocolStep: 1,
  completedSteps: [],
  messages: [],
  draftPostmortem: null,
  ...overrides,
});

describe('recoverable session timer', () => {
  it('recovers elapsed time after a background gap from the resume timestamp and accumulated seconds', () => {
    expect(elapsedSeconds(session(), Date.parse('2026-10-16T10:11:30.000Z'))).toBe(210);
  });

  it('does not advance while paused and caps elapsed time at 3600 seconds', () => {
    expect(elapsedSeconds(session({ isRunning: false, lastResumedAt: null }), Date.parse('2026-10-16T11:00:00.000Z'))).toBe(120);
    expect(elapsedSeconds(session(), Date.parse('2026-10-16T12:00:00.000Z'))).toBe(3_600);
  });

  it('materializes elapsed time when pausing and resumes from a fresh timestamp', () => {
    const paused = pauseSession(session(), Date.parse('2026-10-16T10:11:30.000Z'));
    expect(paused).toMatchObject({ accumulatedSeconds: 210, isRunning: false, lastResumedAt: null });

    const resumed = resumeSession(paused, Date.parse('2026-10-16T10:20:00.000Z'));
    expect(resumed).toMatchObject({ isRunning: true, lastResumedAt: '2026-10-16T10:20:00.000Z' });
  });
});
