import { describe, expect, it, vi } from 'vitest';
import { openCameraStream } from './stream-client';

const streamResponse = (chunks: string[]): Response => new Response(new ReadableStream({
  start(controller) { chunks.forEach((chunk) => controller.enqueue(new TextEncoder().encode(chunk))); controller.close(); },
}), { status: 200, headers: { 'Content-Type': 'text/event-stream' } });

describe('authenticated camera stream client', () => {
  it('uses an Authorization header and parses SSE records across chunk boundaries', async () => {
    const abort = new AbortController();
    const onSnapshot = vi.fn(() => abort.abort());
    const fetchImpl = vi.fn().mockResolvedValue(streamResponse(['data: {"frame":"abc",', '"lastFrameTime":10}\n\n']));
    await openCameraStream({ url: '/stream', credential: 'read-secret', signal: abort.signal, fetchImpl, onSnapshot, onState: vi.fn() });
    expect(fetchImpl).toHaveBeenCalledWith('/stream', expect.objectContaining({ headers: { Authorization: 'Bearer read-secret' }, signal: abort.signal }));
    expect(onSnapshot).toHaveBeenCalledWith({ frame: 'abc', lastFrameTime: 10 });
  });

  it('reports an expired terminal state after a 404 without retrying', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('', { status: 404 }));
    const onState = vi.fn();
    await openCameraStream({ url: '/stream', credential: 'read-secret', signal: new AbortController().signal, fetchImpl, onSnapshot: vi.fn(), onState });
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(onState).toHaveBeenLastCalledWith('expired');
  });

  it('retries four consecutive failures with bounded backoff before expiring', async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn().mockRejectedValue(new Error('offline'));
    const onState = vi.fn();
    const promise = openCameraStream({ url: '/stream', credential: 'read-secret', signal: new AbortController().signal, fetchImpl, onSnapshot: vi.fn(), onState });
    await vi.runAllTimersAsync();
    await promise;
    expect(fetchImpl).toHaveBeenCalledTimes(5);
    expect(onState).toHaveBeenLastCalledWith('expired');
    vi.useRealTimers();
  });
});
