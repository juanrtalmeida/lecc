import type { Analysis } from '@/types';
import { readKey, writeKey, removeKey, listKeys } from './localStorage';
import { uuid } from '@/utils';

const INDEX_KEY = 'analyses:index'; // string[] (apenas ids)
const ANALYSIS_KEY = (id: string) => `analyses:item:${id}`;

function readIndex(): string[] {
  return readKey<string[]>(INDEX_KEY) ?? [];
}

function writeIndex(ids: string[]): void {
  writeKey(INDEX_KEY, ids);
}

/**
 * Lista todas as análises (apenas metadados — sem events[] — para a home leve).
 * Para o full payload usamos getAnalysis().
 */
export interface AnalysisListItem {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  experiment?: string;
  subject?: string;
  date?: string;
  startTime?: string;
  durationSeconds?: number;
  eventCount?: number;
}

export function listAnalyses(): AnalysisListItem[] {
  const ids = readIndex();
  const items: AnalysisListItem[] = [];
  for (const id of ids) {
    const full = readKey<Analysis>(ANALYSIS_KEY(id));
    if (!full) {
      // Item órfão (foi excluído direto do storage). Pula silenciosamente.
      continue;
    }
    items.push(summarize(full));
  }
  // Mais recentes primeiro.
  items.sort((a, b) => (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt));
  return items;
}

export function getAnalysis(id: string): Analysis | undefined {
  return readKey<Analysis>(ANALYSIS_KEY(id));
}

export function saveAnalysis(analysis: Analysis): void {
  writeKey(ANALYSIS_KEY(analysis.id), analysis);
  const ids = readIndex();
  if (!ids.includes(analysis.id)) {
    ids.push(analysis.id);
    writeIndex(ids);
  }
}

export function deleteAnalysis(id: string): void {
  removeKey(ANALYSIS_KEY(id));
  const ids = readIndex().filter((x) => x !== id);
  writeIndex(ids);
}

export function renameAnalysis(id: string, newName: string): void {
  const a = getAnalysis(id);
  if (!a) return;
  const updated: Analysis = {
    ...a,
    name: newName,
    updatedAt: new Date().toISOString(),
  };
  saveAnalysis(updated);
}

function summarize(a: Analysis): AnalysisListItem {
  const startEv = a.events[0]?.time;
  const endEv = a.events[a.events.length - 1]?.time;
  const dur = startEv !== undefined && endEv !== undefined ? Math.max(0, endEv - startEv) : undefined;
  return {
    id: a.id,
    name: a.name,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
    experiment: a.header['Experiment'],
    subject: a.header['Subject'],
    date: a.header['Start Date'],
    startTime: a.header['Start Time'],
    durationSeconds: dur,
    eventCount: a.events.length,
  };
}

/** Cria análise vazia a partir de um cabeçalho/seções já parseadas e eventos extraídos. */
export function createAnalysisFromImport(args: {
  name: string;
  header: Record<string, string>;
  events: import('@/types').RawEvent[];
}): Analysis {
  const now = new Date().toISOString();
  return {
    id: uuid(),
    name: args.name,
    createdAt: now,
    updatedAt: now,
    header: args.header,
    events: args.events,
    eventDefinitions: {},
    customAnalysis: [],
  };
}

/** Limpa TUDO desta app. Útil para um botão "apagar todos os dados" futuramente. */
export function clearAll(): void {
  for (const key of listKeys('analyses:')) {
    removeKey(key);
  }
  removeKey(INDEX_KEY);
}
