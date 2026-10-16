import express, { type Express } from 'express';
import { GoogleGenAI } from '@google/genai';

import { publicError } from './errors';
import { buildTutorContents, SYSTEM_INSTRUCTION, type TutorContent } from './tutor';
import { parseTutorRequest, RequestValidationError } from './validation';

export interface AppDependencies {
  apiKey?: string;
  model?: string;
  generate?: (contents: TutorContent[], systemInstruction: string, model: string) => Promise<string>;
  now?: () => number;
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

  return app;
}
