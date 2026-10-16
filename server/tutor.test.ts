import { describe, expect, it } from 'vitest';

import { buildTutorContents, SYSTEM_INSTRUCTION } from './tutor';
import type { TutorRequest } from './validation';

describe('buildTutorContents', () => {
  it('drops leading assistant turns and merges consecutive roles', () => {
    const request: TutorRequest = {
      messages: [
        { role: 'assistant', content: 'saludo' },
        { role: 'user', content: 'uno' },
        { role: 'user', content: 'dos' },
        { role: 'assistant', content: 'respuesta' },
      ],
    };

    expect(buildTutorContents(request)).toEqual([
      { role: 'user', parts: [{ text: 'uno' }, { text: 'dos' }] },
      { role: 'model', parts: [{ text: 'respuesta' }] },
    ]);
  });

  it('adds bounded session context and the image only to the last user turn', () => {
    const request: TutorRequest = {
      messages: [{ role: 'user', content: 'Comprueba este paso' }],
      image: { mimeType: 'image/png', data: 'iVBORw0KGgo=' },
      sessionContext: {
        week: 7,
        session: 2,
        phase: 'Problema central',
        elapsedMinutes: 20,
        protocolStep: 5,
        topic: 'Derivadas',
      },
    };

    expect(buildTutorContents(request)).toEqual([
      {
        role: 'user',
        parts: [
          { inlineData: { data: 'iVBORw0KGgo=', mimeType: 'image/png' } },
          { text: '[Sesión: semana 7; sesión 2; fase Problema central; minuto 20; tema Derivadas; paso 5]\n\nComprueba este paso' },
        ],
      },
    ]);
  });

  it('uses a safe kickoff when no user turn remains', () => {
    expect(buildTutorContents({ messages: [{ role: 'assistant', content: 'hola' }] })).toEqual([
      { role: 'user', parts: [{ text: 'Hola profesor, empezamos la sesión.' }] },
    ]);
  });
});

describe('SYSTEM_INSTRUCTION', () => {
  it('requires uncertainty, curricular boundaries, and financial disclaimers', () => {
    expect(SYSTEM_INSTRUCTION).toContain('no inventes');
    expect(SYSTEM_INSTRUCTION).toContain('ampliación');
    expect(SYSTEM_INSTRUCTION).toContain('no es asesoramiento financiero');
  });
});
