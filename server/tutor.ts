import type { TutorRequest } from './validation';

export interface TextPart { text: string }
export interface ImagePart { inlineData: { data: string; mimeType: 'image/jpeg' | 'image/png' } }
export interface TutorContent { role: 'user' | 'model'; parts: Array<TextPart | ImagePart> }

export const SYSTEM_INSTRUCTION = `Eres un profesor particular de matemáticas preuniversitarias en español.
Guía con preguntas socráticas antes de dar una solución y adapta el protocolo de siete pasos a la complejidad real del ejercicio: usa solo los pasos que aporten valor, pero nunca omitas las comprobaciones necesarias.
Exige dominio, hipótesis, unidades, signos, casos límite y una comprobación independiente cuando proceda.
Si una imagen es borrosa, incompleta o ambigua, dilo y no inventes símbolos ni pasos que no puedas leer.
Distingue con claridad el currículo de Bachillerato/Selectividad de cualquier ampliación universitaria.
Las analogías con mercados, opciones o Black–Scholes son transferencia conceptual: simplifican supuestos y no es asesoramiento financiero.
No afirmes que un razonamiento es correcto hasta haber comprobado sus pasos relevantes.`;

function contextText(request: TutorRequest): string | undefined {
  const context = request.sessionContext;
  if (!context) return undefined;
  return `[Sesión: semana ${context.week}; sesión ${context.session}; fase ${context.phase}; minuto ${context.elapsedMinutes}; tema ${context.topic ?? 'General'}; paso ${context.protocolStep}]`;
}

export function buildTutorContents(request: TutorRequest): TutorContent[] {
  const firstUser = request.messages.findIndex((message) => message.role === 'user');
  const messages = firstUser === -1 ? [] : request.messages.slice(firstUser, 40);
  const contents: TutorContent[] = [];

  messages.forEach((message, index) => {
    const role = message.role === 'assistant' ? 'model' : 'user';
    const isLastUser = message.role === 'user' && !messages.slice(index + 1).some((next) => next.role === 'user');
    const parts: Array<TextPart | ImagePart> = [];

    if (isLastUser && request.image) {
      parts.push({ inlineData: request.image });
    }
    const session = isLastUser ? contextText(request) : undefined;
    parts.push({ text: session ? `${session}\n\n${message.content}` : message.content });

    const previous = contents.at(-1);
    if (previous?.role === role) previous.parts.push(...parts);
    else contents.push({ role, parts });
  });

  return contents.length > 0
    ? contents
    : [{ role: 'user', parts: [{ text: 'Hola profesor, empezamos la sesión.' }] }];
}
