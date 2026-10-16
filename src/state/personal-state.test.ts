import { describe, expect, it } from 'vitest';

import { createDefaultPersonalState, validatePersonalState } from './personal-state';

describe('personal state model', () => {
  it('drops images and bounds active messages to the newest 40', () => {
    const state = createDefaultPersonalState(1_700_000_000_000);
    const messages = Array.from({ length: 45 }, (_, index) => ({
      id: `message-${index}`,
      role: index % 2 === 0 ? 'assistant' : 'user',
      content: `Contenido ${index}`,
      timestamp: index,
      imageSnapshot: 'data:image/jpeg;base64,/9j/AA==',
    }));

    const validated = validatePersonalState({
      ...state,
      activeSession: {
        id: 'active-1',
        week: 3,
        session: 2,
        startedAt: '2026-10-16T08:00:00.000Z',
        lastResumedAt: null,
        accumulatedSeconds: 120,
        isRunning: false,
        phaseId: 'theory',
        activeProtocolStep: 2,
        completedSteps: [1],
        messages,
        draftPostmortem: null,
      },
    });

    expect(validated?.activeSession?.messages).toHaveLength(40);
    expect(validated?.activeSession?.messages[0].id).toBe('message-5');
    expect(validated?.activeSession?.messages.every((message) => !message.imageSnapshot)).toBe(true);
  });

  it('bounds history to 50 sessions and reviews to 100 items', () => {
    const state = createDefaultPersonalState(1_700_000_000_000);
    const completedSessions = Array.from({ length: 55 }, (_, index) => ({
      id: `session-${index}`,
      week: index % 14,
      session: 1,
      startedAt: '2026-10-16T08:00:00.000Z',
      completedAt: '2026-10-16T09:00:00.000Z',
      durationSeconds: 3600,
      completedSteps: [1, 2],
      summary: `Resumen ${index}`,
      postmortem: {
        errorType: 'conceptual',
        description: 'Descripción',
        correctedRule: 'Regla',
        variantProblem48h: 'Variante',
        masteredConcepts: [],
        openConcepts: [],
        recurringErrors: [],
        pendingProblem: '',
        nextRepetitionHours: 48,
      },
    }));
    const reviews = Array.from({ length: 105 }, (_, index) => ({
      id: `review-${index}`,
      sourceSessionId: `session-${index}`,
      variantProblem: `Variante ${index}`,
      dueAt: '2026-10-18T09:00:00.000Z',
      completedAt: null,
      status: 'pending',
    }));

    const validated = validatePersonalState({ ...state, completedSessions, reviews });

    expect(validated?.completedSessions).toHaveLength(50);
    expect(validated?.completedSessions[0].id).toBe('session-5');
    expect(validated?.reviews).toHaveLength(100);
    expect(validated?.reviews[0].id).toBe('review-5');
  });
});
