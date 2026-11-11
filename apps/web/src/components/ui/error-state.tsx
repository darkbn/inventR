import { AlertTriangle, RefreshCw } from 'lucide-react';

import { ApiError } from '@/api/client';
import { Button } from '@/components/ui/button';

/** Message d'erreur lisible, quelle que soit la forme de l'exception reçue. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Une erreur inattendue est survenue.';
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const details = error instanceof ApiError ? error.validationMessages : [];

  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-destructive/30 bg-shortage-soft px-6 py-12 text-center">
      <AlertTriangle className="h-8 w-8 text-destructive" aria-hidden />
      <div className="space-y-1">
        <p className="font-medium">{errorMessage(error)}</p>
        {details.length > 0 ? (
          <ul className="text-sm text-muted-foreground">
            {details.map((detail) => (
              <li key={detail}>{detail}</li>
            ))}
          </ul>
        ) : null}
      </div>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" aria-hidden />
          Réessayer
        </Button>
      ) : null}
    </div>
  );
}
