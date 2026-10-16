import { describe, expect, it, vi } from 'vitest';

import { CameraSessionError, CameraSessionStore } from './camera-session-store';

describe('CameraSessionStore', () => {
  it('creates distinct opaque identifiers and credentials', () => {
    const store = new CameraSessionStore();
    const first = store.create();
    const second = store.create();

    expect(new Set([first.sessionId, first.writeCredential, first.readCredential]).size).toBe(3);
    expect(first.sessionId).toHaveLength(32);
    expect(second.sessionId).not.toBe(first.sessionId);
  });

  it('authorizes writes and reads and keeps only the last frame', () => {
    const store = new CameraSessionStore();
    const session = store.create();

    expect(() => store.write(session.sessionId, 'wrong', 'first')).toThrow(CameraSessionError);
    store.write(session.sessionId, session.writeCredential, 'first');
    store.write(session.sessionId, session.writeCredential, 'second');
    expect(store.read(session.sessionId, session.readCredential).frame).toBe('second');
    expect(() => store.read(session.sessionId, 'wrong')).toThrow(CameraSessionError);
  });

  it('expires sessions after two hours and removes them on sweep', () => {
    let now = 1_000;
    const store = new CameraSessionStore({ now: () => now });
    const session = store.create();
    now += 2 * 60 * 60 * 1_000 + 1;

    expect(() => store.read(session.sessionId, session.readCredential)).toThrowError(
      expect.objectContaining({ code: 'SESSION_EXPIRED' })
    );
    expect(store.sweep(now)).toBe(1);
  });

  it('notifies subscribers once and removes them on unsubscribe', () => {
    const store = new CameraSessionStore();
    const session = store.create();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(session.sessionId, session.readCredential, listener);

    store.write(session.sessionId, session.writeCredential, 'one');
    unsubscribe();
    store.write(session.sessionId, session.writeCredential, 'two');

    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.read(session.sessionId, session.readCredential).subscriberCount).toBe(0);
  });
});
