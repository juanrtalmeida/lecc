import { useMemo, useState } from 'react';
import type { CustomCategory, EventDefinition } from '@/types';
import {
  EVENT_CATEGORIES,
  CATEGORY_META,
  FALLBACK_CATEGORY,
  buildCategoryList,
  buildCategoryMap,
} from '@/types';
import { CategoryBadge } from './CategoryBadge';
import { CategoryEditor } from './CategoryEditor';
import { formatTimeShort } from '@/utils';

interface Props {
  /** Códigos já conhecidos da análise; cada um PRECISA ter definição ao final. */
  knownCodes: number[];
  /** Eventos agregados por code (count, primeira, última). */
  codeStats: Record<number, { count: number; first: number; last: number }>;
  /** Estado inicial das definições. */
  initial: Record<number, EventDefinition>;
  /** Categorias customizadas já existentes na análise. */
  initialCategories?: CustomCategory[];
  /** Devolve definições e categorias juntas — as duas são salvas na mesma ação. */
  onSave: (
    next: Record<number, EventDefinition>,
    customCategories: CustomCategory[],
  ) => void;
  onCancel?: () => void;
  /** Quando já foi salva alguma vez — transforma botão "Concluir" em "Atualizar identificações". */
  isUpdate?: boolean;
}

export function EventIdentificationForm({
  knownCodes,
  codeStats,
  initial,
  initialCategories = [],
  onSave,
  onCancel,
  isUpdate,
}: Props) {
  const [defs, setDefs] = useState<Record<number, EventDefinition>>(() => {
    const out: Record<number, EventDefinition> = {};
    for (const code of knownCodes) {
      out[code] = initial[code] ?? suggestedFor(code, EVENT_CATEGORIES[0]);
    }
    return out;
  });
  const [cats, setCats] = useState<CustomCategory[]>(initialCategories);

  const missing = useMemo(
    () => knownCodes.filter((c) => !defs[c]?.name?.trim()),
    [knownCodes, defs],
  );

  const categoryOptions = useMemo(() => buildCategoryList(cats), [cats]);
  const categoryMap = useMemo(() => buildCategoryMap(cats), [cats]);

  /** Quantos códigos usam cada categoria — alimenta os contadores do editor. */
  const usage = useMemo(() => {
    const out: Record<string, number> = {};
    for (const info of categoryOptions) out[info.name] = 0;
    for (const code of knownCodes) {
      const cat = defs[code]?.category ?? FALLBACK_CATEGORY;
      const key = out[cat] != null ? cat : FALLBACK_CATEGORY;
      out[key] = (out[key] ?? 0) + 1;
    }
    return out;
  }, [categoryOptions, defs, knownCodes]);

  /**
   * Ao excluir/renomear uma categoria, as definições precisam acompanhar —
   * senão ficam apontando para um nome que não existe mais.
   */
  const changeCategories = (next: CustomCategory[]) => {
    const validNames = new Set(buildCategoryList(next).map((c) => c.name));
    const before = cats.map((c) => c.name);
    const after = next.map((c) => c.name);

    // Renomeação: mesma posição, nome diferente. Arrasta os códigos junto.
    const renames = new Map<string, string>();
    if (before.length === after.length) {
      before.forEach((old, i) => {
        if (old !== after[i]) renames.set(old, after[i]);
      });
    }

    const nextDefs: Record<number, EventDefinition> = {};
    for (const [code, def] of Object.entries(defs)) {
      const renamed = renames.get(def.category);
      const category = renamed ?? def.category;
      nextDefs[Number(code)] = {
        ...def,
        category: validNames.has(category) ? category : FALLBACK_CATEGORY,
      };
    }

    setCats(next);
    setDefs(nextDefs);
  };

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            {isUpdate ? 'Editar identificação de eventos' : 'Identifique os eventos'}
          </h2>
          <p className="text-sm text-slate-500">
            Dê um nome, uma categoria e uma cor para cada código detectado.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-500">
            {knownCodes.length - missing.length}/{knownCodes.length} prontos
          </span>
        </div>
      </div>

      <div className="mb-4">
        <CategoryEditor categories={cats} onChange={changeCategories} usage={usage} />
      </div>

      <ul className="divide-y divide-line">
        {knownCodes.map((code) => {
          const def = defs[code];
          const stats = codeStats[code];
          return (
            <li
              key={code}
              className="py-4 grid grid-cols-1 md:grid-cols-[80px_1fr_180px_120px] gap-3 items-center"
            >
              <div className="text-center">
                <div className="text-2xl font-mono font-bold text-slate-900">{code}</div>
                <div className="text-xs text-slate-500 mt-1">
                  {stats?.count ?? 0} eventos
                </div>
              </div>

              <div>
                <label className="label text-slate-700" htmlFor={`name-${code}`}>
                  Nome
                </label>
                <input
                  id={`name-${code}`}
                  className="input"
                  value={def.name}
                  placeholder={`Ex.: Resposta de barra (cód. ${code})`}
                  onChange={(e) =>
                    setDefs({ ...defs, [code]: { ...def, name: e.target.value } })
                  }
                />
                <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                  <span>
                    1ª: {stats?.first != null ? formatTimeShort(stats.first) : '—'}
                  </span>
                  <span>·</span>
                  <span>
                    últ.: {stats?.last != null ? formatTimeShort(stats.last) : '—'}
                  </span>
                </div>
              </div>

              <div>
                <label className="label" htmlFor={`cat-${code}`}>
                  Categoria
                </label>
                <select
                  id={`cat-${code}`}
                  className="input"
                  value={def.category}
                  onChange={(e) =>
                    setDefs({ ...defs, [code]: { ...def, category: e.target.value } })
                  }
                >
                  {categoryOptions.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.symbol} {c.name}
                      {c.custom ? ' (sua)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label" htmlFor={`color-${code}`}>
                  Cor
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id={`color-${code}`}
                    type="color"
                    value={def.color}
                    onChange={(e) =>
                      setDefs({ ...defs, [code]: { ...def, color: e.target.value } })
                    }
                    className="w-10 h-10 rounded-lg bg-bg-panel border border-line cursor-pointer p-1"
                  />
                  <button
                    type="button"
                    className="btn-ghost btn"
                    title="Sortear cor"
                    onClick={() => {
                      // Sorteio determinístico-per-code mas bastante espalhado: HSL.
                      // Hue derivado de code * 47 (espalha bem); saturação/clarura fixas
                      // para garantir cor legível contra fundo escuro.
                      const hue = (code * 47 + defs[code].category.length * 13) % 360;
                      const next = hslToHex(hue, 65, 60);
                      setDefs({ ...defs, [code]: { ...def, color: next } });
                    }}
                  >
                    Sortear
                  </button>
                </div>
                <div className="mt-2">
                  <CategoryBadge category={def.category} categories={categoryMap} />
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center justify-between mt-5">
        <div className="text-xs text-slate-500">
          {missing.length === 0 ? (
            <span className="text-emerald-600">Tudo identificado ✓</span>
          ) : (
            <span>
              Faltam {missing.length} códigos sem nome:{' '}
              <span className="font-mono">{missing.join(', ')}</span>
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {onCancel && (
            <button className="btn" onClick={onCancel}>
              Cancelar
            </button>
          )}
          <button
            className="btn-primary"
            disabled={missing.length > 0}
            onClick={() => onSave(defs, cats)}
          >
            {isUpdate ? 'Salvar alterações' : 'Abrir dashboard'}
          </button>
        </div>
      </div>
    </div>
  );
}

function suggestedFor(code: number, category: string): EventDefinition {
  const meta = CATEGORY_META[category as keyof typeof CATEGORY_META];
  // Cor inicial: tom HSL espalhado por code, garantindo que codes próximos
  // não fiquem parecidos. Mantém o ícone da categoria sempre visível no chip.
  const hue = (code * 47 + category.length * 13) % 360;
  const color =
    category === 'Outro' ? hslToHex(hue, 65, 60) : meta?.color ?? hslToHex(hue, 65, 60);
  return {
    name: `Cód. ${code}`,
    category,
    color,
  };
}

/** HSL → Hex (#rrggbb). Aceita S, L em [0, 100]. */
function hslToHex(h: number, s: number, l: number): string {
  const sat = s / 100;
  const lum = l / 100;
  const c = (1 - Math.abs(2 * lum - 1)) * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lum - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else[r, g, b] = [c, 0, x];
  const toHex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
