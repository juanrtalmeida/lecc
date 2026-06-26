/**
 * Regressão linear simples (mínimos quadrados). Não usa bibliotecas externas.
 * Para pontos onde x é numérico e y é numérico.
 *  y = slope*x + intercept
 * Devolve r² para qualidade do ajuste.
 */

export interface LinearFit {
  slope: number;
  intercept: number;
  /** Coeficiente de determinação: 1 = perfeito, 0 = sem correlação. Negativo = pior que constante. */
  r2: number;
  /** Coeficiente de correlação de Pearson, em [-1, 1]. */
  r: number;
  /** Quantidade de pontos efetivamente usados. */
  n: number;
}

export function linearFit(
  points: ReadonlyArray<{ x: number; y: number }>,
): LinearFit {
  const n = points.length;
  if (n < 2) return { slope: NaN, intercept: NaN, r2: NaN, r: NaN, n };
  let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
  for (const p of points) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
    sx += p.x;
    sy += p.y;
    sxx += p.x * p.x;
    syy += p.y * p.y;
    sxy += p.x * p.y;
  }
  const m = n;
  const numSlope = m * sxy - sx * sy;
  const denSlope = m * sxx - sx * sx;
  if (denSlope === 0) return { slope: NaN, intercept: NaN, r2: NaN, r: NaN, n };
  const slope = numSlope / denSlope;
  const intercept = (sy - slope * sx) / m;
  const ssTot = syy - (sy * sy) / m;
  const ssRes = syy - intercept * sy - slope * sxy;
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;
  const r = ssTot === 0 ? NaN : (m * sxy - sx * sy) / Math.sqrt(denSlope * (m * syy - sy * sy));
  return { slope, intercept, r2, r, n };
}

export interface PredictionPoint {
  x: number;
  yTrend: number;
  yLower?: number;
  yUpper?: number;
}

export function predictLine(
  fit: LinearFit,
  xValues: number[],
  residualStd?: number,
): PredictionPoint[] {
  return xValues.map((x) => {
    const yTrend = fit.slope * x + fit.intercept;
    if (residualStd == null || !Number.isFinite(residualStd)) return { x, yTrend };
    return {
      x,
      yTrend,
      yLower: yTrend - residualStd,
      yUpper: yTrend + residualStd,
    };
  });
}

/** Erro padrão residual = raiz(soma((y - ypred)^2) / (n-2)) */
export function residualStd(fit: LinearFit, points: ReadonlyArray<{ x: number; y: number }>): number {
  if (points.length < 2) return NaN;
  let ss = 0;
  for (const p of points) {
    const yp = fit.slope * p.x + fit.intercept;
    ss += (p.y - yp) ** 2;
  }
  return Math.sqrt(ss / (points.length - 2));
}
