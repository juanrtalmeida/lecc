import type { ReactNode } from 'react';

/** Estado vazio amigável. */
export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="card p-10 text-center flex flex-col items-center gap-3">
      <div className="text-slate-400">{icon ?? '🗂️'}</div>
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      {description && (
        <p className="text-sm text-slate-500 max-w-md">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
