import type { ChatMessage, PhaseId, PostmortemData } from '../types/tutor';

export const PERSONAL_STATE_SCHEMA_VERSION = 2 as const;

export interface ActiveSession {
  id: string;
  week: number;
  session: number;
  startedAt: string;
  lastResumedAt: string | null;
  accumulatedSeconds: number;
  isRunning: boolean;
  phaseId: PhaseId;
  activeProtocolStep: number;
  completedSteps: number[];
  messages: ChatMessage[];
  draftPostmortem: PostmortemData | null;
}

export interface CompletedSession {
  id: string;
  week: number;
  session: number;
  startedAt: string;
  completedAt: string;
  durationSeconds: number;
  completedSteps: number[];
  summary: string;
  postmortem: PostmortemData;
}

export interface ReviewItem {
  id: string;
  sourceSessionId: string;
  variantProblem: string;
  dueAt: string;
  completedAt: string | null;
  status: 'pending' | 'completed';
}

export interface UserPreferences {
  autoSpeak: boolean;
  speechRate: number;
  speechPitch: number;
  speechVolume: number;
}

export interface PersonalStateV2 {
  schemaVersion: typeof PERSONAL_STATE_SCHEMA_VERSION;
  selection: { week: number; session: number };
  activeSession: ActiveSession | null;
  completedSessions: CompletedSession[];
  reviews: ReviewItem[];
  preferences: UserPreferences;
  updatedAt: string;
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;

const validWeek = (value: unknown): value is number => Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 13;
const validSession = (value: unknown): value is number => Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 3;
const validDate = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value));
const boundedString = (value: unknown, max: number): value is string => typeof value === 'string' && value.length <= max;

function textList(value: unknown, maxItems = 20, maxLength = 500): string[] | null {
  if (!Array.isArray(value) || value.length > maxItems) return null;
  return value.every((item) => boundedString(item, maxLength)) ? value : null;
}

function stepList(value: unknown): number[] | null {
  if (!Array.isArray(value) || value.length > 7) return null;
  const steps = [...new Set(value.filter((step): step is number => Number.isInteger(step) && step >= 1 && step <= 7))];
  return steps.length === value.length ? steps : null;
}

function cleanMessage(value: unknown): ChatMessage | null {
  const message = asRecord(value);
  if (
    !message ||
    typeof message.id !== 'string' || message.id.length === 0 || message.id.length > 200 ||
    (message.role !== 'user' && message.role !== 'assistant') ||
    !boundedString(message.content, 4_000) ||
    typeof message.timestamp !== 'number' || !Number.isFinite(message.timestamp) ||
    (message.protocolStep !== undefined && (!Number.isInteger(message.protocolStep) || Number(message.protocolStep) < 1 || Number(message.protocolStep) > 7)) ||
    (message.isSpoken !== undefined && typeof message.isSpoken !== 'boolean')
  ) return null;
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    timestamp: message.timestamp,
    ...(message.protocolStep === undefined ? {} : { protocolStep: Number(message.protocolStep) }),
    ...(message.isSpoken === undefined ? {} : { isSpoken: message.isSpoken }),
  };
}

function cleanMessages(value: unknown): ChatMessage[] | null {
  if (!Array.isArray(value)) return null;
  const messages = value.map(cleanMessage);
  if (messages.some((message) => message === null)) return null;
  return (messages as ChatMessage[]).slice(-40);
}

function cleanPostmortem(value: unknown): PostmortemData | null {
  const item = asRecord(value);
  if (!item) return null;
  const errorTypes = ['conceptual', 'representacion', 'estrategia', 'mecanico', 'logico', 'verificacion'];
  const masteredConcepts = textList(item.masteredConcepts);
  const openConcepts = textList(item.openConcepts);
  const recurringErrors = textList(item.recurringErrors);
  if (
    !errorTypes.includes(String(item.errorType)) ||
    !boundedString(item.description, 4_000) ||
    !boundedString(item.correctedRule, 4_000) ||
    !boundedString(item.variantProblem48h, 4_000) ||
    !boundedString(item.pendingProblem, 4_000) ||
    !masteredConcepts || !openConcepts || !recurringErrors ||
    typeof item.nextRepetitionHours !== 'number' || !Number.isFinite(item.nextRepetitionHours) || item.nextRepetitionHours < 0 || item.nextRepetitionHours > 8_760
  ) return null;
  return {
    errorType: item.errorType as PostmortemData['errorType'],
    description: item.description,
    correctedRule: item.correctedRule,
    variantProblem48h: item.variantProblem48h,
    masteredConcepts,
    openConcepts,
    recurringErrors,
    pendingProblem: item.pendingProblem,
    nextRepetitionHours: item.nextRepetitionHours,
  };
}

