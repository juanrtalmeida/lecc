import { useMemo, useState } from 'react';
import type { Analysis } from '@/types';
import { formatDate, formatTimeRaw, formatDuration } from '@/utils';
import { useCurrentAnalysis } from '@/hooks';
import { Modal } from './Modal';
import { headerChanges } from '@/analysis';

/** Campos conhecidos do MED-PC, na ordem de leitura. O resto vai para "Outros campos". */
const FIELD_LABELS: Record<string, string> = {
  Experiment: 'Experimento',
  Subject: 'Sujeito',
  'Start Date': 'Data de início',
  'Start Time': 'Hora de início',
  'End Date': 'Data de fim',
  'End Time': 'Hora de fim',
  Box: 'Box',
  Group: 'Grupo',
  MSN: 'Programa (MSN)',
};

const DATE_KEYS = new Set(['Start Date', 'End Date']);
const TIME_KEYS = new Set(['Start Time', 'End Time']);

function display(key: string, value: string | undefined): string {
  if (!value) return '—';
  if (DATE_KEYS.has(key)) return formatDate(value);
  if (TIME_KEYS.has(key)) return formatTimeRaw(value);
  return value;
}

export function SessionHeader({ analysis }: { analysis: Analysis }) {
  const h = analysis.header;
  const [editing, setEditing] = useState(false);

  // Duração medida nos eventos (S3), não a declarada no arquivo.
  const first = analysis.events[0]?.time;
  const last = analysis.events[analysis.events.length - 1]?.time;
  const duration = first != null && last != null ? formatDuration(Math.max(0, last - first)) : '—';

  const known = Object.keys(FIELD_LABELS).filter((k) => k in h || !k.startsWith('End'));
  const others = Object.keys(h).filter((k) => !(k in FIELD_LABELS));
  const changes = useMemo(() => new Map(headerChanges(analysis).map((c) => [c.field, c])), [analysis]);
  // Hint "no arquivo: X" sob cada campo editado — o original nunca some da vista.
  const wasHint = (k: string) => {
    const c = changes.get(k);
    return c ? `no arquivo: ${c.original ? display(k, c.original) : '(ausente)'}` : undefined;
  };

  return (
    <header className="card p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wider text-slate-500">Cabeçalho do arquivo</div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 break-words">
            {h['Experiment'] || 'Sem experimento'}
          </h1>
          <p className="text-slate-500 text-sm">
            Sujeito <strong className="text-slate-700">{h['Subject'] || '—'}</strong> ·{' '}
            {display('Start Date', h['Start Date'])} {display('Start Time', h['Start Time'])}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {changes.size > 0 && (
            <span
              className="chip border border-amber-300 bg-amber-50 text-amber-700"
              title={[...changes.values()].map((c) => `${c.field}: ${c.kind}`).join('\n')}
            >
              Editado · {changes.size} {changes.size === 1 ? 'campo' : 'campos'}
            </span>
          )}
          <button className="btn" onClick={() => setEditing(true)}>
            Editar cabeçalho
          </button>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-3">
        {known.map((k) => (
          <Field key={k} label={FIELD_LABELS[k]} value={display(k, h[k])} hint={wasHint(k)} edited={changes.has(k)} />
        ))}
        <Field label="Duração registrada" value={duration} hint="do 1º ao último evento" />
      </dl>

      {others.length > 0 && (
        <details className="mt-4 rounded-lg border border-line bg-bg-subtle">
          <summary className="cursor-pointer select-none px-3 py-2 text-sm text-slate-700">
            Outros campos do arquivo ({others.length})
          </summary>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 px-3 pb-3 text-sm">
            {others.map((k) => (
              <div key={k} className="contents">
                <dt className="font-mono text-slate-500">{k}</dt>
                <dd className="font-mono text-slate-900 break-all">
                  {h[k] || '—'}
                  {wasHint(k) && <span className="ml-2 text-amber-700">({wasHint(k)})</span>}
                </dd>
              </div>
            ))}
          </dl>
        </details>
      )}

      {editing && <HeaderEditor header={h} onClose={() => setEditing(false)} />}
    </header>
  );
}

function Field({ label, value, hint, edited }: { label: string; value: string; hint?: string; edited?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="label">{label}</dt>
      <dd className="text-sm font-medium text-slate-900 break-words">{value}</dd>
      {hint && <dd className={`text-[11px] ${edited ? 'text-amber-700' : 'text-slate-500'}`}>{hint}</dd>}
    </div>
  );
}

/**
 * Edita os pares chave/valor como estão no arquivo. Os campos conhecidos vêm
 * primeiro (mesmo os ausentes, vazios, para poder preencher); linhas com
 * chave vazia são descartadas ao salvar.
 */
function HeaderEditor({ header, onClose }: { header: Record<string, string>; onClose: () => void }) {
  const setHeader = useCurrentAnalysis((s) => s.setHeader);
  const [rows, setRows] = useState<[string, string][]>(() => {
    const knownRows = Object.keys(FIELD_LABELS)
      .filter((k) => k in header || !k.startsWith('End'))
      .map((k): [string, string] => [k, header[k] ?? '']);
    const rest = Object.entries(header).filter(([k]) => !(k in FIELD_LABELS));
    return [...knownRows, ...rest];
  });

  const keys = rows.map(([k]) => k.trim()).filter(Boolean);
  const duplicate = keys.find((k, i) => keys.indexOf(k) !== i);

  const update = (i: number, col: 0 | 1, v: string) =>
    setRows((rs) => rs.map((r, j) => (j === i ? ((col === 0 ? [v, r[1]] : [r[0], v]) as [string, string]) : r)));

  function save() {
    const next: Record<string, string> = {};
    for (const [k, v] of rows) {
      const key = k.trim();
      // Campo conhecido deixado vazio some do cabeçalho, como se o arquivo não o tivesse.
      if (key && (v.trim() || !(key in FIELD_LABELS))) next[key] = v.trim();
    }
    setHeader(next);
    onClose();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Editar cabeçalho do arquivo"
      size="lg"
      footer={
        <>
          {duplicate && <span className="mr-auto text-sm text-red-600">Campo repetido: {duplicate}</span>}
          <button className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn-primary" disabled={!!duplicate} onClick={save}>
            Salvar
          </button>
        </>
      }
    >
      <p className="text-sm text-slate-500 mb-3">
        Corrige o que veio no arquivo — sujeito, data, grupo. Os eventos e os cálculos não mudam.
      </p>
      <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)_auto] gap-2 items-center">
        <span className="label">Campo</span>
        <span className="label">Valor</span>
        <span />
        {rows.map(([k, v], i) => {
          const known = k in FIELD_LABELS;
          return (
            <div key={i} className="contents">
              {known ? (
                <span className="text-sm text-slate-700">
                  {FIELD_LABELS[k]} <span className="font-mono text-xs text-slate-400">{k}</span>
                </span>
              ) : (
                <input className="input font-mono" value={k} placeholder="Nome do campo" onChange={(e) => update(i, 0, e.target.value)} />
              )}
              <input
                className="input"
                value={v}
                placeholder={DATE_KEYS.has(k) ? 'dd/mm/aa' : TIME_KEYS.has(k) ? 'hh:mm:ss' : ''}
                onChange={(e) => update(i, 1, e.target.value)}
              />
              <button
                className="btn-ghost btn text-slate-400 hover:text-red-600"
                aria-label={`Remover ${k || 'campo'}`}
                onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
      <button className="btn mt-3" onClick={() => setRows((rs) => [...rs, ['', '']])}>
        + Campo
      </button>
    </Modal>
  );
}
