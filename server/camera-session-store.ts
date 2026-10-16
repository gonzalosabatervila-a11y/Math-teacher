import { randomBytes } from 'node:crypto';

export interface CameraSessionAccess {
  sessionId: string;
  writeCredential: string;
  readCredential: string;
  expiresAt: number;
}

export interface CameraSnapshot {
  frame: string | null;
  lastFrameTime: number | null;
  subscriberCount: number;
}

type CameraListener = (snapshot: CameraSnapshot) => void;

interface CameraSession extends CameraSessionAccess {
  createdAt: number;
  frame: string | null;
  lastFrameTime: number | null;
  subscribers: Set<CameraListener>;
}

export class CameraSessionError extends Error {
  constructor(public readonly code: 'SESSION_NOT_FOUND' | 'SESSION_EXPIRED' | 'UNAUTHORIZED') {
    super('La sesión de cámara no está disponible.');
    this.name = 'CameraSessionError';
  }
}

export class CameraSessionStore {
  private readonly sessions = new Map<string, CameraSession>();
  private readonly now: () => number;
  private readonly token: () => string;

  constructor(options: { now?: () => number; randomToken?: () => string } = {}) {
    this.now = options.now ?? Date.now;
    this.token = options.randomToken ?? (() => randomBytes(24).toString('base64url'));
  }

  create(): CameraSessionAccess {
    const createdAt = this.now();
    const access = {
      sessionId: this.token(),
      writeCredential: this.token(),
      readCredential: this.token(),
      expiresAt: createdAt + 2 * 60 * 60 * 1_000,
    };
    this.sessions.set(access.sessionId, {
      ...access,
      createdAt,
      frame: null,
      lastFrameTime: null,
      subscribers: new Set(),
    });
    return access;
  }

  write(id: string, credential: string, frame: string): CameraSnapshot {
    const session = this.getActive(id);
    if (credential !== session.writeCredential) throw new CameraSessionError('UNAUTHORIZED');
    session.frame = frame;
    session.lastFrameTime = this.now();
    const snapshot = this.snapshot(session);
    session.subscribers.forEach((listener) => listener(snapshot));
    return snapshot;
  }

  read(id: string, credential: string): CameraSnapshot {
    const session = this.getActive(id);
    if (credential !== session.readCredential) throw new CameraSessionError('UNAUTHORIZED');
    return this.snapshot(session);
  }

  subscribe(id: string, credential: string, listener: CameraListener): () => void {
    const session = this.getActive(id);
    if (credential !== session.readCredential) throw new CameraSessionError('UNAUTHORIZED');
    session.subscribers.add(listener);
    return () => session.subscribers.delete(listener);
  }

  delete(id: string): boolean {
    return this.sessions.delete(id);
  }

  sweep(timestamp = this.now()): number {
    let removed = 0;
    this.sessions.forEach((session, id) => {
      if (timestamp > session.expiresAt) {
        this.sessions.delete(id);
        removed += 1;
      }
    });
    return removed;
  }

  private getActive(id: string): CameraSession {
    const session = this.sessions.get(id);
    if (!session) throw new CameraSessionError('SESSION_NOT_FOUND');
    if (this.now() > session.expiresAt) throw new CameraSessionError('SESSION_EXPIRED');
    return session;
  }

  private snapshot(session: CameraSession): CameraSnapshot {
    return {
      frame: session.frame,
      lastFrameTime: session.lastFrameTime,
      subscriberCount: session.subscribers.size,
    };
  }
}
