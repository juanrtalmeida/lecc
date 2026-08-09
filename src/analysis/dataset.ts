/**
 * Matriz de variáveis por blocos de tempo.
 *
 * Um evento isolado não é uma observação com múltiplos preditores — para regressão
 * (principalmente a múltipla) precisamos de linhas comparáveis. Aqui a sessão é
 * fatiada em blocos de N segundos e cada bloco vira uma linha, com colunas derivadas
 * de cada code: contagem, taxa por minuto e intervalo médio entre ocorrências.
 */

import type { Analysis } from '@/types';

export type VariableKind = 'count' | 'rate' | 'irt' | 'time' | 'index';

export interface VariableDef {
  /** Id estável, gravado no modelo salvo: "n_110", "taxa_110", "irt_110", "t_ini"… */
  id: string;
  /** Rótulo legível: "Cód. 110 · Bicada — contagem". */
  label: string;
  kind: VariableKind;
  /** Code de origem, quando a variável for derivada de um code. */
  code?: number;
}

export interface BinnedDataset {
  variables: VariableDef[];
  /** Uma linha por bloco. Valores não definidos ficam NaN (só acontece em `irt_*`). */
  rows: Record<string, number>[];
  binSeconds: number;
  /** Se o último bloco (incompleto) foi descartado. */
  droppedPartialBin: boolean;
}

export const VAR_BLOCK = 'bloco';
export const VAR_TIME = 't_ini';
export const VAR_TOTAL = 'n_total';

/** Nome legível de um code, com o mesmo fallback usado nos outros painéis. */
function codeLabel(analysis: Analysis, code: number): string {
  const name = analysis.eventDefinitions[code]?.name;
  return name ? `Cód. ${code} · ${name}` : `Cód. ${code}`;
}

/**
 * Constrói a matriz de blocos. A origem do eixo de tempo é o primeiro evento
 * (mesma convenção de `computeStats`, que mede a duração como last - first).
 * O último bloco parcial é descartado para não enviesar contagens e taxas.
 */
export function buildBinnedDataset(
  analysis: Analysis,
  binSeconds: number,
): BinnedDataset {
  const codes = Array.from(new Set(analysis.events.map((e) => e.code))).sort((a, b) => a - b);

  const variables: VariableDef[] = [
    { id: VAR_BLOCK, label: 'Bloco (índice 1..N)', kind: 'index' },
    { id: VAR_TIME, label: 'Tempo do início do bloco (s)', kind: 'time' },
    { id: VAR_TOTAL, label: 'Total de eventos no bloco', kind: 'count' },
  ];
  for (const code of codes) {
    const base = codeLabel(analysis, code);
    variables.push({ id: `n_${code}`, label: `${base} — contagem`, kind: 'count', code });
    variables.push({ id: `taxa_${code}`, label: `${base} — taxa (/min)`, kind: 'rate', code });
    variables.push({ id: `irt_${code}`, label: `${base} — intervalo médio (s)`, kind: 'irt', code });
  }

  const empty: BinnedDataset = {
    variables,
    rows: [],
    binSeconds,
    droppedPartialBin: false,
  };

  if (!Number.isFinite(binSeconds) || binSeconds <= 0) return empty;
  if (analysis.events.length === 0) return empty;

  const times = analysis.events.map((e) => e.time);
  const t0 = Math.min(...times);
  const tEnd = Math.max(...times);
  const span = tEnd - t0;
  const binCount = Math.floor(span / binSeconds);
  if (binCount < 1) return empty;

  const droppedPartialBin = span > binCount * binSeconds;
  const minutes = binSeconds / 60;

  // Cada bloco acumula contagens por code e os timestamps para o intervalo médio.
  const counts: Map<number, number>[] = [];
  const firstLast: Map<number, { first: number; last: number }>[] = [];
  const totals = new Array<number>(binCount).fill(0);
  for (let i = 0; i < binCount; i++) {
    counts.push(new Map());
    firstLast.push(new Map());
  }

  for (const ev of analysis.events) {
    const idx = Math.floor((ev.time - t0) / binSeconds);
    if (idx < 0 || idx >= binCount) continue; // bloco parcial final
    counts[idx].set(ev.code, (counts[idx].get(ev.code) ?? 0) + 1);
    const fl = firstLast[idx].get(ev.code);
    if (!fl) firstLast[idx].set(ev.code, { first: ev.time, last: ev.time });
    else {
      if (ev.time < fl.first) fl.first = ev.time;
      if (ev.time > fl.last) fl.last = ev.time;
    }
    totals[idx] += 1;
  }

  const rows: Record<string, number>[] = [];
  for (let i = 0; i < binCount; i++) {
    const row: Record<string, number> = {
      [VAR_BLOCK]: i + 1,
      [VAR_TIME]: i * binSeconds,
      [VAR_TOTAL]: totals[i],
    };
    for (const code of codes) {
      const n = counts[i].get(code) ?? 0;
      row[`n_${code}`] = n;
      row[`taxa_${code}`] = n / minutes;
      // Intervalo médio entre ocorrências consecutivas do code DENTRO do bloco:
      // (último - primeiro) / (n - 1). Indefinido com menos de 2 ocorrências.
      const fl = firstLast[i].get(code);
      row[`irt_${code}`] = n >= 2 && fl ? (fl.last - fl.first) / (n - 1) : NaN;
    }
    rows.push(row);
  }

  return { variables, rows, binSeconds, droppedPartialBin };
}

export interface RegressionInput {
  y: number[];
  /** Formato coluna: X[j][i] = valor do preditor j na observação i. */
  X: number[][];
  labels: string[];
  ids: string[];
  /** Linhas descartadas por conterem valor indefinido nas variáveis escolhidas. */
  droppedRows: number;
}

/**
 * Extrai y e X do dataset, com exclusão listwise: qualquer linha com valor não
 * finito em alguma das variáveis escolhidas é descartada (acontece com `irt_*`
 * em blocos com menos de 2 ocorrências do code).
 */
export function prepareRegressionInput(
  dataset: BinnedDataset,
  yVariable: string,
  xVariables: string[],
): RegressionInput {
  const byId = new Map(dataset.variables.map((v) => [v.id, v]));
  const labels = xVariables.map((id) => byId.get(id)?.label ?? id);

  const y: number[] = [];
  const X: number[][] = xVariables.map(() => []);
  let droppedRows = 0;

  for (const row of dataset.rows) {
    const yv = row[yVariable];
    const xs = xVariables.map((id) => row[id]);
    if (!Number.isFinite(yv) || xs.some((v) => !Number.isFinite(v))) {
      droppedRows += 1;
      continue;
    }
    y.push(yv);
    xs.forEach((v, j) => X[j].push(v));
  }

  return { y, X, labels, ids: xVariables, droppedRows };
}
