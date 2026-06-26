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
  category: EventCategory | string;
  /** Hex color (ex.: "#60a5fa") usado na timeline/tabela. */
  color: string;
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
