import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createApp } from './server/app';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = createApp(
  process.env.NODE_ENV === 'test'
    ? { generate: async () => '' }
    : { apiKey: process.env.GEMINI_API_KEY, model: process.env.GEMINI_MODEL }
);
const PORT = Number(process.env.PORT) || 3000;

// Setup Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Profesor de Matemáticas listening on port ${PORT}`);
  });
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}
