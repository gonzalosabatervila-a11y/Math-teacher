import { useMemo, useState } from 'react';
import { AppShell, type AppMode } from './components/AppShell';
import { ConfirmDialog } from './components/ConfirmDialog';
import { MobileCamView } from './components/MobileCamView';
import { HomeScreen } from './screens/HomeScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { SessionScreen } from './screens/SessionScreen';
import { exportBackup, importBackup } from './state/backup';
import { createDefaultPersonalState, type PersonalStateV2 } from './state/personal-state';
import { PersonalStateRepository } from './state/personal-state-repository';
import { usePersonalSession } from './hooks/usePersonalSession';
import { startSession } from './session/session-controller';
import { consumePairingFragment } from './camera/pairing';

type Confirmation = 'new' | 'import' | 'reset' | null;

export default function App() {
  const [mobilePairing] = useState(() => typeof window === 'undefined' ? null : consumePairingFragment(window.location, window.history));
  if (mobilePairing) return <MobileCamView sessionId={mobilePairing.sessionId} writeCredential={mobilePairing.writeCredential} />;
  return <PersonalApp />;
}

function PersonalApp() {
  const repository = useMemo(() => new PersonalStateRepository(localStorage), []);
  const controller = usePersonalSession({ repository });
  const [mode, setMode] = useState<AppMode>('home');
  const [confirmation, setConfirmation] = useState<Confirmation>(null);
  const [pendingImport, setPendingImport] = useState<PersonalStateV2 | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const start = () => { controller.start(); setMode('session'); };
  const replaceWithNew = () => {
    controller.replaceState(startSession({ ...controller.state, activeSession: null }, controller.selection, Date.now()));
    setConfirmation(null);
    setMode('session');
    setStatus('Nueva sesión iniciada. La anterior se ha sustituido.');
  };
  const download = () => {
    const blob = new Blob([exportBackup(controller.state)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `math-teacher-copia-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus('Copia de seguridad descargada.');
  };
  const prepareImport = async (file: File) => {
    setError(null);
    try {
      setPendingImport(importBackup(await file.text()));
      setConfirmation('import');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'La copia de seguridad no se puede leer.');
    }
  };
  const confirmImport = () => {
    if (pendingImport) controller.replaceState(pendingImport);
    setPendingImport(null);
    setConfirmation(null);
    setMode('home');
    setStatus('Copia importada correctamente.');
  };
  const confirmReset = () => {
    repository.clear();
    controller.replaceState(createDefaultPersonalState(Date.now()));
    setConfirmation(null);
    setMode('home');
    setStatus('Datos locales eliminados.');
  };

  return <AppShell mode={mode} onNavigate={(next) => { if (next === 'session' && !controller.activeSession) start(); else setMode(next); }} status={status}>
    {error && <p role="alert" className="mb-4 rounded-lg border border-red-800 bg-red-950/50 p-3 text-sm text-red-200">{error}</p>}
    {mode === 'home' && <HomeScreen state={controller.state} now={Date.now()} onContinue={() => setMode('session')} onStart={start} onCompleteReview={controller.completeReview} onNewSession={() => setConfirmation('new')} />}
    {mode === 'session' && <SessionScreen controller={controller} onFinished={() => { setMode('home'); setStatus('Sesión guardada y repaso programado cuando corresponde.'); }} onRequestNew={() => setConfirmation('new')} />}
    {mode === 'history' && <HistoryScreen state={controller.state} onExport={download} onImport={prepareImport} onReset={() => setConfirmation('reset')} />}
    <ConfirmDialog open={confirmation === 'new'} title="¿Empezar una sesión nueva?" description="La sesión activa se sustituirá. Tu historial ya completado no cambiará." confirmLabel="Empezar nueva" onConfirm={replaceWithNew} onCancel={() => setConfirmation(null)} />
    <ConfirmDialog open={confirmation === 'import'} title="¿Importar esta copia?" description="La copia sustituirá los datos locales actuales después de haber sido validada." confirmLabel="Importar copia" onConfirm={confirmImport} onCancel={() => { setConfirmation(null); setPendingImport(null); }} />
    <ConfirmDialog open={confirmation === 'reset'} title="¿Borrar todos los datos locales?" description="Se eliminarán la sesión activa, el historial, los repasos y las preferencias de este navegador." confirmLabel="Borrar datos" destructive onConfirm={confirmReset} onCancel={() => setConfirmation(null)} />
  </AppShell>;
}
