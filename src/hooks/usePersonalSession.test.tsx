import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createDefaultPersonalState } from '../state/personal-state';
import type { PersonalStateRepository } from '../state/personal-state-repository';
import { usePersonalSession } from './usePersonalSession';

afterEach(() => {
  vi.useRealTimers();
});

describe('usePersonalSession', () => {
  it('restores the repository state on mount', () => {
    const restored = createDefaultPersonalState(Date.parse('2026-10-16T10:00:00.000Z'));
    restored.selection = { week: 6, session: 3 };
    const repository = { load: vi.fn(() => restored), save: vi.fn() } as unknown as PersonalStateRepository;

    const { result } = renderHook(() => usePersonalSession({ repository, now: () => Date.parse('2026-10-16T10:00:00.000Z') }));

    expect(result.current.state.selection).toEqual({ week: 6, session: 3 });
    expect(repository.load).toHaveBeenCalledOnce();
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('debounces rapid state changes into one repository write after 500 ms', () => {
    vi.useFakeTimers();
    const repository = {
      load: vi.fn(() => createDefaultPersonalState(0)),
      save: vi.fn(),
    } as unknown as PersonalStateRepository;
    const { result } = renderHook(() => usePersonalSession({ repository, now: () => 1_000, tickMs: 100 }));

    act(() => {
      result.current.setSelection({ week: 2, session: 1 });
      result.current.setSelection({ week: 2, session: 2 });
      result.current.start();
    });
    act(() => { vi.advanceTimersByTime(499); });
    expect(repository.save).not.toHaveBeenCalled();

    act(() => { vi.advanceTimersByTime(1); });
    expect(repository.save).toHaveBeenCalledOnce();
    expect(repository.save).toHaveBeenLastCalledWith(expect.objectContaining({
      selection: { week: 2, session: 2 },
      activeSession: expect.objectContaining({ week: 2, session: 2 }),
    }));
  });
});
