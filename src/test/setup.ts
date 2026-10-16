import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

Object.defineProperty(window, 'matchMedia', {
  configurable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

Object.defineProperty(window, 'speechSynthesis', {
  configurable: true,
  value: {
    cancel: vi.fn(),
    getVoices: vi.fn(() => []),
    speak: vi.fn(),
  },
});

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(window, 'ResizeObserver', {
  configurable: true,
  value: ResizeObserverStub,
});

class EventSourceStub {
  static CLOSED = 2;
  static CONNECTING = 0;
  static OPEN = 1;
  CLOSED = 2;
  CONNECTING = 0;
  OPEN = 1;
  readyState = EventSourceStub.CONNECTING;
  url: string;
  withCredentials = false;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onopen: ((event: Event) => void) | null = null;

  constructor(url: string | URL) {
    this.url = String(url);
  }

  addEventListener() {}
  dispatchEvent() {
    return true;
  }
  removeEventListener() {}
  close() {
    this.readyState = EventSourceStub.CLOSED;
  }
}

Object.defineProperty(window, 'EventSource', {
  configurable: true,
  value: EventSourceStub,
});

Object.defineProperty(globalThis, 'fetch', {
  configurable: true,
  value: vi.fn(async () => ({
    ok: true,
    json: async () => ({ sessionId: 'TESTSESSION' }),
  })),
});

Object.defineProperty(Element.prototype, 'scrollIntoView', {
  configurable: true,
  value: vi.fn(),
});
