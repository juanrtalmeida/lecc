import type { EventCategory, EventDefinition } from './categories';

export type { EventCategory } from './categories';
export type { EventDefinition } from './categories';

import type { RawEvent } from './parser';
export type { RawEvent, ParsedFile } from './parser';

/**
 * Análise completa persistida no LocalStorage.
 * Cada arquivo importado gera uma nova análise — eventDefinitions JÁ IDENTIFICADAS
 * pelo usuário naquela sessão, portanto não devem ser reaproveitadas
 * automaticamente entre análises distintas.
 */
export interface Analysis {
  id: string;
  name: string;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  header: Record<string, string>;
  /** Definições indexadas pelo code (number). */
  eventDefinitions: Record<number, EventDefinition>;
  /** Eventos puros, em ordem cronológica. */
  events: RawEvent[];
  /** Análises customizadas que o próprio usuário criar (derivadas). */
  customAnalysis: CustomAnalysis[];
}

/** Estatísticas pré-calculadas para o dashboard. */
export interface AnalysisStats {
  totalEvents: number;
  byCategory: Record<EventCategory, number>;
  durationSeconds: number;
  eventsPerMinute: number;
  byCode: Record<number, { count: number; first: number; last: number }>;
}

// ---------- Análises customizadas ----------

export const ANALYSIS_OPERATIONS = [
  'Média',
  'Mediana',
  'Mínimo',
  'Máximo',
  'Soma',
  'Contagem',
  'Intervalo médio',
  'Desvio padrão',
] as const;

export type AnalysisOperation = (typeof ANALYSIS_OPERATIONS)[number];

/**
 * Tipo de busca do evento destino:
 * - "next": primeiro evento com aquele código DEPOIS do origem
 * - "previous": último evento com aquele código ANTES do origem
 * - "any-before": o mais recente antes
 * - "any-after": o primeiro depois
 *
 * Para "Média de tempo entre Barras e Reforços" o típico é next.
 */
export type DirectionAfter = 'next' | 'previous';

/** Critérios de seleção do evento origem e destino. */
export interface EventSelector {
  /** Listagem de códigos candidatos a este slot. */
  codes: number[];
  /** Nome legível (preenchido pela UI). */
  label?: string;
}

export interface CustomAnalysis {
  id: string;
  name: string;
  /** Evento que dispara a busca. */
  from: EventSelector;
  /** Evento que será medido em relação ao from. */
  to: EventSelector;
  /** Para "from→to": direção temporal em que o "to" é buscado. */
  directionAfter: DirectionAfter;
  operation: AnalysisOperation;
  /** Resultado cacheado (recalculado a cada edição na própria análise). */
  result?: number;
  /** Quantos pares contribuíram para o cálculo. */
  sampleSize?: number;
  createdAt: string;
}

export interface CustomAnalysisResult {
  value: number | null;
  sampleSize: number;
  /** Indica por que está vazio (sem pares, sem eventos, etc.). Sem erro — só contexto. */
  emptyReason?: string;
}
