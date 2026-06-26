import type { ReactNode } from 'react';

type Variant = 'response' | 'reinforcement' | 'stimulus' | 'state' | 'other';
type Style = 'filled' | 'soft' | 'outline';

type Props = {
  label: string;
  variant?: Variant;
  style?: Style;
  className?: string;
};

const colorByVariant: Record<Variant, string> = {
  response: '#6366f1',
  reinforcement: '#10b981',
  stimulus: '#f59e0b',
  state: '#0ea5e9',
  other: '#94a3b8',
};

export function CategoryBadge({ label, variant = 'other', style = 'soft', className = '' }: Props) {
  const color = colorByVariant[variant];

  if (style === 'filled') {
    return (
      <span
        className={[
          'badge',
          className,
        ].join(' ')}
        style={{
          backgroundColor: color,
          color: '#fff',
        }}
      >
        {label}
      </span>
    );
  }

  if (style === 'outline') {
    return (
      <span
        className={['badge', className].join(' ')}
        style={{
          borderColor: color,
          color,
          backgroundColor: 'transparent',
        }}
      >
        {label}
      </span>
    );
  }

  return (
    <span
      className={['badge', className].join(' ')}
      style={{
        backgroundColor: `${color}18`,
        color,
      }}
    >
      {label}
    </span>
  );
}
