import type { ChatMessage } from '../types/tutor';

const labels: Record<NonNullable<ChatMessage['tutorMode']>, string> = {
  question: 'Pregunta guía', hint: 'Pista', verification: 'Verificación', solution: 'Solución explicada',
};

export function TutorResponseMeta({ mode, checks = [], uncertainty }: { mode?: ChatMessage['tutorMode']; checks?: string[]; uncertainty?: string }) {
  if (!mode && checks.length === 0 && !uncertainty) return null;
  return <div className="mt-2 space-y-2 border-t border-stone-700/60 pt-2 text-xs">
    {mode && <span className="inline-flex rounded-full bg-amber-500/15 px-2 py-1 font-bold text-amber-300">{labels[mode]}</span>}
    {checks.length > 0 && <div><p className="font-semibold text-stone-300">Comprueba:</p><ul className="mt-1 list-disc space-y-1 pl-4 text-stone-400">{checks.map((check) => <li key={check}>{check}</li>)}</ul></div>}
    {uncertainty && <p role="note" className="rounded-lg border border-cyan-800/60 bg-cyan-950/30 p-2 text-cyan-200">{uncertainty}</p>}
  </div>;
}
