import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import type { Analysis } from '@/types';
import { SUGGESTED_COLORS } from '@/types';
import { analysisCategories, categoryNameOfCode } from '@/analysis';
import { formatTime } from '@/utils';

interface EventLanePoint {
  time: number;
  code: number;
  category: string;
  index: number;
}

interface Props {
  analysis: Analysis;
  /** Início da janela desenhada, em segundos absolutos do arquivo. */
  from: number;
  /** Fim da janela desenhada, em segundos absolutos do arquivo. */
  to: number;
  /** Limites da sessão — arrastar e dar zoom nunca passam daqui. */
  min: number;
  max: number;
  /**
   * A janela é a mesma coisa que o filtro de tempo: arrastar ou dar zoom aqui
   * edita o filtro, e não uma segunda noção de "trecho visível".
   */
  onWindowChange?: (from: number, to: number) => void;
  /** Evento destacado — índice na lista de eventos recebida. */
  highlightIndex?: number | null;
  onPointClick?: (eventIndex: number) => void;
  /**
   * Códigos isolados. Só afeta o desenho: a timeline recebe a mesma lista de
   * eventos que a tabela (os índices precisam bater) e oculta os de fora.
   */
  visibleCodes?: Set<number> | null;
}

// Dimensões ------------------------------------------------------------
const ROW_HEIGHT = 36;         // altura de cada faixa de categoria
const HEADER_HEIGHT = 32;      // faixa dos marcadores de tempo
const LANE_PAD_X = 12;         // respiro horizontal dentro da faixa
const LABEL_COL_WIDTH = 132;   // coluna fixa com o nome da categoria
const MIN_SPAN = 1;            // janela mínima, em segundos

/** Passos "redondos" para os marcadores de tempo, do mais fino ao mais grosso. */
const TICK_STEPS = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600];

function niceTicks(from: number, to: number, target: number): number[] {
  const span = Math.max(1e-6, to - from);
  const step =
    TICK_STEPS.find((s) => span / s <= target) ?? TICK_STEPS[TICK_STEPS.length - 1];
  const out: number[] = [];
  for (let t = Math.ceil(from / step) * step; t <= to; t += step) out.push(t);
  return out;
}

