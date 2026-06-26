import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useCurrentAnalysis } from '@/hooks';
import {
  SessionHeader,
  StatsPanel,
  EventsTable,
  Timeline,
  CustomAnalysesPanel,
  ExportPanel,
  EditDefinitionsButton,
  SessionSelector,
  SingleEventAnalysis,
} from '@/components';
import { sliceAnalysis, summarizeSessions } from '@/analysis';

export function AnalysisViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const load = useCurrentAnalysis((s) => s.load);
  const analysis = useCurrentAnalysis((s) => s.analysis);
  const reset = useCurrentAnalysis((s) => s.reset);
  const [highlightIndex, setHighlightIndex] = useState<number | null>(null);
  const [session, setSession] = useState<string | 'ALL'>('ALL');

  useEffect(() => {
    if (id) load(id);
    return () => reset();
  }, [id, load, reset]);

  // Quando mudar de análise, volta para "ALL".
  useEffect(() => {
    setSession('ALL');
    setHighlightIndex(null);
  }, [id]);

  const sessions = useMemo(
    () => (analysis ? summarizeSessions(analysis.events) : []),
    [analysis],
  );

  // Análise filtrada pela sessão escolhida. Tudo (tabela, timeline, stats, custom)
  // consome esta versão.
  const sessionAnalysis = useMemo(() => {
    if (!analysis) return null;
    return sliceAnalysis(analysis, session);
  }, [analysis, session]);

  if (!analysis) {
    return (
      <div className="card p-10 text-center">
        <p className="text-slate-400">Carregando...</p>
        <Link to="/" className="btn-primary mt-4 inline-flex">
          Voltar para a lista
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2 flex-wrap">
        <Link to="/" className="btn-ghost btn">
          ← Análises
        </Link>
        <div className="flex-1" />
        <button
          className="btn"
          onClick={() => {
            const name = window.prompt('Novo nome:', analysis.name);
            if (name != null && name.trim() !== '') {
              useCurrentAnalysis.getState().renameAnalysis(name.trim());
            }
          }}
        >
          Renomear
        </button>
        <EditDefinitionsButton analysis={analysis} />
        <button
          className="btn-danger"
          onClick={() => {
            if (window.confirm(`Excluir "${analysis.name}"? Esta ação é permanente.`)) {
              navigate('/');
            }
          }}
        >
          Excluir
        </button>
      </div>

      <SessionHeader analysis={analysis} />

      {sessions.length > 1 && (
        <SessionSelector
          sessions={sessions}
          total={analysis.events.length}
          selected={session}
          onChange={setSession}
        />
      )}

      {sessionAnalysis && (
        <>
          <StatsPanel analysis={sessionAnalysis} />
          <SingleEventAnalysis
            analysis={sessionAnalysis}
            highlightIndex={highlightIndex}
            onSelectEvent={(i) => setHighlightIndex(i)}
            onClearHighlight={() => setHighlightIndex(null)}
          />
          <EventsTable
            analysis={sessionAnalysis}
            highlightIndex={highlightIndex}
            onSelectEvent={(i) => setHighlightIndex(i === highlightIndex ? null : i)}
          />
          <Timeline
            analysis={sessionAnalysis}
            highlightIndex={highlightIndex}
            onPointClick={(i) => setHighlightIndex(i === highlightIndex ? null : i)}
          />
          <CustomAnalysesPanel analysis={sessionAnalysis} />
          <ExportPanel analysis={sessionAnalysis} />
        </>
      )}
    </div>
  );
}
