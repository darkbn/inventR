import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

export function Spinner({
  className,
  label = 'Chargement…',
}: {
  className?: string;
  label?: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-muted-foreground" role="status">
      <Loader2 className={cn('h-4 w-4 animate-spin', className)} aria-hidden />
      <span>{label}</span>
    </span>
  );
}

export function PageSpinner({ label = 'Chargement…' }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Spinner label={label} />
    </div>
  );
}
