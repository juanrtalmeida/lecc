import { useMemo, useState } from 'react';
import type { Analysis } from '@/types';
import { transitionMatrix } from '@/analysis';
import { CodePicker } from './CustomAnalysesPanel';

/**
 * P(próximo evento = coluna | evento atual = linha). A última linha é a taxa de
 * base — quanto cada código aparece como "seguinte" em geral — para comparar:
 * uma célula bem acima da base indica sequência preferida.
 *
 * Esconder um evento só tira a linha/coluna da tela: a sequência continua a
 * mesma, e as transições para os ocultos somam na coluna "outros". Assim cada
 * linha segue fechando 100%.
 */
export function TransitionMatrix({ analysis }: { analysis: Analysis }) {
  const m = useMemo(() => transitionMatrix(analysis.events), [analysis.events]);
  const def = (code: number) => analysis.eventDefinitions[code];
  const label = (code: number) => def(code)?.name ?? `cód. ${code}`;

  // Guarda os ocultos, não os visíveis: um código novo (outro recorte) aparece sozinho.
  const [hidden, setHidden] = useState<number[]>([]);
  const [picking, setPicking] = useState(false);
  const shown = m.codes.map((c, i) => ({ c, i })).filter(({ c }) => !hidden.includes(c));
  const hasOthers = shown.length < m.codes.length;
  const sumShown = (pick: (j: number) => number) => shown.reduce((a, { i }) => a + pick(i), 0);

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
        <div>
          <h3 className="font-semibold text-slate-900">Matriz de transição</h3>
          <p className="text-sm text-slate-500">
            Linha = evento atual · coluna = evento <strong>imediatamente seguinte</strong>.
            Passe o mouse para ver as contagens.
          </p>
        </div>
        {m.total > 0 && (
          <button className="btn" onClick={() => setPicking((p) => !p)}>
            Eventos ({shown.length}/{m.codes.length})
          </button>
        )}
      </div>

      {picking && (
        <div className="mb-3">
          <CodePicker
            label="Eventos na matriz"
            options={m.codes}
            defs={analysis.eventDefinitions}
            value={shown.map(({ c }) => c)}
            onChange={(visible) => setHidden(m.codes.filter((c) => !visible.includes(c)))}
          />
          <div className="flex gap-2 mt-1">
            <button className="btn-ghost btn text-xs" onClick={() => setHidden([])}>
              Mostrar todos
            </button>
            <button className="btn-ghost btn text-xs" onClick={() => setHidden(m.codes)}>
              Ocultar todos
            </button>
          </div>
        </div>
      )}

      {m.total === 0 ? (
        <p className="text-sm text-slate-500">São necessários pelo menos 2 eventos.</p>
      ) : shown.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhum evento selecionado.</p>
      ) : (
        // table-fixed + colunas iguais: a matriz ocupa a largura do card sem
        // rolar. O scroll horizontal fica só de reserva para dezenas de códigos.
        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-[11px] tabular-nums border-collapse">
            <colgroup>
              <col className="w-40" />
              {shown.map(({ c }) => (
                <col key={c} />
              ))}
              {hasOthers && <col />}
              <col className="w-12" />
            </colgroup>
            <thead>
              <tr>
                <th className="p-1 text-left align-bottom font-normal text-slate-500">
                  atual ↓ · seguinte →
                </th>
                {shown.map(({ c }) => (
                  <th key={c} className="p-1 align-bottom" title={label(c)}>
                    <Header code={c} name={label(c)} color={def(c)?.color} />
                  </th>
                ))}
                {hasOthers && (
                  <th className="p-1 align-bottom font-normal italic text-slate-500">outros</th>
                )}
                <th className="p-1 align-bottom text-right font-normal text-slate-500">n</th>
              </tr>
            </thead>
            <tbody>
              {shown.map(({ c: from, i }) => (
                <tr key={from}>
                  <th className="p-1 text-left font-normal" title={label(from)}>
                    <Header code={from} name={label(from)} color={def(from)?.color} inline />
                  </th>
                  {shown.map(({ c: to, i: j }) => (
                    <Cell key={to} k={m.counts[i][j]} n={m.rowTotals[i]} title={`${label(from)} → ${label(to)}`} />
                  ))}
                  {hasOthers && (
                    <Cell
                      k={m.rowTotals[i] - sumShown((j) => m.counts[i][j])}
                      n={m.rowTotals[i]}
                      title={`${label(from)} → outros`}
                      muted
                    />
                  )}
                  <td className="p-1 text-slate-500 text-right">{m.rowTotals[i]}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-line">
                <th className="p-1 text-left font-normal italic text-slate-500">base (qualquer)</th>
                {shown.map(({ c: to, i: j }) => (
                  <Cell key={to} k={m.colTotals[j]} n={m.total} title={`qualquer → ${label(to)}`} muted />
                ))}
                {hasOthers && (
                  <Cell k={m.total - sumShown((j) => m.colTotals[j])} n={m.total} title="qualquer → outros" muted />
                )}
                <td className="p-1 text-slate-500 text-right">{m.total}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** Código em destaque + nome em até 2 linhas — legível sem texto vertical. */
function Header({ code, name, color, inline }: { code: number; name: string; color?: string; inline?: boolean }) {
  return (
    <div className={`flex gap-1 leading-tight ${inline ? 'items-center' : 'flex-col items-center text-center'}`}>
      <span
        className="font-mono font-bold text-slate-900 rounded px-1"
        style={color ? { background: `${color}22`, color } : undefined}
      >
        {code}
      </span>
      <span className={`text-slate-600 break-words min-w-0 ${inline ? 'truncate' : 'line-clamp-2'}`}>{name}</span>
    </div>
  );
}

function Cell({ k, n, title, muted }: { k: number; n: number; title: string; muted?: boolean }) {
  const p = n > 0 ? k / n : 0;
  return (
    <td
      className={`p-1 text-center border border-line min-w-[2.25rem] ${muted ? 'text-slate-500' : 'text-slate-900'}`}
      // Intensidade proporcional à probabilidade, na cor da marca.
      style={{ background: p > 0 ? `rgb(99 102 241 / ${(p * 0.6).toFixed(3)})` : undefined }}
      title={`${title}: ${k} de ${n}`}
    >
      {n > 0 && k > 0 ? `${(p * 100).toFixed(0)}%` : '·'}
    </td>
  );
}
