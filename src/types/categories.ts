/**
 * Categorias que o usuário atribui a cada código de evento.
 * Espelhadas em CATEGORY_META (UI) e EXCLUDED_FROM_INTERVALS (análise).
 */

export const EVENT_CATEGORIES = [
  'Resposta',
  'Reforço',
  'Estímulo',
  'Estado',
  'Outro',
] as const;

export type EventCategory = (typeof EVENT_CATEGORIES)[number];

export interface EventDefinition {
  name: string;
  /** Nome da categoria: uma das canônicas ou uma criada pelo usuário. */
  category: EventCategory | string;
  /** Hex color (ex.: "#60a5fa") usado na timeline/tabela. */
  color: string;
}

/**
 * Categoria criada pelo usuário, guardada junto da análise.
 *
 * O `name` é a chave: é ele que aparece em `EventDefinition.category`. Por isso
 * não pode colidir com uma categoria canônica nem com outra customizada — ver
 * `normalizeCategoryName` / `isCategoryNameTaken`.
 */
export interface CustomCategory {
  name: string;
  /** Hex color usada na lane da timeline, no chip e nos gráficos. */
  color: string;
  /** Glifo curto exibido no chip (1–2 caracteres). */
  symbol: string;
}

/** Metadados resolvidos de uma categoria, canônica ou não. */
export interface CategoryInfo {
  name: string;
  color: string;
  symbol: string;
  /** `true` quando veio de `Analysis.customCategories`. */
  custom: boolean;
}

/** Definição "vazia" — aplicada a códigos recém-descobertos antes de o usuário editar. */
export const DEFAULT_EVENT_DEFINITION: EventDefinition = {
  name: '',
  category: 'Outro',
  color: '#64748b',
};

/** Metadados visuais por categoria (cor padrão, ícone textual, etc.). */
export const CATEGORY_META: Record<
  EventCategory,
  { color: string; symbol: string; labelKey: string }
> = {
  Resposta: { color: '#60a5fa', symbol: '●', labelKey: 'Resposta' },
  Reforço: { color: '#34d399', symbol: '▲', labelKey: 'Reforço' },
  Estímulo: { color: '#f59e0b', symbol: '■', labelKey: 'Estímulo' },
  Estado: { color: '#a78bfa', symbol: '◆', labelKey: 'Estado' },
  Outro: { color: '#94a3b8', symbol: '•', labelKey: 'Outro' },
};

/** Paleta sugerida na UI quando o usuário aperta "sortear cor". */
export const SUGGESTED_COLORS = [
  '#60a5fa',
  '#34d399',
  '#f59e0b',
  '#a78bfa',
  '#f472b6',
  '#22d3ee',
  '#fbbf24',
  '#f87171',
  '#4ade80',
  '#818cf8',
];

/** Glifos oferecidos ao criar uma categoria. */
export const CATEGORY_SYMBOLS = [
  '●', '▲', '■', '◆', '★', '✚', '◉', '⬢', '▮', '✖', '☰', '⌁',
] as const;

/** Usada quando um evento aponta para uma categoria que não existe mais. */
export const FALLBACK_CATEGORY: EventCategory = 'Outro';

/**
 * Normaliza o nome digitado: tira espaços nas pontas e colapsa os internos.
 * O nome é a chave da categoria, então precisa ser estável.
 */
export function normalizeCategoryName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

export function isCanonicalCategory(name: string): name is EventCategory {
  return (EVENT_CATEGORIES as readonly string[]).includes(name);
}

/** Comparação de nomes de categoria — sem diferenciar maiúsculas/acentuação de caixa. */
function sameName(a: string, b: string): boolean {
  return a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }) === 0;
}

/** O nome já está em uso (canônico ou customizado)? `ignore` pula a própria. */
export function isCategoryNameTaken(
  name: string,
  custom: CustomCategory[],
  ignore?: string,
): boolean {
  const n = normalizeCategoryName(name);
  if (n === '') return true;
  if (EVENT_CATEGORIES.some((c) => sameName(c, n))) return true;
  return custom.some((c) => (ignore ? !sameName(c.name, ignore) : true) && sameName(c.name, n));
}

/**
 * Catálogo completo: as canônicas primeiro (ordem fixa, é o gabarito visual da
 * timeline) e depois as customizadas, na ordem em que foram criadas.
 */
export function buildCategoryList(custom: CustomCategory[] = []): CategoryInfo[] {
  const canonical = EVENT_CATEGORIES.map((name) => ({
    name: name as string,
    color: CATEGORY_META[name].color,
    symbol: CATEGORY_META[name].symbol,
    custom: false,
  }));
  const extras = custom
    .filter((c) => !isCanonicalCategory(c.name))
    .map((c) => ({
      name: c.name,
      color: c.color || '#64748b',
      symbol: c.symbol || '◆',
      custom: true,
    }));
  return [...canonical, ...extras];
}

export function buildCategoryMap(
  custom: CustomCategory[] = [],
): Record<string, CategoryInfo> {
  const out: Record<string, CategoryInfo> = {};
  for (const info of buildCategoryList(custom)) out[info.name] = info;
  return out;
}

/**
 * Metadados de uma categoria pelo nome. Categorias órfãs (a definição aponta
 * para uma categoria já excluída) caem em "Outro" — sem quebrar a tela.
 */
export function resolveCategoryMeta(
  name: string | undefined,
  custom: CustomCategory[] = [],
): CategoryInfo {
  const map = buildCategoryMap(custom);
  if (name && map[name]) return map[name];
  return map[FALLBACK_CATEGORY];
}
