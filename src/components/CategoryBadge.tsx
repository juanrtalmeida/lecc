import { CATEGORY_META, type EventCategory } from '@/types';

export function CategoryBadge({
  category,
  className = '',
}: {
  category: EventCategory | string;
  className?: string;
}) {
  const meta = CATEGORY_META[category as EventCategory];
  const color = meta?.color ?? '#64748b';
  return (
    <span
      className={`chip ${className}`}
      style={{ background: `${color}22`, color, borderColor: `${color}55` }}
    >
      <span className="font-bold leading-none" style={{ color }}>{meta?.symbol ?? '•'}</span>
      {category}
    </span>
  );
}
