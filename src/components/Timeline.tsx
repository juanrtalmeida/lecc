import { useMemo, useRef, useState, useEffect } from 'react';
import type { CSSProperties, MouseEvent } from 'react';
import type { Analysis } from '@/types';
import { CATEGORY_META, type EventCategory, SUGGESTED_COLORS } from '@/types';
import { computeStats } from '@/analysis';
import { formatTime } from '@/utils';

interface EventLanePoint {
  time: number;
  code: number;
  category: EventCategory;
  index: number;
}

interface Props {
  analysis: Analysis;
  /** Evento destacado — recebe um índice (posição na tabela) vindo do clique. */
  highlightIndex?: number | null;
  /** Clique em um marcador da timeline. */
  onPointClick?: (eventIndex: number) => void;
}

// Dimensões ------------------------------------------------------------
const FULL_WIDTH = 1000;       // 1× zoom baseline
const ROW_HEIGHT = 36;         // espaço vertical por categoria (com padding)
const TOP_PAD = 32;            // espaço acima das lanes para ticks/header
const LANE_PAD_X = 12;         // padding horizontal dentro da lane (espaço entre dots)
// Cor lateral fixa (não rola, não dá zoom) -------------------------------
const LABEL_COL_WIDTH = 120;   // coluna da esquerda com nome da categoria
const HEADER_HEIGHT = TOP_PAD; // header de tempo

const MIN_ZOOM = 1;
const MAX_ZOOM = 20;

