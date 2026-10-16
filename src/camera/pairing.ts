export interface MobilePairing {
  sessionId: string;
  writeCredential: string;
}

interface PairingLocation {
  hash: string;
  pathname: string;
  search: string;
}

const isOpaqueValue = (value: string): boolean => value.length > 0 && value.length <= 200 && /^[A-Za-z0-9_-]+$/.test(value);

export function createPairingFragment(access: MobilePairing): string {
  if (!isOpaqueValue(access.sessionId) || !isOpaqueValue(access.writeCredential)) throw new Error('Datos de emparejamiento no válidos.');
  return `#cam=${encodeURIComponent(access.sessionId)}&key=${encodeURIComponent(access.writeCredential)}`;
}

export function consumePairingFragment(location: PairingLocation, history: Pick<History, 'replaceState'>): MobilePairing | null {
  if (!location.hash.startsWith('#')) return null;
  const params = new URLSearchParams(location.hash.slice(1));
  const sessions = params.getAll('cam');
  const credentials = params.getAll('key');
  if (sessions.length !== 1 || credentials.length !== 1 || !isOpaqueValue(sessions[0]) || !isOpaqueValue(credentials[0])) return null;
  history.replaceState(null, '', `${location.pathname}${location.search}`);
  return { sessionId: sessions[0], writeCredential: credentials[0] };
}
