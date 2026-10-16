import { describe, expect, it } from 'vitest';

import { exportBackup, importBackup } from './backup';
import { createDefaultPersonalState } from './personal-state';

describe('personal backup', () => {
  it('round-trips a validated personal state', () => {
    const state = createDefaultPersonalState(Date.UTC(2026, 9, 16, 10));
    state.selection = { week: 4, session: 2 };

    const exported = exportBackup(state, Date.UTC(2026, 9, 16, 11));

    expect(importBackup(exported)).toEqual(state);
    expect(JSON.parse(exported)).toMatchObject({
      format: 'math-teacher-personal-backup',
      schemaVersion: 2,
      exportedAt: '2026-10-16T11:00:00.000Z',
    });
  });

  it.each([
    '{}',
    JSON.stringify({ format: 'another-app', schemaVersion: 2, state: {} }),
    JSON.stringify({ format: 'math-teacher-personal-backup', schemaVersion: 99, state: {} }),
    JSON.stringify({ format: 'math-teacher-personal-backup', schemaVersion: 2, exportedAt: 'not-a-date', state: {} }),
  ])('rejects malformed or unsupported backups without returning partial state', (payload) => {
    expect(() => importBackup(payload)).toThrow(/copia de seguridad/i);
  });

  it('rejects oversized backup payloads', () => {
    const oversized = 'x'.repeat(1_000_001);
    expect(() => importBackup(oversized)).toThrow(/demasiado grande/i);
  });
});
