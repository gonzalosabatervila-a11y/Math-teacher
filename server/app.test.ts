import { EventEmitter } from 'node:events';

import httpMocks from 'node-mocks-http';
import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';

import { createApp } from './app';

async function invoke(
  app: ReturnType<typeof createApp>,
  body: Record<string, unknown>,
  ip = '127.0.0.1'
) {
  const request = httpMocks.createRequest({ method: 'POST', url: '/api/tutor/chat', body, ip });
  const response = httpMocks.createResponse({ eventEmitter: EventEmitter });
  await new Promise<void>((resolve) => {
    response.on('end', resolve);
    app(request, response);
  });
  return {
    status: response._getStatusCode(),
    json: response._getJSONData(),
    headers: response._getHeaders(),
  };
}

const valid = {
  messages: [{ role: 'user', content: 'Ayúdame a factorizar' }],
  sessionContext: { week: 2, session: 1, phase: 'Problema', elapsedMinutes: 12, protocolStep: 2 },
};

describe('createApp tutor endpoint', () => {
  it('returns a stable structured tutor reply', async () => {
    const app = createApp({ generate: vi.fn().mockResolvedValue(JSON.stringify({ message: '¿Cuál es el dominio?', mode: 'question', checks: ['Escribe la restricción'] })) });
    const response = await invoke(app, valid);
    expect(response).toMatchObject({ status: 200, json: { reply: { message: '¿Cuál es el dominio?', mode: 'question', checks: ['Escribe la restricción'] } } });
  });

  it('exposes a minimal health check without leaking configuration', async () => {
    const app = createApp({ generate: vi.fn() });
    const request = httpMocks.createRequest({ method: 'GET', url: '/api/health' });
    const response = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await new Promise<void>((resolve) => {
      response.on('end', resolve);
      app(request, response);
    });

    expect(response._getStatusCode()).toBe(200);
    expect(response._getJSONData()).toEqual({ status: 'ok' });
  });

  it('reports readiness without contacting the tutor provider or exposing configuration', async () => {
    const generate = vi.fn();
    const app = createApp({ generate, model: 'private-model-name' });
    const request = httpMocks.createRequest({ method: 'GET', url: '/api/ready' });
    const response = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await new Promise<void>((resolve) => { response.on('end', resolve); app(request, response); });
    expect(response._getStatusCode()).toBe(200);
    expect(response._getJSONData()).toEqual({ status: 'ready' });
    expect(generate).not.toHaveBeenCalled();
    expect(JSON.stringify(response._getJSONData())).not.toContain('private-model-name');
  });

  it('maps a provider timeout to a stable unavailable response', async () => {
    vi.useFakeTimers();
    const app = createApp({ generate: vi.fn(() => new Promise<string>(() => {})), providerTimeoutMs: 15 });
    const responsePromise = invoke(app, valid);
    await vi.advanceTimersByTimeAsync(15);
    const response = await responsePromise;
    expect(response).toMatchObject({ status: 502, json: { code: 'TUTOR_UNAVAILABLE' } });
    vi.useRealTimers();
  });

  it('returns a controlled 413 response for an oversized JSON body', async () => {
    const app = createApp({ generate: vi.fn() });
    const response = await request(app)
      .post('/api/tutor/chat')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ padding: 'x'.repeat(9 * 1024 * 1024 + 1) }));
    expect(response.status).toBe(413);
    expect(response.body).toEqual({ error: 'La solicitud supera el límite permitido.', code: 'BODY_TOO_LARGE' });
  });

  it('rejects malformed and oversized requests with stable public errors', async () => {
    const app = createApp({ generate: vi.fn() });
    const malformed = await invoke(app, { messages: [{ role: 'system', content: 'x' }] });
    const oversized = await invoke(app, { ...valid, image: `data:image/jpeg;base64,${Buffer.alloc(6 * 1024 * 1024 + 1, 0xff).toString('base64')}` });

    expect(malformed).toMatchObject({ status: 400, json: { code: 'INVALID_ROLE' } });
    expect(oversized).toMatchObject({ status: 413, json: { code: 'IMAGE_TOO_LARGE' } });
  });

  it('redacts provider failures and applies defensive headers', async () => {
    const app = createApp({ generate: vi.fn().mockRejectedValue(new Error('secret-provider-detail')) });
    const response = await invoke(app, valid);

    expect(response.status).toBe(502);
    expect(response.json).toEqual({ error: 'El profesor no está disponible temporalmente.', code: 'TUTOR_UNAVAILABLE' });
    expect(JSON.stringify(response.json)).not.toContain('secret-provider-detail');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['content-security-policy']).toContain("default-src 'self'");
  });

  it('rate-limits repeated tutor calls', async () => {
    const app = createApp({ generate: vi.fn().mockResolvedValue('respuesta') });
    const responses = [];
    for (let index = 0; index < 21; index += 1) responses.push(await invoke(app, valid, '198.51.100.2'));

    expect(responses.at(-1)).toMatchObject({ status: 429, json: { code: 'RATE_LIMITED' } });
  });

  it('requires a server key when no provider is injected', () => {
    expect(() => createApp({})).toThrow('GEMINI_API_KEY');
  });
});
