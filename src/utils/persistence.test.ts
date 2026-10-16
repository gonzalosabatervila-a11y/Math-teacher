import { describe, expect, it, vi } from 'vitest';

import { loadTutorState, saveTutorState } from './persistence';
import type { ChatMessage } from '../types/tutor';

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
    const storage = { getItem: vi.fn(), setItem: vi.fn() } as unknown as Storage;

    saveTutorState(storage, { week: 3, session: 2, messages });
    const saved = JSON.parse((storage.setItem as ReturnType<typeof vi.fn>).mock.calls[0][1]);

    expect(saved.messages).toHaveLength(40);
    expect(saved.messages[0].id).toBe('m-5');
    expect(saved.messages.every((message: object) => !('imageSnapshot' in message))).toBe(true);
  });

  it('ignores storage quota failures', () => {
    const storage = {
      getItem: vi.fn(),
      setItem: vi.fn(() => { throw new DOMException('quota', 'QuotaExceededError'); }),
    } as unknown as Storage;
    expect(() => saveTutorState(storage, { week: 1, session: 1, messages: [] })).not.toThrow();
  });
});
