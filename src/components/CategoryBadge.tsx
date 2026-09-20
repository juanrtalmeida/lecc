import type { CategoryInfo } from '@/types';
import { CATEGORY_META, type EventCategory } from '@/types';

interface Props {
  category: EventCategory | string;
  /**
   * Catálogo da análise (`analysisCategoryMap`). Sem ele o badge só conhece as
   * categorias canônicas — passe sempre que a análise estiver por perto, senão
   * as categorias criadas pelo usuário perdem cor e símbolo.
   */
  categories?: Record<string, CategoryInfo>;
  className?: string;
}

export function CategoryBadge({ category, categories, className = '' }: Props) {
  const meta =
    categories?.[category] ?? CATEGORY_META[category as EventCategory] ?? null;
  const color = meta?.color ?? '#64748b';
  return (
    <span
      className={`chip ${className}`}
      style={{ background: `${color}22`, color, borderColor: `${color}55` }}
    >
      <span className="font-bold leading-none" style={{ color }}>
        {meta?.symbol ?? '•'}
      </span>
      {category}
    </span>
  );
}
