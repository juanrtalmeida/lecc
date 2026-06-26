import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { StatCard } from './StatCard';
import type { Analysis } from '@/types';
import { computeStats } from '@/analysis';
import { CATEGORY_META, EVENT_CATEGORIES } from '@/types';
import { formatDuration } from '@/utils';

export function StatsPanel({ analysis }: { analysis: Analysis }) {
  const stats = useMemo(() => computeStats(analysis), [analysis]);

  const byCatChart = EVENT_CATEGORIES.map((c) => ({
    name: c,
    value: stats.byCategory[c] ?? 0,
    color: CATEGORY_META[c].color,
  }));

  const byCodeChart = useMemo(() => {
    return Object.entries(stats.byCode)
      .map(([code, v]) => ({ code: Number(code), count: v.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
  }, [stats]);

  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
      <StatCard
        label="Eventos totais"
        value={stats.totalEvents.toLocaleString('pt-BR')}
        accent="#6366f1"
      />
      <StatCard
        label="Respostas"
        value={(stats.byCategory['Resposta'] ?? 0).toLocaleString('pt-BR')}
        accent="#60a5fa"
      />
      <StatCard
        label="Reforços"
        value={(stats.byCategory['Reforço'] ?? 0).toLocaleString('pt-BR')}
        accent="#34d399"
      />
      <StatCard
        label="Estímulos"
        value={(stats.byCategory['Estímulo'] ?? 0).toLocaleString('pt-BR')}
        accent="#f59e0b"
      />
      <StatCard
        label="Duração"
        value={formatDuration(stats.durationSeconds)}
        hint={`${stats.eventsPerMinute.toFixed(2)} ev/min`}
        accent={CATEGORY_META['Estado'].color}
      />
      <StatCard
        label="Eventos/min"
        value={stats.eventsPerMinute.toFixed(1)}
        hint={stats.totalEvents > 0 ? `${stats.totalEvents} no total` : '—'}
        accent={CATEGORY_META['Outro'].color}
      />

      {analysis.events.length > 0 && (
        <div className="card p-4 lg:col-span-3">
          <div className="text-xs uppercase tracking-wider text-slate-500 mb-3">
            Distribuição por categoria
          </div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCatChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.06)',
                  }}
                  labelStyle={{ color: '#1f2937' }}
                  itemStyle={{ color: '#1f2937' }}
                  cursor={{ fill: '#f1f5f9' }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {byCatChart.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {byCodeChart.length > 0 && (
        <div className="card p-4 lg:col-span-3">
          <div className="text-xs uppercase tracking-wider text-slate-500 mb-3">
            Top códigos (por frequência)
          </div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCodeChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="code" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.06)',
                  }}
                  labelStyle={{ color: '#1f2937' }}
                  itemStyle={{ color: '#1f2937' }}
                  cursor={{ fill: '#f1f5f9' }}
                />
                <Bar dataKey="count" fill="#818cf8" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </section>
  );
}
