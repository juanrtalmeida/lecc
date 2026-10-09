import { useMemo, useState } from 'react';
import type { Analysis, CustomAnalysis } from '@/types';
import { ANALYSIS_OPERATIONS, PROBABILITY_OPERATION } from '@/types';
import { resolveCustomAnalysis, wilsonInterval } from '@/analysis';
import { uuid } from '@/utils';
import { useCurrentAnalysis } from '@/hooks';

type Kind = 'time' | 'probability';

const isProbability = (ca: CustomAnalysis) => ca.operation === PROBABILITY_OPERATION;

export function CustomAnalysesPanel({
  analysis,
  kind = 'time',
}: {
  analysis: Analysis;
  /** Mesmo armazenamento, blocos diferentes: tempos ou probabilidades. */
  kind?: Kind;
}) {
  const prob = kind === 'probability';
  // Resolve sobre a análise recebida (já recortada). O result cacheado no
  // objeto vale para a sessão inteira e ignoraria a janela e o isolamento.
  const items = useMemo(
    () =>
      analysis.customAnalysis
        .filter((ca) => isProbability(ca) === prob)
        .map((ca) => {
          const r = resolveCustomAnalysis(analysis, ca);
          return { ...ca, result: r.value ?? undefined, sampleSize: r.sampleSize, successes: r.successes };
        }),
    [analysis, prob],
  );
  const upsert = useCurrentAnalysis((s) => s.upsertCustomAnalysis);
  const remove = useCurrentAnalysis((s) => s.removeCustomAnalysis);

  const allCodes = useMemo(() => {
    return Array.from(new Set(analysis.events.map((e) => e.code))).sort((a, b) => a - b);
  }, [analysis]);

  const [editing, setEditing] = useState<CustomAnalysis | 'new' | null>(null);

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3 gap-3">
        <h3 className="font-semibold text-slate-900">
          {prob ? 'Probabilidade condicional' : 'Tempo entre eventos'}
        </h3>
        <button className="btn-primary" onClick={() => setEditing('new')}>
          + Nova análise
        </button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-slate-500">
          {prob
            ? 'Nenhuma probabilidade configurada. Ex.: "P(Reforço em até 5 s depois de uma Resposta)" ou "P(Resposta antes da próxima luz)".'
            : 'Nenhuma análise configurada. Crie combinações como "Resposta → Reforço → Média" ou "Reforço → Próxima Resposta → Intervalo médio".'}
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((ca) => (
            <li
              key={ca.id}
              className="border border-line rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-2"
            >
              <div className="flex-1">
                <div className="font-medium text-slate-900">{ca.name || '(sem nome)'}</div>
                <div className="text-xs text-slate-500 font-mono">
                  {codesLabel(ca.from.codes)} → ({ca.directionAfter === 'next' ? 'próximo' : 'anterior'}) → {codesLabel(ca.to.codes)}
                  {prob && ` · ${probabilityLimits(ca)}`}
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                {prob ? (
                  <span className="badge bg-brand/10 text-brand border border-brand/30">
                    {formatPercent(ca.result)}{' '}
                    <span className="text-slate-500 ml-1">
                      {ca.successes ?? 0}/{ca.sampleSize ?? 0}
                    </span>
                  </span>
                ) : (
                  <>
                    <span className="chip border-line text-slate-700 bg-bg-subtle">{ca.operation}</span>
                    <span className="badge bg-brand/10 text-brand border border-brand/30">
                      {formatNumber(ca.result)}{' '}
                      <span className="text-slate-500 ml-1">n={ca.sampleSize ?? 0}</span>
                    </span>
                  </>
                )}
              </div>
              <div className="flex gap-1">
                <button className="btn-ghost btn" onClick={() => setEditing(ca)}>
                  Editar
                </button>
                <button className="btn-ghost btn text-red-600 hover:text-red-700" onClick={() => remove(ca.id)}>
                  Excluir
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <Editor
          allCodes={allCodes}
          analysis={analysis}
          prob={prob}
          initial={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
          onSave={(ca) => {
            upsert(ca);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function Editor({
  initial,
  analysis,
  prob,
  allCodes,
  onClose,
  onSave,
}: {
  initial?: CustomAnalysis;
  prob: boolean;
  analysis: Analysis;
  allCodes: number[];
  onClose: () => void;
  onSave: (ca: CustomAnalysis) => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [fromCodes, setFromCodes] = useState<number[]>(initial?.from.codes ?? []);
  const [toCodes, setToCodes] = useState<number[]>(initial?.to.codes ?? []);
  const [directionAfter, setDirectionAfter] = useState<'next' | 'previous'>(
    initial?.directionAfter ?? 'next',
  );
  const [operation, setOperation] = useState<CustomAnalysis['operation']>(
    initial?.operation ?? (prob ? PROBABILITY_OPERATION : 'Média'),
  );
  // Texto livre para o campo poder ficar vazio (= sem limite de tempo).
  const [windowText, setWindowText] = useState(
    initial?.windowSeconds != null ? String(initial.windowSeconds) : '',
  );
  const [untilNextFrom, setUntilNextFrom] = useState(initial?.untilNextFrom ?? true);
  const windowSeconds = windowText.trim() === '' ? undefined : Number(windowText.replace(',', '.'));
  const windowValid = windowSeconds === undefined || (Number.isFinite(windowSeconds) && windowSeconds > 0);

  const candidate: CustomAnalysis = {
    id: initial?.id ?? uuid(),
    name,
    from: { codes: fromCodes, label: '' },
    to: { codes: toCodes, label: '' },
    directionAfter,
    operation,
    ...(prob && { windowSeconds, untilNextFrom }),
    createdAt: initial?.createdAt ?? new Date().toISOString(),
  };

  const preview = resolveCustomAnalysis(analysis, candidate);
  const valid =
    candidate.name.trim() !== '' &&
    fromCodes.length > 0 &&
    toCodes.length > 0 &&
    // Sem nenhum limite, "B depois de A" vira só "B ocorre em algum momento depois".
    (!prob || (windowValid && (windowSeconds !== undefined || untilNextFrom)));

  return (
    <div className="border border-line rounded-xl p-4 mt-4 bg-bg-subtle">
      <h4 className="font-medium mb-3 text-slate-900">
        {initial ? 'Editar' : 'Nova'} {prob ? 'probabilidade' : 'análise'}
      </h4>
      <div className="grid gap-3">
        <label>
          <span className="label">Nome</span>
          <input
            className="input"
            value={name}
            placeholder={prob ? 'Ex.: P(Reforço | Resposta, 5 s)' : 'Ex.: Resposta → Reforço (Tempo Médio)'}
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <div className="grid sm:grid-cols-2 gap-3">
          <CodePicker
            label="Evento origem"
            options={allCodes}
            defs={analysis.eventDefinitions}
            value={fromCodes}
            onChange={setFromCodes}
          />
          <CodePicker
            label="Evento destino"
            options={allCodes}
            defs={analysis.eventDefinitions}
            value={toCodes}
            onChange={setToCodes}
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <label>
            <span className="label">Direção</span>
            <select
              className="input"
              value={directionAfter}
              onChange={(e) => setDirectionAfter(e.target.value as 'next' | 'previous')}
            >
              <option value="next">{prob ? 'Destino depois da origem' : 'Próxima ocorrência depois'}</option>
              <option value="previous">{prob ? 'Destino antes da origem' : 'Ocorrência anterior'}</option>
            </select>
          </label>
          {prob ? (
            <label>
              <span className="label">Em até (segundos)</span>
              <input
                className="input"
                inputMode="decimal"
                value={windowText}
                placeholder="sem limite"
                onChange={(e) => setWindowText(e.target.value)}
              />
            </label>
          ) : (
          <label>
            <span className="label">Operação</span>
            <select
              className="input"
              value={operation}
              onChange={(e) => setOperation(e.target.value as CustomAnalysis['operation'])}
            >
              {ANALYSIS_OPERATIONS.map((op) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </select>
          </label>
          )}
        </div>

        {prob && (
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={untilNextFrom}
              onChange={(e) => setUntilNextFrom(e.target.checked)}
            />
            Só conta se não houver outra ocorrência da origem no meio
          </label>
        )}

        <div className="rounded-lg border border-line bg-bg-elevated p-3 text-sm">
          <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">
            Resultado (preview ao vivo)
          </div>
          {!valid && (
            <div className="text-slate-500">
              {prob && !windowValid
                ? 'O tempo máximo precisa ser um número maior que zero.'
                : prob && windowSeconds === undefined && !untilNextFrom
                  ? 'Defina um tempo máximo ou limite pela próxima origem.'
                  : 'Preencha nome, origem e destino.'}
            </div>
          )}
          {valid && preview.value == null && (
            <div className="text-amber-600">
              {preview.emptyReason}{' '}
              <span className="text-slate-500">(n={preview.sampleSize})</span>
            </div>
          )}
          {valid && preview.value != null && prob && (
            <ProbabilityPreview k={preview.successes ?? 0} n={preview.sampleSize} />
          )}
          {valid && preview.value != null && !prob && (
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-slate-900">
                {operation === 'Contagem' ? preview.value : formatTimeShortOrRaw(preview.value)}
              </span>
              <span className="text-xs text-slate-500">
                {operation === 'Contagem' ? 'ocorrências' : `amostras: ${preview.sampleSize}`}
              </span>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <button className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn-primary"
            disabled={!valid}
            onClick={() => onSave(candidate)}
          >
            {initial ? 'Salvar alterações' : 'Criar análise'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function CodePicker({
  label,
  options,
  defs,
  value,
  onChange,
}: {
  label: string;
  options: number[];
  defs: Analysis['eventDefinitions'];
  value: number[];
  onChange: (codes: number[]) => void;
}) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className="flex flex-wrap gap-1.5 max-h-44 overflow-auto p-2 border border-line rounded-lg bg-bg-subtle">
        {options.length === 0 && (
          <div className="text-xs text-slate-500">Sem códigos disponíveis.</div>
        )}
        {options.map((code) => {
          const def = defs[code];
          const isSel = value.includes(code);
          return (
            <button
              key={code}
              type="button"
              onClick={() => {
                if (isSel) onChange(value.filter((c) => c !== code));
                else onChange([...value, code]);
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
        })}
      </div>
      <div className="text-[11px] text-slate-500 mt-1">
        Selecionados: {value.length === 0 ? 'nenhum' : value.join(', ')}
      </div>
    </div>
  );
}

function codesLabel(codes: number[]): string {
  if (codes.length === 0) return '—';
  if (codes.length === 1) return `cód. ${codes[0]}`;
  if (codes.length <= 3) return codes.map((c) => c).join(', ');
  return `${codes.slice(0, 3).join(', ')}… (+${codes.length - 3})`;
}

function formatNumber(v: number | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—';
  return v.toFixed(2);
}

function formatTimeShortOrRaw(v: number): string {
  // Algumas operações (Soma) podem passar de 1000s; mantém formato claro.
  if (Math.abs(v) < 100) return `${v.toFixed(2)}s`;
  return `${v.toFixed(2)}`;
}

function ProbabilityPreview({ k, n }: { k: number; n: number }) {
  const ci = wilsonInterval(k, n);
  return (
    <div className="flex items-baseline gap-2 flex-wrap">
      <span className="text-2xl font-semibold text-slate-900">{formatPercent(k / n)}</span>
      <span className="text-xs text-slate-500">
        {k} de {n} origens
        {ci && ` · IC 95%: ${formatPercent(ci[0])} – ${formatPercent(ci[1])}`}
      </span>
    </div>
  );
}

function probabilityLimits(ca: CustomAnalysis): string {
  const parts: string[] = [];
  if (ca.windowSeconds != null) parts.push(`≤ ${ca.windowSeconds}s`);
  if (ca.untilNextFrom) parts.push('sem outra origem no meio');
  return parts.join(', ');
}

function formatPercent(v: number | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—';
  return `${(v * 100).toFixed(1)}%`;
}
