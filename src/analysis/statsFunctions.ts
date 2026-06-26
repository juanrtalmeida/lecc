/**
 * Funções estatísticas puras — todas defensivas (não explodem com array vazio).
 * Retornam null/vazio quando não há dados suficientes.
 */

export function valuesOrEmpty(values: number[]): number[] {
  return values.filter((v) => Number.isFinite(v));
}

export function mean(values: number[]): number | null {
  const v = valuesOrEmpty(values);
  if (!v.length) return null;
  return v.reduce((a, b) => a + b, 0) / v.length;
}

export function median(values: number[]): number | null {
  const v = valuesOrEmpty(values).slice().sort((a, b) => a - b);
  if (!v.length) return null;
  const mid = Math.floor(v.length / 2);
  if (v.length % 2 === 0) return (v[mid - 1] + v[mid]) / 2;
  return v[mid];
}

export function min(values: number[]): number | null {
  const v = valuesOrEmpty(values);
  if (!v.length) return null;
  return Math.min(...v);
}

export function max(values: number[]): number | null {
  const v = valuesOrEmpty(values);
  if (!v.length) return null;
  return Math.max(...v);
}

export function sum(values: number[]): number | null {
  const v = valuesOrEmpty(values);
  if (!v.length) return null;
  return v.reduce((a, b) => a + b, 0);
}

export function count(values: number[]): number {
  return valuesOrEmpty(values).length;
}

/** Média dos intervalos SUCESSIVOS entre valores ordenados (ex.: média "Reforço→Reforço"). */
export function meanInterval(values: number[]): number | null {
  const v = valuesOrEmpty(values).slice().sort((a, b) => a - b);
  if (v.length < 2) return null;
  let total = 0;
  for (let i = 1; i < v.length; i++) total += v[i] - v[i - 1];
  return total / (v.length - 1);
}

/** Desvio padrão populacional (N). */
export function stdev(values: number[]): number | null {
  const v = valuesOrEmpty(values);
  if (v.length < 2) return null;
  const m = v.reduce((a, b) => a + b, 0) / v.length;
  const variance = v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length;
  return Math.sqrt(variance);
}

import type { AnalysisOperation } from '@/types';

export function applyOperation(
  op: AnalysisOperation,
  values: number[],
): number | null {
  switch (op) {
    case 'Média':
      return mean(values);
    case 'Mediana':
      return median(values);
    case 'Mínimo':
      return min(values);
    case 'Máximo':
      return max(values);
    case 'Soma':
      return sum(values);
    case 'Contagem':
      // Contagem SEMPRE retorna um número, mesmo sem valores (0).
      return count(values);
    case 'Intervalo médio':
      return meanInterval(values);
    case 'Desvio padrão':
      return stdev(values);
  }
}
