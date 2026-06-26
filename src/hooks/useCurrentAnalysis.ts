import { create } from 'zustand';
import type { Analysis, CustomAnalysis, EventDefinition } from '@/types';
import { getAnalysis, saveAnalysis } from '@/storage';
import { recomputeAllCustom } from '@/analysis';

/**
 * Store da análise em edição (a que está aberta no momento).
 * Toda alteração chama persist() no fim para gravar em LocalStorage
 * e reescrever o índice da listagem.
 */

interface CurrentState {
  analysis: Analysis | null;
  /** Carrega uma análise existente do disco pelo id. */
  load: (id: string) => void;
  /** Substitui a análise corrente (usado após upload + identificação). */
  setAnalysis: (a: Analysis) => void;
  /** Atualiza uma definição de evento (UI chamará). */
  setEventDefinition: (code: number, def: EventDefinition) => void;
  /** Substitui em massa — útil para a tela de identificação. */
  setEventDefinitions: (defs: Record<number, EventDefinition>) => void;
  upsertCustomAnalysis: (ca: CustomAnalysis) => void;
  removeCustomAnalysis: (id: string) => void;
  renameAnalysis: (name: string) => void;
  reset: () => void;
}

export const useCurrentAnalysis = create<CurrentState>((set, get) => ({
  analysis: null,

  load: (id) => {
    const a = getAnalysis(id);
    set({ analysis: a ?? null });
  },

  setAnalysis: (a) => {
    const withRecomputed = recomputeAllCustom(a);
    saveAnalysis(withRecomputed);
    set({ analysis: withRecomputed });
  },

  setEventDefinition: (code, def) => {
    const a = get().analysis;
    if (!a) return;
    const next: Analysis = {
      ...a,
      eventDefinitions: { ...a.eventDefinitions, [code]: def },
      updatedAt: new Date().toISOString(),
    };
    const recomputed = recomputeAllCustom(next);
    saveAnalysis(recomputed);
    set({ analysis: recomputed });
  },

  setEventDefinitions: (defs) => {
    const a = get().analysis;
    if (!a) return;
    const next: Analysis = {
      ...a,
      eventDefinitions: defs,
      updatedAt: new Date().toISOString(),
    };
    const recomputed = recomputeAllCustom(next);
    saveAnalysis(recomputed);
    set({ analysis: recomputed });
  },

  upsertCustomAnalysis: (ca) => {
    const a = get().analysis;
    if (!a) return;
    const existing = a.customAnalysis.findIndex((x) => x.id === ca.id);
    const list = a.customAnalysis.slice();
    if (existing >= 0) list[existing] = ca;
    else list.push(ca);
    const next: Analysis = {
      ...a,
      customAnalysis: list,
      updatedAt: new Date().toISOString(),
    };
    const recomputed = recomputeAllCustom(next);
    saveAnalysis(recomputed);
    set({ analysis: recomputed });
  },

  removeCustomAnalysis: (id) => {
    const a = get().analysis;
    if (!a) return;
    const next: Analysis = {
      ...a,
      customAnalysis: a.customAnalysis.filter((x) => x.id !== id),
      updatedAt: new Date().toISOString(),
    };
    saveAnalysis(next);
    set({ analysis: next });
  },

  renameAnalysis: (name) => {
    const a = get().analysis;
    if (!a) return;
    const next: Analysis = {
      ...a,
      name,
      updatedAt: new Date().toISOString(),
    };
    saveAnalysis(next);
    set({ analysis: next });
  },

  reset: () => set({ analysis: null }),
}));

/** Hook utilitário: retorna a análise corrente (NUNCA null depois de load). */
export function useAnalysis(): Analysis | null {
  return useCurrentAnalysis((s) => s.analysis);
}
