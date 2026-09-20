import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { parseAndExtract } from '@/parser';
import { createAnalysisFromImport } from '@/storage';
import { useAnalysesStore } from '@/hooks';
import { FileDropzone } from '@/components/FileDropzone';
import { EventIdentificationForm } from '@/components/EventIdentificationForm';
import { computeStats } from '@/analysis';
import type { Analysis, RawEvent } from '@/types';
import { tryParseDate } from '@/utils';

type Stage =
  | { kind: 'idle' }
  | { kind: 'parsed'; analysis: Analysis; events: RawEvent[] };

export function NewAnalysisPage() {
  const navigate = useNavigate();
  const importNew = useAnalysesStore((s) => s.importNew);
  const [stage, setStage] = useState<Stage>({ kind: 'idle' });
  const [error, setError] = useState<string | null>(null);

  const onFile = (content: string, filename: string) => {
    setError(null);
    try {
      const { parsed, events } = parseAndExtract(content);
      if (events.length === 0) {
        setError(
          'Não encontrei eventos numéricos no arquivo. Verifique se ele contém linhas no formato 1644.110.',
        );
        return;
      }

      // Nome sugerido: Subject · Experiment · Start Date
      const subject = parsed.header['Subject'] ?? 'Sujeito';
      const exp = parsed.header['Experiment'] ?? 'Experimento';
      const dateStr = parsed.header['Start Date'] ?? '';
      const d = tryParseDate(dateStr);
      const dateLabel = d
        ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        : '';

      const suggestedName = `${subject} · ${exp}${dateLabel ? ` · ${dateLabel}` : ''}`.trim();
      const baseName = suggestedName || filename.replace(/\.[^.]+$/, '');

      const analysis = createAnalysisFromImport({
        name: ensureUnique(baseName),
        header: parsed.header,
        events,
      });

      setStage({ kind: 'parsed', analysis, events });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao parsear o arquivo.');
    }
  };

  function ensureUnique(base: string): string {
    // Garante nome único apenas para evitar sobreposição visual.
    const used = new Set(useAnalysesStore.getState().items.map((i) => i.name));
    let n = base;
    let i = 2;
    while (used.has(n)) {
      n = `${base} (${i++})`;
    }
    return n;
  }

  if (stage.kind === 'parsed') {
    // Tela de identificação (não persistimos até salvar)
    const tempAnalysis: Analysis = stage.analysis;
    const stats = computeStats(tempAnalysis);
    const knownCodes = Object.keys(stats.byCode).map((k) => Number(k)).sort((a, b) => a - b);
    return (
      <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-7rem)]">
        <button
          className="btn-ghost btn mb-3 flex-shrink-0"
          onClick={() => setStage({ kind: 'idle' })}
        >
          ← Trocar arquivo
        </button>
        <div className="flex-1 min-h-0 overflow-y-auto pr-1">
          <EventIdentificationForm
            knownCodes={knownCodes}
            codeStats={stats.byCode}
            initial={tempAnalysis.eventDefinitions}
            initialCategories={tempAnalysis.customCategories ?? []}
            onCancel={() => setStage({ kind: 'idle' })}
            onSave={(defs, cats) => {
              const finalAnalysis: Analysis = {
                ...tempAnalysis,
                eventDefinitions: defs,
                customCategories: cats,
              };
              importNew(finalAnalysis);
              navigate(`/analysis/${finalAnalysis.id}`);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Nova análise</h1>
        <p className="text-slate-500 text-sm">
          1. Selecione o arquivo · 2. Identifique os eventos · 3. Explore a sessão.
        </p>
      </div>
      {error && (
        <div className="card border-red-300 p-3 text-sm text-red-700 bg-red-50">
          {error}
        </div>
      )}
      <FileDropzone onFileContent={onFile} />
      <div className="card p-4 text-sm text-slate-600">
        <h3 className="font-semibold text-slate-900 mb-2">Formato esperado</h3>
        <p className="mb-2">
          Arquivo texto com cabeçalho (campos <code>Chave: Valor</code>) e seções
          nomeadas (A:, B:, C:…). Eventos são linhas como <code>timestamp.code</code>.
        </p>
        <pre className="bg-bg-subtle border border-line rounded-lg p-3 text-xs overflow-x-auto">
{`Start Date: 10/02/25
End Date: 10/02/25
Subject: R12
Experiment: AUTOSHAPING
Box: 4
Start Time: 9:36:59
MSN: AUTOSHAPING

A:
   1644.110
   1645.200
B:
   ...`}
        </pre>
      </div>
    </div>
  );
}
