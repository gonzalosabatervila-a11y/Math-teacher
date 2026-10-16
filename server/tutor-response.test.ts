import { describe, expect, it } from 'vitest';
import { parseTutorReply } from './tutor-response';

describe('parseTutorReply', () => {
  it('accepts and bounds a valid structured reply', () => {
    const reply = parseTutorReply(JSON.stringify({ message: 'Comprueba el dominio.', mode: 'verification', checks: Array.from({ length: 8 }, (_, i) => `Paso ${i}`), uncertainty: 'La foto no muestra el margen.' }));
    expect(reply).toMatchObject({ message: 'Comprueba el dominio.', mode: 'verification', uncertainty: 'La foto no muestra el margen.' });
    expect(reply.checks).toHaveLength(5);
  });

  it.each(['no-json', JSON.stringify({ message: 'Pregunta', mode: 'unknown' }), JSON.stringify({ message: '', mode: 'hint' })])('falls back safely and never returns an empty message', (raw) => {
    const reply = parseTutorReply(raw);
    expect(reply.mode).toBe('question');
    expect(reply.message.length).toBeGreaterThan(0);
  });

  it('bounds message, checks and uncertainty text', () => {
    const reply = parseTutorReply({ message: 'm'.repeat(5_000), mode: 'hint', checks: ['c'.repeat(400)], uncertainty: 'u'.repeat(700) });
    expect(reply.message).toHaveLength(4_000);
    expect(reply.checks[0]).toHaveLength(300);
    expect(reply.uncertainty).toHaveLength(500);
  });
});
