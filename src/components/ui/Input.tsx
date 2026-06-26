import type { InputHTMLAttributes, ReactNode } from 'react';

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
};

export function Input({
  label,
  hint,
  error,
  leftIcon,
  rightIcon,
  className = '',
  id,
  ...rest
}: Props) {
  const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={['flex flex-col gap-1', className].join(' ')}>
      {label && (
        <label htmlFor={inputId} className="label">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
            {leftIcon}
          </span>
        )}
        <input
          id={inputId}
          className={[
            'input w-full rounded-lg border bg-bg-panel px-3 py-2 text-sm',
            'placeholder:text-slate-400',
            'focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20',
            error && 'border-red-400 focus:border-red-500 focus:ring-red-500/20',
            leftIcon && 'pl-9',
            rightIcon && 'pr-9',
          ].join(' ')}
          {...rest}
        />
        {rightIcon && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
            {rightIcon}
          </span>
        )}
      </div>
      {hint && !error && (
        <span className="text-xs text-slate-500">{hint}</span>
      )}
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
