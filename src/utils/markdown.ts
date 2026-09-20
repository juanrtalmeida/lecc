/**
 * Parser de Markdown mínimo — cobre só o subconjunto usado em `docs/*.md`.
 *
 * Existe para a página /docs renderizar exatamente os mesmos arquivos que ficam
 * no repositório, sem arrastar uma biblioteca de ~40 KB para um app que já é
 * grande. Se um documento precisar de algo que não está aqui, a escolha é
 * reescrever o trecho ou estender este arquivo — nunca manter um segundo texto.
 *
 * Suporta: títulos (#..####), parágrafos, listas ordenadas e não ordenadas,
 * blocos de código cercados, citação, regra horizontal e tabelas GFM.
 * Inline: `código`, **negrito**, *itálico* e [texto](url).
 */

export type InlineToken =
  | { kind: 'text'; value: string }
  | { kind: 'code'; value: string }
  | { kind: 'strong'; value: string }
  | { kind: 'em'; value: string }
  | { kind: 'link'; value: string; href: string };

export type Block =
  | { kind: 'heading'; level: number; text: string; id: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'code'; language: string; value: string }
  | { kind: 'quote'; text: string }
  | { kind: 'table'; header: string[]; rows: string[][] }
  | { kind: 'hr' };

/** Slug estável para âncoras do sumário. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const HEADING_RE = /^(#{1,4})\s+(.*)$/;
const UL_RE = /^[-*]\s+(.*)$/;
const OL_RE = /^\d+[.)]\s+(.*)$/;
const FENCE_RE = /^```\s*(\S*)\s*$/;
const QUOTE_RE = /^>\s?(.*)$/;
const HR_RE = /^(-{3,}|\*{3,}|_{3,})$/;
const TABLE_SEP_RE = /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?$/;

function splitRow(line: string): string[] {
  return line
    .replace(/^\s*\|/, '')
    .replace(/\|\s*$/, '')
    .split('|')
    .map((c) => c.trim());
}

export function parseMarkdown(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === '') {
      i += 1;
      continue;
    }

    // Bloco de código cercado — conteúdo passa cru, sem parsing inline.
    const fence = FENCE_RE.exec(line.trim());
    if (fence) {
      const language = fence[1] ?? '';
      const body: string[] = [];
      i += 1;
      while (i < lines.length && !/^```/.test(lines[i].trim())) {
        body.push(lines[i]);
        i += 1;
      }
      i += 1; // fecha a cerca
      blocks.push({ kind: 'code', language, value: body.join('\n') });
      continue;
    }

    if (HR_RE.test(line.trim())) {
      blocks.push({ kind: 'hr' });
      i += 1;
      continue;
    }

    const heading = HEADING_RE.exec(line);
    if (heading) {
      const text = heading[2].trim();
      blocks.push({
        kind: 'heading',
        level: heading[1].length,
        text,
        id: slugify(text),
      });
      i += 1;
      continue;
    }

    // Tabela: uma linha de cabeçalho seguida da linha separadora.
    if (line.includes('|') && i + 1 < lines.length && TABLE_SEP_RE.test(lines[i + 1].trim())) {
      const header = splitRow(line);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].includes('|') && lines[i].trim() !== '') {
        rows.push(splitRow(lines[i]));
        i += 1;
      }
      blocks.push({ kind: 'table', header, rows });
      continue;
    }

    const quote = QUOTE_RE.exec(line);
    if (quote) {
      const body: string[] = [quote[1]];
      i += 1;
      while (i < lines.length) {
        const next = QUOTE_RE.exec(lines[i]);
        if (!next) break;
        body.push(next[1]);
        i += 1;
      }
      blocks.push({ kind: 'quote', text: body.join(' ').trim() });
      continue;
    }

    const bullet = UL_RE.exec(line);
    const numbered = OL_RE.exec(line);
    if (bullet || numbered) {
      const ordered = numbered != null;
      const items: string[] = [];
      while (i < lines.length) {
        const m = ordered ? OL_RE.exec(lines[i]) : UL_RE.exec(lines[i]);
        if (m) {
          items.push(m[1].trim());
          i += 1;
          continue;
        }
        // Continuação indentada do item anterior.
        if (items.length > 0 && /^\s{2,}\S/.test(lines[i])) {
          items[items.length - 1] += ` ${lines[i].trim()}`;
          i += 1;
          continue;
        }
        break;
      }
      blocks.push({ kind: 'list', ordered, items });
      continue;
    }

    // Parágrafo: acumula até linha vazia ou início de outro bloco.
    const paragraph: string[] = [];
    while (i < lines.length) {
      const cur = lines[i];
      if (
        cur.trim() === '' ||
        HEADING_RE.test(cur) ||
        UL_RE.test(cur) ||
        OL_RE.test(cur) ||
        QUOTE_RE.test(cur) ||
        FENCE_RE.test(cur.trim()) ||
        HR_RE.test(cur.trim())
      ) {
        break;
      }
      paragraph.push(cur.trim());
      i += 1;
    }
    blocks.push({ kind: 'paragraph', text: paragraph.join(' ') });
  }

  return blocks;
}

const INLINE_RE = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;

/** Quebra um trecho em tokens inline, preservando a ordem do texto. */
export function parseInline(text: string): InlineToken[] {
  const out: InlineToken[] = [];
  let last = 0;
  for (const match of text.matchAll(INLINE_RE)) {
    const start = match.index ?? 0;
    if (start > last) out.push({ kind: 'text', value: text.slice(last, start) });
    const raw = match[0];
    if (raw.startsWith('`')) {
      out.push({ kind: 'code', value: raw.slice(1, -1) });
    } else if (raw.startsWith('**')) {
      out.push({ kind: 'strong', value: raw.slice(2, -2) });
    } else if (raw.startsWith('*')) {
      out.push({ kind: 'em', value: raw.slice(1, -1) });
    } else {
      const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(raw);
      if (link) out.push({ kind: 'link', value: link[1], href: link[2] });
      else out.push({ kind: 'text', value: raw });
    }
    last = start + raw.length;
  }
  if (last < text.length) out.push({ kind: 'text', value: text.slice(last) });
  return out;
}

/** Títulos de nível 2 — alimentam o sumário lateral. */
export function tableOfContents(blocks: Block[]): { id: string; text: string }[] {
  return blocks
    .filter((b): b is Extract<Block, { kind: 'heading' }> => b.kind === 'heading')
    .filter((b) => b.level === 2)
    .map((b) => ({ id: b.id, text: b.text }));
}
