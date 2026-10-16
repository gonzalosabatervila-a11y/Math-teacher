import type { ChatMessage } from '../types/tutor';

const STORAGE_KEY = 'math_tutor_state_v1';

export interface PersistedTutorState {
  week: number;
  session: number;
  messages: ChatMessage[];
}

const defaults = (): PersistedTutorState => ({ week: 1, session: 1, messages: [] });

function isMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== 'object') return false;
  const message = value as Record<string, unknown>;
  return (
    typeof message.id === 'string' &&
    (message.role === 'user' || message.role === 'assistant') &&
    typeof message.content === 'string' &&
    message.content.length <= 4_000 &&
    typeof message.timestamp === 'number' &&
    Number.isFinite(message.timestamp)
  );
}

export function loadTutorState(storage: Storage): PersistedTutorState {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw || raw.length > 200_000) return defaults();
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (
      !Number.isInteger(parsed.week) || Number(parsed.week) < 0 || Number(parsed.week) > 13 ||
      !Number.isInteger(parsed.session) || Number(parsed.session) < 1 || Number(parsed.session) > 3 ||
      !Array.isArray(parsed.messages)
    ) return defaults();
    const messages = parsed.messages.filter(isMessage).slice(-40).map(({ imageSnapshot: _image, ...message }) => message);
    if (messages.length !== parsed.messages.length && parsed.messages.length <= 40) return defaults();
    return { week: Number(parsed.week), session: Number(parsed.session), messages };
  } catch {
    return defaults();
  }
}

export function saveTutorState(storage: Storage, state: PersistedTutorState): void {
  const messages = state.messages.filter(isMessage).slice(-40).map(({ imageSnapshot: _image, ...message }) => message);
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({ week: state.week, session: state.session, messages }));
  } catch {
    // Storage is an optional convenience; quota and privacy modes must not break the app.
  }
}
