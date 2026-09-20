import { NavLink } from 'react-router-dom';
import type { ReactNode } from 'react';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-full flex flex-col">
      {/* Topbar — Notion-like: borda fina, sem backdrop blur chamativo. */}
      <header className="border-b border-line bg-white/90 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-5 h-14 flex items-center gap-6">
          <NavLink to="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-md bg-brand grid place-items-center text-white font-bold shadow-glow">

            </div>
            <span className="font-semibold tracking-tight text-slate-900">
              Ratnalyzer
            </span>
          </NavLink>
          <nav className="flex items-center gap-1 ml-auto">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                [
                  'px-3 py-1.5 rounded-lg text-sm transition-colors',
                  isActive
                    ? 'bg-bg-subtle text-slate-900 font-medium'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-bg-subtle',
                ].join(' ')
              }
            >
              Análises
            </NavLink>
            <NavLink
              to="/docs"
              className={({ isActive }) =>
                [
                  'px-3 py-1.5 rounded-lg text-sm transition-colors',
                  isActive
                    ? 'bg-bg-subtle text-slate-900 font-medium'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-bg-subtle',
                ].join(' ')
              }
            >
              Documentação
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-5 py-6">
        {children}
      </main>

      <footer className="border-t border-line py-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-5 flex items-center justify-between">
          <span>Feito em memória de CE-07 💜</span>
          <span className="font-mono">v0.1</span>
        </div>
      </footer>
    </div>
  );
}
