import { useQueryClient } from '@tanstack/react-query';
import { GitMerge, MapPin, Search } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState, errorMessage } from '@/components/ui/error-state';
import { Input } from '@/components/ui/input';
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
import {
  useLocationVariants,
  useLocations,
  useMergeLocations,
  useWarehouses,
} from '@/hooks/queries';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { Pagination } from '@/pages/campaigns-page';

const PAGE_SIZE = 50;

export function LocationsPage() {
  const { hasRole } = useAuth();
  const warehouses = useWarehouses();
  const [warehouseId, setWarehouseId] = useState<string>('');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  // Le premier magasin est présélectionné : dans la plupart des installations
  // il n'y en a qu'un, et imposer un choix n'apporterait rien.
  useEffect(() => {
    const first = warehouses.data?.data[0];
    if (first && warehouseId === '') setWarehouseId(first.id);
  }, [warehouses.data, warehouseId]);

  const debouncedSearch = useDebouncedValue(search, 350);
  const locations = useLocations({
    page,
    limit: PAGE_SIZE,
    ...(warehouseId ? { warehouseId } : {}),
    ...(debouncedSearch ? { q: debouncedSearch } : {}),
  });

  if (warehouses.isLoading) return <PageSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Emplacements"
        description="Triés dans l’ordre physique de parcours : allée, travée, niveau, case — en ordre numérique."
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <select
          value={warehouseId}
          onChange={(event) => {
            setWarehouseId(event.target.value);
            setPage(1);
          }}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm sm:w-72"
          aria-label="Magasin"
        >
          {warehouses.data?.data.map((warehouse) => (
            <option key={warehouse.id} value={warehouse.id}>
              {warehouse.code} — {warehouse.label}
            </option>
          ))}
        </select>

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
            placeholder="Code ou libellé d’emplacement…"
            className="pl-9"
            aria-label="Rechercher un emplacement"
          />
        </div>
      </div>

      {hasRole('ADMIN') && warehouseId ? <VariantsPanel warehouseId={warehouseId} /> : null}

      {locations.isLoading ? (
        <PageSpinner />
      ) : locations.isError ? (
        <ErrorState error={locations.error} onRetry={() => void locations.refetch()} />
      ) : (locations.data?.data.length ?? 0) === 0 && !debouncedSearch ? (
        <EmptyState
          icon={MapPin}
          title="Aucun emplacement"
          description="Les emplacements sont créés automatiquement lors de l’import d’inventaire."
        />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Décomposition</TableHead>
                <TableHead>Libellé</TableHead>
                <TableHead className="text-right">Lignes</TableHead>
                <TableHead>État</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations.data?.data.length === 0 ? (
                <TableEmpty colSpan={5}>Aucun emplacement ne correspond.</TableEmpty>
              ) : (
                locations.data?.data.map((location) => (
                  <TableRow key={location.id}>
                    <TableCell className="font-mono text-sm font-medium">{location.code}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {location.aisle === null ? (
                        <span className="italic">Libellé libre</span>
                      ) : (
                        <span className="tabular">
                          Allée {location.aisle} · Travée {location.bay} · Niveau {location.level}
                          {location.slot === null ? '' : ` · Case ${location.slot}`}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{location.label ?? '—'}</TableCell>
                    <TableCell className="text-right tabular">{location.itemCount ?? 0}</TableCell>
                    <TableCell>
                      {location.isVirtual ? (
                        <Badge variant="outline">Virtuel</Badge>
                      ) : location.isActive ? (
                        <Badge variant="secondary">Actif</Badge>
                      ) : (
                        <Badge variant="muted">Fusionné</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <Pagination
            page={page}
            totalPages={locations.data?.meta.totalPages ?? 1}
            total={locations.data?.meta.total ?? 0}
            onChange={setPage}
          />
        </>
      )}
    </div>
  );
}

/**
 * Détection des variantes orthographiques.
 *
 * Les codes structurés en sont délibérément exclus côté API : « 1-1-A-7 » et
 * « 1-1-B-7 » ne diffèrent que d'un caractère mais désignent deux niveaux bien
 * réels. Les proposer à la fusion serait destructeur.
 */
function VariantsPanel({ warehouseId }: { warehouseId: string }) {
  const variants = useLocationVariants(warehouseId);
  const merge = useMergeLocations();
  const queryClient = useQueryClient();
  const toast = useToast();

  if (variants.isLoading || (variants.data?.length ?? 0) === 0) return null;

  const handleMerge = async (sourceId: string, targetLocationId: string): Promise<void> => {
    try {
      await merge.mutateAsync({ sourceId, targetLocationId });
      toast.success(
        'Emplacements fusionnés',
        'Les lignes ont été réaffectées et l’emplacement source désactivé.',
      );
      await queryClient.invalidateQueries({ queryKey: ['locations'] });
    } catch (error) {
      toast.error('Fusion impossible', errorMessage(error));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitMerge className="h-4 w-4" aria-hidden />
          Variantes orthographiques probables
        </CardTitle>
        <CardDescription>
          Ces emplacements se ressemblent fortement : il s’agit vraisemblablement du même lieu saisi
          de deux façons. Vérifiez avant de fusionner.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        <Alert variant="warning">
          La fusion réaffecte toutes les lignes d’inventaire vers l’emplacement conservé, puis
          désactive l’autre. L’opération est journalisée et ne peut pas être annulée
          automatiquement.
        </Alert>

        {variants.data?.map((group) => (
          <div key={group.location.id} className="rounded-lg border p-4">
            <p className="mb-2 text-sm">
              <span className="font-mono font-medium">{group.location.code}</span>{' '}
              <span className="text-muted-foreground">
                ({group.location.itemCount ?? 0} ligne(s))
              </span>
            </p>
            <ul className="space-y-2">
              {group.candidates.map((candidate) => (
                <li
                  key={candidate.id}
                  className="flex flex-wrap items-center justify-between gap-2 text-sm"
                >
                  <span className="font-mono">
                    {candidate.code}{' '}
                    <span className="text-muted-foreground">
                      ({candidate.itemCount ?? 0} ligne(s))
                    </span>
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      loading={merge.isPending}
                      onClick={() => void handleMerge(candidate.id, group.location.id)}
                    >
                      Fusionner vers {group.location.code}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      loading={merge.isPending}
                      onClick={() => void handleMerge(group.location.id, candidate.id)}
                    >
                      Fusionner vers {candidate.code}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
