import { EventEmitter } from 'node:events';

import httpMocks from 'node-mocks-http';
import { describe, expect, it, vi } from 'vitest';

import { createApp } from './app';
import { CameraSessionStore } from './camera-session-store';

async function invoke(
  app: ReturnType<typeof createApp>,
  method: 'GET' | 'POST',
  url: string,
  options: { body?: Record<string, unknown>; authorization?: string } = {}
) {
  const request = httpMocks.createRequest({
    method,
    url,
    body: options.body,
    headers: options.authorization ? { authorization: `Bearer ${options.authorization}` } : {},
  });
  const response = httpMocks.createResponse({ eventEmitter: EventEmitter });
  await new Promise<void>((resolve) => {
    response.on('end', resolve);
    app(request, response);
  });
  const text = response._getData();
  return { status: response._getStatusCode(), json: text ? response._getJSONData() : undefined };
}

describe('camera API', () => {
  it('requires explicit initialization and credentials for frame access', async () => {
    const app = createApp({ generate: vi.fn(), cameraStore: new CameraSessionStore() });
    const missing = await invoke(app, 'GET', '/api/camera/sessions/unknown/latest', { authorization: 'wrong' });
    const created = await invoke(app, 'POST', '/api/camera/sessions');

    expect(missing).toMatchObject({ status: 404, json: { code: 'CAMERA_SESSION_UNAVAILABLE' } });
    expect(created.status).toBe(201);
    expect(created.json).toMatchObject({ sessionId: expect.any(String), writeCredential: expect.any(String), readCredential: expect.any(String) });

    const wrong = await invoke(app, 'POST', `/api/camera/sessions/${created.json.sessionId}/frames`, {
      authorization: 'wrong',
      body: { frame: 'data:image/jpeg;base64,/9j/AA==' },
    });
    expect(wrong).toMatchObject({ status: 404, json: { code: 'CAMERA_SESSION_UNAVAILABLE' } });
  });

  it('validates frames and returns only the latest authorized frame', async () => {
    const app = createApp({ generate: vi.fn(), cameraStore: new CameraSessionStore() });
    const created = await invoke(app, 'POST', '/api/camera/sessions');
    const id = created.json.sessionId;
    const invalid = await invoke(app, 'POST', `/api/camera/sessions/${id}/frames`, {
      authorization: created.json.writeCredential,
      body: { frame: 'data:image/png;base64,/9j/AA==' },
    });
    const tooLarge = await invoke(app, 'POST', `/api/camera/sessions/${id}/frames`, {
      authorization: created.json.writeCredential,
      body: { frame: `data:image/jpeg;base64,${Buffer.alloc(2 * 1024 * 1024 + 1, 0xff).toString('base64')}` },
    });
    const frame = 'data:image/jpeg;base64,/9j/AA==';
    const stored = await invoke(app, 'POST', `/api/camera/sessions/${id}/frames`, {
      authorization: created.json.writeCredential,
      body: { frame },
    });
    const latest = await invoke(app, 'GET', `/api/camera/sessions/${id}/latest`, {
      authorization: created.json.readCredential,
    });

    expect(invalid).toMatchObject({ status: 400, json: { code: 'INVALID_FRAME' } });
    expect(tooLarge).toMatchObject({ status: 413, json: { code: 'FRAME_TOO_LARGE' } });
    expect(stored.status).toBe(204);
    expect(latest).toMatchObject({ status: 200, json: { frame } });
  });
});
