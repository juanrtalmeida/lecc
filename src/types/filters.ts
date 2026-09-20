/**
 * Filtros aplicados sobre a sessão já selecionada (ver `sliceAnalysis`).
 *
 * São dois eixos independentes:
 *  - **isolamento**: quais códigos de evento interessam (timeline mostra só eles);
 *  - **janela de tempo**: um recorte `[windowStart, windowEnd]` em segundos contados
 *    a partir do primeiro evento da sessão — é o "de 3min até 15min" do usuário.
 *
 * `countMode` decide o que a listagem/estatística enxerga: apenas os códigos
 * isolados ou todos os eventos que caem dentro da janela.
 */

/** Como a listagem/estatística contabiliza os eventos fora do isolamento. */
export type CountMode = 'isolated' | 'all';

export interface EventFilter {
  /** Códigos isolados. `null` = sem isolamento (todos os códigos entram). */
  codes: number[] | null;
  /** Início da janela, em segundos a partir do primeiro evento da sessão. */
  windowStart: number;
  /** Fim da janela, em segundos a partir do primeiro evento da sessão. */
  windowEnd: number;
  countMode: CountMode;
}

export const COUNT_MODE_LABEL: Record<CountMode, string> = {
  isolated: 'Somente os isolados',
  all: 'Todos os eventos da janela',
};