function cleanActiveSession(value: unknown): ActiveSession | null | undefined {
  if (value === null) return null;
  const item = asRecord(value);
  const messages = item ? cleanMessages(item.messages) : null;
  const completedSteps = item ? stepList(item.completedSteps) : null;
  const phases: PhaseId[] = ['recall', 'theory', 'problem', 'defense', 'postmortem'];
  const draft = item?.draftPostmortem === null ? null : cleanPostmortem(item?.draftPostmortem);
  if (
    !item || typeof item.id !== 'string' || item.id.length === 0 || item.id.length > 200 ||
    !validWeek(item.week) || !validSession(item.session) || !validDate(item.startedAt) ||
    !(item.lastResumedAt === null || validDate(item.lastResumedAt)) ||
    typeof item.accumulatedSeconds !== 'number' || !Number.isInteger(item.accumulatedSeconds) || item.accumulatedSeconds < 0 || item.accumulatedSeconds > 3_600 ||
    typeof item.isRunning !== 'boolean' || !phases.includes(item.phaseId as PhaseId) ||
    typeof item.activeProtocolStep !== 'number' || !Number.isInteger(item.activeProtocolStep) || item.activeProtocolStep < 1 || item.activeProtocolStep > 7 ||
    !completedSteps || !messages || draft === undefined || (item.draftPostmortem !== null && !draft)
  ) return undefined;
  return {
    id: item.id,
    week: item.week,
    session: item.session,
    startedAt: item.startedAt,
    lastResumedAt: item.lastResumedAt as string | null,
    accumulatedSeconds: item.accumulatedSeconds,
    isRunning: item.isRunning,
    phaseId: item.phaseId as PhaseId,
    activeProtocolStep: item.activeProtocolStep,
    completedSteps,
    messages,
    draftPostmortem: draft,
  };
}

function cleanCompletedSession(value: unknown): CompletedSession | null {
  const item = asRecord(value);
  const completedSteps = item ? stepList(item.completedSteps) : null;
  const postmortem = item ? cleanPostmortem(item.postmortem) : null;
  if (
    !item || typeof item.id !== 'string' || item.id.length === 0 || item.id.length > 200 ||
    !validWeek(item.week) || !validSession(item.session) ||
    !validDate(item.startedAt) || !validDate(item.completedAt) ||
    typeof item.durationSeconds !== 'number' || !Number.isInteger(item.durationSeconds) || item.durationSeconds < 0 || item.durationSeconds > 3_600 ||
    !completedSteps || !boundedString(item.summary, 4_000) || !postmortem
  ) return null;
  return {
    id: item.id,
    week: item.week,
    session: item.session,
    startedAt: item.startedAt,
    completedAt: item.completedAt,
    durationSeconds: item.durationSeconds,
    completedSteps,
    summary: item.summary,
    postmortem,
  };
}

function cleanReview(value: unknown): ReviewItem | null {
  const item = asRecord(value);
  if (
    !item || typeof item.id !== 'string' || item.id.length === 0 || item.id.length > 200 ||
    typeof item.sourceSessionId !== 'string' || item.sourceSessionId.length === 0 || item.sourceSessionId.length > 200 ||
    !boundedString(item.variantProblem, 4_000) || item.variantProblem.trim().length === 0 ||
    !validDate(item.dueAt) || !(item.completedAt === null || validDate(item.completedAt)) ||
    (item.status !== 'pending' && item.status !== 'completed') ||
    (item.status === 'pending' && item.completedAt !== null) ||
    (item.status === 'completed' && item.completedAt === null)
  ) return null;
  return {
    id: item.id,
    sourceSessionId: item.sourceSessionId,
    variantProblem: item.variantProblem,
    dueAt: item.dueAt,
    completedAt: item.completedAt as string | null,
    status: item.status,
  };
}

function cleanPreferences(value: unknown): UserPreferences | null {
  const item = asRecord(value);
  if (
    !item || typeof item.autoSpeak !== 'boolean' ||
    typeof item.speechRate !== 'number' || item.speechRate < 0.5 || item.speechRate > 2 ||
    typeof item.speechPitch !== 'number' || item.speechPitch < 0 || item.speechPitch > 2 ||
    typeof item.speechVolume !== 'number' || item.speechVolume < 0 || item.speechVolume > 1
  ) return null;
  return {
    autoSpeak: item.autoSpeak,
    speechRate: item.speechRate,
    speechPitch: item.speechPitch,
    speechVolume: item.speechVolume,
  };
}

export function createDefaultPersonalState(now: number): PersonalStateV2 {
  return {
    schemaVersion: PERSONAL_STATE_SCHEMA_VERSION,
    selection: { week: 1, session: 1 },
    activeSession: null,
    completedSessions: [],
    reviews: [],
    preferences: { autoSpeak: true, speechRate: 1, speechPitch: 1, speechVolume: 1 },
    updatedAt: new Date(now).toISOString(),
  };
}

export function validatePersonalState(value: unknown): PersonalStateV2 | null {
  const state = asRecord(value);
  const selection = state ? asRecord(state.selection) : null;
  const activeSession = state ? cleanActiveSession(state.activeSession) : undefined;
  const preferences = state ? cleanPreferences(state.preferences) : null;
  if (
    !state || state.schemaVersion !== PERSONAL_STATE_SCHEMA_VERSION ||
    !selection || !validWeek(selection.week) || !validSession(selection.session) ||
    activeSession === undefined || !preferences || !validDate(state.updatedAt) ||
    !Array.isArray(state.completedSessions) || !Array.isArray(state.reviews)
  ) return null;
  const completedSessions = state.completedSessions.map(cleanCompletedSession);
  const reviews = state.reviews.map(cleanReview);
  if (completedSessions.some((item) => !item) || reviews.some((item) => !item)) return null;
  return {
    schemaVersion: PERSONAL_STATE_SCHEMA_VERSION,
    selection: { week: selection.week, session: selection.session },
    activeSession,
    completedSessions: (completedSessions as CompletedSession[]).slice(-50),
    reviews: (reviews as ReviewItem[]).slice(-100),
    preferences,
    updatedAt: state.updatedAt,
  };
}
