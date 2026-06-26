import { useMemo, useState } from 'react';
import type { Analysis } from '@/types';
import { LinearRegressionChart } from './LinearRegressionChart';
import { formatTime, formatTimeShort } from '@/utils';

type XAxisKind = 'time' | 'sequence';
type YAxisKind = 'code' | 'deltaNext' | 'deltaPrev' | 'cumulativeCount';

interface Props {
  analysis: Analysis;
}

/**
 * Painel de regressão linear. O usuário escolhe:
 *   - filtro de codes (checkbox)
 *   - qual eixo X (tempo ou sequência 1..N)
 *   - qual eixo Y (code numérico / Δpróximo / Δanterior / contador cumulativo do code)
 * e o scatter + linha de regressão atualizam ao vivo.
 *
 * Para "code" no eixo Y usamos o Y numérico real (sem normalização) — quando
 * o filtro marca vários codes, eles ficam distintos no eixo Y, formando
 * bandas horizontais que normalmente têm regressões interessantes por code.
 */
export function LinearRegressionPanel({ analysis }: Props) {
  const allCodes = useMemo(
    () => Array.from(new Set(analysis.events.map((e) => e.code))).sort((a, b) => a - b),
    [analysis],
  );

  const [selectedCodes, setSelectedCodes] = useState<number[]>(() => allCodes.slice(0, Math.min(3, allCodes.length)));
  const [xAxis, setXAxis] = useState<XAxisKind>('time');
  const [yAxis, setYAxis] = useState<YAxisKind>('code');

  const points = useMemo(() => {
    // Pega TODOS os eventos (índice na tabela) onde code ∈ selectedCodes.
    const set = new Set(selectedCodes);
    const filtered = analysis.events
      .map((e, i) => ({ e, i }))
      .filter(({ e }) => set.has(e.code));
    // Δpróximo/Δanterior em segundos (precisam olhar o array GLOBAL, não filtrado).
    const lastByCodeGlobal = new Map<number, number>(); // code → último timestamp (s)
    return filtered.map(({ e, i }, j) => {
      let y = 0;
      switch (yAxis) {
        case 'code':
          y = e.code;
          break;
        case 'deltaNext': {
          // distância em segundos até o próximo evento com QUALQUER code do filtro
          const nextIdx = analysis.events.findIndex(
            (ev, k) => k > i && set.has(ev.code),
          );
          y = nextIdx > 0 ? analysis.events[nextIdx].time - e.time : Number.NaN;
          break;
        }
        case 'deltaPrev': {
          let prevIdx = -1;
          for (let k = i - 1; k >= 0; k--) {
            if (set.has(analysis.events[k].code)) {
              prevIdx = k;
              break;
            }
          }
          y = prevIdx >= 0 ? e.time - analysis.events[prevIdx].time : Number.NaN;
          break;
        }
        case 'cumulativeCount':
          y = (lastByCodeGlobal.get(e.code) ?? 0) + 1;
          lastByCodeGlobal.set(e.code, y);
          break;
      }
      const x = xAxis === 'time' ? e.time : j + 1;
      return {
        idx: i,
        x,
        y,
        label: `cód. ${e.code} · ${formatTimeShort(e.time)}`,
      };
    }).filter((p) => Number.isFinite(p.y));
  }, [analysis.events, selectedCodes, xAxis, yAxis]);

  const yLabel = {
    code: 'Código',
    deltaNext: 'Δ até próximo (s)',
    deltaPrev: 'Δ desde anterior (s)',
    cumulativeCount: 'Ocorrências cumulativas (do code)',
  }[yAxis];

  const xLabel = xAxis === 'time' ? 'Tempo (s)' : 'Sequência (1..N)';

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <div>
          <h3 className="font-semibold text-slate-900">Regressão linear</h3>
          <p className="text-xs text-slate-500">
            Selecione os códigos de interesse e os eixos. O ajuste mínimo-quadrados
            é recalculado ao vivo.
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mb-3">
        <div>
          <div className="label">Codes</div>
          <div className="flex flex-wrap gap-1.5 p-2 border border-line rounded-lg bg-bg-subtle max-h-32 overflow-auto">
            {allCodes.length === 0 ? (
              <div className="text-xs text-slate-500">Sem codes.</div>
            ) : (
              allCodes.map((code) => {
                const isSel = selectedCodes.includes(code);
                const def = analysis.eventDefinitions[code];
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => {
                      if (isSel) {
                        setSelectedCodes(selectedCodes.filter((c) => c !== code));
                      } else {
                        setSelectedCodes([...selectedCodes, code].sort((a, b) => a - b));
                      }
                    }}
                    className={`chip border ${
                      isSel ? 'bg-brand text-white border-brand' : 'bg-bg-elevated text-slate-700 border-line'
                    }`}
                    style={
                      !isSel && def?.color
                        ? { borderColor: `${def.color}66`, color: def.color }
                        : undefined
                    }
                  >
                    <span className="font-mono font-bold">{code}</span>
                    {def?.name && <span className="opacity-80">· {def.name}</span>}
                  </button>
                );
              })
            )}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Selecionados: {selectedCodes.length === 0 ? 'nenhum' : selectedCodes.join(', ')}
          </div>
        </div>

        <label className="block">
          <span className="label">Eixo X</span>
          <select className="input" value={xAxis} onChange={(e) => setXAxis(e.target.value as XAxisKind)}>
            <option value="time">Tempo (s)</option>
            <option value="sequence">Sequência 1..N</option>
          </select>
        </label>

        <label className="block">
          <span className="label">Eixo Y</span>
          <select className="input" value={yAxis} onChange={(e) => setYAxis(e.target.value as YAxisKind)}>
            <option value="code">Código (numérico)</option>
            <option value="deltaNext">Δ até o próximo (s)</option>
            <option value="deltaPrev">Δ desde o anterior (s)</option>
            <option value="cumulativeCount">Ocorrências cumulativas</option>
          </select>
        </label>
      </div>

      {selectedCodes.length === 0 ? (
        <div className="text-sm text-slate-500 text-center py-8">
          Selecione pelo menos um code para montar o scatter.
        </div>
      ) : (
        <div className="border border-line rounded-lg p-3 bg-bg-subtle/40">
          <LinearRegressionChart
            title={`y(${yAxis}) × x(${xAxis})`}
            points={points}
            color={
              selectedCodes.length === 1
                ? analysis.eventDefinitions[selectedCodes[0]]?.color ?? '#818cf8'
                : '#818cf8'
            }
          />
          <div className="text-[11px] text-slate-500 mt-2">
            Eixos: x = {xLabel}, y = {yLabel}.{' '}
            {xAxis === 'time' &&
              points.length > 0 &&
              `Janela: ${formatTime(points[0].x)} → ${formatTime(points[points.length - 1].x)}.`}
          </div>
        </div>
      )}
    </div>
  );
}
