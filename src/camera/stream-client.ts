export type CameraStreamState = 'connecting' | 'live' | 'retrying' | 'expired';

export interface CameraStreamSnapshot {
  frame: string | null;
  lastFrameTime: number | null;
}

interface OpenCameraStreamOptions {
  url: string;
  credential: string;
  signal: AbortSignal;
  fetchImpl?: typeof fetch;
  onSnapshot(snapshot: CameraStreamSnapshot): void;
  onState(state: CameraStreamState): void;
}

const MAX_EVENT_SIZE = 3 * 1024 * 1024;
const delays = [500, 1_000, 2_000, 4_000];

const wait = (milliseconds: number, signal: AbortSignal) => new Promise<void>((resolve) => {
  if (signal.aborted) return resolve();
  const timer = window.setTimeout(resolve, milliseconds);
  signal.addEventListener('abort', () => { window.clearTimeout(timer); resolve(); }, { once: true });
});

export async function openCameraStream({ url, credential, signal, fetchImpl = fetch, onSnapshot, onState }: OpenCameraStreamOptions): Promise<void> {
  for (let attempt = 0; attempt <= delays.length && !signal.aborted; attempt += 1) {
    onState(attempt === 0 ? 'connecting' : 'retrying');
    try {
      const response = await fetchImpl(url, { headers: { Authorization: `Bearer ${credential}` }, signal });
      if (response.status === 404) { onState('expired'); return; }
      if (!response.ok || !response.body) throw new Error('Camera stream unavailable');
      onState('live');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (!signal.aborted) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
        if (buffer.length > MAX_EVENT_SIZE) throw new Error('Camera event too large');
        let boundary = buffer.indexOf('\n\n');
        while (boundary >= 0) {
          const record = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          const payload = record.split('\n').filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trimStart()).join('\n');
          if (payload) {
            const parsed = JSON.parse(payload) as CameraStreamSnapshot;
            onSnapshot({ frame: typeof parsed.frame === 'string' ? parsed.frame : null, lastFrameTime: typeof parsed.lastFrameTime === 'number' ? parsed.lastFrameTime : null });
          }
          if (signal.aborted) { await reader.cancel(); return; }
          boundary = buffer.indexOf('\n\n');
        }
      }
      if (signal.aborted) return;
    } catch (error) {
      if (signal.aborted || (error instanceof DOMException && error.name === 'AbortError')) return;
    }
    if (attempt < delays.length) await wait(delays[attempt], signal);
  }
  if (!signal.aborted) onState('expired');
}
