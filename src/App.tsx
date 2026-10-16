/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  GraduationCap,
  Clock,
  BookOpen,
  Camera,
  FileCheck2,
  Volume2,
  VolumeX,
  RotateCcw,
  Sparkles,
  Award,
  ChevronDown,
  Info,
} from 'lucide-react';
import { ChatMessage, SessionPhase, PostmortemData, SyllabusItem } from './types/tutor';
import { SESSION_PHASES, PROTOCOL_STEPS, SYLLABUS } from './data/syllabus';
import { CameraPaperView } from './components/CameraPaperView';
import { SessionTimeline } from './components/SessionTimeline';
import { ClassroomFeed } from './components/ClassroomFeed';
import { SyllabusSelector } from './components/SyllabusSelector';
import { PostmortemModal } from './components/PostmortemModal';
import { MobileCamView } from './components/MobileCamView';
import { speakInSpanish, stopSpeaking, SpeechSettings } from './utils/speech';

const INITIAL_TEACHER_PROMPT =
  '¡Hola! Empecemos nuestra sesión de hoy. ¿En qué semana y sesión estás y qué fallaste la última vez que practicaste?';

export default function App() {
  // Check if opened on mobile phone via camera link or QR code
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const mobileCamSession =
    urlParams?.get('cam') ||
    (typeof window !== 'undefined' && window.location.pathname === '/cam'
      ? urlParams?.get('session') || 'DEFAULT'
      : null);

  if (mobileCamSession) {
    return <MobileCamView sessionId={mobileCamSession} />;
  }

  const [currentWeek, setCurrentWeek] = useState<number>(() => {
    const saved = localStorage.getItem('math_tutor_week');
    return saved !== null ? Number(saved) : 1;
  });

  const [currentSession, setCurrentSession] = useState<number>(() => {
    const saved = localStorage.getItem('math_tutor_session_num');
    return saved !== null ? Number(saved) : 1;
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('math_tutor_messages');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn('Failed parsing saved messages', e);
      }
    }
    return [
      {
        id: 'initial-teacher-msg',
        role: 'assistant',
        content: INITIAL_TEACHER_PROMPT,
        timestamp: Date.now(),
      },
    ];
  });

  const [isLoading, setIsLoading] = useState(false);
  const [currentPaperSnapshot, setCurrentPaperSnapshot] = useState<string | null>(null);

  // 60-minute Session timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<SessionPhase>(SESSION_PHASES[0]);

  // Protocol 7 steps
  const [activeProtocolStep, setActiveProtocolStep] = useState<number>(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  // Modals & Panels
  const [isSyllabusOpen, setIsSyllabusOpen] = useState(false);
  const [isPostmortemOpen, setIsPostmortemOpen] = useState(false);

  // Speech settings
  const [speechSettings, setSpeechSettings] = useState<SpeechSettings>({
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
    autoSpeak: true,
  });

  // Save changes to localStorage
  useEffect(() => {
    localStorage.setItem('math_tutor_week', currentWeek.toString());
  }, [currentWeek]);

  useEffect(() => {
    localStorage.setItem('math_tutor_session_num', currentSession.toString());
  }, [currentSession]);

  useEffect(() => {
    localStorage.setItem('math_tutor_messages', JSON.stringify(messages));
  }, [messages]);

  // Timer tick
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => {
          const next = prev + 1;
          const mins = Math.floor(next / 60);

          // Auto-update phase based on time
          const matchingPhase = SESSION_PHASES.find(
            (p) => mins >= p.startMin && mins < p.endMin
          );
          if (matchingPhase && matchingPhase.id !== currentPhase.id) {
            setCurrentPhase(matchingPhase);
          }
          return next;
        });
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, currentPhase]);

  // Update speech settings
  const handleUpdateSpeechSettings = (newSettings: Partial<SpeechSettings>) => {
    setSpeechSettings((prev) => ({ ...prev, ...newSettings }));
  };

  // Toggle protocol step completed
  const handleToggleStepComplete = (step: number) => {
    setCompletedSteps((prev) =>
      prev.includes(step) ? prev.filter((s) => s !== step) : [...prev, step]
    );
  };

  // Send message to Gemini server
  const handleSendMessage = async (text: string, attachedImage?: string) => {
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
      imageSnapshot: attachedImage || currentPaperSnapshot || undefined,
      protocolStep: activeProtocolStep,
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const activeTopic = SYLLABUS.find((s) => s.week === currentWeek)?.title || 'General';
      const activeProtocol =
        PROTOCOL_STEPS.find((s) => s.step === activeProtocolStep)?.name || 'Comprender';

      const res = await fetch('/api/tutor/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          image: attachedImage || currentPaperSnapshot || null,
          sessionContext: {
            week: currentWeek,
            session: currentSession,
            phase: currentPhase.name,
            elapsedMinutes: Math.floor(elapsedSeconds / 60),
            topic: activeTopic,
            protocolStep: activeProtocol,
          },
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }

      const data = await res.json();
      const replyText = data.reply || 'No recibí respuesta del profesor.';

      const profMsg: ChatMessage = {
        id: `prof-${Date.now()}`,
        role: 'assistant',
        content: replyText,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, profMsg]);

      // Speak reply if autoSpeak enabled
      if (speechSettings.autoSpeak) {
        speakInSpanish(replyText, speechSettings);
      }
    } catch (err: any) {
      console.error('Error calling tutor API:', err);
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content:
          'Hubo un problema de conexión con el aula. Por favor repíteme tu última frase o pulsa de nuevo "Mirar mi papel".',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Tutor review triggered from paper view
  const handleRequestTutorReview = (snapshot?: string, note?: string) => {
    const imageToUse = snapshot || currentPaperSnapshot;
    if (!imageToUse) {
      handleSendMessage(
        'Profesor, por favor examina mi razonamiento y dime qué paso o comprobación debo realizar a continuación.'
      );
      return;
    }
    setCurrentPaperSnapshot(imageToUse);
    handleSendMessage(
      note ||
        'Profesor, estoy escribiendo en mi papel. Por favor míralo y dime si la deducción es correcta o si detectas algún fallo conceptual.',
      imageToUse
    );
  };

  // Start a fresh 60-min session
  const handleNewSession = () => {
    stopSpeaking();
    setElapsedSeconds(0);
    setIsTimerRunning(false);
    setCurrentPhase(SESSION_PHASES[0]);
    setCompletedSteps([]);
    setActiveProtocolStep(1);
    const initialMsg: ChatMessage = {
      id: `session-start-${Date.now()}`,
      role: 'assistant',
      content: INITIAL_TEACHER_PROMPT,
      timestamp: Date.now(),
    };
    setMessages([initialMsg]);
    if (speechSettings.autoSpeak) {
      speakInSpanish(INITIAL_TEACHER_PROMPT, speechSettings);
    }
  };

  const handleSavePostmortem = (data: PostmortemData) => {
    const postmortemMsg: ChatMessage = {
      id: `postmortem-${Date.now()}`,
      role: 'assistant',
      content: `📋 **RESUMEN DE ESTADO Y POSTMORTEM (Semana ${currentWeek}, Sesión ${currentSession})**

• **Error Clasificado**: ${data.errorType.toUpperCase()}
• **Diagnóstico**: ${data.description || 'Analizado durante la defensa'}
• **Regla Corregida**: ${data.correctedRule || 'Revisar siempre casos de frontera y dominio'}
• **Problema Variante (48 horas)**: ${data.variantProblem48h || 'Variante paramétrica en extremos'}
• **Conceptos Dominados**: ${data.masteredConcepts.join(', ') || 'Planteamiento y conjetura'}
• **Conceptos Abiertos**: ${data.openConcepts.join(', ') || 'Comprobación de límites'}
• **Próxima Repetición**: En 48 horas.`,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, postmortemMsg]);
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="border-b border-stone-800 bg-stone-900/90 backdrop-blur-md px-4 py-2.5 sticky top-0 z-40 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-500 flex items-center justify-center text-white shadow-md shadow-amber-600/30">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-sm sm:text-base font-bold text-stone-100 tracking-tight">
                Profesor de Matemáticas Preuniversitarias
              </h1>
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 hidden sm:inline-block">
                Oral en Tiempo Real
              </span>
            </div>
            <p className="text-[11px] text-stone-400 flex items-center gap-1.5">
              <span>Nivel Selectividad & Puente</span>
              <span>·</span>
              <span className="text-amber-400/90">Perfil: Ingeniero & Opciones SPX</span>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          {/* Postmortem Button */}
          <button
            onClick={() => setIsPostmortemOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-750 text-amber-300 border border-amber-500/30 text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm"
            title="Abrir resumen y clasificación de errores postmortem (53-60 min)"
          >
            <FileCheck2 className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Postmortem & Resumen</span>
          </button>

          {/* New Session Button */}
          <button
            onClick={handleNewSession}
            className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs flex items-center gap-1 border border-stone-700"
            title="Reiniciar sesión de 60 minutos con la pregunta obligatoria inicial"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Nueva Sesión</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-3 sm:p-4 max-w-7xl w-full mx-auto flex flex-col space-y-3">
        {/* 13-Week Syllabus Navigator */}
        <SyllabusSelector
          currentWeek={currentWeek}
          currentSession={currentSession}
          onSelectWeek={(w) => setCurrentWeek(w)}
          onSelectSession={(s) => setCurrentSession(s)}
          isOpen={isSyllabusOpen}
          onToggleOpen={() => setIsSyllabusOpen(!isSyllabusOpen)}
        />

        {/* 60-Minute Session Timeline & 7-Step Protocol */}
        <SessionTimeline
          elapsedSeconds={elapsedSeconds}
          isRunning={isTimerRunning}
          onToggleTimer={() => setIsTimerRunning(!isTimerRunning)}
          onResetTimer={() => setElapsedSeconds(0)}
          currentPhase={currentPhase}
          onSelectPhase={(p) => setCurrentPhase(p)}
          activeProtocolStep={activeProtocolStep}
          onSelectProtocolStep={(s) => setActiveProtocolStep(s)}
          completedSteps={completedSteps}
          onToggleStepComplete={handleToggleStepComplete}
        />

        {/* Dual Split Screen: Paper/Camera View on Left, Oral Classroom Feed on Right */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-[560px]">
          {/* Left Column: Camera / Screen / Paper Canvas (7 Cols on desktop) */}
          <div className="lg:col-span-7 h-full min-h-[400px]">
            <CameraPaperView
              onCaptureSnapshot={(dataUrl) => setCurrentPaperSnapshot(dataUrl)}
              onRequestTutorReview={handleRequestTutorReview}
              isInspecting={isLoading}
            />
          </div>

          {/* Right Column: Oral Classroom Dialogue Feed (5 Cols on desktop) */}
          <div className="lg:col-span-5 h-full min-h-[400px]">
            <ClassroomFeed
              messages={messages}
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
              currentPaperSnapshot={currentPaperSnapshot}
              speechSettings={speechSettings}
              onUpdateSpeechSettings={handleUpdateSpeechSettings}
              onRequestTutorReview={() => handleRequestTutorReview()}
            />
          </div>
        </div>
      </main>

      {/* Postmortem Modal */}
      <PostmortemModal
        isOpen={isPostmortemOpen}
        onClose={() => setIsPostmortemOpen(false)}
        currentWeek={currentWeek}
        currentSession={currentSession}
        onSavePostmortem={handleSavePostmortem}
        onSpeakSummary={(text: string) => speakInSpanish(text, speechSettings)}
      />

    </div>
  );
}
