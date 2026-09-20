export {
  computeStats,
  groupEventsByCode,
  sumCounted,
  categoriesInUse,
} from './stats';
export {
  mean,
  median,
  min,
  max,
  sum,
  count,
  meanInterval,
  stdev,
  applyOperation,
} from './statsFunctions';
export { resolveCustomAnalysis, recomputeAllCustom } from './customAnalysis';
export {
  listSessions,
  selectEvents,
  summarizeSessions,
  sliceAnalysis,
  type SessionMeta,
} from './sessions';
export {
  fitOls,
  linePoints,
  INTERCEPT_ID,
  type CoefficientStat,
  type OlsFit,
  type OlsFailure,
  type OlsResult,
} from './regression';
export {
  buildBinnedDataset,
  prepareRegressionInput,
  VAR_BLOCK,
  VAR_TIME,
  VAR_TOTAL,
  type BinnedDataset,
  type VariableDef,
  type VariableKind,
  type RegressionInput,
} from './dataset';
export { resolveRegression, recomputeAllRegressions } from './regressionModel';
export {
  studentTTwoTailedP,
  fUpperTailP,
  tCritical,
  incompleteBeta,
} from './distributions';

export {
  sessionBounds,
  defaultFilter,
  clampFilter,
  hasCodeFilter,
  isFullWindow,
  isNeutralFilter,
  isolatedCodeSet,
  filterEvents,
  applyFilter,
  listCodeOptions,
  describeFilter,
  type TimeBounds,
  type CodeOption,
} from './filters';

export {
  customCategoriesOf,
  analysisCategories,
  analysisCategoryMap,
  categoryOfCode,
  categoryNameOfCode,
  categoriesWithEvents,
  addCustomCategory,
  removeCustomCategory,
  renameCustomCategory,
  codesPerCategory,
} from './categories';
