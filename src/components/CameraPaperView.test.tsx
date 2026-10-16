import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CameraPaperView } from './CameraPaperView';

afterEach(() => vi.unstubAllGlobals());

describe('CameraPaperView privacy', () => {
  it('does not create a server camera session until mobile mode is selected', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ sessionId: 'session', writeCredential: 'write', readCredential: 'read' }) })
      .mockResolvedValueOnce(new Response('', { status: 404 }));
    vi.stubGlobal('fetch', fetchMock);
    render(<CameraPaperView onCaptureSnapshot={vi.fn()} onRequestTutorReview={vi.fn()} />);
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /móvil como cámara/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/camera/sessions', expect.objectContaining({ method: 'POST' })));
  });
});
