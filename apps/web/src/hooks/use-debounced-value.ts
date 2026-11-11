import { useEffect, useState } from 'react';

/**
 * Diffère la propagation d'une valeur.
 *
 * Indispensable sur les champs de recherche : sans cela, chaque frappe
 * déclenche une requête, ce qui sature le limiteur de débit de l'API et fait
 * clignoter les tableaux.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
