import { Minus, TrendingDown, TrendingUp } from 'lucide-react';

import { formatVariance } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * Affichage d'un écart.
 *
 * Le signe, l'icône et la couleur portent la même information : la couleur
 * seule ne doit jamais distinguer un surplus d'un manque, pour rester lisible
 * en cas de daltonisme ou d'impression en noir et blanc.
 */
export function VarianceCell({
  value,
  className,
}: {
  value: number | null | undefined;
  className?: string;
}) {
  if (value === null || value === undefined) {
    return <span className={cn('text-muted-foreground', className)}>—</span>;
  }

  if (value === 0) {
    return (
      <span
        className={cn('inline-flex items-center gap-1 tabular text-muted-foreground', className)}
      >
        <Minus className="h-3.5 w-3.5" aria-hidden />0
      </span>
    );
  }

  const isSurplus = value > 0;
  const Icon = isSurplus ? TrendingUp : TrendingDown;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-medium tabular',
        isSurplus ? 'text-surplus' : 'text-shortage',
        className,
      )}
      title={isSurplus ? 'Surplus' : 'Manque'}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {formatVariance(value)}
      <span className="sr-only">{isSurplus ? 'surplus' : 'manque'}</span>
    </span>
  );
}
