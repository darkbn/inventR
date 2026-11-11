import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Tuile d'indicateur. Le ton sémantique est toujours accompagné d'un libellé :
 * la couleur seule ne doit jamais porter l'information.
 */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'neutral',
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  tone?: 'neutral' | 'surplus' | 'shortage' | 'warning' | 'primary';
}) {
  const toneClasses = {
    neutral: 'text-foreground',
    primary: 'text-primary',
    surplus: 'text-surplus',
    shortage: 'text-shortage',
    warning: 'text-warning',
  } as const;

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        {Icon ? <Icon className="h-4 w-4 text-muted-foreground" aria-hidden /> : null}
      </div>
      <p className={cn('mt-2 text-2xl font-semibold tabular', toneClasses[tone])}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
