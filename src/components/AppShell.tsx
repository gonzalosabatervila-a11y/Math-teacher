import type { ReactNode } from 'react';
import { BookOpenCheck, GraduationCap, History, Home } from 'lucide-react';

export type AppMode = 'home' | 'session' | 'history';

interface AppShellProps {
  mode: AppMode;
  onNavigate(mode: AppMode): void;
  children: ReactNode;
  status?: string | null;
}

const navItems: Array<{ mode: AppMode; label: string; icon: typeof Home }> = [
  { mode: 'home', label: 'Inicio', icon: Home },
  { mode: 'session', label: 'Sesión', icon: BookOpenCheck },
  { mode: 'history', label: 'Historial', icon: History },
];

export function AppShell({ mode, onNavigate, children, status }: AppShellProps) {
  return <div className="min-h-screen bg-stone-950 text-stone-100 font-sans">
    <a href="#main-content" className="skip-link">Saltar al contenido</a>
    <header className="sticky top-0 z-40 border-b border-stone-800 bg-stone-950/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-500 text-stone-950"><GraduationCap aria-hidden="true" /></span>
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold sm:text-lg">Profesor de Matemáticas</h1>
            <p className="truncate text-xs text-stone-400">Espacio personal · progreso guardado en este dispositivo</p>
          </div>
        </div>
        <nav aria-label="Navegación principal" className="hidden items-center gap-1 sm:flex">
          {navItems.map(({ mode: itemMode, label, icon: Icon }) => <button key={itemMode} type="button" onClick={() => onNavigate(itemMode)} aria-current={mode === itemMode ? 'page' : undefined} className={`rounded-lg px-3 py-2 text-sm font-medium ${mode === itemMode ? 'bg-amber-500 text-stone-950' : 'text-stone-300 hover:bg-stone-800'}`}><Icon className="mr-1.5 inline h-4 w-4" aria-hidden="true" />{label}</button>)}
        </nav>
      </div>
    </header>
    {status && <div role="status" className="mx-auto max-w-7xl px-4 pt-3 text-sm text-emerald-300">{status}</div>}
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-7xl px-3 py-4 sm:px-4">{children}</main>
    <nav aria-label="Navegación móvil" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-stone-800 bg-stone-950 p-2 sm:hidden">
      {navItems.map(({ mode: itemMode, label, icon: Icon }) => <button key={itemMode} type="button" onClick={() => onNavigate(itemMode)} aria-current={mode === itemMode ? 'page' : undefined} className={`flex flex-col items-center rounded-lg py-2 text-xs ${mode === itemMode ? 'bg-amber-500 text-stone-950' : 'text-stone-400'}`}><Icon className="h-4 w-4" aria-hidden="true" />{label}</button>)}
    </nav>
  </div>;
}
