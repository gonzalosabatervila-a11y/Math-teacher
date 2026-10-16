import { describe, expect, it, vi } from 'vitest';
import { consumePairingFragment, createPairingFragment } from './pairing';

describe('private camera pairing', () => {
  it('places session and write credential only in the URL fragment', () => {
    const fragment = createPairingFragment({ sessionId: 'session_123', writeCredential: 'write_456' });
    expect(fragment).toBe('#cam=session_123&key=write_456');
    expect(`https://example.test/${fragment}`.split('#')[0]).not.toContain('session_123');
  });

  it('consumes and immediately removes the fragment from the visible address', () => {
    const replaceState = vi.fn();
    const pairing = consumePairingFragment(
      { hash: '#cam=session_123&key=write_456', pathname: '/cam', search: '?display=compact' },
      { replaceState } as unknown as History,
    );
    expect(pairing).toEqual({ sessionId: 'session_123', writeCredential: 'write_456' });
    expect(replaceState).toHaveBeenCalledWith(null, '', '/cam?display=compact');
  });

  it.each(['#cam=x', '#cam=x&cam=y&key=z', `#cam=${'x'.repeat(201)}&key=z`, '#cam=x&key='])('rejects missing, duplicate, or oversized fragment values', (hash) => {
    expect(consumePairingFragment({ hash, pathname: '/', search: '' }, { replaceState: vi.fn() } as unknown as History)).toBeNull();
  });
});
