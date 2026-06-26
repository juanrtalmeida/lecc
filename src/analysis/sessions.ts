import type { Analysis, RawEvent } from '@/types';

/**
 * Lista de sessões presentes nos eventos. Cada seção MED-PC (A, B, C, …)
 * vira uma entrada. Ordena alfabeticamente.
 */
export function listSessions(events: RawEvent[]): string[] {
  const set = new Set<string>();
  for (const e of events) if (e.section) set.add(e.section);
  return Array.from(set).sort();
}

/** Filtra eventos por lista (ou `'ALL'` semântica). */
export function selectEvents(
  events: RawEvent[],
  session: string | 'ALL',
): RawEvent[] {
  if (session === 'ALL') return events;
  return events.filter((e) => e.section === session);
}

export interface SessionMeta {
  name: string;
  eventCount: number;
  firstTimestamp: number;
  lastTimestamp: number;
  durationSeconds: number;
  codes: number[];
}

/** Resumo por sessão — usado para o seletor de sessão (sidebar/pills). */
export function summarizeSessions(events: RawEvent[]): SessionMeta[] {
  const buckets = new Map<string, RawEvent[]>();
  for (const e of events) {
    if (!e.section) continue;
    const arr = buckets.get(e.section);
    if (arr) arr.push(e);
    else buckets.set(e.section, [e]);
  }
  const out: SessionMeta[] = [];
  for (const [name, list] of Array.from(buckets.entries()).sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    const timestamps = list.map((e) => e.timestamp);
    const codes = Array.from(new Set(list.map((e) => e.code))).sort((a, b) => a - b);
    out.push({
      name,
      eventCount: list.length,
      firstTimestamp: Math.min(...timestamps),
      lastTimestamp: Math.max(...timestamps),
      durationSeconds: (Math.max(...timestamps) - Math.min(...timestamps)) / 100,
      codes,
    });
  }
  return out;
}

/**
 * Subconjunto da Analysis para uma sessão específica.
 * Mantém header / customAnalysis (custom são resolvidos sob demanda)
 * e substitui events pelos filtrados.
 */
export function sliceAnalysis(
  analysis: Analysis,
  session: string | 'ALL',
): Analysis {
  if (session === 'ALL') return analysis;
  const filtered = analysis.events.filter((e) => e.section === session);
  return { ...analysis, events: filtered };
}
