/**
 * Resolução de categorias no contexto de uma análise.
 *
 * As cinco categorias canônicas (`EVENT_CATEGORIES`) existem sempre; as demais
 * vivem em `Analysis.customCategories` e são locais àquela análise — do mesmo
 * jeito que as definições de evento, que também não são reaproveitadas entre
 * arquivos importados.
 */

import type { Analysis, CategoryInfo, CustomCategory } from '@/types';
import {
  FALLBACK_CATEGORY,
  buildCategoryList,
  buildCategoryMap,
  isCanonicalCategory,
  normalizeCategoryName,
} from '@/types';

/** Lista de categorias customizadas da análise (nunca `undefined`). */
export function customCategoriesOf(analysis: Analysis): CustomCategory[] {
  return analysis.customCategories ?? [];
}

/** Catálogo da análise: canônicas + customizadas, nessa ordem. */
export function analysisCategories(analysis: Analysis): CategoryInfo[] {
  return buildCategoryList(customCategoriesOf(analysis));
}

export function analysisCategoryMap(analysis: Analysis): Record<string, CategoryInfo> {
  return buildCategoryMap(customCategoriesOf(analysis));
}

/** Categoria de um código, já resolvida (órfã cai em "Outro"). */
export function categoryOfCode(analysis: Analysis, code: number): CategoryInfo {
  const map = analysisCategoryMap(analysis);
  const name = analysis.eventDefinitions[code]?.category;
  return (name ? map[name] : undefined) ?? map[FALLBACK_CATEGORY];
}

/**
 * Nome de categoria efetivo de um código — o que entra em `byCategory`.
 * Códigos sem definição, ou apontando para categoria excluída, viram "Outro".
 */
export function categoryNameOfCode(analysis: Analysis, code: number): string {
  const map = analysisCategoryMap(analysis);
  const name = analysis.eventDefinitions[code]?.category;
  return name && map[name] ? name : FALLBACK_CATEGORY;
}

/** Só as categorias que têm pelo menos um código atribuído nos eventos atuais. */
export function categoriesWithEvents(analysis: Analysis): CategoryInfo[] {
  const used = new Set<string>();
  for (const ev of analysis.events) used.add(categoryNameOfCode(analysis, ev.code));
  return analysisCategories(analysis).filter((c) => used.has(c.name));
}

/**
 * Acrescenta uma categoria customizada. Devolve a análise inalterada quando o
 * nome colide com uma existente — a validação amigável fica na UI.
 */
export function addCustomCategory(analysis: Analysis, cat: CustomCategory): Analysis {
  const name = normalizeCategoryName(cat.name);
  if (name === '' || isCanonicalCategory(name)) return analysis;
  const current = customCategoriesOf(analysis);
  if (current.some((c) => c.name === name)) return analysis;
  return { ...analysis, customCategories: [...current, { ...cat, name }] };
}

/**
 * Remove uma categoria customizada e devolve os códigos que a usavam para
 * "Outro" — assim nenhuma definição fica apontando para o vazio.
 */
export function removeCustomCategory(analysis: Analysis, name: string): Analysis {
  const current = customCategoriesOf(analysis);
  if (!current.some((c) => c.name === name)) return analysis;

  const defs: Analysis['eventDefinitions'] = {};
  for (const [code, def] of Object.entries(analysis.eventDefinitions)) {
    defs[Number(code)] =
      def.category === name ? { ...def, category: FALLBACK_CATEGORY } : def;
  }

  return {
    ...analysis,
    customCategories: current.filter((c) => c.name !== name),
    eventDefinitions: defs,
  };
}

/**
 * Renomeia uma categoria customizada, arrastando junto as definições que a
 * usavam (o nome é a chave — sem isso os códigos ficariam órfãos).
 */
export function renameCustomCategory(
  analysis: Analysis,
  from: string,
  to: string,
): Analysis {
  const name = normalizeCategoryName(to);
  const current = customCategoriesOf(analysis);
  if (name === '' || isCanonicalCategory(name)) return analysis;
  if (!current.some((c) => c.name === from)) return analysis;
  if (current.some((c) => c.name === name)) return analysis;

  const defs: Analysis['eventDefinitions'] = {};
  for (const [code, def] of Object.entries(analysis.eventDefinitions)) {
    defs[Number(code)] = def.category === from ? { ...def, category: name } : def;
  }

  return {
    ...analysis,
    customCategories: current.map((c) => (c.name === from ? { ...c, name } : c)),
    eventDefinitions: defs,
  };
}

/** Quantos códigos usam cada categoria — mostrado ao gerenciar categorias. */
export function codesPerCategory(analysis: Analysis): Record<string, number> {
  const out: Record<string, number> = {};
  for (const info of analysisCategories(analysis)) out[info.name] = 0;
  for (const code of Object.keys(analysis.eventDefinitions)) {
    const name = categoryNameOfCode(analysis, Number(code));
    out[name] = (out[name] ?? 0) + 1;
  }
  return out;
}
