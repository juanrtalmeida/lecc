export type {
  ParsedFile,
  RawEvent,
} from './parser';

export {
  EVENT_CATEGORIES,
  type EventCategory,
  type EventDefinition,
  type CustomCategory,
  type CategoryInfo,
  DEFAULT_EVENT_DEFINITION,
  CATEGORY_META,
  CATEGORY_SYMBOLS,
  FALLBACK_CATEGORY,
  SUGGESTED_COLORS,
  normalizeCategoryName,
  isCanonicalCategory,
  isCategoryNameTaken,
  buildCategoryList,
  buildCategoryMap,
  resolveCategoryMeta,
} from './categories';

export {
  ANALYSIS_OPERATIONS,
  type AnalysisOperation,
  type Analysis,
  type AnalysisStats,
  type CustomAnalysis,
  type CustomAnalysisResult,
  type EventSelector,
  type DirectionAfter,
  type RegressionModel,
  type RegressionSummary,
  type RegressionCoefficient,
} from './analysis';

export {
  COUNT_MODE_LABEL,
  type CountMode,
  type EventFilter,
} from './filters';
