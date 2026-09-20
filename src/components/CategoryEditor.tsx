import { useState } from 'react';
import type { CustomCategory } from '@/types';
import {
  CATEGORY_SYMBOLS,
  EVENT_CATEGORIES,
  CATEGORY_META,
  SUGGESTED_COLORS,
  isCategoryNameTaken,
  normalizeCategoryName,
} from '@/types';

interface Props {
  /** Categorias customizadas em edição. */
  categories: CustomCategory[];
  onChange: (next: CustomCategory[]) => void;
  /** Quantos códigos usam cada categoria — avisa antes de excluir. */
  usage?: Record<string, number>;
}

/**
 * Gerenciador das categorias criadas pelo usuário.
 *
 * As cinco canônicas aparecem só para leitura: elas são o gabarito da timeline
 * e o destino dos códigos que perdem a categoria, então não podem ser editadas.
 */
export function CategoryEditor({ categories, onChange, usage = {} }: Props) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(SUGGESTED_COLORS[4]);
  const [symbol, setSymbol] = useState<string>(CATEGORY_SYMBOLS[4]);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const add = () => {
    const clean = normalizeCategoryName(name);
    if (clean === '') {
      setError('Dê um nome para a categoria.');
      return;
    }
    if (isCategoryNameTaken(clean, categories)) {
      setError(`Já existe uma categoria chamada "${clean}".`);
      return;
    }
    onChange([...categories, { name: clean, color, symbol }]);
    setName('');
    setError(null);
    // Avança na paleta para a próxima categoria não sair com a mesma cor.
    const i = SUGGESTED_COLORS.indexOf(color);
    setColor(SUGGESTED_COLORS[(i + 1) % SUGGESTED_COLORS.length]);
  };

  const commitRename = (from: string) => {
    const clean = normalizeCategoryName(editName);
    if (clean === '' || clean === from) {
      setEditing(null);
      return;
    }
    if (isCategoryNameTaken(clean, categories, from)) {
      setError(`Já existe uma categoria chamada "${clean}".`);
      return;
    }
    onChange(categories.map((c) => (c.name === from ? { ...c, name: clean } : c)));
    setEditing(null);
    setError(null);
  };

  const remove = (target: string) => {
    const used = usage[target] ?? 0;
    if (
      used > 0 &&
      !window.confirm(
        `${used} código(s) usam "${target}". Excluir a categoria devolve esses códigos para "Outro". Continuar?`,
      )
    ) {
      return;
    }
    onChange(categories.filter((c) => c.name !== target));
    setError(null);
  };

  return (
    <div className="border border-line rounded-xl p-3 bg-bg-subtle/60">
      <div className="flex items-baseline gap-2 flex-wrap mb-2">
        <span className="label !mb-0">Categorias</span>
        <span className="text-xs text-slate-500">
          as 5 padrão são fixas; crie quantas quiser além delas
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {EVENT_CATEGORIES.map((c) => (
          <span
            key={c}
            className="chip"
            style={{
              background: `${CATEGORY_META[c].color}18`,
              borderColor: `${CATEGORY_META[c].color}44`,
              color: CATEGORY_META[c].color,
            }}
            title="Categoria padrão — não pode ser renomeada nem excluída"
          >
            <span className="font-bold leading-none">{CATEGORY_META[c].symbol}</span>
            {c}
            <span className="text-slate-400 tabular-nums">{usage[c] ?? 0}</span>
          </span>
        ))}

        {categories.map((c) => (
          <span
            key={c.name}
            className="chip"
            style={{ background: `${c.color}18`, borderColor: `${c.color}66`, color: c.color }}
          >
            <span className="font-bold leading-none">{c.symbol}</span>
            {editing === c.name ? (
              <input
                autoFocus
                className="bg-transparent border-b border-current outline-none w-24 text-xs"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={() => commitRename(c.name)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                  if (e.key === 'Escape') setEditing(null);
                }}
              />
            ) : (
              <button
                type="button"
                title="Renomear"
                onClick={() => {
                  setEditing(c.name);
                  setEditName(c.name);
                }}
              >
                {c.name}
              </button>
            )}
            <span className="text-slate-400 tabular-nums">{usage[c.name] ?? 0}</span>
            <button
              type="button"
              className="text-slate-400 hover:text-red-500 font-bold leading-none ml-0.5"
              title={`Excluir "${c.name}"`}
              onClick={() => remove(c.name)}
            >
              ×
            </button>
          </span>
        ))}
      </div>

      {/* Criação -------------------------------------------------------- */}
      <div className="flex items-end gap-2 flex-wrap">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wider text-slate-400">
            Nova categoria
          </span>
          <input
            className="input !py-1.5 w-44 text-sm"
            placeholder="Ex.: Tentativa omitida"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                add();
              }
            }}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wider text-slate-400">Cor</span>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-10 h-9 rounded-lg bg-bg-panel border border-line cursor-pointer p-1"
          />
        </label>

        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wider text-slate-400">Símbolo</span>
          <div className="flex flex-wrap gap-1 max-w-[16rem]">
            {CATEGORY_SYMBOLS.map((sym) => (
              <button
                key={sym}
                type="button"
                onClick={() => setSymbol(sym)}
                className={`w-7 h-7 rounded-md border text-sm leading-none transition-colors ${
                  symbol === sym
                    ? 'border-brand bg-brand/10 text-brand'
                    : 'border-line bg-bg-panel text-slate-500 hover:border-brand/40'
                }`}
              >
                {sym}
              </button>
            ))}
          </div>
        </div>

        <button type="button" className="btn-primary" onClick={add}>
          Adicionar
        </button>
      </div>

      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );
}
