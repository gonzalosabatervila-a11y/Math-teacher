import { useEffect, useMemo, useState } from 'react';
import type { PersonalSessionController } from '../hooks/usePersonalSession';
import { SESSION_PHASES, SYLLABUS } from '../data/syllabus';
import { CameraPaperView } from '../components/CameraPaperView';
import { ClassroomFeed } from '../components/ClassroomFeed';
import { PostmortemModal } from '../components/PostmortemModal';
import { ResponsiveWorkspaceTabs } from '../components/ResponsiveWorkspaceTabs';
import { SessionTimeline } from '../components/SessionTimeline';
import { SyllabusSelector } from '../components/SyllabusSelector';
import { useTutorSession } from '../hooks/useTutorSession';
import { speakInSpanish, stopSpeaking, type SpeechSettings } from '../utils/speech';

const INITIAL_TEACHER_PROMPT = '¡Hola! Empecemos. ¿Qué fallaste la última vez que practicaste y cómo lo detectarías hoy?';

interface SessionScreenProps { controller: PersonalSessionController; onFinished(): void; onRequestNew(): void }

export function SessionScreen({ controller, onFinished, onRequestNew }: SessionScreenProps) {
  const active = controller.activeSession;
  const [paperSnapshot, setPaperSnapshot] = useState<string | null>(null);
  const [syllabusOpen, setSyllabusOpen] = useState(false);
  const [postmortemOpen, setPostmortemOpen] = useState(false);
  const phase = SESSION_PHASES.find((item) => item.id === active?.phaseId) ?? SESSION_PHASES[0];
  const topic = SYLLABUS.find((item) => item.week === active?.week)?.title ?? 'General';
  const speechSettings: SpeechSettings = useMemo(() => ({
    autoSpeak: controller.preferences.autoSpeak,
    rate: controller.preferences.speechRate,
    pitch: controller.preferences.speechPitch,
    volume: controller.preferences.speechVolume,
  }), [controller.preferences]);
  const initialMessages = useMemo(() => active?.messages.length ? active.messages : [{ id: `initial-${active?.id ?? 'session'}`, role: 'assistant' as const, content: INITIAL_TEACHER_PROMPT, timestamp: Date.now() }], [active?.id]);
  const tutor = useTutorSession({
    initialMessages,
    context: { week: active?.week ?? controller.selection.week, session: active?.session ?? controller.selection.session, phase: phase.name, elapsedMinutes: Math.floor(controller.elapsedSeconds / 60), topic, protocolStep: active?.activeProtocolStep ?? 1 },
    image: paperSnapshot,
    onReply: (reply) => { if (speechSettings.autoSpeak) speakInSpanish(reply, speechSettings); },
  });

  useEffect(() => {
    if (active && tutor.messages !== active.messages) controller.updateActiveSession({ messages: tutor.messages });
  }, [tutor.messages]);

  if (!active) return <section className="rounded-2xl border border-stone-800 bg-stone-900 p-8 text-center"><h2 className="text-xl font-bold">Preparando tu sesión…</h2></section>;

  const updateSpeech = (settings: Partial<SpeechSettings>) => controller.setPreferences({
    autoSpeak: settings.autoSpeak ?? controller.preferences.autoSpeak,
    speechRate: settings.rate ?? controller.preferences.speechRate,
    speechPitch: settings.pitch ?? controller.preferences.speechPitch,
    speechVolume: settings.volume ?? controller.preferences.speechVolume,
  });
  const requestReview = (snapshot?: string, note?: string) => {
    const image = snapshot ?? paperSnapshot ?? undefined;
    if (snapshot) setPaperSnapshot(snapshot);
    void tutor.sendMessage(note ?? 'Profesor, examina mi razonamiento y dime qué comprobación debo realizar a continuación.', image);
  };

  return <div className="space-y-3 pb-20 sm:pb-0">
    <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-bold uppercase tracking-wider text-amber-400">Sesión activa</p><h2 className="text-xl font-bold">Semana {active.week} · Sesión {active.session}</h2></div><div className="flex gap-2"><button type="button" onClick={() => setPostmortemOpen(true)} className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-bold text-stone-950">Finalizar y guardar</button><button type="button" onClick={onRequestNew} className="rounded-lg border border-stone-700 px-3 py-2 text-sm">Nueva sesión</button></div></div>
    <SyllabusSelector currentWeek={controller.selection.week} currentSession={controller.selection.session} onSelectWeek={(week) => controller.setSelection({ ...controller.selection, week })} onSelectSession={(session) => controller.setSelection({ ...controller.selection, session })} isOpen={syllabusOpen} onToggleOpen={() => setSyllabusOpen((value) => !value)} />
    <SessionTimeline elapsedSeconds={controller.elapsedSeconds} isRunning={active.isRunning} onToggleTimer={() => active.isRunning ? controller.pause() : controller.resume()} onResetTimer={() => controller.updateActiveSession({ accumulatedSeconds: 0, lastResumedAt: active.isRunning ? new Date().toISOString() : null })} currentPhase={phase} onSelectPhase={(next) => controller.updateActiveSession({ phaseId: next.id })} activeProtocolStep={active.activeProtocolStep} onSelectProtocolStep={(step) => controller.updateActiveSession({ activeProtocolStep: step })} completedSteps={active.completedSteps} onToggleStepComplete={(step) => controller.updateActiveSession({ completedSteps: active.completedSteps.includes(step) ? active.completedSteps.filter((item) => item !== step) : [...active.completedSteps, step] })} />
    <ResponsiveWorkspaceTabs paper={<div className="h-full min-h-[420px]"><CameraPaperView onCaptureSnapshot={setPaperSnapshot} onRequestTutorReview={requestReview} isInspecting={tutor.isLoading} /></div>} tutor={<div className="h-full min-h-[420px]"><ClassroomFeed messages={tutor.messages} onSendMessage={(text, image) => void tutor.sendMessage(text, image)} isLoading={tutor.isLoading} currentPaperSnapshot={paperSnapshot} speechSettings={speechSettings} onUpdateSpeechSettings={updateSpeech} onRequestTutorReview={() => requestReview()} error={tutor.error} onRetry={() => void tutor.retryLast()} /></div>} />
    <PostmortemModal isOpen={postmortemOpen} onClose={() => setPostmortemOpen(false)} currentWeek={active.week} currentSession={active.session} onSavePostmortem={(data) => { stopSpeaking(); controller.finish(data); onFinished(); }} onSpeakSummary={(text) => speakInSpanish(text, speechSettings)} />
  </div>;
}
