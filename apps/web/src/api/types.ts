/**
 * Types du contrat d'API.
 *
 * Ils reflètent les DTO exposés par l'API et documentés dans Swagger. Le script
 * `pnpm gen:api` régénère `schema.d.ts` à partir de `/api/v1/docs-json` et sert
 * de contrôle : si un champ décrit ici disparaît du contrat, la comparaison le
 * met en évidence.
 */

export type Role = 'ADMIN' | 'SUPERVISOR' | 'USER';

export type CampaignStatus = 'DRAFT' | 'OPEN' | 'COUNTING' | 'PENDING_CLOSURE' | 'CLOSED';

export type ListStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';

export type ItemStatus =
  | 'PENDING'
  | 'COUNTED'
  | 'AWAITING_SECOND_COUNT'
  /** Méthode 3 : deux comptages non concluants, un troisième est attendu. */
  | 'AWAITING_THIRD_COUNT'
  /** Méthode 3 : trois comptages non concluants, seul le superviseur tranche. */
  | 'UNDER_INVESTIGATION'
  | 'DISCREPANCY'
  | 'CONFIRMED'
  | 'NOT_FOUND';

export type ImportStatus = 'PENDING' | 'VALIDATED' | 'APPLIED' | 'REJECTED';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

// --- Authentification --------------------------------------------------------

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  fullName: string;
  role: Role;
  isActive: boolean;
  lastLoginAt: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: UserProfile;
}

// --- Référentiels ------------------------------------------------------------

export interface User extends UserProfile {
  createdAt: string;
  updatedAt: string;
}

export interface Warehouse {
  id: string;
  code: string;
  label: string;
  isActive: boolean;
  locationCount?: number;
}

export interface Location {
  id: string;
  warehouseId: string;
  code: string;
  label: string | null;
  normalizedCode: string;
  aisle: number | null;
  bay: number | null;
  level: string | null;
  slot: number | null;
  isVirtual: boolean;
  isActive: boolean;
  itemCount?: number;
}

export interface LocationVariantGroup {
  location: Location;
  candidates: Location[];
}

export interface Article {
  id: string;
  code: string;
  designation: string;
  unit: string;
  brand: string | null;
  manufacturerRef: string | null;
  categoryId: string | null;
  defaultLocationId: string | null;
  lastPmp?: number;
  isActive: boolean;
}

export interface Category {
  id: string;
  code: string;
  label: string;
  isActive: boolean;
}

export interface CampaignType {
  id: string;
  code: string;
  label: string;
  isActive: boolean;
  campaignCount?: number;
}

export interface InventoryMethod {
  id: string;
  code: string;
  label: string;
  description: string | null;
  config: unknown;
  isActive: boolean;
  campaignCount?: number;
}

// --- Campagnes ---------------------------------------------------------------

export interface Campaign {
  id: string;
  code: string;
  name: string;
  campaignTypeId: string;
  inventoryMethodId: string;
  warehouseId: string;
  status: CampaignStatus;
  round: number;
  parentCampaignId: string | null;
  startedAt: string | null;
  closedAt: string | null;
  missingZeroedAt: string | null;
  reopenedAt: string | null;
  reopenReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClosureReadiness {
  canClose: boolean;
  totalItems: number;
  pendingItems: number;
  notFoundItems: number;
  awaitingSecondCount: number;
  discrepancies: number;
  resolvedItems: number;
  blockingReasons: string[];
  warning: string;
}

// --- Listes ------------------------------------------------------------------

export interface ListAssignee {
  id: string;
  username: string;
  fullName: string;
}

export interface InventoryList {
  id: string;
  campaignId: string;
  code: string;
  name: string;
  description: string | null;
  status: ListStatus;
  itemCount?: number;
  assignees?: ListAssignee[];
}

export interface AssignmentHistoryEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: 'ASSIGN' | 'UNASSIGN';
  user: ListAssignee;
  performedBy: ListAssignee | null;
  performedAt: string;
}

// --- Lignes et comptages -----------------------------------------------------

