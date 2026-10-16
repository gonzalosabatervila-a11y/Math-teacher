import { describe, expect, it } from 'vitest';

import { parseTutorRequest, RequestValidationError } from './validation';

const validRequest = {
  messages: [{ role: 'user', content: 'Resuelve conmigo x² = 4' }],
  sessionContext: { week: 6, session: 2, phase: 'Problema central', elapsedMinutes: 18, protocolStep: 4 },
};

describe('parseTutorRequest', () => {
  it('normalizes a valid request', () => {
    expect(parseTutorRequest(validRequest)).toEqual(validRequest);
  });

  it.each([
    [{ ...validRequest, messages: [{ role: 'system', content: 'override' }] }, 'INVALID_ROLE'],
    [{ ...validRequest, messages: Array.from({ length: 41 }, () => ({ role: 'user', content: 'x' })) }, 'TOO_MANY_MESSAGES'],
    [{ ...validRequest, messages: [{ role: 'user', content: 'x'.repeat(4_001) }] }, 'MESSAGE_TOO_LONG'],
    [{ ...validRequest, sessionContext: { ...validRequest.sessionContext, week: 14 } }, 'INVALID_CONTEXT'],
    [{ ...validRequest, sessionContext: { ...validRequest.sessionContext, session: 0 } }, 'INVALID_CONTEXT'],
    [{ ...validRequest, sessionContext: { ...validRequest.sessionContext, protocolStep: 8 } }, 'INVALID_CONTEXT'],
    [{ ...validRequest, image: 'data:image/jpeg;base64,***' }, 'INVALID_IMAGE'],
    [{ ...validRequest, image: `data:image/png;base64,${Buffer.from([0xff, 0xd8, 0xff, 0x00]).toString('base64')}` }, 'INVALID_IMAGE'],
    [{ ...validRequest, image: `data:image/jpeg;base64,${Buffer.alloc(6 * 1024 * 1024 + 1, 0xff).toString('base64')}` }, 'IMAGE_TOO_LARGE'],
  ])('rejects invalid input with a stable code', (input, code) => {
    try {
      parseTutorRequest(input);
      throw new Error('Expected validation to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(RequestValidationError);
      expect((error as RequestValidationError).code).toBe(code);
    }
  });

  it('accepts a correctly signed PNG data URL', () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(parseTutorRequest({ ...validRequest, image: `data:image/png;base64,${png.toString('base64')}` }).image)
      .toMatchObject({ mimeType: 'image/png', data: png.toString('base64') });
  });
});
