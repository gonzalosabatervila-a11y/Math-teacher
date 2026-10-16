import React, { useState } from 'react';
import {
  AlertTriangle,
  Award,
  Check,
  Clock,
  Copy,
  FileText,
  Volume2,
  X,
  Target,
  Sparkles,
} from 'lucide-react';
import { ErrorType, PostmortemData } from '../types/tutor';
import { MathView } from './MathView';

interface PostmortemModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentWeek: number;
  currentSession: number;
  onSavePostmortem: (data: PostmortemData) => void;
  onSpeakSummary: (text: string) => void;
}

const ERROR_DEFINITIONS: Record<
  ErrorType,
  { label: string; desc: string; example: string; badgeColor: string }
> = {
  conceptual: {
    label: 'Conceptual',
    desc: 'Confusión de definición, teorema o condición previa (ej. no verificar continuidad antes del TFC).',
    example: 'Confundir la pendiente de la secante con la derivada instantánea, o olvidar el dominio del logaritmo.',
    badgeColor: 'bg-red-500/20 text-red-300 border-red-500/40',
  },
  representacion: {
    label: 'Representación',
    desc: 'Fallo al graficar, esquematizar o traducir el texto a diagrama o árbol de probabilidad.',
    example: 'Invertir los ejes de coordenadas o no delimitar correctamente los cortes de integración en el dibujo.',
    badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
  },
  estrategia: {
    label: 'Estrategia',
    desc: 'Elección de una vía ineficaz o cálculo a la fuerza bruta habiendo una simetría o atajo.',
    example: 'Desarrollar un polinomio de grado 4 a lo bruto en lugar de aplicar un cambio de variable $u = x^2$.',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },
  mecanico: {
    label: 'Mecánico / Operativo',
    desc: 'Despiste de signo, error aritmético básico o traspapeleo de constante al copiar una línea.',
    example: 'Escribir $-2 \\cdot (-3) = -6$ o perder un paréntesis en una multiplicación distributiva.',
    badgeColor: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
  },
  logico: {
    label: 'Lógico / Deductivo',
    desc: 'Inferencia inválida, asumir que la implicación inversa es cierta o dividir por cero tácito.',
    example: 'Asumir que si $f\'(x) = 0$ entonces necesariamente hay un extremo relativo sin comprobar el cambio de signo.',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  },
  verificacion: {
    label: 'Verificación',
    desc: 'Dar por buena una solución sin probar casos límite (0, $\\infty$), signos o coherencia física/económica.',
    example: 'Obtener una probabilidad mayor que 1 o una prima de opción negativa y no sospechar del resultado.',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  },
};

