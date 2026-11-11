import { Badge } from '@/components/ui/badge';
import { CAMPAIGN_STATUS_LABELS, ITEM_STATUS_LABELS, LIST_STATUS_LABELS } from '@/lib/labels';
import type { CampaignStatus, ItemStatus, ListStatus } from '@/api/types';

type BadgeVariant =
  'default' | 'secondary' | 'outline' | 'success' | 'danger' | 'warning' | 'muted';

const CAMPAIGN_VARIANTS: Record<CampaignStatus, BadgeVariant> = {
  DRAFT: 'muted',
  OPEN: 'secondary',
  COUNTING: 'default',
  PENDING_CLOSURE: 'warning',
  CLOSED: 'success',
};

const LIST_VARIANTS: Record<ListStatus, BadgeVariant> = {
  DRAFT: 'muted',
  ACTIVE: 'default',
  COMPLETED: 'success',
  ARCHIVED: 'outline',
};

/**
 * Les statuts bloquants pour la clôture portent une teinte d'alerte : le
 * superviseur doit les repérer sans lire chaque libellé.
 */
const ITEM_VARIANTS: Record<ItemStatus, BadgeVariant> = {
  PENDING: 'muted',
  COUNTED: 'secondary',
  AWAITING_SECOND_COUNT: 'warning',
  AWAITING_THIRD_COUNT: 'warning',
  // L'enquête n'est pas une attente de plus : aucun comptage ne la résoudra,
  // elle appelle une décision. Même teinte que le litige, volontairement.
  UNDER_INVESTIGATION: 'danger',
  DISCREPANCY: 'danger',
  CONFIRMED: 'success',
  NOT_FOUND: 'outline',
};

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  return <Badge variant={CAMPAIGN_VARIANTS[status]}>{CAMPAIGN_STATUS_LABELS[status]}</Badge>;
}

export function ListStatusBadge({ status }: { status: ListStatus }) {
  return <Badge variant={LIST_VARIANTS[status]}>{LIST_STATUS_LABELS[status]}</Badge>;
}

export function ItemStatusBadge({ status }: { status: ItemStatus }) {
  return <Badge variant={ITEM_VARIANTS[status]}>{ITEM_STATUS_LABELS[status]}</Badge>;
}
