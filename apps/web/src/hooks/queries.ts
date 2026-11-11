import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { apiDelete, apiGet, apiPatch, apiPost } from '@/api/client';
import type {
  ActivityLog,
  ApplyImportResult,
  Article,
  Campaign,
  CampaignDashboard,
  CampaignType,
  ClosureReadiness,
  Count,
  ImportBatch,
  InventoryItem,
  InventoryList,
  InventoryMethod,
  ItemStatus,
  Location,
  LocationVariantGroup,
  Paginated,
  Role,
  User,
  Warehouse,
} from '@/api/types';

/**
 * Clés de cache, centralisées.
 *
 * Les regrouper ici évite la dérive classique où deux écrans invalident des
 * clés légèrement différentes, laissant l'un des deux afficher des données
 * périmées après une écriture.
 */
export const queryKeys = {
  campaigns: (params?: unknown) => ['campaigns', params ?? {}] as const,
  campaign: (id: string) => ['campaign', id] as const,
  dashboard: (id: string, hideZero: boolean) => ['campaign-dashboard', id, hideZero] as const,
  closureReadiness: (id: string) => ['closure-readiness', id] as const,
  lists: (params?: unknown) => ['lists', params ?? {}] as const,
  list: (id: string) => ['list', id] as const,
  listHistory: (id: string) => ['list-history', id] as const,
  items: (listId: string, params?: unknown) => ['items', listId, params ?? {}] as const,
  itemCounts: (itemId: string) => ['item-counts', itemId] as const,
  users: (params?: unknown) => ['users', params ?? {}] as const,
  articles: (params?: unknown) => ['articles', params ?? {}] as const,
  warehouses: (params?: unknown) => ['warehouses', params ?? {}] as const,
  locations: (params?: unknown) => ['locations', params ?? {}] as const,
  locationVariants: (warehouseId: string) => ['location-variants', warehouseId] as const,
  campaignTypes: () => ['campaign-types'] as const,
  inventoryMethods: () => ['inventory-methods'] as const,
  imports: (listId: string) => ['imports', listId] as const,
  importBatch: (id: string) => ['import-batch', id] as const,
  activityLogs: (params?: unknown) => ['activity-logs', params ?? {}] as const,
};

// ============================================================================
// Campagnes
// ============================================================================

export interface CampaignFilters {
  page?: number;
  limit?: number;
  q?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export function useCampaigns(filters: CampaignFilters): UseQueryResult<Paginated<Campaign>> {
  return useQuery({
    queryKey: queryKeys.campaigns(filters),
    queryFn: () => apiGet<Paginated<Campaign>>('/campaigns', { params: filters }),
  });
}

export function useCampaign(id: string | undefined): UseQueryResult<Campaign> {
  return useQuery({
    queryKey: queryKeys.campaign(id ?? ''),
    queryFn: () => apiGet<Campaign>(`/campaigns/${id ?? ''}`),
    enabled: Boolean(id),
  });
}

export function useCampaignDashboard(
  id: string | undefined,
  hideZeroTheoretical: boolean,
): UseQueryResult<CampaignDashboard> {
  return useQuery({
    queryKey: queryKeys.dashboard(id ?? '', hideZeroTheoretical),
    queryFn: () =>
      apiGet<CampaignDashboard>(`/campaigns/${id ?? ''}/dashboard`, {
        params: { hideZeroTheoretical },
      }),
    enabled: Boolean(id),
    // Une campagne en cours évolue au rythme des comptages : un rafraîchissement
    // périodique évite au superviseur de recharger la page en permanence.
    refetchInterval: 30_000,
  });
}

/**
 * Variante sans rafraîchissement périodique, pour les écrans de synthèse où
 * plusieurs campagnes sont affichées côte à côte : une interrogation toutes les
 * 30 secondes par campagne y serait disproportionnée.
 */
export function useCampaignDashboardStatic(campaignId: string): UseQueryResult<CampaignDashboard> {
  return useQuery({
    queryKey: queryKeys.dashboard(campaignId, true),
    queryFn: () =>
      apiGet<CampaignDashboard>(`/campaigns/${campaignId}/dashboard`, {
        params: { hideZeroTheoretical: true },
      }),
    staleTime: 60_000,
  });
}

export function useClosureReadiness(
  id: string | undefined,
  enabled: boolean,
): UseQueryResult<ClosureReadiness> {
  return useQuery({
    queryKey: queryKeys.closureReadiness(id ?? ''),
    queryFn: () => apiGet<ClosureReadiness>(`/campaigns/${id ?? ''}/closure-readiness`),
    enabled: Boolean(id) && enabled,
  });
}

/** Invalide tout ce qui dépend d'une campagne après une écriture. */
function useCampaignInvalidation(): (campaignId: string) => Promise<void> {
  const queryClient = useQueryClient();

  return async (campaignId: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
      queryClient.invalidateQueries({ queryKey: queryKeys.campaign(campaignId) }),
      queryClient.invalidateQueries({ queryKey: ['campaign-dashboard', campaignId] }),
      queryClient.invalidateQueries({ queryKey: queryKeys.closureReadiness(campaignId) }),
      queryClient.invalidateQueries({ queryKey: ['lists'] }),
    ]);
  };
}

