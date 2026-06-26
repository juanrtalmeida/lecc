import { useEffect, useMemo, useRef, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import type { Analysis, RawEvent } from '@/types';
import { CategoryBadge } from './CategoryBadge';
import { formatTime, formatTimeShort } from '@/utils';

interface Props {
  analysis: Analysis;
  highlightIndex?: number | null;
  onSelectEvent?: (eventIndex: number) => void;
}

interface EventRow {
  index: number;
  time: number;
  timestamp: number;
  code: number;
  name: string;
  category: string;
}

export function EventsTable({ analysis, highlightIndex, onSelectEvent }: Props) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Recalcula linhas quando a análise muda.
  const rows: EventRow[] = useMemo(() => {
    return analysis.events.map((ev: RawEvent, idx) => {
      const def = analysis.eventDefinitions[ev.code];
      return {
        index: idx,
        time: ev.time,
        timestamp: ev.timestamp,
        code: ev.code,
        name: def?.name ?? `(cód. ${ev.code})`,
        category: def?.category ?? 'Outro',
      };
    });
  }, [analysis]);

  // Reset quando muda análise (análise anterior já fica em outro componente).
  useEffect(() => {
    setGlobalFilter('');
    setCategoryFilter('all');
    setSorting([]);
  }, [analysis.id]);

  // Códigos únicos para o filtro
  const codeOptions = useMemo(() => {
    const set = new Set<number>();
    for (const ev of analysis.events) set.add(ev.code);
    return Array.from(set).sort((a, b) => a - b);
  }, [analysis]);

  const filteredRows = useMemo(() => {
    if (categoryFilter === 'all') return rows;
    return rows.filter((r) => r.category === categoryFilter);
  }, [rows, categoryFilter]);

  // ----- Filtro de busca (apenas code + name) -------------------------------
  // Substitui o `globalFilterFn: 'includesString'` padrão, que serializava a linha
  // inteira e podia casar campos como índice/ timestamp/ time — não é isso que o
  // usuário quer quando digita no campo "Buscar (código, nome...)".
  // Aceita busca por substring de dígitos em `code` ou substring (case-insensitive)
  // em `name`. Linhas que não casam são removidas.
  const searchedRows = useMemo(() => {
    const q = globalFilter.trim().toLowerCase();
    if (!q) return filteredRows;
    return filteredRows.filter((r) => {
      // match exato (string) ou por substring de dígitos no código
      if (String(r.code).includes(q)) return true;
      if (r.name.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [filteredRows, globalFilter]);

  // Mapa `index → posição` dentro das linhas visíveis e array de tempos
  // anteriores — usados pela célula Δ para calcular a diferença entre
  // a linha atual e a anterior **na tabela visível** (não na lista global).
  const rowPositions = useMemo(() => {
    const m = new Map<number, number>();
    searchedRows.forEach((r, i) => m.set(r.index, i));
    return m;
  }, [searchedRows]);
  const visibleTimeAtPos = useMemo(
    () => searchedRows.map((r) => r.time),
    [searchedRows],
  );

  const columns = useMemo<ColumnDef<EventRow>[]>(
    () => [
      {
        accessorKey: 'index',
        header: '#',
        cell: ({ row }) => (
          <span className="text-slate-700 font-mono text-xs">{row.original.index + 1}</span>
        ),
        size: 60,
      },
      {
        accessorKey: 'time',
        header: 'Tempo (s)',
        cell: ({ row }) => (
          <span className="font-mono text-slate-700">{formatTime(row.original.time)}</span>
        ),
      },
      {
        accessorKey: 'timestamp',
        header: 'Timestamp',
        cell: ({ row }) => (
          <span className="font-mono text-slate-700">
            {row.original.timestamp}.{String(row.original.code).padStart(2, '0')}
          </span>
        ),
      },
      {
        accessorKey: 'code',
        header: 'Código',
        cell: ({ row }) => (
          <span className="font-mono font-semibold text-slate-700">{row.original.code}</span>
        ),
      },
      {
        accessorKey: 'name',
        header: 'Nome',
        cell: ({ row }) => <span className="text-slate-700">{row.original.name}</span>,
      },
      {
        accessorKey: 'category',
        header: 'Categoria',
        cell: ({ row }) => <CategoryBadge category={row.original.category} />,
      },
      {
        id: 'delta',
        header: 'Δ (s)',
        cell: ({ row }) => {
          // Δ entre esta linha e a anterior **na tabela atualmente visível**
          // (já filtrada por categoria e/ou busca por código/nome). Assim quem
          // filtra para um único code vê o intervalo entre ocorrências daquele
          // code — não a distância até o evento anterior na lista global.
          const pos = rowPositions.get(row.original.index);
          if (pos == null || pos === 0) {
            return <span className="text-slate-500">—</span>;
          }
          const prevTime = visibleTimeAtPos[pos - 1];
          if (prevTime == null) {
            return <span className="text-slate-500">—</span>;
          }
          const dt = row.original.time - prevTime;
          return (
            <span className="font-mono text-slate-700">{formatTimeShort(dt)}</span>
          );
        },
      },
    ],
    [visibleTimeAtPos, rowPositions],
  );

  const table = useReactTable({
    // Não usamos mais os filtros built-in da lib — a busca/categoria já foram
    // aplicadas em `searchedRows`. Manter o filtro da lib desligado evita
    // casar o objeto inteiro da linha no globalFilterFn.
    data: searchedRows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    globalFilterFn: () => true,
  });

  const containerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (highlightIndex == null || !containerRef.current) return;
    const row = containerRef.current.querySelector(
      `[data-event-index="${highlightIndex}"]`,
    ) as HTMLTableRowElement | null;
    if (row) row.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlightIndex, sorting]);

  const dl = (s: SortingState): string =>
    s.length === 0 ? '' : `${s[0].id}:${s[0].desc ? 'desc' : 'asc'}`;

  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <h3 className="font-semibold flex-1 text-slate-900">Eventos ({table.getRowModel().rows.length})</h3>
        {codeOptions.length > 0 && (
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="input max-w-[12rem]"
          >
            <option value="all">Todas as categorias</option>
            <option value="Resposta">Resposta</option>
            <option value="Reforço">Reforço</option>
            <option value="Estímulo">Estímulo</option>
            <option value="Estado">Estado</option>
            <option value="Outro">Outro</option>
          </select>
        )}
        <input
          type="text"
          placeholder="Buscar (código, nome...)"
          className="input max-w-[16rem]"
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
        />
      </div>

      <div ref={containerRef} className="overflow-auto max-h-[55vh] border border-line rounded-lg">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-bg-elevated z-10">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-line">
                {hg.headers.map((h) => (
                  <th
                    key={h.id}
                    className="text-left px-3 py-2 font-medium text-slate-600 cursor-pointer select-none hover:text-slate-900"
                    onClick={h.column.getToggleSortingHandler()}
                  >
                    {flexRender(h.column.columnDef.header, h.getContext())}
                    {h.column.getIsSorted() === 'asc' && ' ▲'}
                    {h.column.getIsSorted() === 'desc' && ' ▼'}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => {
              const i = row.original.index;
              const isHL = highlightIndex === i;
              return (
                <tr
                  key={row.id}
                  data-event-index={i}
                  onClick={() => onSelectEvent?.(i)}
                  className={`border-b border-line/50 cursor-pointer transition-colors
                              ${isHL ? 'bg-brand/15' : 'hover:bg-bg-elevated/60'}`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-1.5">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
        {table.getRowModel().rows.length === 0 && (
          <div className="p-6 text-center text-slate-500 text-sm">
            Nenhum evento corresponde aos filtros atuais.
          </div>
        )}
      </div>
      <div className="text-xs text-slate-500 mt-2">
        Ordenação atual: {dl(sorting) || '—'}
      </div>
    </div>
  );
}
