import type { CustomAnalysis, RawEvent } from '@/types';

/**
 * P(destino | origem): para cada origem, procura o primeiro destino na direção
 * pedida. Conta como sucesso se ele cair dentro de `windowSeconds` (quando
 * definido) e, com `untilNextFrom`, antes de outra origem aparecer.
 *
 * Diferente da latência (A2), a origem sem destino NÃO é descartada: ela é
 * justamente o "fracasso" do denominador.
 */
export function conditionalProbability(
  events: RawEvent[],
  ca: CustomAnalysis,
): { successes: number; trials: number } {
  const fromSet = new Set(ca.from.codes);
  const toSet = new Set(ca.to.codes);
  const step = ca.directionAfter === 'next' ? 1 : -1;
  const win = ca.windowSeconds;
  let successes = 0;
  let trials = 0;

  for (let i = 0; i < events.length; i++) {
    if (!fromSet.has(events[i].code)) continue;
    trials++;
    for (let j = i + step; j >= 0 && j < events.length; j += step) {
      const dt = Math.abs(events[j].time - events[i].time);
      if (win != null && dt > win) break;
      // Destino é testado antes da origem: em "A → A" a própria repetição é o sucesso.
      if (toSet.has(events[j].code)) {
        successes++;
        break;
      }
      if (ca.untilNextFrom && fromSet.has(events[j].code)) break;
    }
  }
  return { successes, trials };
}

export interface TransitionMatrix {
  codes: number[];
  /** counts[i][j] = vezes em que codes[j] veio logo depois de codes[i]. */
  counts: number[][];
  rowTotals: number[];
  /** Quantas vezes cada código aparece como "seguinte" — a taxa de base. */
  colTotals: number[];
  total: number;
}

/** Transições de lag 1: cada evento e o imediatamente seguinte. */
export function transitionMatrix(events: RawEvent[]): TransitionMatrix {
  const codes = Array.from(new Set(events.map((e) => e.code))).sort((a, b) => a - b);
  const idx = new Map(codes.map((c, i) => [c, i]));
  const counts = codes.map(() => codes.map(() => 0));
  for (let i = 1; i < events.length; i++) {
    counts[idx.get(events[i - 1].code)!][idx.get(events[i].code)!]++;
  }
  const rowTotals = counts.map((r) => r.reduce((a, b) => a + b, 0));
  const colTotals = codes.map((_, j) => counts.reduce((a, r) => a + r[j], 0));
  return { codes, counts, rowTotals, colTotals, total: Math.max(0, events.length - 1) };
}
