import type { SessionMeta } from '@/analysis';
import { formatTimeShort } from '@/utils';

interface Props {
  sessions: SessionMeta[];
  total: number;
  selected: string | 'ALL';
  onChange: (session: string | 'ALL') => void;
}

export function SessionSelector({ sessions, total, selected, onChange }: Props) {
  return (
    <div className="card p-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2 pr-2">
          <span className="label !mb-0">Sessão:</span>
        </div>
        <Pill
          active={selected === 'ALL'}
          onClick={() => onChange('ALL')}
          label="TODAS"
          hint={`${total.toLocaleString('pt-BR')} eventos`}
        />
        {sessions.map((s) => (
          <Pill
            key={s.name}
            active={selected === s.name}
            onClick={() => onChange(s.name)}
            label={s.name}
            hint={`${s.eventCount.toLocaleString('pt-BR')} · ${formatTimeShort(s.durationSeconds)}`}
          />
        ))}
      </div>
    </div>
  );
}

function Pill({
  active,
  label,
  hint,
  onClick,
}: {
  active: boolean;
  label: string;
  hint?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-colors
                  ${active ? 'bg-brand text-white border-brand shadow-glow' : 'bg-bg-elevated text-slate-700 border-line hover:border-brand/40 hover:text-slate-900'}`}
    >
      <span className="font-semibold tracking-wide">{label}</span>
      {hint && <span className={`text-[10px] ${active ? 'text-white/80' : 'text-slate-500'}`}>{hint}</span>}
    </button>
  );
}
