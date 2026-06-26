import type {
  Analysis,
  CustomAnalysis,
  CustomAnalysisResult,
  RawEvent,
} from '@/types';
import { applyOperation } from './statsFunctions';

/**
 * Para cada ocorrência do(s) código(s) "from", procura a próxima ocorrência do(s)
 * código(s) "to" na direção pedida (next | previous).
 *
 * Devolve a lista de diferenças "to.time - from.time" em segundos.
 *
 * Eventos sem "to" pareado são ignorados (não vamos inflar amostra com nada).
 */
function computePairDeltas(
  events: RawEvent[],
  ca: CustomAnalysis,
): number[] {
  const fromSet = new Set(ca.from.codes);
  const toSet = new Set(ca.to.codes);
  if (fromSet.size === 0 || toSet.size === 0) return [];

  const deltas: number[] = [];

  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    if (!fromSet.has(ev.code)) continue;
    if (ca.directionAfter === 'next') {
      for (let j = i + 1; j < events.length; j++) {
        if (toSet.has(events[j].code)) {
          deltas.push(events[j].time - ev.time);
          break;
        }
      }
    } else {
      // previous
      for (let j = i - 1; j >= 0; j--) {
        if (toSet.has(events[j].code)) {
          deltas.push(events[j].time - ev.time);
          break;
        }
      }
    }
  }
  return deltas;
}

/**
 * Resolve uma CustomAnalysis contra os eventos correntes da Analysis.
 * Retorna { value, sampleSize, emptyReason }.
 */
export function resolveCustomAnalysis(
  analysis: Analysis,
  ca: CustomAnalysis,
): CustomAnalysisResult {
  const deltas = computePairDeltas(analysis.events, ca);
  if (deltas.length === 0) {
    if (analysis.events.length === 0) return { value: null, sampleSize: 0, emptyReason: 'Sessão sem eventos.' };
    if (ca.from.codes.length === 0) return { value: null, sampleSize: 0, emptyReason: 'Nenhum evento origem selecionado.' };
    if (ca.to.codes.length === 0) return { value: null, sampleSize: 0, emptyReason: 'Nenhum evento destino selecionado.' };
    return { value: null, sampleSize: 0, emptyReason: 'Nenhum par origem→destino encontrado.' };
  }
  const value = applyOperation(ca.operation, deltas);
  return { value, sampleSize: deltas.length };
}

/** Recalcula TODAS as customAnalysis em batch e injeta result/sampleSize. */
export function recomputeAllCustom(analysis: Analysis): Analysis {
  if (!analysis.customAnalysis.length) return analysis;
  const updated = analysis.customAnalysis.map((ca) => {
    const r = resolveCustomAnalysis(analysis, ca);
    return { ...ca, result: r.value ?? undefined, sampleSize: r.sampleSize };
  });
  return { ...analysis, customAnalysis: updated };
}
