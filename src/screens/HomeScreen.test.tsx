import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { createDefaultPersonalState } from '../state/personal-state';
import { HomeScreen } from './HomeScreen';

describe('HomeScreen', () => {
  it('shows Continuar with active context plus due reviews and recent sessions', () => {
    const state = createDefaultPersonalState(0);
    state.activeSession = {
      id: 'active', week: 4, session: 2, startedAt: '2026-10-16T10:00:00.000Z', lastResumedAt: null,
      accumulatedSeconds: 600, isRunning: false, phaseId: 'problem', activeProtocolStep: 3,
      completedSteps: [1, 2], messages: [], draftPostmortem: null,
    };
    state.completedSessions = [{
      id: 'done', week: 3, session: 1, startedAt: '2026-10-14T10:00:00.000Z', completedAt: '2026-10-14T11:00:00.000Z',
      durationSeconds: 3_000, completedSteps: [1], summary: 'Límites',
      postmortem: { errorType: 'conceptual', description: '', correctedRule: '', variantProblem48h: '', masteredConcepts: [], openConcepts: [], recurringErrors: [], pendingProblem: '', nextRepetitionHours: 48 },
    }];
    state.reviews = [{ id: 'review', sourceSessionId: 'done', variantProblem: 'Calcula el límite', dueAt: '2026-10-15T10:00:00.000Z', completedAt: null, status: 'pending' }];
    const onContinue = vi.fn();
    render(<HomeScreen state={state} now={Date.parse('2026-10-16T10:00:00.000Z')} onContinue={onContinue} onStart={vi.fn()} onCompleteReview={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /continuar semana 4, sesión 2/i }));
    expect(onContinue).toHaveBeenCalled();
    expect(screen.getByText('Calcula el límite')).toBeInTheDocument();
    expect(screen.getByText('Límites')).toBeInTheDocument();
  });
});
