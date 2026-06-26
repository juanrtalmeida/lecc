import type { ReactNode } from 'react';

type Props = {
  title: string;
  value: string | number;
  unit?: string;
  hint?: string;
  trend?: 'up' | 'down' | 'flat';
  icon?: ReactNode;
  className?: string;
};

export function StatCard({
  title,
  value,
  unit,
  hint,
  trend,
  icon,
  className = '',
}: Props) {
  return (
    <article
      className={[
        'card p-4',
        'flex flex-col gap-2',
        'transition-colors duration-150',
        className,
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="caption text-slate-500">{title}</span>
        {icon && <span className="text-slate-400">{icon}</span>}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="heading tabular-nums">{value}</span>
        {unit && <span className="body text-slate-500">{unit}</span>}
      </div>
      {(hint || trend) && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          {trend && (
            <span
              className={[
                'inline-flex h-1.5 w-1.5 rounded-full',
                trend === 'up' && 'bg-emerald-500',
                trend === 'down' && 'bg-rose-500',
                trend === 'flat' && 'bg-slate-400',
              ].join(' ')}
            />
          )}
          {hint}
        </div>
      )}
    </article>
  );
}
