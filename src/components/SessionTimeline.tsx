import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Clock,
  Compass,
  CheckCircle,
  HelpCircle,
  TrendingUp,
} from 'lucide-react';
import { SessionPhase, ProtocolStep } from '../types/tutor';
import { SESSION_PHASES, PROTOCOL_STEPS } from '../data/syllabus';

interface SessionTimelineProps {
  elapsedSeconds: number;
  isRunning: boolean;
  onToggleTimer: () => void;
  onResetTimer: () => void;
  currentPhase: SessionPhase;
  onSelectPhase: (phase: SessionPhase) => void;
  activeProtocolStep: number;
  onSelectProtocolStep: (step: number) => void;
  completedSteps: number[];
  onToggleStepComplete: (step: number) => void;
}

export const SessionTimeline: React.FC<SessionTimelineProps> = ({
  elapsedSeconds,
  isRunning,
  onToggleTimer,
  onResetTimer,
  currentPhase,
  onSelectPhase,
  activeProtocolStep,
  onSelectProtocolStep,
  completedSteps,
  onToggleStepComplete,
}) => {
  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  const secondsRemainder = elapsedSeconds % 60;
  const totalSessionSeconds = 60 * 60;
  const progressPercent = Math.min(100, (elapsedSeconds / totalSessionSeconds) * 100);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-stone-900/90 border border-stone-800 rounded-xl p-3 shadow-lg space-y-3">
      {/* Timer Header & Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-baseline space-x-1.5 font-mono">
            <Clock className="w-4 h-4 text-amber-500 self-center" />
            <span className="text-xl font-bold text-stone-100">{formatTime(elapsedSeconds)}</span>
            <span className="text-xs text-stone-500">/ 60:00</span>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={onToggleTimer}
              className={`p-1.5 rounded-lg border transition-all ${
                isRunning
                  ? 'bg-amber-600/20 border-amber-500 text-amber-400 hover:bg-amber-600/30'
                  : 'bg-stone-800 border-stone-700 text-stone-300 hover:bg-stone-750'
              }`}
              title={isRunning ? 'Pausar sesión' : 'Reanudar sesión'}
            >
              {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={onResetTimer}
              className="p-1.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-400 hover:text-stone-200"
              title="Reiniciar cronómetro de 60m"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Current Phase Badge */}
        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
            {currentPhase.name} ({currentPhase.startMin}-{currentPhase.endMin}m)
          </span>
        </div>
      </div>

      {/* 60-Minute Phase Timeline Bar */}
      <div>
        <div className="h-2 w-full bg-stone-950 rounded-full overflow-hidden flex relative border border-stone-800">
          {SESSION_PHASES.map((p) => {
            const widthPct = (p.durationMin / 60) * 100;
            const isCurrent = currentPhase.id === p.id;
            return (
              <button
                key={p.id}
                onClick={() => onSelectPhase(p)}
                style={{ width: `${widthPct}%` }}
                className={`h-full border-r border-stone-900 transition-colors ${
                  isCurrent
                    ? 'bg-amber-500'
                    : elapsedMinutes >= p.startMin
                    ? 'bg-amber-700/60 hover:bg-amber-600/70'
                    : 'bg-stone-800 hover:bg-stone-700'
                }`}
                title={`${p.name} (${p.startMin}-${p.endMin}m): ${p.description}`}
              />
            );
          })}
          {/* Progress Pin */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white shadow-sm pointer-events-none"
            style={{ left: `${progressPercent}%` }}
          />
        </div>

        {/* Phase selector buttons below bar */}
        <div className="grid grid-cols-5 gap-1 mt-1.5 text-[10px]">
          {SESSION_PHASES.map((p) => {
            const active = currentPhase.id === p.id;
            return (
              <button
                key={p.id}
                onClick={() => onSelectPhase(p)}
                className={`py-1 px-1 rounded text-center truncate transition-all ${
                  active
                    ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
                }`}
              >
                {p.shortName}
              </button>
            );
          })}
        </div>
      </div>

      {/* Protocol 7 Steps - Essential for every problem */}
      <div className="pt-2 border-t border-stone-800/80">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-stone-300">
            <Compass className="w-3.5 h-3.5 text-amber-500" />
            <span>Protocolo de Resolución en 7 Pasos</span>
          </div>
          <span className="text-[10px] text-stone-500">
            {completedSteps.length} / 7 completados
          </span>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {PROTOCOL_STEPS.map((step) => {
            const isCompleted = completedSteps.includes(step.step);
            const isActive = activeProtocolStep === step.step;

            return (
              <div
                key={step.step}
                className={`group relative flex flex-col p-1.5 rounded-lg border text-center transition-all ${
                  isActive
                    ? 'bg-amber-500/20 border-amber-500 text-amber-200 shadow-sm'
                    : isCompleted
                    ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                    : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700'
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <button
                    onClick={() => onSelectProtocolStep(step.step)}
                    className="text-[10px] font-bold text-left hover:underline truncate"
                  >
                    #{step.step}
                  </button>
                  <button
                    onClick={() => onToggleStepComplete(step.step)}
                    className="hover:scale-110 transition-transform"
                    title={isCompleted ? 'Marcar incompleto' : 'Marcar completado'}
                  >
                    <CheckCircle
                      className={`w-3 h-3 ${
                        isCompleted ? 'text-emerald-400 fill-emerald-400/20' : 'text-stone-600'
                      }`}
                    />
                  </button>
                </div>

                <button
                  onClick={() => onSelectProtocolStep(step.step)}
                  className="text-[10px] font-medium leading-tight text-left truncate hover:text-white"
                  title={`${step.name}: ${step.objective}`}
                >
                  {step.name}
                </button>

                {/* Hover Quick Tip Tooltip */}
                <div className="hidden group-hover:block absolute bottom-full mb-1 left-1/2 -translate-x-1/2 z-30 w-44 p-2 bg-stone-900 border border-stone-700 rounded shadow-xl text-left text-[11px] text-stone-200 pointer-events-none">
                  <div className="font-bold text-amber-400 mb-0.5">
                    Paso {step.step}: {step.name}
                  </div>
                  <div className="text-stone-300 mb-1">{step.studentAction}</div>
                  <div className="text-[10px] text-amber-200/80 italic">
                    "{step.checkQuestion}"
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
