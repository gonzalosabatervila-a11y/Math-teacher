export type TutorRole = 'user' | 'assistant';

export interface TutorMessage {
  role: TutorRole;
  content: string;
}

export interface TutorSessionContext {
  week: number;
  session: number;
  phase: string;
  elapsedMinutes: number;
  protocolStep: number;
  topic?: string;
}

export interface TutorImage {
  mimeType: 'image/jpeg' | 'image/png';
  data: string;
}

export interface TutorRequest {
  messages: TutorMessage[];
  sessionContext?: TutorSessionContext;
  image?: TutorImage;
}

export class RequestValidationError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'RequestValidationError';
  }
}

function fail(code: string, message: string): never {
  throw new RequestValidationError(code, message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseImage(value: unknown): TutorImage | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') fail('INVALID_IMAGE', 'La imagen debe ser una URL de datos.');

  const match = /^data:(image\/(?:jpeg|png));base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match) fail('INVALID_IMAGE', 'La imagen no tiene un formato válido.');

  const mimeType = match[1] as TutorImage['mimeType'];
  const data = match[2];
  const bytes = Buffer.from(data, 'base64');
  if (bytes.length > 6 * 1024 * 1024) fail('IMAGE_TOO_LARGE', 'La imagen supera el límite permitido.');
  if (bytes.length === 0 || bytes.toString('base64').replace(/=+$/, '') !== data.replace(/=+$/, '')) {
    fail('INVALID_IMAGE', 'La imagen contiene base64 inválido.');
  }

  const jpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  const png = bytes.length >= 8 && pngSignature.every((byte, index) => bytes[index] === byte);
  if ((mimeType === 'image/jpeg' && !jpeg) || (mimeType === 'image/png' && !png)) {
    fail('INVALID_IMAGE', 'El contenido no coincide con el tipo de imagen declarado.');
  }

  return { mimeType, data };
}

export function parseTutorRequest(input: unknown): TutorRequest {
  if (!isRecord(input) || !Array.isArray(input.messages)) {
    fail('INVALID_REQUEST', 'La solicitud no tiene el formato esperado.');
  }
  if (input.messages.length > 40) fail('TOO_MANY_MESSAGES', 'El historial es demasiado largo.');

  const messages = input.messages.map((message) => {
    if (!isRecord(message) || (message.role !== 'user' && message.role !== 'assistant')) {
      fail('INVALID_ROLE', 'El rol del mensaje no es válido.');
    }
    if (typeof message.content !== 'string') fail('INVALID_MESSAGE', 'El mensaje debe ser texto.');
    if (message.content.length > 4_000) fail('MESSAGE_TOO_LONG', 'El mensaje es demasiado largo.');
    return { role: message.role as TutorRole, content: message.content };
  });

  let sessionContext: TutorSessionContext | undefined;
  if (input.sessionContext !== undefined) {
    const context = input.sessionContext;
    const week = isRecord(context) ? context.week : undefined;
    const session = isRecord(context) ? context.session : undefined;
    const elapsedMinutes = isRecord(context) ? context.elapsedMinutes : undefined;
    const protocolStep = isRecord(context) ? context.protocolStep : undefined;
    if (
      !isRecord(context) ||
      typeof week !== 'number' || !Number.isInteger(week) || week < 0 || week > 13 ||
      typeof session !== 'number' || !Number.isInteger(session) || session < 1 || session > 3 ||
      typeof context.phase !== 'string' || context.phase.length > 80 ||
      typeof elapsedMinutes !== 'number' || !Number.isInteger(elapsedMinutes) || elapsedMinutes < 0 || elapsedMinutes > 60 ||
      typeof protocolStep !== 'number' || !Number.isInteger(protocolStep) || protocolStep < 1 || protocolStep > 7 ||
      (context.topic !== undefined && (typeof context.topic !== 'string' || context.topic.length > 200))
    ) {
      fail('INVALID_CONTEXT', 'El contexto de sesión no es válido.');
    }
    sessionContext = context as unknown as TutorSessionContext;
  }

  const image = parseImage(input.image);
  return {
    messages,
    ...(sessionContext ? { sessionContext } : {}),
    ...(image ? { image } : {}),
  };
}