export function useCreateCampaign(): UseMutationResult<Campaign, unknown, Record<string, unknown>> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body) => apiPost<Campaign>('/campaigns', body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
  });
}

export function useOpenCampaign(): UseMutationResult<Campaign, unknown, string> {
  const invalidate = useCampaignInvalidation();

  return useMutation({
    mutationFn: (id) => apiPost<Campaign>(`/campaigns/${id}/open`),
    onSuccess: (_data, id) => invalidate(id),
  });
}

export function useCloseCampaign(): UseMutationResult<
  Campaign,
  unknown,
  { id: string; confirmZeroMissing: boolean; note?: string }
> {
  const invalidate = useCampaignInvalidation();

  return useMutation({
    mutationFn: ({ id, ...body }) => apiPost<Campaign>(`/campaigns/${id}/close`, body),
    onSuccess: (_data, variables) => invalidate(variables.id),
  });
}

/**
 * Suppression définitive d'une campagne.
 *
 * Le code de la campagne et un motif sont exigés par l'API : ils ne sont pas
 * décoratifs, le serveur refuse la requête sans eux. Toutes les listes de
 * campagnes sont invalidées plutôt que la seule entrée supprimée — la ligne
 * n'existe plus, il n'y a rien à rafraîchir, seulement des listes à reconstruire.
 */
export function useDeleteCampaign(): UseMutationResult<
  void,
  unknown,
  { id: string; confirmCode: string; reason: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...body }) => apiDelete<void>(`/campaigns/${id}`, { data: body }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
  });
}

/**
 * Ajout d'une ligne absente du fichier importé.
 *
 * Invalide les lignes de la liste **et** le tableau de bord : une ligne de plus
 * change l'avancement et le nombre d'articles à créer dans l'ERP.
 */
export function useAddListItem(): UseMutationResult<
  InventoryItem,
  unknown,
  {
    listId: string;
    articleCode: string;
    designation?: string;
    locationCode?: string;
    unit?: string;
    note?: string;
  }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ listId, ...body }) =>
      apiPost<InventoryItem>(`/lists/${listId}/items`, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['items'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useReopenCampaign(): UseMutationResult<
  Campaign,
  unknown,
  { id: string; reason: string }
> {
  const invalidate = useCampaignInvalidation();

  return useMutation({
    mutationFn: ({ id, reason }) => apiPost<Campaign>(`/campaigns/${id}/reopen`, { reason }),
    onSuccess: (_data, variables) => invalidate(variables.id),
  });
}

export function useNextRound(): UseMutationResult<
  Campaign,
  unknown,
  { id: string; keepOriginalTheoretical?: boolean; inventoryMethodId?: string }
> {
  const invalidate = useCampaignInvalidation();

  return useMutation({
    mutationFn: ({ id, ...body }) => apiPost<Campaign>(`/campaigns/${id}/next-round`, body),
    onSuccess: (_data, variables) => invalidate(variables.id),
  });
}

// ============================================================================
// Listes
// ============================================================================

export function useLists(filters: {
  campaignId?: string;
  page?: number;
  limit?: number;
}): UseQueryResult<Paginated<InventoryList>> {
  return useQuery({
    queryKey: queryKeys.lists(filters),
    queryFn: () => apiGet<Paginated<InventoryList>>('/lists', { params: filters }),
    enabled: filters.campaignId === undefined || filters.campaignId !== '',
  });
}

export function useList(id: string | undefined): UseQueryResult<InventoryList> {
  return useQuery({
    queryKey: queryKeys.list(id ?? ''),
    queryFn: () => apiGet<InventoryList>(`/lists/${id ?? ''}`),
    enabled: Boolean(id),
  });
}

export function useCreateList(): UseMutationResult<
  InventoryList,
  unknown,
  { campaignId: string; code: string; name: string; description?: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ campaignId, ...body }) =>
      apiPost<InventoryList>(`/campaigns/${campaignId}/lists`, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lists'] }),
  });
}

