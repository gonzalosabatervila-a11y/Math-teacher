import { createDefaultPersonalState, type PersonalStateV2, validatePersonalState } from './personal-state';

export const PERSONAL_STATE_KEY = 'math_teacher_personal_state_v2';
export const LEGACY_STORAGE_KEY = 'math_tutor_state_v1';

interface LegacyState {
  week: number;
  session: number;
  messages: unknown[];
}

function readJson(storage: Storage, key: string): unknown {
  const raw = storage.getItem(key);
  if (!raw || raw.length > 500_000) return null;
  return JSON.parse(raw);
}

function validLegacy(value: unknown): value is LegacyState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  return Number.isInteger(item.week) && Number(item.week) >= 0 && Number(item.week) <= 13 &&
    Number.isInteger(item.session) && Number(item.session) >= 1 && Number(item.session) <= 3 &&
    Array.isArray(item.messages);
}

export class PersonalStateRepository {
  constructor(
    private readonly storage: Storage,
    private readonly now: () => number = Date.now,
  ) {}

  load(): PersonalStateV2 {
    try {
      const current = this.storage.getItem(PERSONAL_STATE_KEY);
      if (current) return validatePersonalState(readJson(this.storage, PERSONAL_STATE_KEY)) ?? createDefaultPersonalState(this.now());

      const legacy = readJson(this.storage, LEGACY_STORAGE_KEY);
      if (!validLegacy(legacy)) return createDefaultPersonalState(this.now());
      const createdAt = this.now();
      const base = createDefaultPersonalState(createdAt);
      const migrated = validatePersonalState({
        ...base,
        selection: { week: legacy.week, session: legacy.session },
        activeSession: legacy.messages.length === 0 ? null : {
          id: `migrated-${createdAt}`,
          week: legacy.week,
          session: legacy.session,
          startedAt: new Date(createdAt).toISOString(),
          lastResumedAt: null,
          accumulatedSeconds: 0,
          isRunning: false,
          phaseId: 'recall',
          activeProtocolStep: 1,
          completedSteps: [],
          messages: legacy.messages,
          draftPostmortem: null,
        },
      }) ?? base;
      try {
        this.storage.setItem(PERSONAL_STATE_KEY, JSON.stringify(migrated));
        this.storage.removeItem(LEGACY_STORAGE_KEY);
      } catch {
        // Keep the legacy record so a later load can retry migration.
      }
      return migrated;
    } catch {
      return createDefaultPersonalState(this.now());
    }
  }

  save(state: PersonalStateV2): void {
    const validated = validatePersonalState(state);
    if (!validated) return;
    try {
      this.storage.setItem(PERSONAL_STATE_KEY, JSON.stringify(validated));
    } catch {
      // Browser storage is best-effort and must never crash a study session.
    }
  }

  clear(): void {
    try {
      this.storage.removeItem(PERSONAL_STATE_KEY);
      this.storage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      // Privacy modes may deny storage access; the in-memory session still works.
    }
  }
}
