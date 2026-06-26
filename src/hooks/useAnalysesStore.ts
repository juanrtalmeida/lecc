import { create } from 'zustand';
import type { Analysis } from '@/types';
import {
  deleteAnalysis as repoDelete,
  getAnalysis,
  listAnalyses,
  renameAnalysis as repoRename,
  saveAnalysis as repoSave,
} from '@/storage';
import { recomputeAllCustom } from '@/analysis';

/**
 * Store global: índice leve de análises + ações de mutação.
 * A análise carregada no momento vive em currentAnalysisStore.
 */

interface AnalysesState {
  items: ReturnType<typeof listAnalyses>;
  refresh: () => void;
  importNew: (analysis: Analysis) => void;
  remove: (id: string) => void;
  rename: (id: string, newName: string) => void;
  /** Atualiza uma análise existente em disco e atualiza o índice. */
  update: (analysis: Analysis) => void;
  /** Reotimiza as análises customizadas (após mexer em categorias). */
  recomputeCustomAll: (id: string) => void;
}

export const useAnalysesStore = create<AnalysesState>((set) => ({
  items: listAnalyses(),
  refresh: () => set({ items: listAnalyses() }),
  importNew: (a) => {
    repoSave(a);
    set({ items: listAnalyses() });
  },
  remove: (id) => {
    repoDelete(id);
    set({ items: listAnalyses() });
  },
  rename: (id, newName) => {
    repoRename(id, newName);
    set({ items: listAnalyses() });
  },
  update: (a) => {
    const updated = recomputeAllCustom(a);
    repoSave(updated);
    set({ items: listAnalyses() });
  },
  recomputeCustomAll: (id) => {
    const a = getAnalysis(id);
    if (!a) return;
    const updated = recomputeAllCustom(a);
    repoSave(updated);
    set({ items: listAnalyses() });
  },
}));
