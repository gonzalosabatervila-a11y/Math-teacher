import { useId, useState, type KeyboardEvent, type ReactNode } from 'react';

interface ResponsiveWorkspaceTabsProps { paper: ReactNode; tutor: ReactNode }

export function ResponsiveWorkspaceTabs({ paper, tutor }: ResponsiveWorkspaceTabsProps) {
  const [active, setActive] = useState<'paper' | 'tutor'>('paper');
  const id = useId();
  const selectFromKey = (event: KeyboardEvent<HTMLButtonElement>, next: 'paper' | 'tutor') => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    setActive(next);
    document.getElementById(`${id}-${next}-tab`)?.focus();
  };
  return <div>
    <div role="tablist" aria-label="Zona de trabajo" className="mb-2 grid grid-cols-2 rounded-xl border border-stone-800 bg-stone-900 p-1 lg:hidden">
      <button id={`${id}-paper-tab`} role="tab" aria-selected={active === 'paper'} aria-controls={`${id}-paper-panel`} onClick={() => setActive('paper')} onKeyDown={(e) => selectFromKey(e, 'tutor')} className={`rounded-lg px-3 py-2 text-sm font-semibold ${active === 'paper' ? 'bg-amber-500 text-stone-950' : 'text-stone-300'}`}>Papel</button>
      <button id={`${id}-tutor-tab`} role="tab" aria-selected={active === 'tutor'} aria-controls={`${id}-tutor-panel`} onClick={() => setActive('tutor')} onKeyDown={(e) => selectFromKey(e, 'paper')} className={`rounded-lg px-3 py-2 text-sm font-semibold ${active === 'tutor' ? 'bg-amber-500 text-stone-950' : 'text-stone-300'}`}>Profesor</button>
    </div>
    <div className="grid min-h-[540px] grid-cols-1 gap-3 lg:grid-cols-12">
      <section id={`${id}-paper-panel`} role="tabpanel" aria-labelledby={`${id}-paper-tab`} data-active={active === 'paper'} className="workspace-panel lg:col-span-7">{paper}</section>
      <section id={`${id}-tutor-panel`} role="tabpanel" aria-labelledby={`${id}-tutor-tab`} data-active={active === 'tutor'} className="workspace-panel lg:col-span-5">{tutor}</section>
    </div>
  </div>;
}
