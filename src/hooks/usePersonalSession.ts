import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { ActiveSession, PersonalStateV2, UserPreferences } from '../state/personal-state';
import type { PersonalStateRepository } from '../state/personal-state-repository';
import { finishSession, startSession, type SessionSelection } from '../session/session-controller';
import { completeReview as completeReviewState } from '../session/reviews';
import { elapsedSeconds, pauseSession, resumeSession } from '../session/timer';
import type { PostmortemData } from '../types/tutor';

export interface PersonalSessionController {
  state: PersonalStateV2;
  selection: SessionSelection;
  activeSession: ActiveSession | null;
  elapsedSeconds: number;
  completedSessions: PersonalStateV2['completedSessions'];
  reviews: PersonalStateV2['reviews'];
  preferences: UserPreferences;
  setSelection(selection: SessionSelection): void;
  start(): void;
  pause(): void;
  resume(): void;
  finish(postmortem: PostmortemData): void;
  completeReview(reviewId: string): void;
  updateActiveSession(update: Partial<ActiveSession> | ((session: ActiveSession) => ActiveSession)): void;
  setPreferences(preferences: UserPreferences): void;
  replaceState(state: PersonalStateV2): void;
}

interface UsePersonalSessionOptions {
  repository: PersonalStateRepository;
  now?: () => number;
  tickMs?: number;
}

export function usePersonalSession({
  repository,
  now = Date.now,
  tickMs = 1_000,
}: UsePersonalSessionOptions): PersonalSessionController {
  const [state, setState] = useState<PersonalStateV2>(() => repository.load());
  const [tick, setTick] = useState(0);
  const isFirstPersistenceEffect = useRef(true);

  useEffect(() => {
    const timer = window.setInterval(() => setTick((value) => value + 1), tickMs);
    return () => window.clearInterval(timer);
  }, [tickMs]);

  useEffect(() => {
    if (isFirstPersistenceEffect.current) {
      isFirstPersistenceEffect.current = false;
      return;
    }
    const timer = window.setTimeout(() => repository.save(state), 500);
    return () => window.clearTimeout(timer);
  }, [repository, state]);

  const setSelection = useCallback((selection: SessionSelection) => {
    setState((current) => ({
      ...current,
      selection,
      updatedAt: new Date(now()).toISOString(),
    }));
  }, [now]);

  const start = useCallback(() => {
    setState((current) => startSession(current, current.selection, now()));
  }, [now]);

  const pause = useCallback(() => {
    setState((current) => current.activeSession ? {
      ...current,
      activeSession: pauseSession(current.activeSession, now()),
      updatedAt: new Date(now()).toISOString(),
    } : current);
  }, [now]);

  const resume = useCallback(() => {
    setState((current) => current.activeSession ? {
      ...current,
      activeSession: resumeSession(current.activeSession, now()),
      updatedAt: new Date(now()).toISOString(),
    } : current);
  }, [now]);

  const finish = useCallback((postmortem: PostmortemData) => {
    setState((current) => finishSession(current, postmortem, now()));
  }, [now]);

  const completeReview = useCallback((reviewId: string) => {
    setState((current) => completeReviewState(current, reviewId, now()));
  }, [now]);

  const updateActiveSession = useCallback((update: Partial<ActiveSession> | ((session: ActiveSession) => ActiveSession)) => {
    setState((current) => {
      if (!current.activeSession) return current;
      const activeSession = typeof update === 'function'
        ? update(current.activeSession)
        : { ...current.activeSession, ...update };
      return { ...current, activeSession, updatedAt: new Date(now()).toISOString() };
    });
  }, [now]);

  const setPreferences = useCallback((preferences: UserPreferences) => {
    setState((current) => ({ ...current, preferences, updatedAt: new Date(now()).toISOString() }));
  }, [now]);

  const replaceState = useCallback((replacement: PersonalStateV2) => setState(replacement), []);

  return useMemo(() => ({
    state,
    selection: state.selection,
    activeSession: state.activeSession,
    elapsedSeconds: state.activeSession ? elapsedSeconds(state.activeSession, now()) : 0,
    completedSessions: state.completedSessions,
    reviews: state.reviews,
    preferences: state.preferences,
    setSelection,
    start,
    pause,
    resume,
    finish,
    completeReview,
    updateActiveSession,
    setPreferences,
    replaceState,
  }), [
    state,
    tick,
    now,
    setSelection,
    start,
    pause,
    resume,
    finish,
    completeReview,
    updateActiveSession,
    setPreferences,
    replaceState,
  ]);
}
