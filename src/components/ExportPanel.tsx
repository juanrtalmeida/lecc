import { useState } from 'react';
import type { Analysis } from '@/types';
import {
  exportAnalysisJson,
  exportAnalysisXlsx,
  exportEventsCsv,
  triggerDownload,
} from '@/services';

export function ExportPanel({ analysis }: { analysis: Analysis }) {
  const [busy, setBusy] = useState(false);

  const onCsv = () => {
    const csv = exportEventsCsv(analysis);
    triggerDownload(`${safeName(analysis.name)}.csv`, csv, 'text/csv;charset=utf-8');
  };
  const onJson = () => {
    const json = exportAnalysisJson(analysis);
    triggerDownload(
      `${safeName(analysis.name)}.json`,
      json,
      'application/json;charset=utf-8',
    );
  };
  const onXlsx = async () => {
    setBusy(true);
    try {
      const blob = await exportAnalysisXlsx(analysis);
      triggerDownload(
        `${safeName(analysis.name)}.xlsx`,
        blob,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Exportação</h3>
        <span className="text-xs text-slate-500">Baixa para o seu dispositivo</span>
      </div>
      <div className="grid sm:grid-cols-3 gap-2">
        <button className="btn" onClick={onCsv} disabled={analysis.events.length === 0}>
          CSV (eventos)
        </button>
        <button className="btn" onClick={onJson} disabled={analysis.events.length === 0}>
          JSON (análise completa)
        </button>
        <button
          className="btn-primary"
          onClick={onXlsx}
          disabled={busy || analysis.events.length === 0}
        >
          {busy ? 'Gerando…' : 'Excel (.xlsx)'}
        </button>
      </div>
    </div>
  );
}

function safeName(name: string): string {
  return (name || 'medpc-analise').replace(/[^\w\-]+/g, '_').slice(0, 64);
}
