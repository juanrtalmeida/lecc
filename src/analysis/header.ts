import type { Analysis } from '@/types';

export type HeaderChangeKind = 'alterado' | 'adicionado' | 'removido';

export interface HeaderChange {
  field: string;
  original?: string;
  current?: string;
  kind: HeaderChangeKind;
}

/**
 * Diferenças entre o cabeçalho lido do arquivo e o atual. Vazio quando nunca
 * foi editado — ou quando a edição voltou tudo ao original.
 */
export function headerChanges(analysis: Analysis): HeaderChange[] {
  const orig = analysis.headerOriginal;
  if (!orig) return [];
  const cur = analysis.header;
  const out: HeaderChange[] = [];
  for (const field of new Set([...Object.keys(orig), ...Object.keys(cur)])) {
    const o = orig[field];
    const c = cur[field];
    if (o === c) continue;
    const kind: HeaderChangeKind = o === undefined ? 'adicionado' : c === undefined ? 'removido' : 'alterado';
    out.push({ field, original: o, current: c, kind });
  }
  return out;
}