export const PostmortemModal: React.FC<PostmortemModalProps> = ({
  isOpen,
  onClose,
  currentWeek,
  currentSession,
  onSavePostmortem,
  onSpeakSummary,
}) => {
  const [selectedError, setSelectedError] = useState<ErrorType>('conceptual');
  const [description, setDescription] = useState('');
  const [correctedRule, setCorrectedRule] = useState('');
  const [variantProblem, setVariantProblem] = useState('');
  const [masteredInput, setMasteredInput] = useState('');
  const [openConceptsInput, setOpenConceptsInput] = useState('');
  const [recurringErrorsInput, setRecurringErrorsInput] = useState('');
  const [pendingProblem, setPendingProblem] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const generateDictationText = (): string => {
    return `Resumen de estado final. Semana ${currentWeek}, Sesión ${currentSession}.
Conceptos dominados: ${masteredInput || 'Definición y planteamiento inicial'}.
Conceptos abiertos: ${openConceptsInput || 'Dominio y casos límite'}.
Error clasificado: ${ERROR_DEFINITIONS[selectedError].label}. ${description || 'Observado en el desarrollo manuscrito'}.
Regla corregida: ${correctedRule || 'Comprobar siempre condiciones de frontera antes de operar'}.
Problema variante para dentro de 48 horas: ${variantProblem || 'Variante con parámetros en los extremos'}.
Próxima repetición espaciada: En 48 horas.`;
  };

  const handleSpeak = () => {
    onSpeakSummary(generateDictationText());
  };

  const handleSave = () => {
    const data: PostmortemData = {
      errorType: selectedError,
      description,
      correctedRule,
      variantProblem48h: variantProblem,
      masteredConcepts: masteredInput.split(',').map((s) => s.trim()).filter(Boolean),
      openConcepts: openConceptsInput.split(',').map((s) => s.trim()).filter(Boolean),
      recurringErrors: recurringErrorsInput.split(',').map((s) => s.trim()).filter(Boolean),
      pendingProblem,
      nextRepetitionHours: 48,
    };
    onSavePostmortem(data);
    onClose();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateDictationText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 text-stone-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-100">
                Postmortem y Resumen de Estado (Minuto 53-60)
              </h2>
              <p className="text-xs text-stone-400">
                Semana {currentWeek} · Sesión #{currentSession} · Clasificación rigurosa de errores
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Clasificación del Error */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-amber-500" />
            <span>1. Clasificación Taxonómica del Error</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {(Object.keys(ERROR_DEFINITIONS) as ErrorType[]).map((type) => {
              const def = ERROR_DEFINITIONS[type];
              const isSelected = selectedError === type;
              return (
                <button
                  key={type}
                  onClick={() => setSelectedError(type)}
                  className={`p-2 rounded-lg border text-left transition-all ${
                    isSelected
                      ? `${def.badgeColor} ring-2 ring-amber-500 font-semibold shadow-md`
                      : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700'
                  }`}
                >
                  <div className="text-xs font-bold">{def.label}</div>
                  <div className="text-[10px] text-stone-400 truncate mt-0.5">{def.desc}</div>
                </button>
              );
            })}
          </div>

          <div className="p-2.5 bg-stone-950/70 border border-stone-800 rounded-lg text-xs text-stone-300 space-y-1">
            <div className="font-semibold text-amber-400">
              Diagnóstico: {ERROR_DEFINITIONS[selectedError].label}
            </div>
            <p className="text-[11px] text-stone-400">{ERROR_DEFINITIONS[selectedError].desc}</p>
            <p className="text-[10px] text-stone-500 italic">
              Ejemplo típico: {ERROR_DEFINITIONS[selectedError].example}
            </p>
          </div>
        </div>

        {/* Descripción del Error y Regla Corregida */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="space-y-1">
            <label className="font-semibold text-stone-300">¿Qué falló exactamente en el papel?</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: Al cancelar el factor en el límite, no se especificó que x != 2..."
              rows={3}
              className="w-full bg-stone-950 border border-stone-800 rounded-lg p-2 text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-amber-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Regla Corregida Formulada</span>
            </label>
            <textarea
              value={correctedRule}
              onChange={(e) => setCorrectedRule(e.target.value)}
              placeholder="Regla: Siempre que factorice en cociente de límites, registrar la condición de indeterminación antes de simplificar."
              rows={3}
              className="w-full bg-stone-950 border border-amber-500/40 rounded-lg p-2 text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Variante 48h */}
        <div className="space-y-1 text-xs">
          <label className="font-semibold text-stone-300 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>Problema Variante para dentro de 48 Horas (Repetición Espaciada)</span>
          </label>
          <input
            type="text"
            value={variantProblem}
            onChange={(e) => setVariantProblem(e.target.value)}
            placeholder="Ej: Calcular el mismo límite con parámetro k o con signo negativo en la raíz..."
            className="w-full bg-stone-950 border border-stone-800 rounded-lg p-2 text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Conceptos Dominados / Abiertos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="space-y-1">
            <label className="font-semibold text-emerald-400">Conceptos Dominados Hoy</label>
            <input
              type="text"
              value={masteredInput}
              onChange={(e) => setMasteredInput(e.target.value)}
              placeholder="Regla de la cadena, asíntota vertical, etc."
              className="w-full bg-stone-950 border border-stone-800 rounded-lg p-2 text-stone-200 placeholder-stone-600 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-amber-300">Conceptos que Quedan Abiertos</label>
            <input
              type="text"
              value={openConceptsInput}
              onChange={(e) => setOpenConceptsInput(e.target.value)}
              placeholder="Asíntota oblicua cuando grado numerador difiere..."
              className="w-full bg-stone-950 border border-stone-800 rounded-lg p-2 text-stone-200 placeholder-stone-600 focus:outline-none"
            />
          </div>
        </div>

        {/* Resumen dictado */}
        <div className="p-3 bg-stone-950 border border-stone-800 rounded-lg space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-stone-400">
            <span>Texto de Dictado Oficial del Profesor:</span>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleCopy}
                className="hover:text-white flex items-center gap-1 text-[11px]"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copiado' : 'Copiar'}</span>
              </button>
              <button
                onClick={handleSpeak}
                className="text-amber-400 hover:text-amber-300 flex items-center gap-1 text-[11px]"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Dictar en voz alta</span>
              </button>
            </div>
          </div>
          <p className="text-[11px] text-stone-300 font-mono whitespace-pre-line leading-relaxed">
            {generateDictationText()}
          </p>
        </div>

        {/* Modal Buttons */}
        <div className="flex items-center justify-end space-x-2 pt-2 border-t border-stone-800">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs"
          >
            Cerrar
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs shadow-md"
          >
            Guardar en Registro
          </button>
        </div>
      </div>
    </div>
  );
};