export function useAssignUserToList(): UseMutationResult<
  void,
  unknown,
  { listId: string; userId: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ listId, userId }) => apiPost<void>(`/lists/${listId}/assignments`, { userId }),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['lists'] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.listHistory(variables.listId) }),
      ]);
    },
  });
}

export function useUnassignUserFromList(): UseMutationResult<
  void,
  unknown,
  { listId: string; userId: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ listId, userId }) => apiDelete<void>(`/lists/${listId}/assignments/${userId}`),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['lists'] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.listHistory(variables.listId) }),
      ]);
    },
  });
}

// ============================================================================
// Lignes d'inventaire
// ============================================================================

export interface ItemFilters {
  page?: number;
  limit?: number;
  q?: string;
  filter?: string;
  hideZeroTheoretical?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export function useListItems(
  listId: string | undefined,
  filters: ItemFilters,
): UseQueryResult<Paginated<InventoryItem>> {
  return useQuery({
    queryKey: queryKeys.items(listId ?? '', filters),
    queryFn: () =>
      apiGet<Paginated<InventoryItem>>(`/lists/${listId ?? ''}/items`, { params: filters }),
    enabled: Boolean(listId),
    // Conserve l'affichage précédent pendant le chargement d'une nouvelle page :
    // sans cela, le tableau clignote à chaque changement de filtre.
    placeholderData: (previous) => previous,
  });
}

export function useItemCounts(itemId: string | undefined): UseQueryResult<Count[]> {
  return useQuery({
    queryKey: queryKeys.itemCounts(itemId ?? ''),
    queryFn: () => apiGet<Count[]>(`/items/${itemId ?? ''}/counts`),
    enabled: Boolean(itemId),
  });
}

export function useArbitrateItem(): UseMutationResult<
  InventoryItem,
  unknown,
  { itemId: string; quantity: number; note: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, ...body }) =>
      apiPatch<InventoryItem>(`/items/${itemId}/arbitrate`, body),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['items'] }),
        queryClient.invalidateQueries({ queryKey: ['campaign-dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['closure-readiness'] }),
      ]);
    },
  });
}

// ============================================================================
// Référentiels
// ============================================================================

export function useUsers(filters: {
  page?: number;
  limit?: number;
  q?: string;
  role?: Role;
  isActive?: boolean;
}): UseQueryResult<Paginated<User>> {
  return useQuery({
    queryKey: queryKeys.users(filters),
    queryFn: () => apiGet<Paginated<User>>('/users', { params: filters }),
  });
}

export function useArticles(filters: {
  page?: number;
  limit?: number;
  q?: string;
}): UseQueryResult<Paginated<Article>> {
  return useQuery({
    queryKey: queryKeys.articles(filters),
    queryFn: () => apiGet<Paginated<Article>>('/articles', { params: filters }),
    placeholderData: (previous) => previous,
  });
}

export function useWarehouses(): UseQueryResult<Paginated<Warehouse>> {
  return useQuery({
    queryKey: queryKeys.warehouses(),
    queryFn: () => apiGet<Paginated<Warehouse>>('/warehouses', { params: { limit: 200 } }),
  });
}

