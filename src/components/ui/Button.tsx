import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
};

const bases: Record<Variant, string> = {
  primary:
    'border-brand bg-brand text-white hover:bg-brand-deep shadow-glow',
  secondary:
    'border-line bg-bg-panel text-slate-800 hover:bg-bg-subtle',
  ghost:
    'border-transparent bg-transparent text-slate-700 hover:bg-bg-subtle',
  danger:
    'border-red-500 bg-red-500 text-white hover:bg-red-600',
};

const sizes: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-md',
  md: 'px-4 py-2 text-sm rounded-lg',
  lg: 'px-5 py-2.5 text-base rounded-lg',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  className = '',
  children,
  ...rest
}: Props) {
  return (
    <button
      className={[
        'inline-flex items-center justify-center gap-2 font-medium',
        'border transition-colors duration-150',
        'focus:outline-none focus:ring-2 focus:ring-brand/40 focus:ring-offset-2',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        bases[variant],
        sizes[size],
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </button>
  );
}
