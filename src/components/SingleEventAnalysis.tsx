import { useMemo } from 'react';
import type { Analysis, RawEvent } from '@/types';
import { analysisCategoryMap, categoryOfCode } from '@/analysis';
import { CategoryBadge } from './CategoryBadge';
import { formatTime, formatTimeShort } from '@/utils';
import { useCurrentAnalysis } from '@/hooks';
import { uuid } from '@/utils';
import type { CustomAnalysis } from '@/types';

interface Props {
  analysis: Analysis;
  /** Índice do evento destacado (vem da timeline/tabela). */
  highlightIndex: number | null;
  onSelectEvent?: (i: number) => void;
  onClearHighlight?: () => void;
}

interface SameCodeStats {
  count: number;
  mean: number;
  median: number;
  min: number;
  max: number;
  std: number;
  intervals: number[];
}

function computeSameCodeStats(events: RawEvent[]): SameCodeStats | null {
  if (events.length < 2) return null;
  const intervals: number[] = [];
  for (let i = 1; i < events.length; i++) {
    intervals.push(events[i].time - events[i - 1].time);
  }
  intervals.sort((a, b) => a - b);
  const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const median = intervals[Math.floor(intervals.length / 2)];
  const min = intervals[0];
  const max = intervals[intervals.length - 1];
  const variance =
    intervals.reduce((a, b) => a + (b - mean) ** 2, 0) / intervals.length;
  return { count: intervals.length, mean, median, min, max, std: Math.sqrt(variance), intervals };
}

const fmt = (v: number) => (Number.isFinite(v) ? v.toFixed(2) : '—');

