import { describe, expect, it } from 'vitest';
import { loadConfig } from './config';

describe('server configuration', () => {
  it('rejects a missing production API key and invalid port or model values', () => {
    expect(() => loadConfig({ NODE_ENV: 'production', PORT: '3000' })).toThrow(/GEMINI_API_KEY/);
    expect(() => loadConfig({ NODE_ENV: 'development', PORT: '0', GEMINI_API_KEY: 'x' })).toThrow(/PORT/);
    expect(() => loadConfig({ NODE_ENV: 'development', PORT: '3000', GEMINI_API_KEY: 'x', GEMINI_MODEL: '../bad model' })).toThrow(/GEMINI_MODEL/);
  });

  it('loads bounded defaults without exposing unrelated environment values', () => {
    expect(loadConfig({ NODE_ENV: 'development', GEMINI_API_KEY: 'secret', OTHER_SECRET: 'ignore' })).toEqual({ nodeEnv: 'development', port: 3000, apiKey: 'secret', model: 'gemini-2.5-flash' });
  });
});