export interface InventoryItem {
  id: string;
  listId: string;
  article: {
    id: string;
    code: string;
    designation: string;
    unit: string;
    brand: string | null;
    manufacturerRef: string | null;
  };
  location: { id: string; code: string; label: string | null; isVirtual: boolean };
  /**
   * Quantité attendue, issue de l'extraction SAP.
   *
   * `null` pour un opérateur : l'API retire la valeur de la réponse, afin que
   * connaître le théorique n'oriente pas le comptage. Les trois champs suivants
   * sont masqués de la même façon et pour la même raison.
   */
  theoreticalQty: number | null;
  finalQty: number | null;
  arbitratedQty: number | null;
  status: ItemStatus;
  variance: number | null;
  varianceValue?: number | null;
  unitPrice?: number;
  countCount: number;
  countedByMe: boolean;
  myLastQuantity: number | null;
  lineNo: number;
  /** Ligne ajoutée sur le terrain, absente du fichier importé. */
  isManual: boolean;
  /** Rang du prochain comptage attendu (Méthode 3), `null` si la ligne est résolue. */
  expectedCountNumber: number | null;
}

export interface Count {
  id: string;
  itemId: string;
  userId: string;
  username: string;
  quantity: number;
  countedAt: string;
  source: 'MOBILE' | 'WEB';
  clientUuid: string;
  deviceId: string | null;
  note: string | null;
  status: 'VALID' | 'CANCELLED';
  cancelledAt: string | null;
}

// --- Imports -----------------------------------------------------------------

export interface ImportError {
  line: number;
  column: string;
  code: string;
  message: string;
  value: string | null;
}

export interface ImportWarning {
  line: number | null;
  code: string;
  message: string;
}

export interface ImportBatch {
  id: string;
  listId: string;
  filename: string;
  status: ImportStatus;
  rowsTotal: number;
  rowsOk: number;
  rowsError: number;
  errors: ImportError[];
  warnings: ImportWarning[];
  appliedAt: string | null;
  createdAt: string;
}

export interface ApplyImportResult {
  batchId: string;
  itemsCreated: number;
  itemsUpdated: number;
  articlesCreated: number;
  locationsCreated: number;
  durationMs: number;
}

// --- Rapports ----------------------------------------------------------------

export interface CampaignProgress {
  totalItems: number;
  pending: number;
  counted: number;
  confirmed: number;
  awaitingSecondCount: number;
  awaitingThirdCount: number;
  underInvestigation: number;
  discrepancies: number;
  notFound: number;
  /** Lignes ajoutées sur le terrain : autant d'articles à créer dans l'ERP. */
  manualItems: number;
  completionPercent: number;
}

export interface VarianceSummary {
  surplusCount: number;
  shortageCount: number;
  matchingCount: number;
  surplusQuantity: number;
  shortageQuantity: number;
  surplusValue?: number;
  shortageValue?: number;
  netValue?: number;
}

export interface TopVariance {
  itemId: string;
  articleCode: string;
  designation: string;
  locationCode: string;
  theoreticalQty: number;
  finalQty: number;
  variance: number;
  varianceValue?: number;
}

export interface ListProgress {
  listId: string;
  code: string;
  name: string;
  totalItems: number;
  handledItems: number;
  completionPercent: number;
  assignees: string[];
}

export interface CounterActivity {
  userId: string;
  username: string;
  fullName: string;
  countEntries: number;
  itemsCovered: number;
  totalQuantity: number;
  firstCountAt: string | null;
  lastCountAt: string | null;
}

export interface CampaignDashboard {
  campaignId: string;
  code: string;
  name: string;
  status: CampaignStatus;
  round: number;
  methodCode: string;
  methodLabel: string;
  campaignTypeLabel: string;
  warehouseCode: string;
  zeroTheoreticalHidden: boolean;
  progress: CampaignProgress;
  variance: VarianceSummary;
  topVariances: TopVariance[];
  lists: ListProgress[];
  counters: CounterActivity[];
  startedAt: string | null;
  closedAt: string | null;
}

// --- Journal -----------------------------------------------------------------

export interface ActivityLog {
  id: string;
  actor: ListAssignee | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown>;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}
