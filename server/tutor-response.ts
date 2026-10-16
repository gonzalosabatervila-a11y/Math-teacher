export type TutorReplyMode = 'question' | 'hint' | 'verification' | 'solution';

export interface TutorReply {
  message: string;
  mode: TutorReplyMode;
  checks: string[];
  uncertainty?: string;
}

const modes: TutorReplyMode[] = ['question', 'hint', 'verification', 'solution'];
const fallbackMessage = '¿Qué paso concreto has intentado y qué condición necesitas comprobar primero?';

export function parseTutorReply(value: unknown): TutorReply {
  let parsed: unknown = value;
  if (typeof value === 'string') {
    const trimmed = value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    try { parsed = JSON.parse(trimmed); } catch { return { message: trimmed.slice(0, 4_000) || fallbackMessage, mode: 'question', checks: [] }; }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { message: fallbackMessage, mode: 'question', checks: [] };
  const item = parsed as Record<string, unknown>;
  const validMode = modes.includes(item.mode as TutorReplyMode);
  const message = typeof item.message === 'string' ? item.message.trim().slice(0, 4_000) : '';
  if (!validMode || !message) return { message: message || fallbackMessage, mode: 'question', checks: [] };
  const checks = Array.isArray(item.checks) ? item.checks.filter((check): check is string => typeof check === 'string' && check.trim().length > 0).slice(0, 5).map((check) => check.trim().slice(0, 300)) : [];
  const uncertainty = typeof item.uncertainty === 'string' && item.uncertainty.trim() ? item.uncertainty.trim().slice(0, 500) : undefined;
  return { message, mode: item.mode as TutorReplyMode, checks, ...(uncertainty ? { uncertainty } : {}) };
}
