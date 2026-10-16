import { PersonalStateRepository } from '../state/personal-state-repository';
import type { ActiveSession } from '../state/personal-state';
import type { ChatMessage } from '../types/tutor';

export interface PersistedTutorState {
  week: number;
  session: number;
  messages: ChatMessage[];
}

export function loadTutorState(storage: Storage): PersistedTutorState {
  const state = new PersonalStateRepository(storage).load();
  return {
    week: state.selection.week,
    session: state.selection.session,
    messages: state.activeSession?.messages ?? [],
  };
}

export function saveTutorState(storage: Storage, state: PersistedTutorState): void {
  const repository = new PersonalStateRepository(storage);
  const current = repository.load();
  const now = Date.now();
  const existing = current.activeSession;
  const activeSession: ActiveSession | null = state.messages.length === 0 && !existing
    ? null
    : {
        id: existing?.id ?? `session-${now}`,
        week: state.week,
        session: state.session,
        startedAt: existing?.startedAt ?? new Date(now).toISOString(),
        lastResumedAt: existing?.lastResumedAt ?? null,
        accumulatedSeconds: existing?.accumulatedSeconds ?? 0,
        isRunning: existing?.isRunning ?? false,
        phaseId: existing?.phaseId ?? 'recall',
        activeProtocolStep: existing?.activeProtocolStep ?? 1,
        completedSteps: existing?.completedSteps ?? [],
        messages: state.messages,
        draftPostmortem: existing?.draftPostmortem ?? null,
      };

  repository.save({
    ...current,
    selection: { week: state.week, session: state.session },
    activeSession,
    updatedAt: new Date(now).toISOString(),
  });
}
