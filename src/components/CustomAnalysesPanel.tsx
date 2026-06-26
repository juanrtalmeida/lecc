import { useMemo, useState } from 'react';
import type { Analysis, CustomAnalysis } from '@/types';
import { ANALYSIS_OPERATIONS } from '@/types';
import { resolveCustomAnalysis } from '@/analysis';
import { uuid } from '@/utils';
import { useCurrentAnalysis } from '@/hooks';

export function CustomAnalysesPanel({ analysis }: { analysis: Analysis }) {
  const upsert = useCurrentAnalysis((s) => s.upsertCustomAnalysis);
  const remove = useCurrentAnalysis((s) => s.removeCustomAnalysis);

  const allCodes = useMemo(() => {
    return Array.from(new Set(analysis.events.map((e) => e.code))).sort((a, b) => a - b);
  }, [analysis]);

  const [editing, setEditing] = useState<CustomAnalysis | 'new' | null>(null);

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3 gap-3">
        <h3 className="font-semibold text-slate-900">Análises customizadas</h3>
        <button className="btn-primary" onClick={() => setEditing('new')}>
          + Nova análise
        </button>
      </div>

      {analysis.customAnalysis.length === 0 ? (
        <p className="text-sm text-slate-500">
          Nenhuma análise configurada. Crie combinações como "Resposta → Reforço → Média"
          ou "Reforço → Próxima Resposta → Intervalo médio".
        </p>
      ) : (
        <ul className="space-y-2">
          {analysis.customAnalysis.map((ca) => (
            <li
              key={ca.id}
              className="border border-line rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-2"
            >
              <div className="flex-1">
                <div className="font-medium text-slate-900">{ca.name || '(sem nome)'}</div>
                <div className="text-xs text-slate-500 font-mono">
                  {codesLabel(ca.from.codes)} → ({ca.directionAfter === 'next' ? 'próximo' : 'anterior'}) → {codesLabel(ca.to.codes)}
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="chip border-line text-slate-700 bg-bg-subtle">{ca.operation}</span>
                <span className="badge bg-brand/10 text-brand border border-brand/30">
                  {formatNumber(ca.result)}{' '}
                  <span className="text-slate-500 ml-1">n={ca.sampleSize ?? 0}</span>
                </span>
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
  allCodes,
  onClose,
  onSave,
}: {
  initial?: CustomAnalysis;
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
    initial?.operation ?? 'Média',
  );

  const candidate: CustomAnalysis = {
    id: initial?.id ?? uuid(),
    name,
    from: { codes: fromCodes, label: '' },
    to: { codes: toCodes, label: '' },
    directionAfter,
    operation,
    createdAt: initial?.createdAt ?? new Date().toISOString(),
  };

  const preview = resolveCustomAnalysis(analysis, candidate);
  const valid =
    candidate.name.trim() !== '' &&
    fromCodes.length > 0 &&
    toCodes.length > 0;

  return (
    <div className="border border-line rounded-xl p-4 mt-4 bg-bg-subtle">
      <h4 className="font-medium mb-3 text-slate-900">{initial ? 'Editar análise' : 'Nova análise'}</h4>
      <div className="grid gap-3">
        <label>
          <span className="label">Nome</span>
          <input
            className="input"
            value={name}
            placeholder="Ex.: Resposta → Reforço (Tempo Médio)"
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
              <option value="next">Próxima ocorrência depois</option>
              <option value="previous">Ocorrência anterior</option>
            </select>
          </label>
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
        </div>

        <div className="rounded-lg border border-line bg-bg-elevated p-3 text-sm">
          <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">
            Resultado (preview ao vivo)
          </div>
          {!valid && (
            <div className="text-slate-500">Preencha nome, origem e destino.</div>
          )}
          {valid && preview.value == null && (
            <div className="text-amber-600">
              {preview.emptyReason}{' '}
              <span className="text-slate-500">(n={preview.sampleSize})</span>
            </div>
          )}
          {valid && preview.value != null && (
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

function CodePicker({
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
