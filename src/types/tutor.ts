export type Role = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
  imageSnapshot?: string;
  protocolStep?: number;
  isSpoken?: boolean;
}

export type PhaseId = 'recall' | 'theory' | 'problem' | 'defense' | 'postmortem';

export interface SessionPhase {
  id: PhaseId;
  name: string;
  shortName: string;
  startMin: number;
  endMin: number;
  durationMin: number;
  description: string;
  goal: string;
  promptTip: string;
}

export interface ProtocolStep {
  step: number;
  name: string;
  shortLabel: string;
  objective: string;
  studentAction: string;
  checkQuestion: string;
}

export type ErrorType =
  | 'conceptual'
  | 'representacion'
  | 'estrategia'
  | 'mecanico'
  | 'logico'
  | 'verificacion';

export interface PostmortemData {
  errorType: ErrorType;
  description: string;
  correctedRule: string;
  variantProblem48h: string;
  masteredConcepts: string[];
  openConcepts: string[];
  recurringErrors: string[];
  pendingProblem: string;
  nextRepetitionHours: number;
}

export interface SyllabusItem {
  week: number;
  block: string;
  title: string;
  topics: string[];
  financialTransfer: string;
  exampleContext: string;
}
