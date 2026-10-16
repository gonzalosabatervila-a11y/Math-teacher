import type { CompletedSession, PersonalStateV2 } from '../state/personal-state';
import type { PostmortemData } from '../types/tutor';
import { scheduleReview } from './reviews';
import { elapsedSeconds } from './timer';

export interface SessionSelection {
  week: number;
  session: number;
}

export function startSession(state: PersonalStateV2, selection: SessionSelection, now: number): PersonalStateV2 {
  if (state.activeSession) return state;
  const startedAt = new Date(now).toISOString();
  return {
    ...state,
    selection,
    activeSession: {
      id: `session-${now}`,
      ...selection,
      startedAt,
      lastResumedAt: startedAt,
      accumulatedSeconds: 0,
      isRunning: true,
      phaseId: 'recall',
      activeProtocolStep: 1,
      completedSteps: [],
      messages: [],
      draftPostmortem: null,
    },
    updatedAt: startedAt,
  };
}

export function finishSession(state: PersonalStateV2, postmortem: PostmortemData, now: number): PersonalStateV2 {
  const active = state.activeSession;
  if (!active) return state;
  const completedAt = new Date(now).toISOString();
  const completed: CompletedSession = {
    id: active.id,
    week: active.week,
    session: active.session,
    startedAt: active.startedAt,
    completedAt,
    durationSeconds: elapsedSeconds(active, now),
    completedSteps: [...active.completedSteps],
    summary: postmortem.description.trim() || postmortem.correctedRule.trim(),
    postmortem: {
      ...postmortem,
      masteredConcepts: [...postmortem.masteredConcepts],
      openConcepts: [...postmortem.openConcepts],
      recurringErrors: [...postmortem.recurringErrors],
    },
  };
  const review = scheduleReview(active.id, postmortem.variantProblem48h, now);
  return {
    ...state,
    activeSession: null,
    completedSessions: [...state.completedSessions, completed].slice(-50),
    reviews: review ? [...state.reviews, review].slice(-100) : state.reviews,
    updatedAt: completedAt,
  };
}
