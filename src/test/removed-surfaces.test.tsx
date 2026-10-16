import { EventEmitter } from 'node:events';

import { render, screen } from '@testing-library/react';
import httpMocks from 'node-mocks-http';
import { describe, expect, it } from 'vitest';

import { app } from '../../server';
import App from '../App';

async function invoke(
  method: 'GET' | 'POST',
  url: string,
  body?: Record<string, unknown>
): Promise<number> {
  const request = httpMocks.createRequest({ method, url, body });
  const response = httpMocks.createResponse({ eventEmitter: EventEmitter });

  await new Promise<void>((resolve) => {
    response.on('end', resolve);
    app(request, response);
  });

  return response._getStatusCode();
}

describe('removed privileged product surfaces', () => {
  it('does not expose source download or repository mutation routes', async () => {
    const [download, push] = await Promise.all([
      invoke('GET', '/api/download-zip'),
      invoke('POST', '/api/github/push', {
        repoUrl: 'https://example.invalid/repo.git',
        token: 'secret',
      }),
    ]);

    expect(download).toBe(404);
    expect(push).toBe(404);
  });

  it('does not offer source download or GitHub token controls', () => {
    render(<App />);

    expect(screen.queryByRole('button', { name: /descargar.*zip/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /subir.*github/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/token.*github/i)).not.toBeInTheDocument();
  });
});
