/**
 * Motor de mínimos quadrados ordinários (OLS) — regressão linear simples e múltipla.
 * Não usa bibliotecas externas.
 *
 *   y = β0 + β1·x1 + … + βk·xk + ε
 *
 * A regressão simples é apenas o caso k = 1 do mesmo motor — não existe caminho
 * de código separado para ela.
 */

import { fUpperTailP, studentTTwoTailedP, tCritical } from './distributions';

export interface CoefficientStat {
  /** Id da variável ("n_110") ou INTERCEPT_ID para o intercepto. */
  name: string;
  /** Rótulo legível, exibido na tabela. */
  label: string;
  beta: number;
  stdError: number;
  t: number;
  pValue: number;
  /** Limites do intervalo de confiança de 95%. */
  ciLow: number;
  ciHigh: number;
}

export const INTERCEPT_ID = '(intercepto)';

export interface OlsFit {
  ok: true;
  /** coefficients[0] é sempre o intercepto. */
  coefficients: CoefficientStat[];
  /** Observações efetivamente usadas. */
  n: number;
  /** Número de preditores (sem contar o intercepto). */
  k: number;
  r2: number;
  adjR2: number;
  /** Erro padrão residual: raiz(SSR / (n - k - 1)). */
  residualStdError: number;
  /** Estatística F do modelo, com df1 = k e df2 = n - k - 1. */
  f: number;
  fPValue: number;
  fitted: number[];
  residuals: number[];
}

export interface OlsFailure {
  ok: false;
  reason: string;
}

export type OlsResult = OlsFit | OlsFailure;

/**
 * Resolve A·B = I por Gauss-Jordan com pivoteamento parcial, devolvendo A⁻¹.
 * `null` quando a matriz é (numericamente) singular.
 */
function invertMatrix(a: number[][]): number[][] | null {
  const n = a.length;
  // Cópia aumentada [A | I].
  const m = a.map((row, i) => [
    ...row,
    ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  ]);

  // Escala de referência para decidir o que é "pivô zero" sem depender da
  // magnitude absoluta dos dados (contagens vs. tempos em segundos).
  let scale = 0;
  for (const row of a) for (const v of row) scale = Math.max(scale, Math.abs(v));
  const tol = Math.max(scale, 1) * n * Number.EPSILON * 16;

  for (let col = 0; col < n; col++) {
    let pivotRow = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(m[r][col]) > Math.abs(m[pivotRow][col])) pivotRow = r;
    }
    if (Math.abs(m[pivotRow][col]) <= tol) return null;
    if (pivotRow !== col) {
      const tmp = m[pivotRow];
      m[pivotRow] = m[col];
      m[col] = tmp;
    }
    const pivot = m[col][col];
    for (let j = 0; j < 2 * n; j++) m[col][j] /= pivot;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = m[r][col];
      if (factor === 0) continue;
      for (let j = 0; j < 2 * n; j++) m[r][j] -= factor * m[col][j];
    }
  }

  return m.map((row) => row.slice(n));
}

/**
 * Ajusta y ~ 1 + X por mínimos quadrados.
 *
 * @param y      vetor resposta (comprimento n)
 * @param X      preditores em formato coluna: X[j][i] = valor do preditor j na obs. i
 * @param labels rótulos legíveis dos preditores (mesma ordem de X)
 * @param ids    ids das variáveis (mesma ordem de X); default = labels
 */
