import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

import type { ChatMessage, TutorReply } from '../types/tutor';

export interface TutorSessionContext {
  week: number;
  session: number;
  phase: string;
  elapsedMinutes: number;
  topic: string;
  protocolStep: number;
}

interface UseTutorSessionOptions {
  initialMessages: ChatMessage[];
  context: TutorSessionContext;
  image?: string | null;
  request?: typeof fetch;
  onReply?: (reply: string) => void;
}

interface TutorSessionResult {
  messages: ChatMessage[];
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  isLoading: boolean;
  error: string | null;
  sendMessage: (text: string, image?: string) => Promise<void>;
  retryLast: () => Promise<void>;
}

function readReply(value: unknown): TutorReply {
  if (typeof value === 'string') return { message: value.trim().slice(0, 4_000) || 'No recibí respuesta del profesor.', mode: 'question', checks: [] };
  if (!value || typeof value !== 'object') return { message: 'No recibí respuesta del profesor.', mode: 'question', checks: [] };
  const item = value as Record<string, unknown>;
  const modes: TutorReply['mode'][] = ['question', 'hint', 'verification', 'solution'];
  const message = typeof item.message === 'string' ? item.message.trim().slice(0, 4_000) : '';
  const mode = modes.includes(item.mode as TutorReply['mode']) ? item.mode as TutorReply['mode'] : 'question';
  const checks = Array.isArray(item.checks) ? item.checks.filter((check): check is string => typeof check === 'string').slice(0, 5).map((check) => check.slice(0, 300)) : [];
  const uncertainty = typeof item.uncertainty === 'string' ? item.uncertainty.slice(0, 500) : undefined;
  return { message: message || 'No recibí respuesta del profesor.', mode, checks, ...(uncertainty ? { uncertainty } : {}) };
}

export function useTutorSession(options: UseTutorSessionOptions): TutorSessionResult {
  const [messages, setMessages] = useState<ChatMessage[]>(options.initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);
  const messagesRef = useRef(messages);
  const lastAttemptRef = useRef<{ text: string; image?: string } | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const request = options.request ?? fetch;

  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => () => controllerRef.current?.abort(), []);

  const perform = useCallback(async (text: string, image: string | undefined, appendUser: boolean) => {
    if (loadingRef.current || !text.trim()) return;
    loadingRef.current = true;
    setIsLoading(true);
    setError(null);
    lastAttemptRef.current = { text: text.trim(), ...(image ? { image } : {}) };
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: Date.now(),
      imageSnapshot: image,
      protocolStep: options.context.protocolStep,
    };
    const nextMessages = appendUser ? [...messagesRef.current, userMessage] : messagesRef.current;
    if (appendUser) {
      messagesRef.current = nextMessages;
      setMessages(nextMessages);
    }
    const controller = new AbortController();
    controllerRef.current = controller;

    try {
      const response = await request('/api/tutor/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          messages: nextMessages.filter((message) => message.role !== 'system').map(({ role, content }) => ({ role, content })),
          image: image ?? options.image ?? null,
          sessionContext: options.context,
        }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json() as { reply?: unknown };
      const reply = readReply(data.reply);
      const assistant: ChatMessage = { id: `prof-${Date.now()}`, role: 'assistant', content: reply.message, timestamp: Date.now(), tutorMode: reply.mode, tutorChecks: reply.checks, ...(reply.uncertainty ? { tutorUncertainty: reply.uncertainty } : {}) };
      setMessages((current) => [...current, assistant]);
      options.onReply?.(reply.message);
    } catch (caught) {
      if (!(caught instanceof DOMException && caught.name === 'AbortError')) {
        setError('Hubo un problema de conexión con el aula. Puedes reintentar el último mensaje.');
      }
    } finally {
      loadingRef.current = false;
      setIsLoading(false);
    }
  }, [options.context, options.image, options.onReply, request]);

  return {
    messages,
    setMessages,
    isLoading,
    error,
    sendMessage: (text, image) => perform(text, image, true),
    retryLast: () => lastAttemptRef.current
      ? perform(lastAttemptRef.current.text, lastAttemptRef.current.image, false)
      : Promise.resolve(),
  };
}
