import express, { type Express } from 'express';
import { GoogleGenAI } from '@google/genai';

import { publicError } from './errors';
import { CameraSessionError, CameraSessionStore } from './camera-session-store';
import { buildTutorContents, SYSTEM_INSTRUCTION, type TutorContent } from './tutor';
import { parseTutorRequest, RequestValidationError } from './validation';

export interface AppDependencies {
  apiKey?: string;
  model?: string;
  generate?: (contents: TutorContent[], systemInstruction: string, model: string) => Promise<string>;
  now?: () => number;
  cameraStore?: CameraSessionStore;
}

interface RateBucket { start: number; count: number }

export function createApp(dependencies: AppDependencies): Express {
  const model = dependencies.model ?? process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';
  let generate = dependencies.generate;
  if (!generate) {
    if (!dependencies.apiKey) throw new Error('GEMINI_API_KEY is required to start the tutor server.');
    const client = new GoogleGenAI({ apiKey: dependencies.apiKey });
    generate = async (contents, systemInstruction, selectedModel) => {
      const response = await client.models.generateContent({
        model: selectedModel,
        contents,
        config: { systemInstruction, temperature: 0.4 },
      });
      return response.text ?? '';
    };
  }

  const app = express();
  const cameraStore = dependencies.cameraStore ?? new CameraSessionStore({ now: dependencies.now });
  const buckets = new Map<string, RateBucket>();
  const now = dependencies.now ?? Date.now;

  app.disable('x-powered-by');
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; media-src 'self' blob:; connect-src 'self'; style-src 'self' 'unsafe-inline'");
    next();
  });
  app.use(express.json({ limit: '9mb' }));

  app.post('/api/tutor/chat', async (req, res) => {
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const timestamp = now();
    const bucket = buckets.get(key);
    if (!bucket || timestamp - bucket.start >= 60_000) buckets.set(key, { start: timestamp, count: 1 });
    else if (bucket.count >= 20) return res.status(429).json(publicError('Demasiadas solicitudes. Inténtalo de nuevo en un minuto.', 'RATE_LIMITED'));
    else bucket.count += 1;

    try {
      const tutorRequest = parseTutorRequest(req.body);
      const reply = await generate!(buildTutorContents(tutorRequest), SYSTEM_INSTRUCTION, model);
      return res.json({ reply });
    } catch (error) {
      if (error instanceof RequestValidationError) {
        const status = error.code === 'IMAGE_TOO_LARGE' ? 413 : 400;
        return res.status(status).json(publicError(error.message, error.code));
      }
      console.error('Tutor provider request failed');
      return res.status(502).json(publicError('El profesor no está disponible temporalmente.', 'TUTOR_UNAVAILABLE'));
    }
  });

  app.post('/api/camera/sessions', (_req, res) => {
    res.status(201).json(cameraStore.create());
  });

  const cameraCredential = (req: express.Request): string => {
    const header = req.get('authorization');
    if (header?.startsWith('Bearer ')) return header.slice(7);
    return typeof req.query.credential === 'string' ? req.query.credential : '';
  };

  const parseFrame = (value: unknown): string => {
    if (typeof value !== 'string') throw new RequestValidationError('INVALID_FRAME', 'El fotograma no es válido.');
    const match = /^data:(image\/(?:jpeg|png));base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
    if (!match) throw new RequestValidationError('INVALID_FRAME', 'El fotograma no es válido.');
    const bytes = Buffer.from(match[2], 'base64');
    if (bytes.length > 2 * 1024 * 1024) throw new RequestValidationError('FRAME_TOO_LARGE', 'El fotograma supera el límite permitido.');
    const jpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    const png = bytes.length >= 8 && pngSignature.every((byte, index) => bytes[index] === byte);
    if ((match[1] === 'image/jpeg' && !jpeg) || (match[1] === 'image/png' && !png)) {
      throw new RequestValidationError('INVALID_FRAME', 'El fotograma no es válido.');
    }
    return value;
  };

  const cameraFailure = (res: express.Response, error: unknown) => {
    if (error instanceof CameraSessionError) {
      return res.status(404).json(publicError('La sesión de cámara no está disponible.', 'CAMERA_SESSION_UNAVAILABLE'));
    }
    if (error instanceof RequestValidationError) {
      const status = error.code === 'FRAME_TOO_LARGE' ? 413 : 400;
      return res.status(status).json(publicError(error.message, error.code));
    }
    return res.status(500).json(publicError('No se pudo procesar la cámara.', 'CAMERA_ERROR'));
  };

  app.post('/api/camera/sessions/:id/frames', (req, res) => {
    try {
      cameraStore.write(req.params.id, cameraCredential(req), parseFrame(req.body?.frame));
      return res.status(204).end();
    } catch (error) {
      return cameraFailure(res, error);
    }
  });

  app.get('/api/camera/sessions/:id/latest', (req, res) => {
    try {
      return res.json(cameraStore.read(req.params.id, cameraCredential(req)));
    } catch (error) {
      return cameraFailure(res, error);
    }
  });

  app.get('/api/camera/sessions/:id/stream', (req, res) => {
    try {
      const credential = cameraCredential(req);
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Connection', 'keep-alive');
      const send = (snapshot: unknown) => res.write(`data: ${JSON.stringify(snapshot)}\n\n`);
      send(cameraStore.read(req.params.id, credential));
      const unsubscribe = cameraStore.subscribe(req.params.id, credential, send);
      const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 15_000);
      req.on('close', () => {
        clearInterval(heartbeat);
        unsubscribe();
      });
    } catch (error) {
      return cameraFailure(res, error);
    }
  });

  app.use('/api', (_req, res) => {
    res.status(404).json(publicError('Ruta no encontrada.', 'NOT_FOUND'));
  });

  return app;
}
