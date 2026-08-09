import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface ScatterPoint {
  x: number;
  y: number;
  /** Texto extra no tooltip (ex.: "bloco 7 · 18:00"). */
  label?: string;
}

interface Props {
  points: ScatterPoint[];
  /** Reta já calculada pelo chamador (ajuste OLS ou identidade). */
  line: { x: number; y: number }[];
  xLabel: string;
  yLabel: string;
  /** Nome da série da reta na legenda. */
  lineName?: string;
  color?: string;
  height?: number;
}

interface TooltipPayload {
  payload?: ScatterPoint;
}

function PointTooltip({
  active,
  payload,
  xLabel,
  yLabel,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  xLabel: string;
  yLabel: string;
}) {
  const p = payload?.[0]?.payload;
  if (!active || !p) return null;
  return (
    <div className="card px-3 py-2 text-xs shadow-xl">
      <div className="font-mono text-slate-700">
        {xLabel} = {fmt(p.x)}
      </div>
      <div className="font-mono font-semibold text-slate-900">
        {yLabel} = {fmt(p.y)}
      </div>
      {p.label && <div className="text-slate-500 mt-0.5">{p.label}</div>}
    </div>
  );
}

function fmt(v: number): string {
  if (!Number.isFinite(v)) return '—';
  return Math.abs(v) >= 1000 ? v.toFixed(0) : v.toFixed(2);
}

/**
 * Dispersão + uma reta. O ajuste NÃO é calculado aqui — o painel passa a reta
 * pronta, seja a regressão simples (1 preditor) ou a identidade do gráfico
 * observado × previsto (2+ preditores).
 */
export function RegressionScatter({
  points,
  line,
  xLabel,
  yLabel,
  lineName = 'Reta ajustada',
  color = '#818cf8',
  height = 300,
}: Props) {
  if (points.length < 2) {
    return (
      <div className="text-sm text-slate-500 text-center py-8">
        Precisa de pelo menos 2 observações para desenhar o gráfico.
      </div>
    );
  }

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart margin={{ top: 8, right: 20, left: 8, bottom: 24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="x"
            type="number"
            domain={['auto', 'auto']}
            stroke="#64748b"
            fontSize={11}
            tickFormatter={fmt}
            label={{
              value: xLabel,
              position: 'insideBottom',
              offset: -12,
              fontSize: 11,
              fill: '#64748b',
            }}
          />
          <YAxis
            dataKey="y"
            type="number"
            domain={['auto', 'auto']}
            stroke="#64748b"
            fontSize={11}
            tickFormatter={fmt}
            label={{
              value: yLabel,
              angle: -90,
              position: 'insideLeft',
              fontSize: 11,
              fill: '#64748b',
            }}
          />
          <Tooltip
            content={<PointTooltip xLabel={xLabel} yLabel={yLabel} />}
            cursor={{ stroke: '#94a3b8' }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: '#475569' }} />
          <Scatter name="Observações" data={points} fill={color} shape="circle" />
          <Line
            name={lineName}
            type="linear"
            data={line}
            dataKey="y"
            stroke="#0f172a"
            strokeWidth={2}
            dot={false}
            legendType="line"
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
