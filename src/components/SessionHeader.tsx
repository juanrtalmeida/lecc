import type { Analysis } from '@/types';
import { formatDate, formatTimeRaw, formatDuration } from '@/utils';

const FIELD_LABELS: Record<string, string> = {
  Experiment: 'Experimento',
  Subject: 'Sujeito',
  'Start Time': 'Hora de início',
  'End Time': 'Hora de fim',
  'Start Date': 'Data',
  Box: 'Box',
  Group: 'Grupo',
  MSN: 'MSN',
};

export function SessionHeader({ analysis }: { analysis: Analysis }) {
  const h = analysis.header;

  // Duração a partir de eventos (fallback se header não trouxer).
  const first = analysis.events[0]?.time;
  const last = analysis.events[analysis.events.length - 1]?.time;
  const duration = first != null && last != null ? formatDuration(Math.max(0, last - first)) : '—';

  const items = [
    { label: 'Experimento', value: h['Experiment'] },
    { label: 'Sujeito', value: h['Subject'] },
    { label: 'Data', value: formatDate(h['Start Date']) },
    { label: 'Hora', value: formatTimeRaw(h['Start Time']) },
    { label: 'Duração', value: duration },
    { label: 'Box', value: h['Box'] },
    { label: 'Grupo', value: h['Group'] },
    { label: 'MSN', value: h['MSN'] },
  ];

  return (
    <header className="card p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {h['Experiment'] ?? 'Sem nome'}
          </h1>
          <p className="text-slate-500 text-sm">
            Sujeito {h['Subject'] ?? '—'} · {formatDate(h['Start Date'])} {formatTimeRaw(h['Start Time'])}
          </p>
        </div>
        <div className="text-xs text-slate-500 font-mono">{analysis.id.slice(0, 8)}</div>
      </div>
      <dl className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        {items.map((it) => (
          <div key={it.label}>
            <dt className="label">{it.label}</dt>
            <dd className="text-sm text-slate-700 break-words">{it.value ?? '—'}</dd>
          </div>
        ))}
      </dl>
      {Object.keys(FIELD_LABELS).length === 0 && null}
    </header>
  );
}
