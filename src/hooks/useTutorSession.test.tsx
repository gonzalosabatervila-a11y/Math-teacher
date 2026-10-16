import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useTutorSession } from './useTutorSession';

const context = { week: 1, session: 1, phase: 'Inicio', elapsedMinutes: 0, topic: 'Álgebra', protocolStep: 1 };

describe('useTutorSession', () => {
  it('sends once, appends the reply, and blocks duplicate submissions', async () => {
    let resolve!: (value: Response) => void;
    const request = vi.fn(() => new Promise<Response>((done) => { resolve = done; }));
    const { result } = renderHook(() => useTutorSession({ initialMessages: [], context, request }));

    act(() => {
      void result.current.sendMessage('hola');
      void result.current.sendMessage('duplicado');
    });
    expect(request).toHaveBeenCalledTimes(1);
    await act(async () => resolve({ ok: true, json: async () => ({ reply: 'respuesta' }) } as Response));
    await waitFor(() => expect(result.current.messages.at(-1)?.content).toBe('respuesta'));
  });

  it('aborts an in-flight request on unmount', () => {
    let signal: AbortSignal | undefined;
    const request = vi.fn((_url: RequestInfo | URL, init?: RequestInit) => {
      signal = init?.signal ?? undefined;
      return new Promise<Response>(() => {});
    });
    const { result, unmount } = renderHook(() => useTutorSession({ initialMessages: [], context, request }));
    act(() => { void result.current.sendMessage('hola'); });
    unmount();
    expect(signal?.aborted).toBe(true);
  });

  it('stores structured coaching metadata without provider raw data', async () => {
    const request = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ reply: { message: 'Revisa el signo.', mode: 'hint', checks: ['Sustituye el resultado'], uncertainty: 'No se ve el denominador.' } }) });
    const { result } = renderHook(() => useTutorSession({ initialMessages: [], context, request }));
    await act(async () => { await result.current.sendMessage('ayuda'); });
    expect(result.current.messages.at(-1)).toMatchObject({ content: 'Revisa el signo.', tutorMode: 'hint', tutorChecks: ['Sustituye el resultado'], tutorUncertainty: 'No se ve el denominador.' });
  });

  it('keeps the user message after an error and retries it', async () => {
    const request = vi.fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ ok: true, json: async () => ({ reply: 'recuperado' }) });
    const { result } = renderHook(() => useTutorSession({ initialMessages: [], context, request }));

    await act(async () => { await result.current.sendMessage('intento'); });
    expect(result.current.messages.map((message) => message.content)).toContain('intento');
    expect(result.current.error).toBeTruthy();
    await act(async () => { await result.current.retryLast(); });
    expect(request).toHaveBeenCalledTimes(2);
    expect(result.current.messages.at(-1)?.content).toBe('recuperado');
  });
});
