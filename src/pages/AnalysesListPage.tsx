import { useNavigate } from 'react-router-dom';
import { useAnalysesStore } from '@/hooks';
import { EmptyState } from '@/components';
import { formatDate, formatDuration, formatTimeRaw } from '@/utils';

export function AnalysesListPage() {
  const items = useAnalysesStore((s) => s.items);
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Análises</h1>
          <p className="text-slate-600 text-sm">
            Sessões comportamentais importadas do MED-PC. Tudo é salvo no seu navegador.
          </p>
        </div>
        <button className="btn-primary" onClick={() => navigate('/new')}>
          + Nova análise
        </button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="Você ainda não importou nenhuma análise"
          description="Comece selecionando ou arrastando um arquivo exportado pelo MED-PC. O parser identifica automaticamente as seções e os eventos."
          action={
            <button className="btn-primary" onClick={() => navigate('/new')}>
              + Nova análise
            </button>
          }
          icon="📊"
        />
      ) : (
        <div className="card overflow-hidden text-slate-700">
          <table className="w-full text-sm">
            <thead className="bg-bg-elevated border-b border-line">
              <tr>
                <Th className="pl-5">Nome</Th>
                <Th>Experimento</Th>
                <Th>Sujeito</Th>
                <Th>Data</Th>
                <Th>Hora</Th>
                <Th>Duração</Th>
                <Th>Eventos</Th>
                <Th className="pr-5 text-right">Ações</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr
                  key={a.id}
                  className="border-b border-line/60 hover:bg-bg-elevated/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/analysis/${a.id}`)}
                >
                  <td className="pl-5 py-3 align-top">
                    <div className="font-medium">{a.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Atualizada{' '}
                      {new Date(a.updatedAt || a.createdAt).toLocaleString('pt-BR')}
                    </div>
                  </td>
                  <Td>{a.experiment ?? '—'}</Td>
                  <Td>{a.subject ?? '—'}</Td>
                  <Td>{formatDate(a.date)}</Td>
                  <Td>{formatTimeRaw(a.startTime)}</Td>
                  <Td>
                    {a.durationSeconds != null
                      ? formatDuration(a.durationSeconds)
                      : '—'}
                  </Td>
                  <Td className="tabular-nums">{a.eventCount?.toLocaleString('pt-BR') ?? 0}</Td>
                  <td className="pr-5 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        className="btn-ghost btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/analysis/${a.id}`);
                        }}
                      >
                        Abrir
                      </button>
                      <RenameInline id={a.id} name={a.name} />
                      <DeleteInline id={a.id} name={a.name} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`text-left px-3 py-2.5 text-xs uppercase tracking-wider text-slate-500 font-medium ${className}`}>
      {children}
    </th>
  );
}

function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-3 align-top ${className}`}>{children}</td>;
}

import { useState } from 'react';
import { Modal } from '@/components';

function RenameInline({ id, name }: { id: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState(name);
  const rename = useAnalysesStore((s) => s.rename);
  return (
    <>
      <button
        className="btn-ghost btn"
        onClick={(e) => {
          e.stopPropagation();
          setVal(name);
          setOpen(true);
        }}
      >
        Renomear
      </button>
      <Modal
        title="Renomear análise"
        open={open}
        onClose={() => setOpen(false)}
        footer={
          <>
            <button className="btn" onClick={() => setOpen(false)}>
              Cancelar
            </button>
            <button
              className="btn-primary"
              onClick={() => {
                rename(id, val.trim() || name);
                setOpen(false);
              }}
            >
              Salvar
            </button>
          </>
        }
      >
        <label className="label">Nome</label>
        <input
          className="input"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          autoFocus
        />
      </Modal>
    </>
  );
}

function DeleteInline({ id, name }: { id: string; name: string }) {
  const [open, setOpen] = useState(false);
  const remove = useAnalysesStore((s) => s.remove);
  return (
    <>
      <button
        className="btn-ghost btn text-red-600 hover:text-red-700"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        Excluir
      </button>
      <Modal
        title="Excluir análise"
        open={open}
        onClose={() => setOpen(false)}
        footer={
          <>
            <button className="btn" onClick={() => setOpen(false)}>
              Cancelar
            </button>
            <button
              className="btn-danger"
              onClick={() => {
                remove(id);
                setOpen(false);
              }}
            >
              Excluir definitivamente
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-700">
          Esta ação é permanente e apaga os dados desta análise do navegador.
        </p>
        <p className="text-sm text-slate-500 mt-2">
          Análise: <span className="font-semibold text-slate-800">{name}</span>
        </p>
      </Modal>
    </>
  );
}
