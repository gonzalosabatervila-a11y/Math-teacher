import {
  PERSONAL_STATE_SCHEMA_VERSION,
  type PersonalStateV2,
  validatePersonalState,
} from './personal-state';

const BACKUP_FORMAT = 'math-teacher-personal-backup';
const MAX_BACKUP_LENGTH = 1_000_000;

interface BackupEnvelope {
  format: typeof BACKUP_FORMAT;
  schemaVersion: typeof PERSONAL_STATE_SCHEMA_VERSION;
  exportedAt: string;
  state: PersonalStateV2;
}

export class BackupValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupValidationError';
  }
}

export function exportBackup(state: PersonalStateV2, exportedAt = Date.now()): string {
  const validated = validatePersonalState(state);
  if (!validated) throw new BackupValidationError('La copia de seguridad contiene datos no válidos.');

  const envelope: BackupEnvelope = {
    format: BACKUP_FORMAT,
    schemaVersion: PERSONAL_STATE_SCHEMA_VERSION,
    exportedAt: new Date(exportedAt).toISOString(),
    state: validated,
  };
  return JSON.stringify(envelope, null, 2);
}

export function importBackup(payload: string): PersonalStateV2 {
  if (payload.length > MAX_BACKUP_LENGTH) {
    throw new BackupValidationError('La copia de seguridad es demasiado grande.');
  }

  try {
    const envelope = JSON.parse(payload) as Partial<BackupEnvelope>;
    if (
      !envelope || typeof envelope !== 'object' || Array.isArray(envelope) ||
      envelope.format !== BACKUP_FORMAT ||
      envelope.schemaVersion !== PERSONAL_STATE_SCHEMA_VERSION ||
      typeof envelope.exportedAt !== 'string' || !Number.isFinite(Date.parse(envelope.exportedAt))
    ) {
      throw new BackupValidationError('La copia de seguridad no tiene un formato compatible.');
    }
    const state = validatePersonalState(envelope.state);
    if (!state) throw new BackupValidationError('La copia de seguridad contiene datos no válidos.');
    return state;
  } catch (error) {
    if (error instanceof BackupValidationError) throw error;
    throw new BackupValidationError('La copia de seguridad no se puede leer.');
  }
}