export function fitOls(
  y: number[],
  X: number[][],
  labels: string[],
  ids: string[] = labels,
): OlsResult {
  const n = y.length;
  const k = X.length;

  if (k === 0) return { ok: false, reason: 'Selecione pelo menos um preditor (X).' };
  if (X.some((col) => col.length !== n)) {
    return { ok: false, reason: 'Preditores e resposta têm tamanhos diferentes.' };
  }
  if (n <= k + 1) {
    return {
      ok: false,
      reason: `Poucas observações para o número de preditores (n=${n}, k=${k}). ` +
        `São necessárias pelo menos ${k + 2} — reduza o tamanho do bloco ou os preditores.`,
    };
  }
  if (y.some((v) => !Number.isFinite(v)) || X.some((col) => col.some((v) => !Number.isFinite(v)))) {
    return { ok: false, reason: 'Há valores inválidos (NaN/∞) entre as observações.' };
  }

  const p = k + 1; // colunas do design (intercepto + preditores)
  const design = (i: number, j: number) => (j === 0 ? 1 : X[j - 1][i]);

  // XᵀX e Xᵀy.
  const xtx: number[][] = Array.from({ length: p }, () => new Array<number>(p).fill(0));
  const xty = new Array<number>(p).fill(0);
  for (let i = 0; i < n; i++) {
    for (let a = 0; a < p; a++) {
      const va = design(i, a);
      xty[a] += va * y[i];
      for (let b = a; b < p; b++) xtx[a][b] += va * design(i, b);
    }
  }
  for (let a = 0; a < p; a++) for (let b = 0; b < a; b++) xtx[a][b] = xtx[b][a];

  const inv = invertMatrix(xtx);
  if (!inv) {
    return {
      ok: false,
      reason:
        'Preditores colineares (matriz singular) — algum X é combinação linear ' +
        'de outro, ou é constante. Remova uma das variáveis.',
    };
  }

  const beta = new Array<number>(p).fill(0);
  for (let a = 0; a < p; a++) {
    let s = 0;
    for (let b = 0; b < p; b++) s += inv[a][b] * xty[b];
    beta[a] = s;
  }

  const fitted = new Array<number>(n);
  const residuals = new Array<number>(n);
  let ssr = 0;
  for (let i = 0; i < n; i++) {
    let yh = 0;
    for (let a = 0; a < p; a++) yh += beta[a] * design(i, a);
    fitted[i] = yh;
    residuals[i] = y[i] - yh;
    ssr += residuals[i] * residuals[i];
  }

  const meanY = y.reduce((a, b) => a + b, 0) / n;
  const sst = y.reduce((acc, v) => acc + (v - meanY) ** 2, 0);
  if (sst === 0) {
    return { ok: false, reason: 'A variável dependente (Y) é constante — não há variação a explicar.' };
  }

  const df = n - p; // n - k - 1
  const sigma2 = ssr / df;
  const residualStdError = Math.sqrt(sigma2);
  const r2 = 1 - ssr / sst;
  const adjR2 = 1 - ((1 - r2) * (n - 1)) / df;
  const f = ((sst - ssr) / k) / sigma2;
  const fPValue = fUpperTailP(f, k, df);
  const tCrit = tCritical(df, 0.05);

  const coefficients: CoefficientStat[] = beta.map((b, a) => {
    const stdError = Math.sqrt(Math.max(0, sigma2 * inv[a][a]));
    const t = stdError > 0 ? b / stdError : NaN;
    return {
      name: a === 0 ? INTERCEPT_ID : ids[a - 1],
      label: a === 0 ? INTERCEPT_ID : labels[a - 1],
      beta: b,
      stdError,
      t,
      pValue: studentTTwoTailedP(t, df),
      ciLow: b - tCrit * stdError,
      ciHigh: b + tCrit * stdError,
    };
  });

  return {
    ok: true,
    coefficients,
    n,
    k,
    r2,
    adjR2,
    residualStdError,
    f,
    fPValue,
    fitted,
    residuals,
  };
}

/** Pontos da reta ajustada, para o gráfico do caso com 1 preditor. */
export function linePoints(
  intercept: number,
  slope: number,
  xValues: number[],
  steps = 12,
): { x: number; y: number }[] {
  const finite = xValues.filter((v) => Number.isFinite(v));
  if (finite.length < 2) return [];
  const minX = Math.min(...finite);
  const maxX = Math.max(...finite);
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i <= steps; i++) {
    const x = minX + ((maxX - minX) * i) / steps;
    out.push({ x, y: intercept + slope * x });
  }
  return out;
}
