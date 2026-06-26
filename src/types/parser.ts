/**
 * Tipos do parser — output bruto da leitura do arquivo MED-PC.
 */

export interface ParsedFile {
  /** Pares chave/valor do cabeçalho (qualquer campo encontrado, não só os pré-definidos). */
  header: Record<string, string>;
  /** Seções A:, B:, C:... Cada valor contém as linhas exatamente como estavam no arquivo. */
  sections: Record<string, string[]>;
}

export interface RawEvent {
  /** O original do arquivo, ex.: "1644.110" */
  raw: string;
  /** Inteiro "antes do ponto" — timestamp em décimos de segundo (1644 → 1644). */
  timestamp: number;
  /** Tempo em segundos: timestamp / 100 (1644 / 100 = 16.44). */
  time: number;
  /** Código após o ponto — inteiro (110). */
  code: number;
  /** Seção MED-PC de onde veio: "A", "B", "C", "D"…
   *  Cada seção é um array/sessão independente. */
  section: string;
}
