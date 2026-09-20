import type { Analysis, AnalysisStats, RawEvent } from '@/types';
import { analysisCategories, categoryNameOfCode } from './categories';

/**
 * Calcula estatísticas agregadas a partir dos eventos
 * e do eventDefinitions (que indica a categoria de cada code).
 *
 * Eventos sem definição — ou apontando para uma categoria customizada que foi
 * excluída — mapeiam para "Outro". Todas as categorias da análise (canônicas e
 * customizadas) aparecem em `byCategory`, mesmo zeradas.
 */
export function computeStats(analysis: Analysis): AnalysisStats {
  const byCategory: Record<string, number> = {};
  for (const info of analysisCategories(analysis)) byCategory[info.name] = 0;
  const byCode: AnalysisStats['byCode'] = {};

  for (const ev of analysis.events) {
    const cat = categoryNameOfCode(analysis, ev.code);
    byCategory[cat] = (byCategory[cat] ?? 0) + 1;
    const cur = byCode[ev.code];
    if (!cur) {
      byCode[ev.code] = { count: 1, first: ev.time, last: ev.time };
    } else {
      cur.count += 1;
      if (ev.time < cur.first) cur.first = ev.time;
      if (ev.time > cur.last) cur.last = ev.time;
    }
  }

  const first = analysis.events[0]?.time;
  const last = analysis.events[analysis.events.length - 1]?.time;
  const duration =
    first !== undefined && last !== undefined ? Math.max(0, last - first) : 0;
  const minutes = duration > 0 ? duration / 60 : 0;
  const eventsPerMinute = minutes > 0 ? analysis.events.length / minutes : 0;

  return {
    totalEvents: analysis.events.length,
    byCategory,
    durationSeconds: duration,
    eventsPerMinute,
    byCode,
  };
}

/** Soma de quantidade por categoria — canônicas e customizadas. */
export function sumCounted(byCategory: Record<string, number>): number {
  let total = 0;
  for (const n of Object.values(byCategory)) total += n;
  return total;
}

/** Nomes das categorias que TÊM pelo menos 1 evento. */
export function categoriesInUse(stats: AnalysisStats): string[] {
  return Object.keys(stats.byCategory).filter((c) => (stats.byCategory[c] ?? 0) > 0);
}

/**
 * Helper: agrupa eventos pelo code. Retorna maps code → RawEvent[] em ordem.
 * Útil para a timeline (cada code pode usar sua própria linha).
 */
export function groupEventsByCode(events: RawEvent[]): Map<number, RawEvent[]> {
  const map = new Map<number, RawEvent[]>();
  for (const ev of events) {
    const arr = map.get(ev.code);
    if (arr) arr.push(ev);
    else map.set(ev.code, [ev]);
  }
  return map;
}
