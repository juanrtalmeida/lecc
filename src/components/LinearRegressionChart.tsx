import { useMemo } from 'react';
import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  linearFit,
  predictLine,
  residualStd,
  type LinearFit,
} from '@/analysis';
import { formatTime } from '@/utils';

export interface RegressionPoint {
  idx: number;
  x: number;
  y: number;
  label?: string;
}

interface Props {
  /** Título exibido em cima do gráfico. */
  title: string;
  /** Pontos do scatter. */
  points: RegressionPoint[];
  /** Cor principal (stroke da linha). */
  color?: string;
  /** Largura mínima do SVG (px). */
  height?: number;
}

interface FitTooltipPayload {
  payload?: RegressionPoint;
}

function FitTooltip({ active, payload }: { active?: boolean; payload?: FitTooltipPayload[] }) {
  if (!active || !payload || !payload[0]?.payload) return null;
  const p = payload[0].payload;
  return (
    <div className="card px-3 py-2 text-xs shadow-xl">
      <div className="font-mono text-slate-700">x = {p.x.toFixed(3)}</div>
      <div className="font-semibold text-slate-900">y = {p.y}</div>
      {p.label && <div className="text-slate-500 mt-0.5">{p.label}</div>}
    </div>
  );
}

export function LinearRegressionChart({
  title,
  points,
  color = '#818cf8',
  height = 280,
}: Props) {
  const cleanedPoints = useMemo(
    () =>
      points.filter(
        (p) => Number.isFinite(p.x) && Number.isFinite(p.y),
      ),
    [points],
  );
  const fit: LinearFit = useMemo(() => linearFit(cleanedPoints), [cleanedPoints]);
  const rsd = useMemo(() => residualStd(fit, cleanedPoints), [fit, cleanedPoints]);

  const linePts = useMemo(() => {
    if (!cleanedPoints.length) return [];
    const xs = cleanedPoints.map((p) => p.x);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    // Duas pontas + 10 pontos intermediários.
    const n = 10;
    const grid: number[] = [];
    for (let i = 0; i <= n; i++) grid.push(minX + ((maxX - minX) * i) / n);
    return predictLine(fit, grid, Number.isFinite(rsd) ? rsd : undefined);
  }, [cleanedPoints, fit, rsd]);

  const merged = useMemo(() => {
    // Cada ponto da linha passa pelos mesmos pontos do scatter como `{ idx, x }`
    const map = new Map<number, { idx: number; x: number }>();
    for (const p of cleanedPoints) map.set(p.idx, { idx: p.idx, x: p.x });
    const yTrend = new Map<number, number>();
    for (const l of linePts) yTrend.set(Math.round(l.x * 1000), l.yTrend);
    // Não precisamos devolver nada novo — linha é desenhada por xs의회.
    void map;
    void yTrend;
    return linePts;
  }, [cleanedPoints, linePts]);

  const hasFit = Number.isFinite(fit.slope);

  return (
    <div className="card p-4">
      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-3">
        <h3 className="font-semibold text-slate-900">{title}</h3>
        {hasFit && (
          <div className="flex items-center gap-3 text-xs">
            <Pill label="slope" value={fit.slope.toFixed(4)} />
            <Pill label="intercept" value={fit.intercept.toFixed(4)} />
            <Pill label="r²" value={Number.isFinite(fit.r2) ? fit.r2.toFixed(4) : '—'} />
            <Pill label="σ resid." value={Number.isFinite(rsd) ? rsd.toFixed(4) : '—'} />
            <Pill label="n" value={String(fit.n)} />
          </div>
        )}
      </div>

      {cleanedPoints.length < 2 ? (
        <div className="text-sm text-slate-500 text-center py-8">
          Precisa de pelo menos 2 pontos para ajustar uma reta.
        </div>
      ) : (
        <div style={{ height }} className="w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart margin={{ top: 8, right: 16, left: 8, bottom: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="x"
                type="number"
                domain={['auto', 'auto']}
                stroke="#64748b"
                fontSize={11}
                tickFormatter={(v: number) => (Math.abs(v) >= 1000 ? v.toFixed(0) : v.toFixed(2))}
              />
              <YAxis
                dataKey="y"
                type="number"
                domain={['auto', 'auto']}
                stroke="#64748b"
                fontSize={11}
              />
              <Tooltip content={<FitTooltip />} cursor={{ stroke: '#94a3b8' }} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#475569' }} />
              {/* Pontos */}
              <Scatter
                name="Observações"
                data={cleanedPoints.map((p) => ({ ...p, _y: p.y }))}
                fill={color}
                shape="circle"
              />
              {/* Linha de regressão (e banda ±σ se houver) */}
              <Line
                name="Regressão"
                type="linear"
                data={merged.map((m) => ({
                  idx: m.x,
                  x: m.x,
                  y: m.yTrend,
                }))}
                dataKey="y"
                stroke={color}
                strokeWidth={2.2}
                dot={false}
                legendType="line"
              />
              {Number.isFinite(rsd) &&
                merged.map((m, i) => (
                  <ReferenceLine
                    key={`rl-${i}`}
                    segment={[
                      { x: m.x, y: (m.yTrend ?? 0) - rsd },
                      { x: m.x, y: (m.yTrend ?? 0) + rsd },
                    ]}
                    stroke="#1f2937"
                    strokeWidth={1}
                    ifOverflow="visible"
                    opacity={0.0}
                  />
                ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {hasFit && (
        <div className="text-xs text-slate-500 mt-3 leading-relaxed">
          Ajuste mínimo-quadrados:{' '}
          <span className="font-mono">
            y = {fit.slope.toFixed(4)} · x + {fit.intercept.toFixed(4)}
          </span>
          {Number.isFinite(fit.r) && (
            <>
              {' · '}correlação (Pearson) r = {fit.r.toFixed(4)}.
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <span className="chip border-line bg-bg-subtle text-slate-700">
      <span className="text-slate-500">{label}</span>
      <span className="font-mono">{value}</span>
    </span>
  );
}

// fmt só pra deixar disponível em outros arquivos se necessário
void formatTime;
// referência para evitar tree-shake de ScatterChart isolado
void ScatterChart;
