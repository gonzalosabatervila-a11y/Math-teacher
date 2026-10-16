import { describe, expect, it } from 'vitest';

import { createDefaultPersonalState } from '../state/personal-state';
import type { PostmortemData } from '../types/tutor';
import { finishSession, startSession } from './session-controller';

const postmortem = (variantProblem48h = 'Resuelve 2x + 4 = 12'): PostmortemData => ({
  errorType: 'conceptual',
  description: 'Confundí el signo al trasladar un término.',
  correctedRule: 'Aplicar la misma operación en ambos miembros.',
  variantProblem48h,
  masteredConcepts: ['ecuaciones lineales'],
  openConcepts: ['comprobación'],
  recurringErrors: ['cambio de signo'],
  pendingProblem: '',
  nextRepetitionHours: 48,
});

describe('session workflow', () => {
  it('finishes into immutable history and clears the active session', () => {
    const initial = createDefaultPersonalState(Date.parse('2026-10-16T09:00:00.000Z'));
    const started = startSession(initial, { week: 3, session: 2 }, Date.parse('2026-10-16T10:00:00.000Z'));
    const finished = finishSession(started, postmortem(), Date.parse('2026-10-16T10:45:00.000Z'));

    expect(initial.activeSession).toBeNull();
    expect(started.activeSession).not.toBeNull();
    expect(finished.activeSession).toBeNull();
    expect(finished.completedSessions).toHaveLength(1);
    expect(finished.completedSessions[0]).toMatchObject({
      week: 3,
      session: 2,
      durationSeconds: 2_700,
      completedAt: '2026-10-16T10:45:00.000Z',
    });
  });

  it('does not create a review when the variant problem is blank', () => {
    const started = startSession(createDefaultPersonalState(0), { week: 1, session: 1 }, 0);
    const finished = finishSession(started, postmortem('   '), 1_000);
    expect(finished.reviews).toEqual([]);
  });
});
