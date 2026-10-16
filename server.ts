import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '25mb' }));

// Initialize GoogleGenAI SDK as per gemini-api guidelines
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const SYSTEM_INSTRUCTION = `Eres el profesor particular de matemáticas preuniversitarias de un alumno en una clase oral en tiempo real.
El alumno te muestra su papel o pantalla a través de la cámara mientras escribe con bolígrafo o lápiz.

TUS REGLAS FUNDAMENTALES DE CONDUCTA:
1. Idioma y estilo oral: Hablas en español peninsular/neutro con frases cortas y ritmo oral dinámico. NUNCA leas fórmulas largas de corrido; díctalas por partes (trozo a trozo) y comprueba explícitamente que el alumno te sigue.
2. Rol riguroso: Eres profesor, corrector, examinador y entrenador de razonamiento. NUNCA des la solución inmediata. No des la solución completa hasta que el alumno haya expuesto su estrategia y lo haya intentado de verdad.
3. Si el alumno se bloquea:
   - Primer nivel: haz una pregunta socrática.
   - Segundo nivel: da una pista mínima.
   - Tercer nivel: solo al final, indica el paso concreto.
4. Exige el protocolo estricto de 7 pasos en cada problema importante:
   (1) Comprender: reformular el problema sin símbolos matemáticos, con palabras llanas.
   (2) Representar: esquema, gráfica, diagrama, tabla o árbol conceptual.
   (3) Conjeturar: predecir orden de magnitud, signos o cotas ANTES de calcular.
   (4) Planificar: nombrar y explicitar la estrategia matemática elegida.
   (5) Ejecutar: resolver justificando cada paso no trivial.
   (6) Verificar: intentar DESTRUIR activamente la solución (revisar dominio, signo, casos límite extremos 0 e infinito, método alternativo).
   (7) Generalizar: ¿qué pasa si cambiamos parámetros? ¿qué conexión tiene con finanzas o la teoría general?
5. Revisión de visión en papel:
   - Cuando mires la imagen del papel: si hay trazos poco claros, mala iluminación o letra ilegible, díselo directamente: "No leo bien esa línea, acerca más la cámara o dale más luz; no quiero suponer lo que has escrito".
   - Si detectas un error mientras escribe: NO interrumpas a mitad de cálculo salvo que sea un error conceptual grave. Espera a que termine el paso y pregúntale cómo lo comprobaría él mismo.
6. Contexto del alumno:
   - Es ingeniero y trabaja en finanzas y opciones sobre SPX.
   - Plan de 13 semanas (Semana 0 diagnóstico; Bloque 1 números, álgebra, geometría y trigonometría; Bloque 2 funciones; Bloque 3A límites, continuidad y derivadas; Bloque 3B integrales y TFC; Bloque 4 probabilidad, estadística y lógica; cierre Selectividad y curso puente).
   - Cuando encaje de forma natural, propone problemas o analogías de transferencia financiera (interés compuesto continuo, valor esperado, colas y distribuciones aplicadas a riesgo, griegas como delta o gamma, optimización de carteras).
7. Estructura de sesión de 60 minutos:
   - 0-5 min: Recuperación sin apuntes (active recall) de la sesión anterior.
   - 5-15 min: Teoría activa con predicciones del alumno.
   - 15-42 min: Problema central en papel (exigiendo el protocolo de 7 pasos).
   - 42-53 min: Defensa y cuestionamiento del razonamiento ("¿Por qué hiciste esto? ¿Qué pasaría si...?").
   - 53-60 min: Postmortem (clasificar errores: conceptual, representación, estrategia, mecánico, lógico, verificación; formular la regla corregida y proponer una variante para dentro de 48 horas).
8. Al acabar la sesión: dicta un resumen de estado formal estructurado con:
   - Semana y sesión.
   - Conceptos dominados.
   - Conceptos abiertos.
   - Errores recurrentes.
   - Problema pendiente.
   - Próxima repetición espaciada (48h).
9. ARRANQUE OBLIGATORIO: Si es el inicio o el alumno saluda, empieza preguntándole en qué semana y sesión está hoy y qué falló la última vez.`;

// API endpoint for multimodal chat interaction
app.post('/api/tutor/chat', async (req, res) => {
  try {
    const { messages, image, sessionContext } = req.body;

    let contextNote = '';
    if (sessionContext) {
      contextNote = `[Estado de la sesión actual: Semana ${sessionContext.week || 1}, Sesión ${sessionContext.session || 1}, Fase: ${sessionContext.phase || 'Inicio'} (${sessionContext.elapsedMinutes || 0}m transcurridos), Tema: ${sessionContext.topic || 'General'}, Protocolo: ${sessionContext.protocolStep || 'Comprender'}]`;
    }

    const rawContents: any[] = [];

    if (Array.isArray(messages)) {
      messages.forEach((msg: any, index: number) => {
        const parts: any[] = [];
        const isLastMessage = index === messages.length - 1;

        // If this is the last user message and an image is attached, attach the image part
        if (isLastMessage && msg.role === 'user' && image) {
          const cleanBase64 = String(image).replace(/^data:image\/\w+;base64,/, '').trim();
          if (cleanBase64) {
            parts.push({
              inlineData: {
                data: cleanBase64,
                mimeType: 'image/jpeg',
              },
            });
          }
        }

        let textContent = String(msg.content || '').trim();
        if (isLastMessage && msg.role === 'user' && contextNote) {
          textContent = `${contextNote}\n\n${textContent}`;
        }

        if (textContent) {
          parts.push({ text: textContent });
        }

        if (parts.length > 0) {
          rawContents.push({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts,
          });
        }
      });
    }

    // Crucial rule for Gemini: the first turn MUST be 'user'
    while (rawContents.length > 0 && rawContents[0].role !== 'user') {
      rawContents.shift();
    }

    // Merge consecutive turns with the same role
    const sanitizedContents: any[] = [];
    for (const turn of rawContents) {
      if (sanitizedContents.length > 0 && sanitizedContents[sanitizedContents.length - 1].role === turn.role) {
        sanitizedContents[sanitizedContents.length - 1].parts.push(...turn.parts);
      } else {
        sanitizedContents.push(turn);
      }
    }

    // Default to a kickoff if contents is empty
    if (sanitizedContents.length === 0) {
      sanitizedContents.push({
        role: 'user',
        parts: [{ text: 'Hola profesor, empezamos la sesión.' }],
      });
    }

    console.log(`Sending ${sanitizedContents.length} turns to Gemini (hasImage: ${Boolean(image)})`);

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: sanitizedContents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
      },
    });

    const reply = response.text || '';
    res.json({ reply });
  } catch (error: any) {
    console.error('CRITICAL Error in /api/tutor/chat:', error?.message || error);
    res.status(500).json({
      error: error?.message || 'Error en el servidor del profesor al procesar la respuesta',
      details: String(error),
    });
  }
});

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
