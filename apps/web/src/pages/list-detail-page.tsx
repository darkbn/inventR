import {
  ArrowLeft,
  Gavel,
  PackagePlus,
  QrCode,
  Search,
  Upload,
  UserPlus,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { downloadFile } from '@/api/client';
import type { InventoryItem } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ErrorState, errorMessage } from '@/components/ui/error-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageSpinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/components/ui/toast';
import { PageHeader } from '@/components/layout/page-header';
import { useAuth } from '@/features/auth/auth-context';
import { ItemStatusBadge, ListStatusBadge } from '@/features/campaigns/campaign-status-badge';
import { AddItemDialog } from '@/features/items/add-item-dialog';
import { VarianceCell } from '@/features/items/variance-cell';
import { Pagination } from '@/pages/campaigns-page';
import {
  useArbitrateItem,
  useAssignUserToList,
  useItemCounts,
  useList,
  useListItems,
  useUnassignUserFromList,
  useUsers,
} from '@/hooks/queries';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { formatAmount, formatDateTime, formatQuantity } from '@/lib/format';

const PAGE_SIZE = 50;

/** Filtres proposés, dans l'ordre d'usage sur le terrain. */
const FILTERS = [
  { value: 'all', label: 'Toutes les lignes' },
  { value: 'remaining', label: 'Restantes' },
  { value: 'counted', label: 'Comptées' },
  { value: 'not_found', label: 'Non trouvées' },
  { value: 'discrepancy', label: 'À arbitrer' },
  { value: 'investigation', label: 'Sous enquête' },
  { value: 'manual', label: 'Ajoutées terrain' },
] as const;

