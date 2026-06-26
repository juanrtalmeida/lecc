import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  title?: string;
  actions?: ReactNode;
  className?: string;
};

export function Card({ title, actions, className = '', children }: Props) {
  return (
    <div className={['card p-4', className].join(' ')}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 border-b border-line px-1 py-2 mb-3">
          {title && <span className="text-sm font-medium text-slate-700">{title}</span>}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}
