import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useCurrentAnalysis } from '@/hooks';
import {
  SessionHeader,
  StatsPanel,
  EventsTable,
  CustomAnalysesPanel,
  ExportPanel,
  EditDefinitionsButton,
  SessionSelector,
  SingleEventAnalysis,
  RegressionPanel,
  TimelinePanel,
  TransitionMatrix,
} from '@/components';
import {
  analysisCategories,
  applyFilter,
  clampFilter,
  defaultFilter,
  filterEvents,
  isolatedCodeSet,
  listCodeOptions,
  sessionBounds,
  sliceAnalysis,
  summarizeSessions,
} from '@/analysis';
import type { EventFilter, RawEvent } from '@/types';
import type { ReactNode } from 'react';

const SECTIONS = [
  { id: 'recorte', title: 'Recorte' },
  { id: 'visao-geral', title: 'Visão geral' },
  { id: 'eventos', title: 'Eventos' },
  { id: 'tempos', title: 'Tempo entre eventos' },
  { id: 'probabilidades', title: 'Probabilidades' },
  { id: 'regressao', title: 'Regressão' },
  { id: 'exportar', title: 'Exportar' },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

function Section({ id, hint, children }: { id: SectionId; hint?: string; children: ReactNode }) {
  const title = SECTIONS.find((s) => s.id === id)!.title;
  return (
    <section id={id} className="flex flex-col gap-3 scroll-mt-4">
      <div className="border-b border-line pb-1.5">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {hint && <p className="text-sm text-slate-500">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

export function AnalysisViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const load = useCurrentAnalysis((s) => s.load);
  const analysis = useCurrentAnalysis((s) => s.analysis);
  const reset = useCurrentAnalysis((s) => s.reset);
  // O evento destacado é guardado pelo próprio objeto, não pelo índice: a lista
  // muda a cada filtro, e um índice antigo passaria a apontar para outro evento.
  const [selected, setSelected] = useState<RawEvent | null>(null);
  const [session, setSession] = useState<string | 'ALL'>('ALL');
  const [filter, setFilter] = useState<EventFilter | null>(null);

  useEffect(() => {
    if (id) load(id);
    return () => reset();
  }, [id, load, reset]);

  // Quando mudar de análise, volta para "ALL".
  useEffect(() => {
    setSession('ALL');
    setSelected(null);
    setFilter(null);
  }, [id]);

  const sessions = useMemo(
    () => (analysis ? summarizeSessions(analysis.events) : []),
    [analysis],
  );

  // Análise filtrada pela sessão escolhida — base para os filtros de evento.
  const sessionAnalysis = useMemo(() => {
    if (!analysis) return null;
    return sliceAnalysis(analysis, session);
  }, [analysis, session]);

  // Limites de tempo da sessão: a janela do filtro é contada a partir daqui.
  const bounds = useMemo(
    () => sessionBounds(sessionAnalysis?.events ?? []),
    [sessionAnalysis],
  );

  // Filtro efetivo. Enquanto o usuário não mexe em nada, é o neutro da sessão;
  // ao trocar de sessão a janela é reancorada na nova duração.
  const effectiveFilter = useMemo(
    () => (filter ? clampFilter(filter, bounds) : defaultFilter(bounds)),
    [filter, bounds],
  );

  // Reancora a janela quando a duração encolhe ao trocar de sessão.
  useEffect(() => {
    setFilter((f) => (f ? clampFilter(f, bounds) : f));
  }, [bounds]);

  const categories = useMemo(
    () => (sessionAnalysis ? analysisCategories(sessionAnalysis) : []),
    [sessionAnalysis],
  );

  const codeOptions = useMemo(
    () =>
      sessionAnalysis ? listCodeOptions(sessionAnalysis, effectiveFilter, bounds) : [],
    [sessionAnalysis, effectiveFilter, bounds],
  );

  /**
   * Análise que alimenta tabela, cards e análises derivadas. Em `countMode:
   * 'all'` só a janela de tempo é aplicada — os eventos fora do isolamento
   * continuam contando.
   */
  const filteredAnalysis = useMemo(
    () => (sessionAnalysis ? applyFilter(sessionAnalysis, effectiveFilter, bounds) : null),
    [sessionAnalysis, effectiveFilter, bounds],
  );

  /** Códigos isolados — a timeline esconde o resto sem mexer nos índices. */
  const visibleCodes = useMemo(
    () => isolatedCodeSet(effectiveFilter),
    [effectiveFilter],
  );

  // Contagens mostradas no painel de filtros.
  const windowEvents = useMemo(
    () =>
      sessionAnalysis
        ? filterEvents(sessionAnalysis.events, effectiveFilter, bounds, false).length
        : 0,
    [sessionAnalysis, effectiveFilter, bounds],
  );
  const isolatedEvents = useMemo(
    () =>
      sessionAnalysis
        ? filterEvents(sessionAnalysis.events, effectiveFilter, bounds, true).length
        : 0,
    [sessionAnalysis, effectiveFilter, bounds],
  );

  /**
   * Índice do evento destacado dentro da lista filtrada. Sai de cena sozinho
   * quando o evento deixa de estar no recorte atual.
   */
  const highlightIndex = useMemo(() => {
    if (!selected || !filteredAnalysis) return null;
    const i = filteredAnalysis.events.indexOf(selected);
    return i >= 0 ? i : null;
  }, [selected, filteredAnalysis]);

  /** Clicar no evento já destacado desfaz a seleção. */
  const selectByIndex = useCallback(
    (i: number) => {
      const ev = filteredAnalysis?.events[i] ?? null;
      setSelected((cur) => (ev && ev === cur ? null : ev));
    },
    [filteredAnalysis],
  );

  const changeSession = useCallback((next: string | 'ALL') => {
    setSession(next);
    setFilter(null);
    setSelected(null);
  }, []);

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
          onChange={changeSession}
        />
      )}

      {sessionAnalysis && filteredAnalysis && (
        <>
          <nav className="flex flex-wrap gap-1.5 text-sm">
            {SECTIONS.map((s) => (
              <a key={s.id} href={`#${s.id}`} className="chip border border-line bg-bg-elevated text-slate-700 hover:border-brand/40">
                {s.title}
              </a>
            ))}
          </nav>
          <Section id="recorte" hint="Janela de tempo e eventos isolados. Tudo abaixo obedece a este recorte.">
            <TimelinePanel
              analysis={filteredAnalysis}
              filter={effectiveFilter}
              onChange={setFilter}
              bounds={bounds}
              options={codeOptions}
              categories={categories}
              windowEvents={windowEvents}
              isolatedEvents={isolatedEvents}
              totalEvents={sessionAnalysis.events.length}
              highlightIndex={highlightIndex}
              onSelectEvent={selectByIndex}
            />
          </Section>
          <Section id="visao-geral">
            <StatsPanel analysis={filteredAnalysis} />
          </Section>
          <Section id="eventos" hint="Clique em um evento da linha do tempo ou da tabela para ver seus vizinhos e intervalos.">
            <SingleEventAnalysis
              analysis={filteredAnalysis}
              highlightIndex={highlightIndex}
              onSelectEvent={selectByIndex}
              onClearHighlight={() => setSelected(null)}
            />
            <EventsTable
              analysis={filteredAnalysis}
              highlightIndex={highlightIndex}
              isolatedCodes={visibleCodes}
              onSelectEvent={selectByIndex}
            />
          </Section>
          <Section id="tempos" hint="Latências e intervalos: quanto tempo passa de um evento até outro.">
            <CustomAnalysesPanel analysis={filteredAnalysis} kind="time" />
          </Section>
          <Section id="probabilidades" hint="Com que frequência um evento acontece depois (ou antes) de outro.">
            <CustomAnalysesPanel analysis={filteredAnalysis} kind="probability" />
            <TransitionMatrix analysis={filteredAnalysis} />
          </Section>
          <Section id="regressao" hint="Divide a sessão em blocos de tempo e ajusta um modelo sobre as variáveis de cada bloco.">
            <RegressionPanel analysis={filteredAnalysis} session={session} />
          </Section>
          <Section id="exportar">
            <ExportPanel analysis={filteredAnalysis} />
          </Section>
        </>
      )}
    </div>
  );
}
