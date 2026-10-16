import { describe, expect, it, vi } from 'vitest';

import { loadTutorState, saveTutorState } from './persistence';
import type { ChatMessage } from '../types/tutor';
import { PERSONAL_STATE_KEY } from '../state/personal-state-repository';

function memoryStorage(initial: Record<string, string> = {}): Storage {
  const values = new Map(Object.entries(initial));
  return {
    get length() { return values.size; },
    clear: vi.fn(() => values.clear()),
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    key: vi.fn((index: number) => [...values.keys()][index] ?? null),
    removeItem: vi.fn((key: string) => { values.delete(key); }),
    setItem: vi.fn((key: string, value: string) => { values.set(key, value); }),
  };
}

describe('tutor persistence', () => {
  it.each([null, '{bad json', JSON.stringify({ week: 99, session: 0, messages: 'bad' })])(
    'falls back safely for missing, malformed, or out-of-range state',
    (stored) => {
      const storage = { getItem: vi.fn(() => stored), setItem: vi.fn() } as unknown as Storage;
      expect(loadTutorState(storage)).toEqual({ week: 1, session: 1, messages: [] });
    }
  );

  it('keeps only the newest 40 valid text messages and strips images', () => {
    const messages = Array.from({ length: 45 }, (_, index) => ({
      id: `m-${index}`,
      role: (index % 2 ? 'user' : 'assistant') as ChatMessage['role'],
      content: `message ${index}`,
      timestamp: index,
      imageSnapshot: 'data:image/jpeg;base64,/9j/AA==',
    }));
    const storage = memoryStorage();

    saveTutorState(storage, { week: 3, session: 2, messages });
    const saved = JSON.parse(storage.getItem(PERSONAL_STATE_KEY) ?? '{}');

    expect(saved.schemaVersion).toBe(2);
    expect(saved.activeSession.messages).toHaveLength(40);
    expect(saved.activeSession.messages[0].id).toBe('m-5');
    expect(saved.activeSession.messages.every((message: object) => !('imageSnapshot' in message))).toBe(true);
    expect(loadTutorState(storage)).toEqual({
      week: 3,
      session: 2,
      messages: saved.activeSession.messages,
    });
  });

  it('ignores storage quota failures', () => {
    const storage = {
      getItem: vi.fn(),
      setItem: vi.fn(() => { throw new DOMException('quota', 'QuotaExceededError'); }),
    } as unknown as Storage;
    expect(() => saveTutorState(storage, { week: 1, session: 1, messages: [] })).not.toThrow();
  });
});
