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

// Mobile Document Camera Session Management
interface CamSession {
  id: string;
  createdAt: number;
  lastFrame: string | null;
  lastFrameTime: number;
  mobileConnected: boolean;
  subscribers: Array<(data: any) => void>;
}

const camSessions = new Map<string, CamSession>();

// Cleanup stale sessions every 10 mins
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of camSessions.entries()) {
    if (now - session.lastFrameTime > 2 * 60 * 60 * 1000) {
      camSessions.delete(id);
    }
  }
}, 10 * 60 * 1000);

// Initialize a mobile camera pairing session
app.post('/api/cam-session/init', (req, res) => {
  const customId = req.body?.sessionId;
  const id = customId || Math.random().toString(36).substring(2, 8).toUpperCase();
  
  if (!camSessions.has(id)) {
    camSessions.set(id, {
      id,
      createdAt: Date.now(),
      lastFrame: null,
      lastFrameTime: Date.now(),
      mobileConnected: false,
      subscribers: [],
    });
  }
  
  res.json({ sessionId: id });
});

// Mobile posts a frame from its camera
app.post('/api/cam-session/:id/frame', (req, res) => {
  const { id } = req.params;
  const { frame } = req.body;

  let session = camSessions.get(id);
  if (!session) {
    session = {
      id,
      createdAt: Date.now(),
      lastFrame: null,
      lastFrameTime: Date.now(),
      mobileConnected: true,
      subscribers: [],
    };
    camSessions.set(id, session);
  }

  session.lastFrame = frame || null;
  session.lastFrameTime = Date.now();
  session.mobileConnected = true;

  // Notify all SSE subscribers
  const payload = JSON.stringify({
    type: 'frame',
    frame: session.lastFrame,
    timestamp: session.lastFrameTime,
    mobileConnected: true,
  });

  session.subscribers.forEach((send) => send(payload));
  res.json({ ok: true, subscribers: session.subscribers.length });
});

// SSE stream for computer to receive live mobile camera frames in real time
app.get('/api/cam-session/:id/stream', (req, res) => {
  const { id } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  let session = camSessions.get(id);
  if (!session) {
    session = {
      id,
      createdAt: Date.now(),
      lastFrame: null,
      lastFrameTime: Date.now(),
      mobileConnected: false,
      subscribers: [],
    };
    camSessions.set(id, session);
  }

  const sendEvent = (dataString: string) => {
    res.write(`data: ${dataString}\n\n`);
  };

  session.subscribers.push(sendEvent);

  // Send current state immediately
  sendEvent(
    JSON.stringify({
      type: 'init',
      frame: session.lastFrame,
      mobileConnected: session.mobileConnected,
      timestamp: session.lastFrameTime,
    })
  );

  req.on('close', () => {
    if (session) {
      session.subscribers = session.subscribers.filter((fn) => fn !== sendEvent);
    }
  });
});

// Query latest frame or status
app.get('/api/cam-session/:id/latest', (req, res) => {
  const { id } = req.params;
  const session = camSessions.get(id);
  if (!session) {
    return res.json({ connected: false, frame: null });
  }
  res.json({
    connected: session.mobileConnected,
    frame: session.lastFrame,
    timestamp: session.lastFrameTime,
    ageMs: Date.now() - session.lastFrameTime,
  });
});

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

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
