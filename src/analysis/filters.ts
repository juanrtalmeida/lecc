import type { Analysis, CountMode, EventFilter, RawEvent } from '@/types';
import { analysisCategoryMap, categoryNameOfCode } from './categories';

/** Tolerância para comparar tempos (os dados vêm em décimos de segundo). */
const EPS = 1e-6;

/** Limites absolutos da sessão, em segundos do próprio arquivo. */
export interface TimeBounds {
  /** Tempo do primeiro evento — origem da janela. */
  start: number;
  /** Tempo do último evento. */
  end: number;
  /** `end - start`, nunca negativo. */
  duration: number;
}

export function sessionBounds(events: RawEvent[]): TimeBounds {
  if (events.length === 0) return { start: 0, end: 0, duration: 0 };
  let start = events[0].time;
  let end = events[0].time;
  for (const e of events) {
    if (e.time < start) start = e.time;
    if (e.time > end) end = e.time;
  }
  return { start, end, duration: Math.max(0, end - start) };
}

/** Filtro neutro: janela inteira, sem isolamento. */
export function defaultFilter(bounds: TimeBounds): EventFilter {
  return {
    codes: null,
    windowStart: 0,
    windowEnd: bounds.duration,
    countMode: 'isolated',
  };
}

/** Há isolamento de códigos ativo? (lista vazia = nada selecionado, ainda conta) */
export function hasCodeFilter(filter: EventFilter): boolean {
  return filter.codes !== null;
}

/** A janela cobre a sessão inteira? */
export function isFullWindow(filter: EventFilter, bounds: TimeBounds): boolean {
  return (
    filter.windowStart <= EPS && filter.windowEnd >= bounds.duration - EPS
  );
}

export function isNeutralFilter(filter: EventFilter, bounds: TimeBounds): boolean {
  return !hasCodeFilter(filter) && isFullWindow(filter, bounds);
}

/**
 * Reancora um filtro quando a sessão (e portanto a duração) muda: mantém a
 * janela escolhida quando ela ainda cabe, e recorta o que passar do fim.
 */
export function clampFilter(filter: EventFilter, bounds: TimeBounds): EventFilter {
  const start = Math.min(Math.max(0, filter.windowStart), bounds.duration);
  const end = Math.min(Math.max(start, filter.windowEnd), bounds.duration);
  if (start === filter.windowStart && end === filter.windowEnd) return filter;
  return { ...filter, windowStart: start, windowEnd: end };
}

/** Conjunto de códigos isolados, ou `null` quando não há isolamento. */
export function isolatedCodeSet(filter: EventFilter): Set<number> | null {
  return filter.codes === null ? null : new Set(filter.codes);
}

/**
 * Aplica o filtro aos eventos.
 *
 * `isolate` controla o eixo de códigos: com `false` só a janela de tempo é
 * aplicada — é assim que o modo "contabilizar todos" mantém os demais eventos
 * na listagem sem perder o recorte temporal.
 */
export function filterEvents(
  events: RawEvent[],
  filter: EventFilter,
  bounds: TimeBounds,
  isolate: boolean,
): RawEvent[] {
  const from = bounds.start + filter.windowStart;
  const to = bounds.start + filter.windowEnd;
  const codes = isolate ? isolatedCodeSet(filter) : null;
  if (codes === null && isFullWindow(filter, bounds)) return events;
  return events.filter((e) => {
    if (e.time < from - EPS || e.time > to + EPS) return false;
    if (codes && !codes.has(e.code)) return false;
    return true;
  });
}

/**
 * Versão filtrada da análise. Por padrão o isolamento segue o `countMode`:
 * em `'all'` os outros eventos continuam contando.
 */
export function applyFilter(
  analysis: Analysis,
  filter: EventFilter,
  bounds: TimeBounds,
  isolate: boolean = filter.countMode === 'isolated',
): Analysis {
  const events = filterEvents(analysis.events, filter, bounds, isolate);
  if (events === analysis.events) return analysis;
  return { ...analysis, events };
}

// ---------- Apoio para a UI ----------

export interface CodeOption {
  code: number;
  name: string;
  /** Nome da categoria já resolvido (canônica ou criada pelo usuário). */
  category: string;
  color: string;
  /** Ocorrências na sessão inteira (independente da janela). */
  total: number;
  /** Ocorrências dentro da janela atual. */
  inWindow: number;
}

/**
 * Catálogo de códigos presentes na sessão, com as contagens que a UI usa para
 * mostrar "quantos eventos sobram" antes mesmo de aplicar o isolamento.
 */
export function listCodeOptions(
  analysis: Analysis,
  filter: EventFilter,
  bounds: TimeBounds,
): CodeOption[] {
  const totals = new Map<number, number>();
  const inWindow = new Map<number, number>();
  const from = bounds.start + filter.windowStart;
  const to = bounds.start + filter.windowEnd;

  for (const ev of analysis.events) {
    totals.set(ev.code, (totals.get(ev.code) ?? 0) + 1);
    if (ev.time >= from - EPS && ev.time <= to + EPS) {
      inWindow.set(ev.code, (inWindow.get(ev.code) ?? 0) + 1);
    }
  }

  const catMap = analysisCategoryMap(analysis);

  return Array.from(totals.keys())
    .sort((a, b) => a - b)
    .map((code) => {
      const def = analysis.eventDefinitions[code];
      const category = categoryNameOfCode(analysis, code);
      return {
        code,
        name: def?.name?.trim() || `(cód. ${code})`,
        category,
        color: def?.color || catMap[category]?.color || '#64748b',
        total: totals.get(code) ?? 0,
        inWindow: inWindow.get(code) ?? 0,
      };
    });
}

/** Resumo textual do filtro, usado nos cabeçalhos dos painéis. */
export function describeFilter(
  filter: EventFilter,
  bounds: TimeBounds,
  codeCount: number,
): { codes: string; window: string; mode: CountMode } {
  const codes =
    filter.codes === null
      ? `todos os ${codeCount} códigos`
      : `${filter.codes.length} de ${codeCount} códigos`;
  const window = isFullWindow(filter, bounds)
    ? 'sessão inteira'
    : `${(filter.windowStart / 60).toFixed(2)}–${(filter.windowEnd / 60).toFixed(2)} min`;
  return { codes, window, mode: filter.countMode };
}
