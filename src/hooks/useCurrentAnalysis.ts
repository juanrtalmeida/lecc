import { create } from 'zustand';
import type {
  Analysis,
  CustomAnalysis,
  CustomCategory,
  EventDefinition,
  RegressionModel,
} from '@/types';
import { getAnalysis, saveAnalysis } from '@/storage';
import {
  addCustomCategory,
  recomputeAllCustom,
  recomputeAllRegressions,
  removeCustomCategory,
  renameCustomCategory,
} from '@/analysis';

/** Recalcula tudo que é derivado (custom + regressões) antes de persistir. */
function recomputeAll(a: Analysis): Analysis {
  return recomputeAllRegressions(recomputeAllCustom(a));
}

/** Grava uma alteração de categorias — elas mexem nas definições, não nos eventos. */
function persistCategories(
  next: Analysis,
  set: (partial: { analysis: Analysis }) => void,
): void {
  const stamped: Analysis = { ...next, updatedAt: new Date().toISOString() };
  const recomputed = recomputeAll(stamped);
  saveAnalysis(recomputed);
  set({ analysis: recomputed });
}

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
  /**
   * Substitui em massa — útil para a tela de identificação, que também pode
   * devolver categorias criadas ali mesmo.
   */
  setEventDefinitions: (
    defs: Record<number, EventDefinition>,
    customCategories?: CustomCategory[],
  ) => void;
  /** Cria uma categoria customizada (ignora nome duplicado ou canônico). */
  addCategory: (cat: CustomCategory) => void;
  /** Exclui uma categoria customizada; os códigos dela voltam para "Outro". */
  removeCategory: (name: string) => void;
  /** Renomeia uma categoria customizada, arrastando as definições junto. */
  renameCategory: (from: string, to: string) => void;
  upsertCustomAnalysis: (ca: CustomAnalysis) => void;
  removeCustomAnalysis: (id: string) => void;
  upsertRegression: (model: RegressionModel) => void;
  removeRegression: (id: string) => void;
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
    const withRecomputed = recomputeAll(a);
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
    const recomputed = recomputeAll(next);
    saveAnalysis(recomputed);
    set({ analysis: recomputed });
  },

  setEventDefinitions: (defs, customCategories) => {
    const a = get().analysis;
    if (!a) return;
    const next: Analysis = {
      ...a,
      eventDefinitions: defs,
      customCategories: customCategories ?? a.customCategories ?? [],
      updatedAt: new Date().toISOString(),
    };
    const recomputed = recomputeAll(next);
    saveAnalysis(recomputed);
    set({ analysis: recomputed });
  },

  addCategory: (cat) => {
    const a = get().analysis;
    if (!a) return;
    const next = addCustomCategory(a, cat);
    if (next === a) return;
    persistCategories(next, set);
  },

  removeCategory: (name) => {
    const a = get().analysis;
    if (!a) return;
    const next = removeCustomCategory(a, name);
    if (next === a) return;
    persistCategories(next, set);
  },

  renameCategory: (from, to) => {
    const a = get().analysis;
    if (!a) return;
    const next = renameCustomCategory(a, from, to);
    if (next === a) return;
    persistCategories(next, set);
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
    const recomputed = recomputeAll(next);
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

  upsertRegression: (model) => {
    const a = get().analysis;
    if (!a) return;
    const list = (a.regressions ?? []).slice();
    const existing = list.findIndex((x) => x.id === model.id);
    if (existing >= 0) list[existing] = model;
    else list.push(model);
    const next: Analysis = {
      ...a,
      regressions: list,
      updatedAt: new Date().toISOString(),
    };
    const recomputed = recomputeAll(next);
    saveAnalysis(recomputed);
    set({ analysis: recomputed });
  },

  removeRegression: (id) => {
    const a = get().analysis;
    if (!a) return;
    const next: Analysis = {
      ...a,
      regressions: (a.regressions ?? []).filter((x) => x.id !== id),
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
