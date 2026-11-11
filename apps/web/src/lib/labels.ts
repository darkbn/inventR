import type { CampaignStatus, ImportStatus, ItemStatus, ListStatus, Role } from '@/api/types';

/**
 * Libellés affichés. Les codes techniques de l'API ne doivent jamais apparaître
 * tels quels à l'écran : « AWAITING_SECOND_COUNT » n'évoque rien à un
 * magasinier.
 */

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administrateur',
  SUPERVISOR: 'Superviseur',
  USER: 'Opérateur',
};

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  DRAFT: 'En préparation',
  OPEN: 'Ouverte',
  COUNTING: 'Comptage en cours',
  PENDING_CLOSURE: 'Clôture en attente',
  CLOSED: 'Clôturée',
};

export const LIST_STATUS_LABELS: Record<ListStatus, string> = {
  DRAFT: 'En préparation',
  ACTIVE: 'Active',
  COMPLETED: 'Terminée',
  ARCHIVED: 'Archivée',
};

export const ITEM_STATUS_LABELS: Record<ItemStatus, string> = {
  PENDING: 'Non comptée',
  COUNTED: 'Comptée',
  AWAITING_SECOND_COUNT: 'Second comptage attendu',
  AWAITING_THIRD_COUNT: 'Troisième comptage attendu',
  UNDER_INVESTIGATION: 'Enquête requise',
  DISCREPANCY: 'Litige',
  CONFIRMED: 'Confirmée',
  NOT_FOUND: 'Non trouvée',
};

export const IMPORT_STATUS_LABELS: Record<ImportStatus, string> = {
  PENDING: 'En analyse',
  VALIDATED: 'Prêt à appliquer',
  APPLIED: 'Appliqué',
  REJECTED: 'Rejeté',
};