export function Timeline({
  analysis,
  from,
  to,
  min,
  max,
  onWindowChange,
  highlightIndex,
  onPointClick,
  visibleCodes = null,
}: Props) {
  const plotRef = useRef<HTMLDivElement>(null);
  const [plotWidth, setPlotWidth] = useState(600);

  // A timeline ocupa a largura disponível — sem rolagem horizontal própria,
  // porque o recorte já é a janela de tempo.
  useLayoutEffect(() => {
    const el = plotRef.current;
    if (!el) return;
    const measure = () => setPlotWidth(Math.max(240, el.clientWidth));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const span = Math.max(MIN_SPAN, to - from);

  // Agrupa por categoria em faixas. Inclui TODAS as categorias da análise
  // (canônicas e criadas pelo usuário), mesmo vazias: ausência é resultado.
  const lanes = useMemo(() => {
    const categories = analysisCategories(analysis);
    const buckets = new Map<string, EventLanePoint[]>();
    const totals = new Map<string, number>();
    for (const c of categories) {
      buckets.set(c.name, []);
      totals.set(c.name, 0);
    }
    analysis.events.forEach((ev, i) => {
      const cat = categoryNameOfCode(analysis, ev.code);
      totals.set(cat, (totals.get(cat) ?? 0) + 1);
      if (visibleCodes && !visibleCodes.has(ev.code)) return;
      buckets.get(cat)?.push({ time: ev.time, code: ev.code, category: cat, index: i });
    });
    return categories.map((info) => ({
      info,
      points: buckets.get(info.name) ?? [],
      total: totals.get(info.name) ?? 0,
    }));
  }, [analysis, visibleCodes]);

  const isolating = visibleCodes != null;
  const heightPx = HEADER_HEIGHT + lanes.length * ROW_HEIGHT + 12;
  const innerW = Math.max(120, plotWidth - LANE_PAD_X * 2);

  const projectX = (time: number) =>
    LANE_PAD_X + ((time - from) / span) * innerW;

  const ticks = useMemo(() => {
    const target = Math.max(3, Math.min(9, Math.floor(plotWidth / 110)));
    return niceTicks(from, to, target);
  }, [from, to, plotWidth]);

  /** Move/redimensiona a janela respeitando os limites da sessão. */
  const commitWindow = (nextFrom: number, nextTo: number) => {
    if (!onWindowChange) return;
    let s = Math.max(MIN_SPAN, nextTo - nextFrom);
    s = Math.min(s, max - min);
    let f = Math.min(Math.max(min, nextFrom), max - s);
    onWindowChange(f, f + s);
  };

  // Roda do mouse: com Ctrl/⌘ dá zoom ancorado no cursor, sem modificador
  // desliza a janela. Listener manual porque o evento precisa ser cancelável.
  useEffect(() => {
    const el = plotRef.current;
    if (!el || !onWindowChange) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const frac = Math.min(1, Math.max(0, (e.clientX - rect.left - LANE_PAD_X) / innerW));
      const anchor = from + frac * span;
      if (e.ctrlKey || e.metaKey) {
        const factor = e.deltaY < 0 ? 1 / 1.25 : 1.25;
        const nextSpan = Math.min(max - min, Math.max(MIN_SPAN, span * factor));
        commitWindow(anchor - frac * nextSpan, anchor - frac * nextSpan + nextSpan);
      } else {
        const delta = ((e.deltaX || e.deltaY) / Math.max(1, innerW)) * span;
        commitWindow(from + delta, to + delta);
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [from, to, span, innerW, min, max, onWindowChange]);

  // Arrastar move a janela (e, portanto, o filtro de tempo).
  const dragRef = useRef<{ x: number; from: number; to: number } | null>(null);
  const onMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (!onWindowChange) return;
    if ((e.target as Element).closest?.('circle')) return;
    dragRef.current = { x: e.clientX, from, to };
  };
  const onMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d) return;
    const delta = ((d.x - e.clientX) / Math.max(1, innerW)) * (d.to - d.from);
    commitWindow(d.from + delta, d.to + delta);
  };
  const endDrag = () => {
    dragRef.current = null;
  };

  const [hover, setHover] = useState<{
    cx: number;
    cy: number;
    point: EventLanePoint & { name: string };
  } | null>(null);
  const plotRect = useRef<DOMRect | null>(null);

  return (
    <div className="select-none">
      <div className="relative border border-line rounded-lg bg-bg-subtle overflow-hidden">
        <div className="flex" style={{ height: heightPx }}>
          {/* Coluna fixa com as categorias ------------------------------- */}
          <div
            className="flex-shrink-0 bg-white/85 border-r border-line"
            style={{ width: LABEL_COL_WIDTH }}
          >
            <div
              className="px-3 flex items-center text-[10px] uppercase tracking-wider text-slate-500 font-semibold"
              style={{ height: HEADER_HEIGHT }}
            >
              Categoria
            </div>
            {lanes.map((lane) => {
              const inactive = lane.points.length === 0;
              return (
                <div
                  key={lane.info.name}
                  className="flex items-center px-3 border-t border-line/40 text-xs"
                  style={{
                    height: ROW_HEIGHT,
                    borderTopColor: '#e2e8f0',
                    color: inactive ? '#94a3b8' : lane.info.color,
                  }}
                >
                  <span
                    className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold mr-2 flex-shrink-0"
                    style={{
                      background: inactive ? '#f1f5f9' : `${lane.info.color}22`,
                      color: inactive ? '#94a3b8' : lane.info.color,
                    }}
                  >
                    {lane.info.symbol}
                  </span>
                  <span className={`truncate ${inactive ? 'line-through' : ''}`}>
                    {lane.info.name}
                  </span>
                  <span className="ml-auto pl-1 text-[10px] text-slate-500 tabular-nums flex-shrink-0">
                    {lane.points.length}
                    {isolating && lane.total !== lane.points.length && (
                      <span className="text-slate-300">/{lane.total}</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Área do gráfico -------------------------------------------- */}
          <div
            ref={plotRef}
            className={`relative flex-1 min-w-0 ${onWindowChange ? 'cursor-grab active:cursor-grabbing' : ''}`}
            onMouseDown={onMouseDown}
            onMouseMove={(e) => {
              plotRect.current = e.currentTarget.getBoundingClientRect();
              onMouseMove(e);
            }}
            onMouseUp={endDrag}
            onMouseLeave={() => {
              endDrag();
              setHover(null);
            }}
          >
            <svg width={plotWidth} height={heightPx} style={{ display: 'block' }}>
              {ticks.map((t, i) => (
                <g key={`tick-${i}`} transform={`translate(${projectX(t)} 0)`}>
                  <line x1={0} x2={0} y1={0} y2={heightPx} stroke="#e2e8f0" strokeWidth={1} />
                  <text x={4} y={20} fill="#64748b" fontSize={10} fontFamily="JetBrains Mono, monospace">
                    {formatTime(t).replace(/\.\d+$/, '')}
                  </text>
                </g>
              ))}

              {lanes.map((lane, idx) => {
                const laneY = HEADER_HEIGHT + idx * ROW_HEIGHT;
                return (
                  <g key={lane.info.name} transform={`translate(0 ${laneY})`}>
                    <rect
                      x={0}
                      y={ROW_HEIGHT / 2 - 1}
                      width={plotWidth}
                      height={2}
                      fill="#cbd5e1"
                      opacity={0.5}
                    />
                    {lane.points.map((p, pi) => {
                      const cx = projectX(p.time);
                      const cy = ROW_HEIGHT / 2;
                      const def = analysis.eventDefinitions[p.code];
                      const fillColor = def?.color ?? lane.info.color ?? SUGGESTED_COLORS[0];
                      const isHL = highlightIndex === p.index;
                      return (
                        <circle
                          key={`${lane.info.name}-${pi}`}
                          cx={cx}
                          cy={cy}
                          r={isHL ? 8 : 5}
                          fill={fillColor}
                          opacity={isHL ? 1 : 0.9}
                          stroke={isHL ? '#fff' : 'none'}
                          strokeWidth={isHL ? 1.5 : 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            onPointClick?.(p.index);
                          }}
                          onMouseEnter={() => {
                            const r = plotRect.current;
                            if (!r) return;
                            setHover({
                              cx: r.left + cx,
                              cy: r.top + laneY + cy,
                              point: { ...p, name: def?.name ?? `(cód. ${p.code})` },
                            });
                          }}
                          onMouseLeave={() => setHover(null)}
                          style={{ cursor: 'pointer' }}
                        />
                      );
                    })}
                  </g>
                );
              })}
            </svg>

            {analysis.events.length === 0 && (
              <div className="absolute inset-0 grid place-items-center text-xs text-slate-400">
                Nenhum evento neste trecho.
              </div>
            )}
          </div>
        </div>

        {hover && (
          <div
            className="fixed z-30 card px-3 py-2 text-xs shadow-xl pointer-events-none"
            style={{ left: hover.cx + 12, top: hover.cy + 12, minWidth: 200 }}
          >
            <div className="font-mono text-slate-700">{formatTime(hover.point.time)}</div>
            <div>
              <span className="font-semibold text-slate-900">{hover.point.name}</span>{' '}
              <span className="text-slate-500">· cód. {hover.point.code}</span>
            </div>
            <div className="text-slate-600 mt-0.5">Categoria: {hover.point.category}</div>
            <div className="text-slate-500 text-[10px] mt-1">
              Clique para destacar este evento na tabela.
            </div>
          </div>
        )}
      </div>

      <p className="text-[11px] text-slate-400 mt-2">
        Arraste para percorrer a sessão · Ctrl/⌘ + roda do mouse para aproximar ·
        clique em um ponto para destacá-lo na tabela
      </p>
    </div>
  );
}
