export interface ServerConfig {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  apiKey?: string;
  model: string;
}

export function loadConfig(env: Record<string, string | undefined>): ServerConfig {
  const nodeEnv = env.NODE_ENV === 'production' || env.NODE_ENV === 'test' ? env.NODE_ENV : 'development';
  const port = env.PORT === undefined || env.PORT === '' ? 3000 : Number(env.PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) throw new Error('PORT debe ser un entero entre 1 y 65535.');
  const model = env.GEMINI_MODEL || 'gemini-2.5-flash';
  if (!/^[A-Za-z0-9._-]{1,100}$/.test(model)) throw new Error('GEMINI_MODEL no es válido.');
  const apiKey = env.GEMINI_API_KEY?.trim() || undefined;
  if (nodeEnv === 'production' && !apiKey) throw new Error('GEMINI_API_KEY es obligatoria en producción.');
  return { nodeEnv, port, ...(apiKey ? { apiKey } : {}), model };
}
