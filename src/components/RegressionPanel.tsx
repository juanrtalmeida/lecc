import { useMemo, useState } from 'react';
import type { Analysis, RegressionModel } from '@/types';
import {
  buildBinnedDataset,
  fitOls,
  linePoints,
  prepareRegressionInput,
  INTERCEPT_ID,
  type OlsResult,
  type VariableDef,
} from '@/analysis';
import { useCurrentAnalysis } from '@/hooks';
import { uuid } from '@/utils';
import { RegressionScatter, type ScatterPoint } from './RegressionScatter';

const DEFAULT_BIN = 300; // 5 min

interface Props {
  analysis: Analysis;
  /** Sessão atualmente selecionada — gravada no modelo para recalcular igual depois. */
  session: string | 'ALL';
}

/**
 * Regressão linear simples e múltipla sobre a matriz de blocos de tempo.
 * Cada bloco de N segundos é uma observação; as variáveis (contagem, taxa e
 * intervalo médio por code) são escolhidas pelo usuário: 1 preditor = simples,
 * 2 ou mais = múltipla.
 */
export function RegressionPanel({ analysis, session }: Props) {
  const remove = useCurrentAnalysis((s) => s.removeRegression);
  const upsert = useCurrentAnalysis((s) => s.upsertRegression);
  const [editing, setEditing] = useState<RegressionModel | 'new' | null>(null);

  const models = analysis.regressions ?? [];

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <div>
          <h3 className="font-semibold text-slate-900">Regressão linear</h3>
          <p className="text-xs text-slate-500">
            A sessão é dividida em blocos de tempo; cada bloco é uma observação.
            Escolha a variável dependente e um ou mais preditores.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setEditing('new')}>
          + Novo modelo
        </button>
      </div>

      {models.length === 0 ? (
        <p className="text-sm text-slate-500">
          Nenhum modelo criado. Exemplo: "Reforços por bloco" explicado por
          "Respostas por bloco" e "Tempo decorrido".
        </p>
      ) : (
        <ul className="space-y-2">
          {models.map((m) => (
            <li
              key={m.id}
              className="border border-line rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-2"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-900">{m.name || '(sem nome)'}</div>
                <div className="text-xs text-slate-500 font-mono truncate">
                  {m.yVariable} ~ {m.xVariables.join(' + ')}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  bloco {formatBin(m.binSeconds)} · sessão {m.session === 'ALL' ? 'todas' : m.session}
                  {m.xVariables.length > 1
                    ? ` · múltipla (k=${m.xVariables.length})`
                    : ' · simples'}
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                {m.result?.ok ? (
                  <>
                    <span className="chip border-line text-slate-700 bg-bg-subtle">
                      <span className="text-slate-500">R²</span>
                      <span className="font-mono">{fmt(m.result.r2, 4)}</span>
                    </span>
                    <span className="chip border-line text-slate-700 bg-bg-subtle">
                      <span className="text-slate-500">p(F)</span>
                      <span className="font-mono">{formatP(m.result.fPValue)}</span>
                    </span>
                    <span className="chip border-line text-slate-700 bg-bg-subtle">
                      <span className="text-slate-500">n</span>
                      <span className="font-mono">{m.result.n}</span>
                    </span>
                  </>
                ) : (
                  <span className="chip border-amber-300 bg-amber-50 text-amber-700">
                    sem ajuste
                  </span>
                )}
              </div>
              <div className="flex gap-1">
                <button className="btn-ghost btn" onClick={() => setEditing(m)}>
                  Editar
                </button>
                <button
                  className="btn-ghost btn text-red-600 hover:text-red-700"
                  onClick={() => remove(m.id)}
                >
                  Excluir
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <Editor
          analysis={analysis}
          session={session}
          initial={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
          onSave={(m) => {
            upsert(m);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function Editor({
  analysis,
  session,
  initial,
  onClose,
  onSave,
}: {
  analysis: Analysis;
  session: string | 'ALL';
  initial?: RegressionModel;
  onClose: () => void;
  onSave: (m: RegressionModel) => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [binSeconds, setBinSeconds] = useState(initial?.binSeconds ?? DEFAULT_BIN);
  const [yVariable, setYVariable] = useState(initial?.yVariable ?? '');
  const [xVariables, setXVariables] = useState<string[]>(initial?.xVariables ?? []);

  const dataset = useMemo(
    () => buildBinnedDataset(analysis, binSeconds),
    [analysis, binSeconds],
  );

  const byId = useMemo(
    () => new Map(dataset.variables.map((v) => [v.id, v])),
    [dataset.variables],
  );

  // Ids podem sumir se o usuário trocar de sessão/código — filtra o que não existe.
  const validX = xVariables.filter((id) => byId.has(id) && id !== yVariable);
  const y = byId.has(yVariable) ? yVariable : '';
  // Chave estável: `validX` é um array novo a cada render, mas seu conteúdo não muda.
  const xKey = validX.join('|');

  const input = useMemo(
    () => (y && xKey ? prepareRegressionInput(dataset, y, xKey.split('|')) : null),
    [dataset, y, xKey],
  );

  const fit: OlsResult | null = useMemo(
    () => (input ? fitOls(input.y, input.X, input.labels, input.ids) : null),
    [input],
  );

  const valid = name.trim() !== '' && y !== '' && validX.length > 0;

  const model: RegressionModel = {
    id: initial?.id ?? uuid(),
    name: name.trim(),
    session: initial?.session ?? session,
    binSeconds,
    yVariable: y,
    xVariables: validX,
    createdAt: initial?.createdAt ?? new Date().toISOString(),
  };

  return (
    <div className="border border-line rounded-xl p-4 mt-4 bg-bg-subtle">
      <h4 className="font-medium mb-3 text-slate-900">
        {initial ? 'Editar modelo' : 'Novo modelo'}
      </h4>

      <div className="grid gap-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <label>
            <span className="label">Nome</span>
            <input
              className="input"
              value={name}
              placeholder="Ex.: Reforços ~ Respostas + Tempo"
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <BinPicker
            binSeconds={binSeconds}
            onChange={setBinSeconds}
            rowCount={dataset.rows.length}
            droppedPartialBin={dataset.droppedPartialBin}
          />
        </div>

        <label>
          <span className="label">Variável dependente (Y)</span>
          <select
            className="input"
            value={y}
            onChange={(e) => {
              const next = e.target.value;
              setYVariable(next);
              setXVariables((xs) => xs.filter((id) => id !== next));
            }}
          >
            <option value="">— selecione —</option>
            {dataset.variables.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
        </label>

        <VariablePicker
          label={`Preditores (X) — ${
            validX.length === 0
              ? 'selecione ao menos um'
              : validX.length === 1
                ? 'regressão simples'
                : `regressão múltipla (k=${validX.length})`
          }`}
          variables={dataset.variables}
          disabledId={y}
          value={validX}
          analysis={analysis}
          onChange={setXVariables}
        />

        <ResultBlock
          fit={fit}
          input={input}
          dataset={dataset}
          yVariable={y}
          analysis={analysis}
        />

        <div className="flex justify-end gap-2">
          <button className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn-primary" disabled={!valid} onClick={() => onSave(model)}>
            {initial ? 'Salvar alterações' : 'Criar modelo'}
          </button>
        </div>
      </div>
    </div>
  );
}

const BIN_PRESETS = [30, 60, 300, 600];

function BinPicker({
  binSeconds,
  onChange,
  rowCount,
  droppedPartialBin,
}: {
  binSeconds: number;
  onChange: (v: number) => void;
  rowCount: number;
  droppedPartialBin: boolean;
}) {
  const [unit, setUnit] = useState<'s' | 'min'>(binSeconds % 60 === 0 ? 'min' : 's');
  const shown = unit === 'min' ? binSeconds / 60 : binSeconds;

  return (
    <div>
      <span className="label">Tamanho do bloco (define n)</span>
      <div className="flex gap-2">
        <input
          className="input"
          type="number"
          min={1}
          step="any"
          value={Number.isFinite(shown) ? shown : ''}
          onChange={(e) => {
            const raw = Number(e.target.value);
            if (!Number.isFinite(raw) || raw <= 0) return;
            onChange(unit === 'min' ? raw * 60 : raw);
          }}
        />
        <select
          className="input w-24"
          value={unit}
          onChange={(e) => setUnit(e.target.value as 's' | 'min')}
        >
          <option value="s">seg</option>
          <option value="min">min</option>
        </select>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-1.5">
        {BIN_PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => {
              setUnit(p % 60 === 0 ? 'min' : 's');
              onChange(p);
            }}
            className={`chip border ${
              binSeconds === p
                ? 'bg-brand text-white border-brand'
                : 'bg-bg-elevated text-slate-700 border-line'
            }`}
          >
            {formatBin(p)}
          </button>
        ))}
      </div>
      <div className="text-[11px] text-slate-500 mt-1">
        n = {rowCount} {rowCount === 1 ? 'bloco' : 'blocos'}
        {droppedPartialBin && ' · último bloco incompleto descartado'}
      </div>
    </div>
  );
}

function VariablePicker({
  label,
  variables,
  disabledId,
  value,
  analysis,
  onChange,
}: {
  label: string;
  variables: VariableDef[];
  disabledId: string;
  value: string[];
  analysis: Analysis;
  onChange: (ids: string[]) => void;
}) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className="flex flex-wrap gap-1.5 max-h-52 overflow-auto p-2 border border-line rounded-lg bg-bg-elevated">
        {variables.length === 0 && (
          <div className="text-xs text-slate-500">Sem variáveis disponíveis.</div>
        )}
        {variables.map((v) => {
          const isSel = value.includes(v.id);
          const isDisabled = v.id === disabledId;
          const color = v.code != null ? analysis.eventDefinitions[v.code]?.color : undefined;
          return (
            <button
              key={v.id}
              type="button"
              disabled={isDisabled}
              onClick={() => {
                if (isSel) onChange(value.filter((id) => id !== v.id));
                else onChange([...value, v.id]);
              }}
              className={`chip border ${
                isSel
                  ? 'bg-brand text-white border-brand'
                  : 'bg-bg-subtle text-slate-700 border-line'
              } ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''}`}
              style={!isSel && !isDisabled && color ? { borderColor: `${color}66`, color } : undefined}
              title={isDisabled ? 'Já é a variável dependente (Y)' : v.id}
            >
              {v.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ResultBlock({
  fit,
  input,
  dataset,
  yVariable,
  analysis,
}: {
  fit: OlsResult | null;
  input: ReturnType<typeof prepareRegressionInput> | null;
  dataset: ReturnType<typeof buildBinnedDataset>;
  yVariable: string;
  analysis: Analysis;
}) {
  const yDef = dataset.variables.find((v) => v.id === yVariable);

  const chart = useMemo(() => {
    if (!fit || !fit.ok || !input) return null;
    const simple = fit.k === 1;
    if (simple) {
      const xs = input.X[0];
      const points: ScatterPoint[] = input.y.map((yv, i) => ({
        x: xs[i],
        y: yv,
        label: `bloco ${i + 1}`,
      }));
      const [b0, b1] = [fit.coefficients[0].beta, fit.coefficients[1].beta];
      return {
        points,
        line: linePoints(b0, b1, xs),
        xLabel: input.labels[0],
        yLabel: yDef?.label ?? yVariable,
        lineName: 'Reta ajustada',
      };
    }
    const points: ScatterPoint[] = input.y.map((yv, i) => ({
      x: fit.fitted[i],
      y: yv,
      label: `bloco ${i + 1}`,
    }));
    const finite = fit.fitted.filter((v) => Number.isFinite(v));
    const lo = Math.min(...finite, ...input.y);
    const hi = Math.max(...finite, ...input.y);
    return {
      points,
      line: [
        { x: lo, y: lo },
        { x: hi, y: hi },
      ],
      xLabel: 'Previsto pelo modelo',
      yLabel: `Observado — ${yDef?.label ?? yVariable}`,
      lineName: 'Ajuste perfeito (y = x)',
    };
  }, [fit, input, yDef, yVariable]);

  if (!fit || !input) {
    return (
      <div className="rounded-lg border border-line bg-bg-elevated p-3 text-sm text-slate-500">
        Escolha a variável dependente e pelo menos um preditor para ver o ajuste.
      </div>
    );
  }

  const color =
    input.ids.length === 1 && dataset.variables.find((v) => v.id === input.ids[0])?.code != null
      ? analysis.eventDefinitions[
          dataset.variables.find((v) => v.id === input.ids[0])!.code!
        ]?.color ?? '#818cf8'
      : '#818cf8';

  return (
    <div className="rounded-lg border border-line bg-bg-elevated p-3">
      <div className="text-xs uppercase tracking-wider text-slate-500 mb-2">
        Resultado (ao vivo)
      </div>

      {input.droppedRows > 0 && (
        <div className="text-xs text-amber-600 mb-2">
          {input.droppedRows}{' '}
          {input.droppedRows === 1 ? 'bloco descartado' : 'blocos descartados'} por dados
          faltantes nas variáveis escolhidas (intervalo médio exige ≥ 2 ocorrências no bloco).
        </div>
      )}

      {!fit.ok ? (
        <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
          {fit.reason}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 mb-3">
            <Stat label="n" value={String(fit.n)} />
            <Stat label="R²" value={fmt(fit.r2, 4)} />
            <Stat label="R² ajust." value={fmt(fit.adjR2, 4)} />
            <Stat label={`F(${fit.k}, ${fit.n - fit.k - 1})`} value={fmt(fit.f, 3)} />
            <Stat label="p (F)" value={formatP(fit.fPValue)} />
            <Stat label="σ resid." value={fmt(fit.residualStdError, 3)} />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-line">
                  <th className="py-1.5 pr-3">Variável</th>
                  <th className="py-1.5 px-3 text-right">β</th>
                  <th className="py-1.5 px-3 text-right">Erro padrão</th>
                  <th className="py-1.5 px-3 text-right">t</th>
                  <th className="py-1.5 px-3 text-right">p</th>
                  <th className="py-1.5 pl-3 text-right">IC 95%</th>
                </tr>
              </thead>
              <tbody>
                {fit.coefficients.map((c) => {
                  const signif = Number.isFinite(c.pValue) && c.pValue < 0.05;
                  return (
                    <tr key={c.name} className="border-b border-line/60 last:border-0">
                      <td className="py-1.5 pr-3 text-slate-700">
                        {c.name === INTERCEPT_ID ? (
                          <span className="text-slate-500">{c.label}</span>
                        ) : (
                          c.label
                        )}
                      </td>
                      <td className="py-1.5 px-3 text-right font-mono tabular-nums text-slate-900">
                        {fmt(c.beta, 4)}
                      </td>
                      <td className="py-1.5 px-3 text-right font-mono tabular-nums text-slate-600">
                        {fmt(c.stdError, 4)}
                      </td>
                      <td className="py-1.5 px-3 text-right font-mono tabular-nums text-slate-600">
                        {fmt(c.t, 3)}
                      </td>
                      <td
                        className={`py-1.5 px-3 text-right font-mono tabular-nums ${
                          signif ? 'font-semibold text-emerald-700' : 'text-slate-600'
                        }`}
                      >
                        {formatP(c.pValue)}
                      </td>
                      <td className="py-1.5 pl-3 text-right font-mono tabular-nums text-slate-500 whitespace-nowrap">
                        [{fmt(c.ciLow, 3)}, {fmt(c.ciHigh, 3)}]
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="text-xs text-slate-500 mt-2 font-mono break-words">
            {yDef?.label ?? yVariable} = {fmt(fit.coefficients[0].beta, 4)}
            {fit.coefficients.slice(1).map((c) => (
              <span key={c.name}>
                {c.beta >= 0 ? ' + ' : ' − '}
                {fmt(Math.abs(c.beta), 4)} · {c.name}
              </span>
            ))}
          </div>

          {chart && (
            <div className="mt-3 border border-line rounded-lg p-3 bg-bg-subtle/40">
              <RegressionScatter
                points={chart.points}
                line={chart.line}
                xLabel={chart.xLabel}
                yLabel={chart.yLabel}
                lineName={chart.lineName}
                color={color}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-bg-subtle px-2.5 py-1.5 border border-line">
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className="text-sm font-semibold tabular-nums mt-0.5 text-slate-900">{value}</div>
    </div>
  );
}

function fmt(v: number | undefined, digits: number): string {
  if (v == null || !Number.isFinite(v)) return '—';
  return v.toFixed(digits);
}

function formatP(p: number | undefined): string {
  if (p == null || !Number.isFinite(p)) return '—';
  if (p < 0.001) return '<0.001';
  return p.toFixed(3);
}

function formatBin(seconds: number): string {
  if (seconds % 60 === 0) return `${seconds / 60} min`;
  return `${seconds} s`;
}
