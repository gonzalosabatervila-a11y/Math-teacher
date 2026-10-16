import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import App from './App';
import { createDefaultPersonalState } from './state/personal-state';
import { PERSONAL_STATE_KEY } from './state/personal-state-repository';

describe('personal app workflow', () => {
  beforeEach(() => localStorage.clear());

  it('keeps an active session when replacement is cancelled and starts a replacement only after confirmation', () => {
    const state = createDefaultPersonalState(Date.parse('2026-10-16T10:00:00.000Z'));
    state.activeSession = {
      id: 'original', week: 5, session: 2, startedAt: '2026-10-16T10:00:00.000Z', lastResumedAt: null,
      accumulatedSeconds: 900, isRunning: false, phaseId: 'problem', activeProtocolStep: 3,
      completedSteps: [1, 2], messages: [], draftPostmortem: null,
    };
    localStorage.setItem(PERSONAL_STATE_KEY, JSON.stringify(state));
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Nueva sesión' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByRole('button', { name: /continuar semana 5, sesión 2/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Nueva sesión' }));
    fireEvent.click(screen.getByRole('button', { name: 'Empezar nueva' }));
    expect(screen.getByText('Sesión activa')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /continuar semana 5, sesión 2/i })).not.toBeInTheDocument();
  });
});