export function SingleEventAnalysis({
  analysis,
  highlightIndex,
  onSelectEvent,
  onClearHighlight,
}: Props) {
  const upsert = useCurrentAnalysis((s) => s.upsertCustomAnalysis);
  const categoryMap = useMemo(() => analysisCategoryMap(analysis), [analysis]);

  const event =
    highlightIndex != null
      ? (analysis.events[highlightIndex] as RawEvent | null)
      : null;
  const def = event ? analysis.eventDefinitions[event.code] : null;

  // Mesmo code, em ordem no array global.
  const sameCodeEvents = useMemo<RawEvent[]>(() => {
    if (!event) return [];
    return analysis.events.filter((e) => e.code === event.code);
  }, [analysis.events, event]);

  const sameCodeIndex = useMemo(() => {
    if (!event) return -1;
    return sameCodeEvents.findIndex((e) => e.timestamp === event.timestamp && e.code === event.code);
  }, [sameCodeEvents, event]);

  const sameStats = useMemo(() => computeSameCodeStats(sameCodeEvents), [sameCodeEvents]);

  // Eventos imediatamente antes/depois, no array global.
  const prevEv = useMemo(() => {
    if (!event || highlightIndex == null || highlightIndex <= 0) return null;
    return analysis.events[highlightIndex - 1] ?? null;
  }, [analysis.events, event, highlightIndex]);
  const nextEv = useMemo(() => {
    if (!event || highlightIndex == null || highlightIndex >= analysis.events.length - 1)
      return null;
    return analysis.events[highlightIndex + 1] ?? null;
  }, [analysis.events, event, highlightIndex]);

  function attachAsCustom(name: string, direction: 'next' | 'previous', op: CustomAnalysis['operation']) {
    if (!event) return;
    const from = [event.code];
    const ca: CustomAnalysis = {
      id: uuid(),
      name,
      from: { codes: from, label: def?.name ?? `cód. ${event.code}` },
      to: { codes: from, label: def?.name ?? `cód. ${event.code}` },
      directionAfter: direction,
      operation: op,
      createdAt: new Date().toISOString(),
    };
    upsert(ca);
  }

  if (!event || highlightIndex == null) {
    return (
      <div className="card p-4 text-sm text-slate-500">
        Clique em um evento da <strong className="text-slate-700">tabela</strong> ou da{' '}
        <strong className="text-slate-700">timeline</strong> para ver as análises deste
        evento (intervalos até o anterior/próximo, distribuição dos intervalos do mesmo
        code, atalhos para criar análises customizadas, etc.).
      </div>
    );
  }

  const catMeta = categoryOfCode(analysis, event.code);
  const dtPrev =
    prevEv && event ? event.time - prevEv.time : Number.NaN;
  const dtNext =
    nextEv && event ? nextEv.time - event.time : Number.NaN;

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-2 flex-wrap mb-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500">
            Evento selecionado
          </div>
          <h3 className="text-lg font-semibold mt-0.5 text-slate-900">
            <span className="font-mono">{formatTime(event.time)}</span>
            <span className="text-slate-500 text-sm font-normal">
              {' '}· timestamp {event.timestamp}.{String(event.code).padStart(3, '0')}
            </span>
          </h3>
          <div className="flex items-center gap-2 mt-1.5">
            <span
              className="chip"
              style={{
                background: `${def?.color ?? catMeta.color}22`,
                color: def?.color ?? catMeta.color,
                border: `1px solid ${def?.color ?? `${catMeta.color}55`}55`,
              }}
            >
              <span className="font-mono font-bold">{event.code}</span>
              <span>{def?.name ?? '(sem nome)'}</span>
            </span>
            <CategoryBadge category={catMeta.name} categories={categoryMap} />
          </div>
        </div>
        {onClearHighlight && (
          <button className="btn-ghost btn" onClick={onClearHighlight}>
            Limpar seleção
          </button>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-3 mb-3">
        <NeighborCard
          title="Evento anterior"
          ev={prevEv}
          deltaSeconds={dtPrev}
          onClick={() => {
            if (prevEv && onSelectEvent && highlightIndex != null) {
              onSelectEvent(highlightIndex - 1);
            }
          }}
        />
        <NeighborCard
          title="Próximo evento"
          ev={nextEv}
          deltaSeconds={dtNext}
          onClick={() => {
            if (nextEv && onSelectEvent && highlightIndex != null) {
              onSelectEvent(highlightIndex + 1);
            }
          }}
        />
      </div>

      <div className="rounded-lg border border-line p-3 bg-bg-subtle">
        <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-500">
              Distribuição de ΔT entre ocorrências deste code
            </div>
            <div className="text-sm text-slate-700 font-medium">
              Code <span className="font-mono font-bold">{event.code}</span>
              {' '} — {sameCodeEvents.length} ocorrências
              {sameCodeIndex >= 0 && (
                <span className="text-slate-500"> · #{sameCodeIndex + 1} de {sameCodeEvents.length}</span>
              )}
            </div>
          </div>
        </div>
        {sameStats ? (
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-sm">
            <Stat label="n" value={String(sameStats.count)} />
            <Stat label="Média" value={`${fmt(sameStats.mean)} s`} />
            <Stat label="Mediana" value={`${fmt(sameStats.median)} s`} />
            <Stat label="Min" value={`${fmt(sameStats.min)} s`} />
            <Stat label="Max" value={`${fmt(sameStats.max)} s`} />
            <Stat label="σ" value={`${fmt(sameStats.std)} s`} />
          </div>
        ) : (
          <div className="text-sm text-slate-500">
            Menos de 2 ocorrências — não é possível calcular intervalos.
          </div>
        )}

      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          className="btn"
          onClick={() =>
            attachAsCustom(
              `Δ entre ${def?.name ?? `cód. ${event.code}`} (próximo)`,
              'next',
              'Média',
            )
          }
        >
          + Análise: próximo do mesmo code · Média
        </button>
        <button
          className="btn"
          onClick={() =>
            attachAsCustom(
              `Δ entre ${def?.name ?? `cód. ${event.code}`} (anterior)`,
              'previous',
              'Média',
            )
          }
        >
          + Análise: anterior do mesmo code · Média
        </button>
        <button
          className="btn"
          onClick={() =>
            attachAsCustom(
              `Δ entre ${def?.name ?? `cód. ${event.code}`} (próximo)`,
              'next',
              'Desvio padrão',
            )
          }
        >
          + Δ próximo · Desvio padrão
        </button>
      </div>
    </div>
  );
}

function NeighborCard({
  title,
  ev,
  deltaSeconds,
  onClick,
}: {
  title: string;
  ev: RawEvent | null;
  deltaSeconds: number;
  onClick?: () => void;
}) {
  if (!ev) {
    return (
      <div className="border border-line rounded-lg p-3 bg-bg-elevated">
        <div className="text-xs uppercase tracking-wider text-slate-500">{title}</div>
        <div className="text-sm text-slate-500 mt-1">—</div>
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left border border-line rounded-lg p-3 bg-bg-elevated hover:border-brand/40 transition"
    >
      <div className="text-xs uppercase tracking-wider text-slate-500">{title}</div>
      <div className="font-mono font-bold text-base mt-0.5 text-slate-900">
        {formatTime(ev.time)}{' '}
        <span className="text-slate-500 text-xs font-normal">
          · {ev.timestamp}.{String(ev.code).padStart(3, '0')}
        </span>
      </div>
      <div className="text-xs text-slate-600 mt-1">
        code{' '}
        <span className="font-mono font-semibold text-slate-900">{ev.code}</span>
        {Number.isFinite(deltaSeconds) && (
          <>
            {' '}· Δ = <span className="font-mono font-semibold text-slate-900">{formatTimeShort(deltaSeconds)}</span>
          </>
        )}
      </div>
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-bg-elevated px-2.5 py-1.5 border border-line">
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className="text-sm font-semibold tabular-nums mt-0.5 text-slate-900">{value}</div>
    </div>
  );
}
