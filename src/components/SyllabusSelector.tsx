import React from 'react';
import { BookOpen, TrendingUp, Sparkles, ChevronRight, Check } from 'lucide-react';
import { SyllabusItem } from '../types/tutor';
import { SYLLABUS } from '../data/syllabus';

interface SyllabusSelectorProps {
  currentWeek: number;
  currentSession: number;
  onSelectWeek: (week: number) => void;
  onSelectSession: (session: number) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

export const SyllabusSelector: React.FC<SyllabusSelectorProps> = ({
  currentWeek,
  currentSession,
  onSelectWeek,
  onSelectSession,
  isOpen,
  onToggleOpen,
}) => {
  const currentItem = SYLLABUS.find((s) => s.week === currentWeek) || SYLLABUS[0];

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden shadow-md">
      {/* Active Week Summary Header */}
      <div className="p-3 flex items-center justify-between bg-stone-950/60 border-b border-stone-800">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-sm">
            S{currentWeek}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-stone-200">
                Semana {currentWeek}: {currentItem.title}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-800 text-stone-400 border border-stone-700">
                {currentItem.block}
              </span>
            </div>
            <div className="text-[11px] text-stone-400 flex items-center gap-1 mt-0.5">
              <span>Sesión #{currentSession}</span>
              <span>·</span>
              <span className="text-amber-400/90 font-medium truncate max-w-xs">
                SPX: {currentItem.financialTransfer}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Quick session buttons 1, 2, 3 */}
          <div className="flex items-center bg-stone-900 border border-stone-800 rounded-lg p-0.5 text-xs">
            {[1, 2, 3].map((num) => (
              <button
                key={num}
                type="button"
                aria-pressed={currentSession === num}
                aria-label={`Seleccionar sesión ${num}`}
                onClick={() => onSelectSession(num)}
                className={`px-2 py-0.5 rounded ${
                  currentSession === num
                    ? 'bg-amber-600 text-white font-bold'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
                title={`Sesión ${num} de la semana`}
              >
                #{num}
              </button>
            ))}
          </div>

          <button
            type="button"
            aria-expanded={isOpen}
            aria-controls="syllabus-weeks"
            onClick={onToggleOpen}
            className="px-2.5 py-1 text-xs bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg border border-stone-700 flex items-center gap-1"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span>{isOpen ? 'Cerrar Plan' : 'Plan 13 Semanas'}</span>
          </button>
        </div>
      </div>

      {/* Accordion / Expanded 13-Week Grid */}
      {isOpen && (
        <div id="syllabus-weeks" className="p-3 bg-stone-950/90 max-h-96 overflow-y-auto space-y-2 border-b border-stone-800 text-xs">
          <div className="text-stone-400 text-[11px] mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>
              Plan de 13 semanas preparatorio para Selectividad y puente universitario (con transferencia a finanzas y opciones SPX):
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {SYLLABUS.map((item) => {
              const isSelected = item.week === currentWeek;
              return (
                <button
                  type="button"
                  key={item.week}
                  onClick={() => onSelectWeek(item.week)}
                  aria-pressed={isSelected}
                  className={`w-full p-2.5 rounded-lg border cursor-pointer text-left transition-all ${
                    isSelected
                      ? 'bg-amber-950/30 border-amber-500/80 ring-1 ring-amber-500/30'
                      : 'bg-stone-900/60 border-stone-800 hover:border-stone-700 hover:bg-stone-900'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-stone-200 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded bg-stone-800 text-amber-300 flex items-center justify-center text-[10px] font-bold">
                        {item.week}
                      </span>
                      {item.title}
                    </span>
                    <span className="text-[10px] text-stone-500 uppercase">{item.block}</span>
                  </div>

                  <ul className="text-[11px] text-stone-400 space-y-0.5 pl-2 border-l border-stone-800 my-1.5">
                    {item.topics.slice(0, 3).map((topic, i) => (
                      <li key={i} className="truncate">
                        • {topic}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-1 pt-1 border-t border-stone-800/80 flex items-center gap-1 text-[10px] text-amber-400/90">
                    <TrendingUp className="w-3 h-3 text-amber-500 flex-shrink-0" />
                    <span className="truncate">{item.financialTransfer}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
