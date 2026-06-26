import type { ParsedFile, RawEvent } from '@/types';

/**
 * Parser MED-PC.
 *
 * Formato aceito (visto em arquivos reais do MED-PC IV):
 *
 *   Start Date: 10/02/25
 *   Subject: R12
 *   ...
 *   E:       0.000       <- variáveis escalares (chave: valor), também caem no header
 *   F:       0.000
 *   ...
 *   Z:       0.000
 *   A:                     <- início de seção (sem valor na linha)
 *        0:        2.000        0.000   180000.000       60.000        0.000
 *        5:      300.000        0.000      118.000      200.000        2.000
 *      ...
 *   B:
 *      ...
 *
 * - Linhas no formato "Chave: Valor" antes da primeira seção viram `header`.
 * - Variáveis escalares (`E: 0.000`) também caem no header (são tratadas pelo mesmo regex).
 * - "A:" sozinho (sem valor depois) abre a seção A.
 * - Linhas dentro de uma seção têm o formato "<offset_decimal>: v1 v2 v3 ...".
 *   O `offset` (em décimos de segundo) é informativo — usado para validar ordem, mas
 *   os eventos reais vêm dos valores `ts.code` reconhecidos.
 * - Cada valor que casa ^\d+\.\d+$ vira um RawEvent { timestamp, time=ts/100, code }.
 * - Eventos com `code === 0` (ex.: 2.000) ficam no array — o usuário decide depois
 *   se ignora ou não (chamamos isso de "filtragem opcional" na tela de identificação).
 *
 * Especificações:
 *  - Aceita CRLF e LF.
 *  - Comentários //… são ignorados em qualquer lugar.
 *  - Cabeçalho é case-preserving nas chaves.
 *  - Listas de header desconhecidas (MSN, Group, Box) são guardadas como pares chave/valor.
 */

// "Chave: Valor" — chave pode ter letras, dígitos, espaço, barra, etc.
const HEADER_LINE_RE = /^([A-Za-z][A-Za-z0-9 _\/#().-]{0,40})\s*:\s*(.*)$/;

// "A:" sozinho com whitespace, sem valor depois — abre seção.
const SECTION_HEAD_RE = /^([A-Za-z])\s*:\s*$/;

// "      5:      300.000        0.000      118.000      200.000        2.000"
// Captura o offset (inteiro em décimos) e o "resto" (valores separados por whitespace).
const SECTION_DATA_LINE_RE = /^\s*(\d+)\s*:\s*(.+?)\s*$/;

// Aceita tanto "." quanto "," como separador decimal. Não aceita valores negativos.
// Eventos como "1644.110" → timestamp=1644, code=110.

export function parseMedPc(input: string): ParsedFile {
  const normalized = input.replace(/\r\n?/g, '\n');
  const lines = normalized.split('\n').map((l) => l.trimEnd());

  const header: Record<string, string> = {};
  const sections: Record<string, string[]> = {};

  let currentSection: string | null = null;
  let foundFirstSection = false;

  for (const rawLine of lines) {
    const line = rawLine;
    const trimmed = line.trim();
    if (trimmed === '') {
      if (currentSection) sections[currentSection].push('');
      continue;
    }
    if (trimmed.startsWith('//')) continue;

    // Cabeçalho de seção "X:" (sem valor).
    const sectionMatch = SECTION_HEAD_RE.exec(line);
    if (sectionMatch) {
      const name = sectionMatch[1].toUpperCase();
      currentSection = name;
      foundFirstSection = true;
      if (!sections[name]) sections[name] = [];
      continue;
    }

    if (!foundFirstSection) {
      // Ainda estamos no header (pré-seção). "Chave: Valor".
      const headerMatch = HEADER_LINE_RE.exec(line);
      if (headerMatch) {
        // Ignorar chave que WOULD ser confundida com seção solta.
        const key = headerMatch[1].trim();
        const value = headerMatch[2].trim();
        if (value === '') {
          // "X:" sozinho antes de qualquer seção a seguir — interpreta como seção.
          // (cobre o caso onde a primeira linha do arquivo já é uma seção).
          currentSection = key.toUpperCase();
          foundFirstSection = true;
          if (!sections[currentSection]) sections[currentSection] = [];
        } else {
          header[key] = value;
        }
        continue;
      }
      // Linha não reconhecida antes da 1ª seção: descarta.
      continue;
    }

    // Dentro de seção: preserva a linha + tenta casar conteúdo.
    if (currentSection) {
      sections[currentSection].push(line);
    }
  }

  // Limpa linhas vazias ao final de cada seção.
  for (const k of Object.keys(sections)) {
    const arr = sections[k];
    while (arr.length && arr[arr.length - 1] === '') arr.pop();
  }

  return { header, sections };
}

/**
 * Extrai todos os eventos numéricos de TODAS as seções.
 * Cada valor que casa ^\d+\.\d+$ vira RawEvent. Ordena por timestamp ascendente.
 *
 * Para depuração / UI, se você quiser ver também as linhas de "offset + valores" brutas,
 * use `parsed.sections[name]` direto.
 */
export function extractEvents(parsed: ParsedFile): RawEvent[] {
  const events: RawEvent[] = [];

  for (const [sectionName, lines] of Object.entries(parsed.sections)) {
    for (const line of lines) {
      // Linha no formato "offset: v1 v2 ...".
      const dataMatch = SECTION_DATA_LINE_RE.exec(line);
      if (dataMatch) {
        const valuesStr = dataMatch[2];
        const values = valuesStr.split(/\s+/);
        for (const v of values) {
          const ev = parseValue(v);
          if (ev) events.push({ ...ev, section: sectionName });
        }
        continue;
      }
      // Linha com um único valor (mais raro, mas toleramos).
      const ev = parseValue(line.trim());
      if (ev) events.push({ ...ev, section: sectionName });
    }
  }

  events.sort((a, b) => {
    if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
    // Empate de timestamp: ordena alfabeticamente pela seção (mantém estabilidade).
    return a.section.localeCompare(b.section);
  });
  return events;
}

function parseValue(token: string): RawEvent | null {
  const trimmed = token.trim();
  if (!trimmed) return null;
  const m = /^(\d+)[.,](\d+)$/.exec(trimmed);
  if (!m) return null;
  const timestamp = Number.parseInt(m[1], 10);
  const code = Number.parseInt(m[2], 10);
  if (!Number.isFinite(timestamp) || !Number.isFinite(code)) return null;
  return {
    raw: trimmed,
    timestamp,
    time: timestamp / 100,
    code,
    // section será sobrescrito pelo caller
    section: '',
  };
}

/**
 * Atalho: faz parse + extração em uma chamada.
 */
export function parseAndExtract(input: string): {
  parsed: ParsedFile;
  events: RawEvent[];
} {
  const parsed = parseMedPc(input);
  const events = extractEvents(parsed);
  return { parsed, events };
}