export function Timeline({ analysis, highlightIndex, onPointClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const stats = useMemo(() => computeStats(analysis), [analysis]);
  const firstEv = analysis.events[0];
  const lastEv = analysis.events[analysis.events.length - 1];
  const tMin = firstEv?.time ?? 0;
  const tMax = lastEv?.time ?? 1;
  const span = Math.max(0.001, tMax - tMin);

  // Agrupa por categoria em lanes. Inclui TODAS as categorias canônicas
  // (mesmo as vazias) para o usuário ter sempre o mesmo gabarito visual.
  const lanes = useMemo(() => {
    const buckets = new Map<EventCategory, EventLanePoint[]>();
    for (const c of Object.keys(CATEGORY_META) as EventCategory[]) {
      buckets.set(c, []);
    }
    analysis.events.forEach((ev, i) => {
      const def = analysis.eventDefinitions[ev.code];
      const cat = (def?.category ?? 'Outro') as EventCategory;
      buckets.get(cat)!.push({
        time: ev.time,
        code: ev.code,
        category: cat,
        index: i,
      });
    });
    const result: { category: EventCategory; points: EventLanePoint[] }[] = [];
    for (const c of Object.keys(CATEGORY_META) as EventCategory[]) {
      result.push({ category: c, points: buckets.get(c) ?? [] });
    }
    return result;
  }, [analysis]);

  const [zoom, setZoom] = useState(1);
  const [view, setView] = useState<{ start: number; end: number }>({ start: 0, end: 1 });

  useEffect(() => {
    setZoom(1);
    setView({ start: 0, end: 1 });
  }, [analysis.id]);

  // Foco automático quando um evento é selecionado.
  useEffect(() => {
    if (highlightIndex == null) return;
    const ev = analysis.events[highlightIndex];
    if (!ev) return;
    const frac = (ev.time - tMin) / span;
    const halfWin = Math.max(0.02, 0.5 / zoom);
    setView({
      start: Math.max(0, frac - halfWin / 2),
      end: Math.min(1, frac + halfWin / 2),
    });
    const scroller = scrollerRef.current;
    if (scroller) {
      // Centraliza o evento no scroller horizontal.
      const evX = frac * FULL_WIDTH * zoom;
      scroller.scrollLeft = evX - scroller.clientWidth / 2;
    }
  }, [highlightIndex, analysis, tMin, span, zoom]);

  // Wheel = zoom (Ctrl/Meta) ou pan (sem modifier).
  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    const xInContainer = rect ? e.clientX - rect.left : 0;
    // Posição no scroller interno
    const inner = scrollerRef.current ?? containerRef.current;
    const innerRect = inner?.getBoundingClientRect();
    const localX = innerRect ? e.clientX - innerRect.left + (inner?.scrollLeft ?? 0) : 0;
    const totalW = FULL_WIDTH * zoom;
    const anchorFrac = view.start + (localX / Math.max(1, totalW)) * (view.end - view.start);
    void xInContainer;
    if (e.ctrlKey || e.metaKey) {
      const dir = e.deltaY < 0 ? 1 : -1;
      setZoom((z) => {
        const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * (dir > 0 ? 1.25 : 1 / 1.25)));
        const winSize = 1 / next;
        const halfWin = Math.max(0.005, winSize / 2);
        const sAnchored = Math.max(0, Math.min(1 - Math.min(1, winSize), anchorFrac - halfWin));
        setView({ start: sAnchored, end: Math.min(1, sAnchored + Math.min(1, winSize)) });
        return next;
      });
    } else {
      // pan horizontal
      const innerW = innerRect?.width ?? (rect?.width ?? 1);
      const pan = (e.deltaY / innerW) * (view.end - view.start);
      setView((v) => {
        const win = v.end - v.start;
        let s = v.start + pan;
        s = Math.max(0, Math.min(1 - win, s));
        return { start: s, end: s + win };
      });
    }
  };

  // Drag-to-pan (qualquer ponto fora de um círculo).
  const dragRef = useRef<{ x: number; start: number; end: number } | null>(null);
  const onMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if ((e.target as Element).closest?.('circle')) return;
    dragRef.current = { x: e.clientX, start: view.start, end: view.end };
  };
  const onMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const inner = scrollerRef.current;
    if (!inner) return;
    const dx = (e.clientX - dragRef.current.x) / inner.clientWidth;
    const win = dragRef.current.end - dragRef.current.start;
    let s = Math.max(0, Math.min(1 - win, dragRef.current.start - dx));
    setView({ start: s, end: s + win });
  };
  const onMouseUp = () => {
    dragRef.current = null;
  };

  // Dimensões finais
  const widthPx = FULL_WIDTH * zoom;
  const heightPx = HEADER_HEIGHT + lanes.length * ROW_HEIGHT + 12;

  const visStart = tMin + view.start * span;
  const visEnd = tMin + view.end * span;
  const visSpan = Math.max(0.001, visEnd - visStart);

  const projectX = (time: number) => {
    const visibleFrac = (time - visStart) / visSpan;
    return LANE_PAD_X + visibleFrac * Math.max(1, widthPx - LANE_PAD_X * 2);
  };

  const ticks = useMemo(() => {
    const out: number[] = [];
    const n = Math.max(3, Math.min(10, Math.floor(zoom * 5)));
    for (let i = 0; i <= n; i++) {
      const t = visStart + (visSpan * i) / n;
      out.push(t);
    }
    return out;
  }, [visStart, visSpan, zoom]);

  // Tooltip em hover
  const [hover, setHover] = useState<{
    cx: number;
    cy: number;
    point: EventLanePoint & { name: string };
    eventsCount: number;
  } | null>(null);

  const containerRect0 = useRef<DOMRect | null>(null);

  // Pré-cálculos pra tooltip e navega
  // ------------------------------------------------------

  return (
    <div className="card p-4 select-none">
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <div>
          <h3 className="font-semibold text-slate-900">Timeline</h3>
          <p className="text-xs text-slate-500">
            {formatTime(visStart)} → {formatTime(visEnd)} de {formatTime(tMax)} · zoom {zoom.toFixed(2)}×
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost btn" onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z * 1.5))}>
            ＋
          </button>
          <button className="btn-ghost btn" onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z / 1.5))}>
            －
          </button>
          <button
            className="btn-ghost btn"
            onClick={() => {
              setZoom(1);
              setView({ start: 0, end: 1 });
            }}
          >
            Reset
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative border border-line rounded-lg bg-bg-subtle"
        onWheel={onWheel}
        style={{ height: heightPx }}
      >
        {/* Coluna lateral fixa (não rola) ----------------------------------- */}
        <div
          className="absolute left-0 top-0 bottom-0 z-10 bg-white/85 border-r border-line"
          style={{ width: LABEL_COL_WIDTH, height: heightPx }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          <div
            className="px-3 flex items-center text-[10px] uppercase tracking-wider text-slate-500 font-semibold"
            style={{ height: HEADER_HEIGHT }}
          >
            Categoria
          </div>
          {lanes.map((lane) => {
            const meta = CATEGORY_META[lane.category];
            const inactive = lane.points.length === 0;
            return (
              <div
                key={lane.category}
                className="flex items-center px-3 border-t border-line/40"
                style={{
                  height: ROW_HEIGHT,
                  borderTopColor: '#e2e8f0',
                  color: inactive ? '#94a3b8' : meta.color,
                }}
              >
                <span
                  className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold mr-2"
                  style={{
                    background: inactive ? '#f1f5f9' : `${meta.color}22`,
                    color: inactive ? '#94a3b8' : meta.color,
                  }}
                >
                  {meta.symbol}
                </span>
                <span className={inactive ? 'line-through' : ''}>{lane.category}</span>
                <span className="ml-auto text-[10px] text-slate-500 tabular-nums">
                  {lane.points.length}
                </span>
              </div>
            );
          })}
        </div>

        {/* Área rolável (ticks + lanes) ------------------------------------ */}
        <div
          ref={scrollerRef}
          className="absolute right-0 top-0 bottom-0 overflow-x-auto overflow-y-hidden cursor-grab active:cursor-grabbing"
          style={{ left: LABEL_COL_WIDTH, height: heightPx }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={() => {
            onMouseUp();
            setHover(null);
          }}
          onMouseMoveCapture={(e) => {
            containerRect0.current = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
          }}
        >
          <svg
            width={Math.max(widthPx, 600)}
            height={heightPx}
            style={{ display: 'block' } as CSSProperties}
            viewBox={`0 0 ${Math.max(widthPx, 600)} ${heightPx}`}
          >
            {/* Header: ticks de tempo */}
            {ticks.map((t, i) => (
              <g key={`tick-${i}`} transform={`translate(${projectX(t)} 0)`}>
                <line x1={0} x2={0} y1={0} y2={heightPx} stroke="#e2e8f0" strokeWidth={1} />
                <text
                  x={4}
                  y={20}
                  fill="#64748b"
                  fontSize={10}
                  fontFamily="JetBrains Mono, monospace"
                >
                  {formatTime(t).slice(0, 8)}
                </text>
              </g>
            ))}

            {/* Lanes + pontos */}
            {lanes.map((lane, idx) => {
              const visible = lane.points.filter(
                (p) => p.time >= visStart - 0.01 && p.time <= visEnd + 0.01,
              );
              const laneY = HEADER_HEIGHT + idx * ROW_HEIGHT;
              return (
                <g key={lane.category} transform={`translate(0 ${laneY})`}>
                  {/* linha-base da lane */}
                  <line
                    x1={0}
                    x2={Math.max(widthPx, 600)}
                    y1={ROW_HEIGHT / 2}
                    y2={ROW_HEIGHT / 2}
                    stroke="#e2e8f0"
                    strokeWidth={1}
                  />
                  {/* marcador central da lane */}
                  <rect
                    x={0}
                    y={ROW_HEIGHT / 2 - 1}
                    width={Math.max(widthPx, 600)}
                    height={2}
                    fill="#cbd5e1"
                    opacity={0.5}
                  />
                  {/* pontos */}
                  {visible.map((p, pi) => {
                    const cx = projectX(p.time);
                    const cy = ROW_HEIGHT / 2;
                    const def = analysis.eventDefinitions[p.code];
                    const fillColor =
                      def?.color ?? CATEGORY_META[lane.category].color ?? SUGGESTED_COLORS[0];
                    const isHL = highlightIndex === p.index;
                    return (
                      <g key={`${laneY}-${pi}`}>
                        <circle
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
                            const cRect = containerRect0.current;
                            if (!cRect) return;
                            const dotX = cRect.left + cx;
                            const dotY = cRect.top + laneY + cy;
                            setHover({
                              cx: dotX,
                              cy: dotY,
                              point: { ...p, name: def?.name ?? `(cód. ${p.code})` },
                              eventsCount: lane.points.length,
                            });
                          }}
                          onMouseLeave={() => setHover(null)}
                          style={{ cursor: 'pointer' }}
                        />
                      </g>
                    );
                  })}
                </g>
              );
            })}
          </svg>

          {/* Tooltip em hover (DOM, fora do SVG) */}
          {hover && (
            <div
              className="fixed z-30 card px-3 py-2 text-xs shadow-xl pointer-events-none"
              style={{
                left: hover.cx + 12,
                top: hover.cy + 12,
                minWidth: 220,
              }}
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
      </div>

      <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
        {(Object.keys(CATEGORY_META) as EventCategory[]).map((c) => (
          <div key={c} className="flex items-center gap-2">
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{ background: CATEGORY_META[c].color }}
            />
            <span className='text-slate-700'>
              {c}{' '}
              <span className="text-slate-700">({stats.byCategory[c] ?? 0})</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