export function ListDetailPage() {
  const { listId } = useParams<{ listId: string }>();
  const { hasRole } = useAuth();
  const toast = useToast();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [hideZero, setHideZero] = useState(false);
  const [arbitrating, setArbitrating] = useState<InventoryItem | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);

  const debouncedSearch = useDebouncedValue(search, 350);

  const list = useList(listId);
  const items = useListItems(listId, {
    page,
    limit: PAGE_SIZE,
    ...(debouncedSearch ? { q: debouncedSearch } : {}),
    filter,
    hideZeroTheoretical: hideZero,
  });

  const isManager = hasRole('ADMIN', 'SUPERVISOR');

  if (list.isLoading) return <PageSpinner />;
  if (list.isError) return <ErrorState error={list.error} onRetry={() => void list.refetch()} />;
  if (!list.data || !listId) return null;

  const handleLabels = async (): Promise<void> => {
    try {
      await downloadFile(
        `/qr/lists/${listId}/labels.pdf`,
        `InventAir-etiquettes-${list.data.code}.pdf`,
      );
    } catch (error) {
      toast.error('Génération impossible', errorMessage(error));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={
          <Link
            to={`/campagnes/${list.data.campaignId}`}
            className="inline-flex items-center gap-1 hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Retour à la campagne
          </Link>
        }
        title={list.data.name}
        description={list.data.description ?? undefined}
        actions={
          isManager ? (
            <>
              <Button variant="outline" onClick={() => void handleLabels()}>
                <QrCode className="h-4 w-4" aria-hidden />
                Étiquettes QR
              </Button>
              <Button variant="outline" asChild>
                <Link to={`/listes/${listId}/import`}>
                  <Upload className="h-4 w-4" aria-hidden />
                  Importer
                </Link>
              </Button>
              <Button variant="outline" onClick={() => setAddItemOpen(true)}>
                <PackagePlus className="h-4 w-4" aria-hidden />
                Ajouter un article
              </Button>
              <Button onClick={() => setAssignOpen(true)}>
                <UserPlus className="h-4 w-4" aria-hidden />
                Attribuer
              </Button>
            </>
          ) : null
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-sm font-medium">{list.data.code}</span>
        <ListStatusBadge status={list.data.status} />
        <span className="text-sm text-muted-foreground">
          <span className="tabular">{list.data.itemCount ?? 0}</span> ligne(s)
        </span>
        {list.data.assignees?.map((assignee) => (
          <Badge key={assignee.id} variant="secondary">
            {assignee.fullName}
          </Badge>
        ))}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Code article, désignation, emplacement, marque, réf. fabricant…"
            className="pl-9"
            aria-label="Rechercher un article"
          />
        </div>

        <Select
          value={filter}
          onValueChange={(value) => {
            setFilter(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="lg:w-56" aria-label="Filtrer les lignes">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FILTERS.map((entry) => (
              <SelectItem key={entry.value} value={entry.value}>
                {entry.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <label className="flex items-center gap-2 whitespace-nowrap text-sm">
          <input
            type="checkbox"
            checked={hideZero}
            onChange={(event) => {
              setHideZero(event.target.checked);
              setPage(1);
            }}
            className="h-4 w-4 rounded border-input"
          />
          Masquer les quantités théoriques nulles
        </label>
      </div>

      {items.isError ? (
        <ErrorState error={items.error} onRetry={() => void items.refetch()} />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                {/* L'emplacement vient en premier : c'est le critère de
                    déplacement dans l'entrepôt. */}
                <TableHead>Emplacement</TableHead>
                <TableHead>Code article</TableHead>
                <TableHead>Désignation</TableHead>
                {/* Théorique, compté et écart ne sont pas affichés à un
                    opérateur : l'API ne les lui transmet pas. Afficher trois
                    tirets serait plus déroutant qu'utile. */}
                {isManager ? <TableHead className="text-right">Théorique</TableHead> : null}
                {isManager ? <TableHead className="text-right">Compté</TableHead> : null}
                {isManager ? <TableHead className="text-right">Écart</TableHead> : null}
                <TableHead>Statut</TableHead>
                {isManager ? <TableHead /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.isLoading ? (
                <TableEmpty colSpan={isManager ? 8 : 4}>Chargement…</TableEmpty>
              ) : (items.data?.data.length ?? 0) === 0 ? (
                <TableEmpty colSpan={isManager ? 8 : 4}>
                  Aucune ligne ne correspond à ces critères.
                </TableEmpty>
              ) : (
                items.data?.data.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <span
                        className={
                          item.location.isVirtual
                            ? 'text-sm italic text-muted-foreground'
                            : 'font-mono text-sm font-semibold'
                        }
                      >
                        {item.location.isVirtual ? 'Sans emplacement' : item.location.code}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{item.article.code}</TableCell>
                    <TableCell className="max-w-sm">
                      <p className="truncate">{item.article.designation}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.article.brand ?? ''}
                        {item.isManual ? (
                          <span className="ml-1 rounded bg-amber-100 px-1 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-800">
                            Ajouté terrain
                          </span>
                        ) : null}
                      </p>
                    </TableCell>
                    {isManager ? (
                      <TableCell className="text-right tabular">
                        {formatQuantity(item.theoreticalQty)}
                      </TableCell>
                    ) : null}
                    {isManager ? (
                      <TableCell className="text-right tabular">
                        {formatQuantity(item.finalQty)}
                      </TableCell>
                    ) : null}
                    {isManager ? (
                      <TableCell className="text-right">
                        <VarianceCell value={item.variance} />
                        {item.varianceValue !== undefined &&
                        item.varianceValue !== null &&
                        item.varianceValue !== 0 ? (
                          <p className="text-xs tabular text-muted-foreground">
                            {formatAmount(item.varianceValue)}
                          </p>
                        ) : null}
                      </TableCell>
                    ) : null}
                    <TableCell>
                      <ItemStatusBadge status={item.status} />
                      {item.countCount > 0 ? (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {item.countCount} comptage(s)
                          {item.expectedCountNumber !== null
                            ? ` — ${item.expectedCountNumber}e attendu`
                            : ''}
                        </p>
                      ) : null}
                    </TableCell>
                    {isManager ? (
                      <TableCell className="text-right">
                        {item.status === 'DISCREPANCY' ||
                        item.status === 'UNDER_INVESTIGATION' ||
                        item.status === 'AWAITING_SECOND_COUNT' ||
                        item.status === 'AWAITING_THIRD_COUNT' ? (
                          <Button variant="outline" size="sm" onClick={() => setArbitrating(item)}>
                            <Gavel className="h-4 w-4" aria-hidden />
                            {item.status === 'UNDER_INVESTIGATION' ? 'Enquêter' : 'Arbitrer'}
                          </Button>
                        ) : null}
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <Pagination
            page={page}
            totalPages={items.data?.meta.totalPages ?? 1}
            total={items.data?.meta.total ?? 0}
            onChange={setPage}
          />
        </>
      )}

      {arbitrating ? (
        <ArbitrateDialog item={arbitrating} onClose={() => setArbitrating(null)} />
      ) : null}

      <AssignDialog listId={listId} open={assignOpen} onOpenChange={setAssignOpen} />

      <AddItemDialog listId={listId} open={addItemOpen} onOpenChange={setAddItemOpen} />
    </div>
  );
}

// ============================================================================

function ArbitrateDialog({ item, onClose }: { item: InventoryItem; onClose: () => void }) {
  const counts = useItemCounts(item.id);
  const arbitrate = useArbitrateItem();
  const toast = useToast();

  const [quantity, setQuantity] = useState(String(item.theoreticalQty));
  const [note, setNote] = useState('');

  const handleSubmit = async (): Promise<void> => {
    const parsed = Number.parseFloat(quantity.replace(',', '.'));

    if (!Number.isFinite(parsed) || parsed < 0) {
      toast.error('Quantité invalide', 'Saisissez un nombre positif ou nul.');
      return;
    }

    try {
      await arbitrate.mutateAsync({ itemId: item.id, quantity: parsed, note });
      toast.success('Litige tranché', 'La quantité arbitrée prime sur tous les comptages.');
      onClose();
    } catch (error) {
      toast.error('Arbitrage impossible', errorMessage(error));
    }
  };

  const validCounts = counts.data?.filter((count) => count.status === 'VALID') ?? [];

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Arbitrer — {item.article.code}</DialogTitle>
          <DialogDescription>
            {item.article.designation} · emplacement{' '}
            {item.location.isVirtual ? 'non renseigné' : item.location.code}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border p-4">
            <p className="mb-2 text-sm font-medium">Comptages enregistrés</p>
            {validCounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun comptage valide.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {validCounts.map((count) => (
                  <li key={count.id} className="flex justify-between gap-4">
                    <span>{count.username}</span>
                    <span className="tabular font-medium">{formatQuantity(count.quantity)}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(count.countedAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-sm text-muted-foreground">
              Quantité théorique :{' '}
              <span className="tabular font-medium">{formatQuantity(item.theoreticalQty)}</span>
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="arbitrate-quantity" required>
              Quantité retenue
            </Label>
            <Input
              id="arbitrate-quantity"
              type="number"
              min={0}
              step="0.001"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              className="text-lg tabular"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="arbitrate-note" required>
              Motif de l’arbitrage
            </Label>
            <Input
              id="arbitrate-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Recomptage contradictoire en présence du chef magasinier"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              Cette décision engage le résultat de l’inventaire : elle est journalisée.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            disabled={note.trim().length === 0}
            loading={arbitrate.isPending}
            onClick={() => void handleSubmit()}
          >
            <Gavel className="h-4 w-4" aria-hidden />
            Valider l’arbitrage
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================

function AssignDialog({
  listId,
  open,
  onOpenChange,
}: {
  listId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const list = useList(listId);
  const users = useUsers({ limit: 200, isActive: true });
  const assign = useAssignUserToList();
  const unassign = useUnassignUserFromList();
  const toast = useToast();

  const assignedIds = new Set(list.data?.assignees?.map((assignee) => assignee.id) ?? []);
  const candidates = (users.data?.data ?? []).filter((user) => !assignedIds.has(user.id));

  const handleAssign = async (userId: string): Promise<void> => {
    try {
      await assign.mutateAsync({ listId, userId });
      toast.success('Liste attribuée');
    } catch (error) {
      toast.error('Attribution impossible', errorMessage(error));
    }
  };

  const handleUnassign = async (userId: string): Promise<void> => {
    try {
      await unassign.mutateAsync({ listId, userId });
      toast.success('Opérateur retiré');
    } catch (error) {
      toast.error('Retrait impossible', errorMessage(error));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Attribution de la liste</DialogTitle>
          <DialogDescription>
            Un opérateur ne voit que les listes qui lui sont attribuées. Chaque modification est
            historisée.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium">Opérateurs affectés</p>
            {(list.data?.assignees?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun opérateur pour l’instant.</p>
            ) : (
              <ul className="space-y-1">
                {list.data?.assignees?.map((assignee) => (
                  <li
                    key={assignee.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                  >
                    <span>
                      {assignee.fullName}{' '}
                      <span className="text-muted-foreground">({assignee.username})</span>
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void handleUnassign(assignee.id)}
                      aria-label={`Retirer ${assignee.fullName}`}
                    >
                      <X className="h-4 w-4" aria-hidden />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Ajouter un opérateur</p>
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {candidates.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun compte disponible.</p>
              ) : (
                candidates.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => void handleAssign(user.id)}
                    className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
                  >
                    <span>
                      {user.fullName}{' '}
                      <span className="text-muted-foreground">({user.username})</span>
                    </span>
                    <UserPlus className="h-4 w-4 text-muted-foreground" aria-hidden />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
