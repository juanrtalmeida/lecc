import { useEffect, useMemo, useState } from 'react';
import type { Analysis, CategoryInfo, CountMode, EventFilter } from '@/types';
import { COUNT_MODE_LABEL } from '@/types';
import type { CodeOption, TimeBounds } from '@/analysis';
import { isFullWindow } from '@/analysis';
import { formatMinutes, parseMinutesInput } from '@/utils';
import { DualRange } from './ui/DualRange';
import { Timeline } from './Timeline';

interface Props {
  /** Análise já filtrada — a mesma que a tabela recebe. */
  analysis: Analysis;
  filter: EventFilter;
  onChange: (filter: EventFilter) => void;
  bounds: TimeBounds;
  options: CodeOption[];
  /** Catálogo de categorias da análise (canônicas + criadas pelo usuário). */
  categories: CategoryInfo[];
  /** Eventos dentro da janela, sem isolamento de códigos. */
  windowEvents: number;
  /** Eventos dentro da janela restritos aos códigos isolados. */
  isolatedEvents: number;
  /** Eventos da sessão inteira, sem nenhum filtro. */
  totalEvents: number;
  highlightIndex: number | null;
  onSelectEvent: (eventIndex: number) => void;
}

/** Durações oferecidas como atalho, em minutos — só as que cabem na sessão. */
const PRESET_MINUTES = [1, 3, 5, 10, 15, 20, 30, 45, 60];

/**
 * Painel único de manejo da sessão: a janela de tempo, o isolamento de eventos,
 * o modo de contagem e a própria linha do tempo no mesmo lugar.
 *
 * A janela é ao mesmo tempo o filtro e o trecho desenhado — não existem duas
 * noções de "trecho visível" para entrar em conflito. Arrastar ou dar zoom na
 * linha do tempo mexe exatamente no mesmo controle que a barra acima dela.
 */
