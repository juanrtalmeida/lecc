/**
 * Resolução de um RegressionModel salvo contra os eventos correntes.
 * Faz a ponte entre o modelo persistido (ids de variáveis + tamanho do bloco)
 * e o motor OLS, no mesmo espírito de `resolveCustomAnalysis`.
 */

import type { Analysis, RegressionModel, RegressionSummary } from '@/types';
import { buildBinnedDataset, prepareRegressionInput } from './dataset';
import { fitOls } from './regression';
import { sliceAnalysis } from './sessions';

/** Calcula o resumo do modelo sobre a análise dada (já fatiada ou não). */
export function resolveRegression(
  analysis: Analysis,
  model: RegressionModel,
): RegressionSummary {
  const scoped = sliceAnalysis(analysis, model.session);
  const dataset = buildBinnedDataset(scoped, model.binSeconds);

  if (dataset.rows.length === 0) {
    return {
      ok: false,
      reason:
        'Nenhum bloco completo com este tamanho — a sessão é mais curta que um bloco. ' +
        'Reduza o tamanho do bloco.',
      droppedRows: 0,
    };
  }

  const known = new Set(dataset.variables.map((v) => v.id));
  const missing = [model.yVariable, ...model.xVariables].filter((id) => !known.has(id));
  if (missing.length > 0) {
    return {
      ok: false,
      reason: `Variáveis indisponíveis nesta sessão: ${missing.join(', ')}.`,
      droppedRows: 0,
    };
  }

  const input = prepareRegressionInput(dataset, model.yVariable, model.xVariables);
  const fit = fitOls(input.y, input.X, input.labels, input.ids);

  if (!fit.ok) {
    return { ok: false, reason: fit.reason, droppedRows: input.droppedRows };
  }

  return {
    ok: true,
    coefficients: fit.coefficients,
    n: fit.n,
    k: fit.k,
    r2: fit.r2,
    adjR2: fit.adjR2,
    residualStdError: fit.residualStdError,
    f: fit.f,
    fPValue: fit.fPValue,
    droppedRows: input.droppedRows,
  };
}

/** Recalcula TODOS os modelos salvos e injeta o result cacheado. */
export function recomputeAllRegressions(analysis: Analysis): Analysis {
  const models = analysis.regressions;
  if (!models || models.length === 0) return analysis;
  return {
    ...analysis,
    regressions: models.map((m) => ({ ...m, result: resolveRegression(analysis, m) })),
  };
}
