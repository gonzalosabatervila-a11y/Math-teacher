import { describe, expect, it } from 'vitest';

import { createDefaultPersonalState } from '../state/personal-state';
import { completeReview, scheduleReview } from './reviews';

describe('review scheduling', () => {
  it('schedules a variant problem exactly 48 hours after completion', () => {
    const completedAt = Date.parse('2026-10-16T12:00:00.000Z');
    const review = scheduleReview('session-1', '  Calcula el límite equivalente.  ', completedAt);

    expect(review).toMatchObject({
      sourceSessionId: 'session-1',
      variantProblem: 'Calcula el límite equivalente.',
      dueAt: '2026-10-18T12:00:00.000Z',
      completedAt: null,
      status: 'pending',
    });
  });

  it('marks a review complete without assigning a score', () => {
    const initial = createDefaultPersonalState(0);
    initial.reviews = [scheduleReview('session-1', 'Problema variante', 0)!];
    const finished = completeReview(initial, initial.reviews[0].id, Date.parse('2026-10-19T12:00:00.000Z'));

    expect(finished.reviews[0]).toEqual({
      ...initial.reviews[0],
      status: 'completed',
      completedAt: '2026-10-19T12:00:00.000Z',
    });
    expect(finished.reviews[0]).not.toHaveProperty('score');
  });
});