export function useLocations(filters: {
  page?: number;
  limit?: number;
  q?: string;
  warehouseId?: string;
  includeVirtual?: boolean;
}): UseQueryResult<Paginated<Location>> {
  return useQuery({
    queryKey: queryKeys.locations(filters),
    queryFn: () => apiGet<Paginated<Location>>('/locations', { params: filters }),
    placeholderData: (previous) => previous,
  });
}

export function useLocationVariants(
  warehouseId: string | undefined,
): UseQueryResult<LocationVariantGroup[]> {
  return useQuery({
    queryKey: queryKeys.locationVariants(warehouseId ?? ''),
    queryFn: () => apiGet<LocationVariantGroup[]>(`/locations/variants/${warehouseId ?? ''}`),
    enabled: Boolean(warehouseId),
  });
}

export function useMergeLocations(): UseMutationResult<
  Location,
  unknown,
  { sourceId: string; targetLocationId: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sourceId, targetLocationId }) =>
      apiPost<Location>(`/locations/${sourceId}/merge`, { targetLocationId }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['locations'] }),
        queryClient.invalidateQueries({ queryKey: ['location-variants'] }),
      ]);
    },
  });
}

export function useCampaignTypes(): UseQueryResult<CampaignType[]> {
  return useQuery({
    queryKey: queryKeys.campaignTypes(),
    queryFn: () => apiGet<CampaignType[]>('/campaign-types'),
    // Référentiel quasi figé : inutile de le réinterroger en permanence.
    staleTime: 5 * 60_000,
  });
}

export function useInventoryMethods(): UseQueryResult<InventoryMethod[]> {
  return useQuery({
    queryKey: queryKeys.inventoryMethods(),
    queryFn: () => apiGet<InventoryMethod[]>('/inventory-methods'),
    staleTime: 5 * 60_000,
  });
}

// ============================================================================
// Imports
// ============================================================================

export function useListImports(listId: string | undefined): UseQueryResult<ImportBatch[]> {
  return useQuery({
    queryKey: queryKeys.imports(listId ?? ''),
    queryFn: () => apiGet<ImportBatch[]>(`/lists/${listId ?? ''}/imports`),
    enabled: Boolean(listId),
  });
}

export function useAnalyzeImport(): UseMutationResult<
  ImportBatch,
  unknown,
  { listId: string; file: File; excludeZeroQuantity: boolean; updateExisting: boolean }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ listId, file, excludeZeroQuantity, updateExisting }) => {
      const form = new FormData();
      form.append('file', file);

      return apiPost<ImportBatch>(`/lists/${listId}/imports`, form, {
        params: { excludeZeroQuantity, updateExisting },
        headers: { 'Content-Type': 'multipart/form-data' },
        // Un fichier de 8 000 lignes met plusieurs secondes à être analysé.
        timeout: 180_000,
      });
    },
    onSuccess: (_data, variables) =>
      queryClient.invalidateQueries({ queryKey: queryKeys.imports(variables.listId) }),
  });
}

export function useApplyImport(): UseMutationResult<
  ApplyImportResult,
  unknown,
  { batchId: string; listId: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ batchId }) =>
      apiPost<ApplyImportResult>(`/imports/${batchId}/apply`, undefined, { timeout: 300_000 }),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.imports(variables.listId) }),
        queryClient.invalidateQueries({ queryKey: ['items', variables.listId] }),
        queryClient.invalidateQueries({ queryKey: ['lists'] }),
        queryClient.invalidateQueries({ queryKey: ['campaign-dashboard'] }),
      ]);
    },
  });
}

// ============================================================================
// Journal
// ============================================================================

export function useActivityLogs(filters: {
  page?: number;
  limit?: number;
  action?: string;
  entityType?: string;
}): UseQueryResult<Paginated<ActivityLog>> {
  return useQuery({
    queryKey: queryKeys.activityLogs(filters),
    queryFn: () => apiGet<Paginated<ActivityLog>>('/activity-logs', { params: filters }),
    placeholderData: (previous) => previous,
  });
}

/** Statuts de ligne considérés comme bloquant la clôture. */
export const BLOCKING_ITEM_STATUSES: ItemStatus[] = ['AWAITING_SECOND_COUNT', 'DISCREPANCY'];