export function TimelinePanel({
  analysis,
  filter,
  onChange,
  bounds,
  options,
  categories,
  windowEvents,
  isolatedEvents,
  totalEvents,
  highlightIndex,
  onSelectEvent,
}: Props) {
  const duration = bounds.duration;
  const fullWindow = isFullWindow(filter, bounds);
  const isolating = filter.codes !== null;
  const windowLength = Math.max(0, filter.windowEnd - filter.windowStart);
  const countedEvents = filter.countMode === 'isolated' ? isolatedEvents : windowEvents;
  const step = duration > 3600 ? 5 : 1;

  const presets = useMemo(
    () => PRESET_MINUTES.filter((m) => m * 60 <= duration + 1),
    [duration],
  );

  const ticks = useMemo(() => {
    if (duration <= 0) return [];
    const minutes = duration / 60;
    const everyN = Math.max(1, Math.ceil(minutes / 12));
    const out: number[] = [];
    for (let m = everyN; m * 60 < duration; m += everyN) out.push((m * 60) / duration);
    return out;
  }, [duration]);

  const setWindow = (start: number, end: number) => {
    const s = Math.min(Math.max(0, start), duration);
    const e = Math.min(Math.max(s, end), duration);
    onChange({ ...filter, windowStart: s, windowEnd: e });
  };

  /** Mantém o início e ajusta o fim; se estourar a sessão, empurra o início. */
  const setLength = (seconds: number) => {
    const len = Math.min(seconds, duration);
    let s = filter.windowStart;
    if (s + len > duration) s = Math.max(0, duration - len);
    setWindow(s, s + len);
  };

  /** Aproxima/afasta em torno do centro da janela atual. */
  const scaleWindow = (factor: number) => {
    const center = (filter.windowStart + filter.windowEnd) / 2;
    const len = Math.min(duration, Math.max(1, windowLength * factor));
    setWindow(center - len / 2, center + len / 2);
  };

  const setCodes = (codes: number[] | null) => onChange({ ...filter, codes });

  const toggleCode = (code: number) => {
    if (filter.codes === null) {
      // Primeiro clique isola só aquele evento.
      setCodes([code]);
      return;
    }
    const has = filter.codes.includes(code);
    const next = has
      ? filter.codes.filter((c) => c !== code)
      : [...filter.codes, code].sort((a, b) => a - b);
    setCodes(next);
  };

  const toggleCategory = (category: string) => {
    const inCat = options.filter((o) => o.category === category).map((o) => o.code);
    if (inCat.length === 0) return;
    const current = filter.codes ?? [];
    const allIn = inCat.every((c) => current.includes(c));
    const next = allIn
      ? current.filter((c) => !inCat.includes(c))
      : Array.from(new Set([...current, ...inCat])).sort((a, b) => a - b);
    setCodes(next);
  };

  // Só as categorias que têm algum evento nesta sessão.
  const categoriesPresent = useMemo(
    () => categories.filter((c) => options.some((o) => o.category === c.name)),
    [categories, options],
  );

  const active = isolating || !fullWindow;

  return (
    <div className="card p-4 flex flex-col gap-3">
      {/* Cabeçalho ------------------------------------------------------- */}
      <div className="flex items-baseline gap-2 flex-wrap">
        <h3 className="font-semibold text-slate-900">Linha do tempo</h3>
        <span className="text-xs text-slate-500 font-mono">
          {formatMinutes(filter.windowStart)} → {formatMinutes(filter.windowEnd)}
        </span>
        <span className="text-xs text-slate-400">de {formatMinutes(duration)}</span>
        <div className="flex-1" />
        <span className="text-xs text-slate-500 tabular-nums">
          {countedEvents.toLocaleString('pt-BR')} de {totalEvents.toLocaleString('pt-BR')}{' '}
          eventos em análise
        </span>
        {active && (
          <button
            type="button"
            className="btn-ghost btn !px-2 !py-1 text-xs"
            onClick={() =>
              onChange({
                codes: null,
                windowStart: 0,
                windowEnd: duration,
                countMode: filter.countMode,
              })
            }
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Janela de tempo -------------------------------------------------- */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-[10px] uppercase tracking-wider text-slate-400 w-14 flex-shrink-0">
          Janela
        </span>
        <div className="flex-1 min-w-[12rem]">
          <DualRange
            min={0}
            max={Math.max(step, duration)}
            step={step}
            start={filter.windowStart}
            end={filter.windowEnd}
            ticks={ticks}
            disabled={duration <= 0}
            onChange={setWindow}
          />
        </div>
        <TimeField
          label="De"
          value={filter.windowStart}
          max={duration}
          onCommit={(v) => setWindow(v, Math.max(v, filter.windowEnd))}
        />
        <TimeField
          label="Até"
          value={filter.windowEnd}
          max={duration}
          onCommit={(v) => setWindow(Math.min(filter.windowStart, v), v)}
        />
        <TimeField label="Duração" value={windowLength} max={duration} onCommit={setLength} />
      </div>

      <div className="flex items-center gap-1.5 flex-wrap pl-0 sm:pl-[4.25rem]">
        {presets.map((m) => {
          const on = Math.abs(windowLength - m * 60) < 0.5;
          return (
            <button
              key={m}
              type="button"
              onClick={() => setLength(m * 60)}
              className={`chip transition-colors ${
                on
                  ? 'border-brand bg-brand text-white'
                  : 'border-line bg-bg-elevated text-slate-600 hover:border-brand/40'
              }`}
            >
              {m} min
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setWindow(0, duration)}
          className={`chip transition-colors ${
            fullWindow
              ? 'border-brand bg-brand text-white'
              : 'border-line bg-bg-elevated text-slate-600 hover:border-brand/40'
          }`}
        >
          sessão inteira
        </button>

        <span className="w-px h-4 bg-line mx-1" />

        <button
          type="button"
          className="btn-ghost btn !px-2 !py-1 text-xs"
          title="Aproximar"
          onClick={() => scaleWindow(1 / 1.5)}
        >
          ＋
        </button>
        <button
          type="button"
          className="btn-ghost btn !px-2 !py-1 text-xs"
          title="Afastar"
          disabled={fullWindow}
          onClick={() => scaleWindow(1.5)}
        >
          －
        </button>
        <button
          type="button"
          className="btn-ghost btn !px-2 !py-1 text-xs"
          disabled={fullWindow || filter.windowStart <= 0}
          onClick={() =>
            setWindow(
              Math.max(0, filter.windowStart - windowLength),
              Math.max(windowLength, filter.windowEnd - windowLength),
            )
          }
        >
          ← trecho anterior
        </button>
        <button
          type="button"
          className="btn-ghost btn !px-2 !py-1 text-xs"
          disabled={fullWindow || filter.windowEnd >= duration}
          onClick={() =>
            setWindow(
              Math.min(duration - windowLength, filter.windowStart + windowLength),
              Math.min(duration, filter.windowEnd + windowLength),
            )
          }
        >
          próximo trecho →
        </button>
      </div>

      {/* Isolamento de eventos -------------------------------------------- */}
      <div className="flex items-start gap-3 flex-wrap border-t border-line pt-3">
        <span className="text-[10px] uppercase tracking-wider text-slate-400 w-14 flex-shrink-0 mt-1.5">
          Eventos
        </span>
        <div className="flex-1 min-w-[14rem] flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
          {options.map((opt) => {
            const on = filter.codes === null || filter.codes.includes(opt.code);
            const explicit = filter.codes !== null && filter.codes.includes(opt.code);
            return (
              <button
                key={opt.code}
                type="button"
                onClick={() => toggleCode(opt.code)}
                title={`${opt.name} · ${opt.category} · ${opt.inWindow} nesta janela (${opt.total} na sessão)`}
                className="chip transition-colors"
                style={{
                  background: explicit ? `${opt.color}22` : on ? '#ffffff' : '#f8fafc',
                  borderColor: explicit ? `${opt.color}99` : '#e2e8f0',
                  color: on ? '#334155' : '#94a3b8',
                  opacity: on ? 1 : 0.6,
                }}
              >
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ background: on ? opt.color : '#cbd5e1' }}
                />
                <span className="font-mono">{opt.code}</span>
                <span className="max-w-[9rem] truncate">{opt.name}</span>
                <span className="tabular-nums text-slate-400">{opt.inWindow}</span>
              </button>
            );
          })}
          {options.length === 0 && (
            <span className="text-xs text-slate-500">Nenhum evento nesta sessão.</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {categoriesPresent.length > 1 &&
            categoriesPresent.map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => toggleCategory(c.name)}
                className="chip border-line bg-bg-elevated text-slate-600 hover:border-brand/40"
                title={`Marcar/desmarcar todos os eventos de ${c.name}`}
              >
                <span style={{ color: c.color }}>{c.symbol}</span>
                {c.name}
              </button>
            ))}
          <button
            type="button"
            className="btn-ghost btn !px-2 !py-1 text-xs"
            onClick={() => setCodes(null)}
          >
            Todos
          </button>
          <button
            type="button"
            className="btn-ghost btn !px-2 !py-1 text-xs"
            onClick={() => setCodes([])}
          >
            Nenhum
          </button>
        </div>
      </div>

      {isolating && filter.codes!.length === 0 && (
        <p className="text-xs text-amber-600 sm:pl-[4.25rem]">
          Nenhum evento marcado — a linha do tempo fica vazia. Use{' '}
          <strong>Todos</strong> para voltar a mostrar tudo.
        </p>
      )}

      {/* Modo de contagem -------------------------------------------------- */}
      <div className="flex items-center gap-3 flex-wrap border-t border-line pt-3">
        <span className="text-[10px] uppercase tracking-wider text-slate-400 w-14 flex-shrink-0">
          Contando
        </span>
        <div className="flex gap-1.5 flex-wrap">
          {(Object.keys(COUNT_MODE_LABEL) as CountMode[]).map((mode) => {
            const on = filter.countMode === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => onChange({ ...filter, countMode: mode })}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                  on
                    ? 'bg-brand text-white border-brand shadow-glow'
                    : 'bg-bg-elevated text-slate-600 border-line hover:border-brand/40'
                }`}
              >
                {COUNT_MODE_LABEL[mode]}
                <span
                  className={`ml-1.5 tabular-nums ${on ? 'text-white/75' : 'text-slate-400'}`}
                >
                  {(mode === 'isolated' ? isolatedEvents : windowEvents).toLocaleString(
                    'pt-BR',
                  )}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-slate-500 flex-1 min-w-[14rem]">
          {filter.countMode === 'isolated'
            ? 'A tabela, os cartões e as análises usam só os eventos marcados.'
            : 'A tabela, os cartões e as análises usam tudo o que ocorreu nesta janela.'}
        </p>
      </div>

      {/* A linha do tempo propriamente dita --------------------------------- */}
      <Timeline
        analysis={analysis}
        from={bounds.start + filter.windowStart}
        to={bounds.start + filter.windowEnd}
        min={bounds.start}
        max={bounds.start + duration}
        onWindowChange={(f, t) =>
          onChange({
            ...filter,
            windowStart: f - bounds.start,
            windowEnd: t - bounds.start,
          })
        }
        visibleCodes={filter.codes === null ? null : new Set(filter.codes)}
        highlightIndex={highlightIndex}
        onPointClick={onSelectEvent}
      />
    </div>
  );
}

function TimeField({
  label,
  value,
  max,
  onCommit,
}: {
  label: string;
  value: number;
  max: number;
  onCommit: (seconds: number) => void;
}) {
  const [text, setText] = useState(() => formatMinutes(value));
  const [invalid, setInvalid] = useState(false);

  // Sincroniza quando o valor muda por fora (slider, atalhos, arraste da linha).
  useEffect(() => {
    setText(formatMinutes(value));
    setInvalid(false);
  }, [value]);

  const commit = () => {
    const parsed = parseMinutesInput(text);
    if (parsed == null) {
      setInvalid(true);
      setText(formatMinutes(value));
      return;
    }
    setInvalid(false);
    onCommit(Math.min(Math.max(0, parsed), max));
  };

  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wider text-slate-400">{label}</span>
      <input
        type="text"
        inputMode="decimal"
        className={`input !py-1 !px-2 w-20 font-mono text-sm ${invalid ? '!border-red-400' : ''}`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
        placeholder="9:30"
      />
    </label>
  );
}
