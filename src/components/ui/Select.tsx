import type { SelectHTMLAttributes } from 'react';

type Option = { value: string; label: string };

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  options: Option[];
  placeholder?: string;
};

export function Select({
  label,
  options,
  placeholder,
  className = '',
  id,
  ...rest
}: Props) {
  const selectId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={['flex flex-col gap-1', className].join(' ')}>
      {label && (
        <label htmlFor={selectId} className="label">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          className={[
            'input w-full appearance-none rounded-lg border bg-bg-panel px-3 py-2 pr-8 text-sm',
            'focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20',
          ].join(' ')}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-slate-400">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    </div>
  );
}
