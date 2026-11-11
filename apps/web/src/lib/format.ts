/**
 * Formatage pour une lecture francophone. Les quantités gardent jusqu'à trois
 * décimales — c'est l'échelle de la colonne — mais n'en affichent aucune quand
 * elles sont entières, ce qui est le cas de l'écrasante majorité des lignes.
 */

const quantityFormatter = new Intl.NumberFormat('fr-FR', {
  maximumFractionDigits: 3,
});

const currencyFormatter = new Intl.NumberFormat('fr-FR', {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

const dateTimeFormatter = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

const dateFormatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });

export function formatQuantity(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return quantityFormatter.format(value);
}

/** Montant sans symbole : la devise dépend du site et n'est pas dans le modèle. */
export function formatAmount(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return currencyFormatter.format(value);
}

/** Écart signé : le « + » explicite évite de confondre surplus et manque. */
export function formatVariance(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  const formatted = quantityFormatter.format(Math.abs(value));
  if (value === 0) return '0';
  return value > 0 ? `+${formatted}` : `−${formatted}`;
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? '—' : dateTimeFormatter.format(date);
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? '—' : dateFormatter.format(date);
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${quantityFormatter.format(value)} %`;
}
