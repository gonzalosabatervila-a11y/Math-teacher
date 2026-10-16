import { CheckCircle2, Clock3, Play, RotateCcw } from 'lucide-react';
import type { PersonalStateV2 } from '../state/personal-state';

interface HomeScreenProps {
  state: PersonalStateV2;
  now: number;
  onContinue(): void;
  onStart(): void;
  onCompleteReview(id: string): void;
  onNewSession?: () => void;
}

export function HomeScreen({ state, now, onContinue, onStart, onCompleteReview, onNewSession }: HomeScreenProps) {
  const pending = state.reviews.filter((review) => review.status === 'pending').sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt));
  const recent = [...state.completedSessions].reverse().slice(0, 3);
  const active = state.activeSession;
  return <div className="space-y-6 pb-20 sm:pb-0">
    <section className="overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-stone-900 to-amber-950/30 p-6 sm:p-8">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">Tu próxima acción</p>
      <h2 className="mt-2 text-2xl font-bold sm:text-3xl">{active ? `Retoma la semana ${active.week}, sesión ${active.session}` : `Semana ${state.selection.week}, sesión ${state.selection.session}`}</h2>
      <p className="mt-2 max-w-2xl text-sm text-stone-300">{active ? `Progreso conservado: paso ${active.activeProtocolStep} de 7 y ${Math.floor(active.accumulatedSeconds / 60)} minutos acumulados.` : 'Inicia una práctica guiada de 60 minutos. Todo el progreso se guarda localmente.'}</p>
      <div className="mt-5 flex flex-wrap gap-3">
        {active ? <button type="button" onClick={onContinue} aria-label={`Continuar semana ${active.week}, sesión ${active.session}`} className="rounded-xl bg-amber-500 px-5 py-3 font-bold text-stone-950"><Play className="mr-2 inline h-4 w-4" />Continuar</button> : <button type="button" onClick={onStart} className="rounded-xl bg-amber-500 px-5 py-3 font-bold text-stone-950"><Play className="mr-2 inline h-4 w-4" />Empezar sesión</button>}
        {active && onNewSession && <button type="button" onClick={onNewSession} aria-label="Nueva sesión" className="rounded-xl border border-stone-700 bg-stone-900 px-5 py-3 text-sm font-semibold"><RotateCcw className="mr-2 inline h-4 w-4" />Nueva sesión</button>}
      </div>
    </section>
    <div className="grid gap-5 lg:grid-cols-2">
      <section aria-labelledby="reviews-title" className="rounded-2xl border border-stone-800 bg-stone-900 p-5">
        <h2 id="reviews-title" className="text-lg font-bold"><Clock3 className="mr-2 inline h-5 w-5 text-amber-400" />Repasos</h2>
        <div className="mt-4 space-y-3">{pending.length ? pending.map((review) => <article key={review.id} className="rounded-xl border border-stone-800 bg-stone-950 p-4"><p className="font-medium">{review.variantProblem}</p><p className={`mt-1 text-xs ${Date.parse(review.dueAt) <= now ? 'text-amber-300' : 'text-stone-400'}`}>{Date.parse(review.dueAt) <= now ? 'Pendiente ahora' : `Disponible ${new Date(review.dueAt).toLocaleDateString('es-ES')}`}</p><button type="button" onClick={() => onCompleteReview(review.id)} className="mt-3 text-sm font-semibold text-emerald-300"><CheckCircle2 className="mr-1 inline h-4 w-4" />Marcar completado</button></article>) : <p className="text-sm text-stone-400">No hay repasos pendientes.</p>}</div>
      </section>
      <section aria-labelledby="recent-title" className="rounded-2xl border border-stone-800 bg-stone-900 p-5"><h2 id="recent-title" className="text-lg font-bold">Actividad reciente</h2><div className="mt-4 space-y-3">{recent.length ? recent.map((item) => <article key={item.id} className="rounded-xl border border-stone-800 bg-stone-950 p-4"><div className="flex justify-between gap-3"><p className="font-semibold">Semana {item.week} · Sesión {item.session}</p><span className="text-xs text-stone-500">{Math.round(item.durationSeconds / 60)} min</span></div><p className="mt-1 text-sm text-stone-400">{item.summary || 'Sesión completada'}</p></article>) : <p className="text-sm text-stone-400">Tu historial aparecerá aquí al terminar la primera sesión.</p>}</div></section>
    </div>
  </div>;
}
