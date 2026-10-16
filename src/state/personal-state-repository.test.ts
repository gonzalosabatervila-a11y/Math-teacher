import { describe, expect, it } from 'vitest';

import { createDefaultPersonalState } from './personal-state';
import { LEGACY_STORAGE_KEY, PERSONAL_STATE_KEY, PersonalStateRepository } from './personal-state-repository';

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

describe('PersonalStateRepository', () => {
  it('migrates valid v1 week, session and text messages exactly once', () => {
    const storage = new MemoryStorage();
    storage.setItem(LEGACY_STORAGE_KEY, JSON.stringify({
      week: 4,
      session: 2,
      messages: [{
        id: 'legacy-message',
        role: 'user',
        content: 'Mi razonamiento',
        timestamp: 123,
        imageSnapshot: 'data:image/jpeg;base64,/9j/AA==',
      }],
    }));
    const repository = new PersonalStateRepository(storage, () => 1_700_000_000_000);

    const first = repository.load();
    const second = repository.load();

    expect(first.selection).toEqual({ week: 4, session: 2 });
    expect(first.activeSession?.messages).toEqual([{ id: 'legacy-message', role: 'user', content: 'Mi razonamiento', timestamp: 123 }]);
    expect(second).toEqual(first);
    expect(storage.getItem(PERSONAL_STATE_KEY)).not.toBeNull();
    expect(storage.getItem(LEGACY_STORAGE_KEY)).toBeNull();
  });

  it('falls back without throwing on corrupt stored JSON', () => {
    const storage = new MemoryStorage();
    storage.setItem(PERSONAL_STATE_KEY, '{bad json');
    const repository = new PersonalStateRepository(storage, () => 1_700_000_000_000);

    expect(repository.load()).toEqual(createDefaultPersonalState(1_700_000_000_000));
  });

  it('does not mutate the current value when storage writes fail', () => {
    const storage = new MemoryStorage();
    const state = createDefaultPersonalState(1_700_000_000_000);
    const before = structuredClone(state);
    storage.setItem(LEGACY_STORAGE_KEY, JSON.stringify({ week: 2, session: 1, messages: [] }));
    storage.setItem = () => { throw new DOMException('quota', 'QuotaExceededError'); };
    const repository = new PersonalStateRepository(storage, () => 1_700_000_000_000);

    expect(() => repository.save(state)).not.toThrow();
    expect(state).toEqual(before);
    expect(repository.load().selection).toEqual({ week: 2, session: 1 });
    expect(storage.getItem(LEGACY_STORAGE_KEY)).not.toBeNull();
  });
});
