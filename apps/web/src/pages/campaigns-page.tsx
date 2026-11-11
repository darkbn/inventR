import { ClipboardList, Plus, Search, Upload } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Input } from '@/components/ui/input';
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
import { PageHeader } from '@/components/layout/page-header';
import { useAuth } from '@/features/auth/auth-context';
import { CampaignStatusBadge } from '@/features/campaigns/campaign-status-badge';
import { useCampaigns } from '@/hooks/queries';
import { CAMPAIGN_STATUS_LABELS } from '@/lib/labels';
import { formatDate } from '@/lib/format';
import { useDebouncedValue } from '@/hooks/use-debounced-value';

const PAGE_SIZE = 20;
const ALL_STATUSES = 'ALL';

export function CampaignsPage() {
  const { hasRole } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>(ALL_STATUSES);

  // La recherche est différée : interroger l'API à chaque frappe saturerait le
  // limiteur de débit et ferait clignoter le tableau.
  const debouncedSearch = useDebouncedValue(search, 350);

  const campaigns = useCampaigns({
    page,
    limit: PAGE_SIZE,
    ...(debouncedSearch ? { q: debouncedSearch } : {}),
    ...(status === ALL_STATUSES ? {} : { status }),
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campagnes"
        description="Chaque campagne porte sur un magasin et une méthode de calcul."
        actions={
          hasRole('ADMIN', 'SUPERVISOR') ? (
            <Button asChild>
              <Link to="/campagnes/nouvelle">
                <Plus className="h-4 w-4" aria-hidden />
                Nouvelle campagne
              </Link>
            </Button>
          ) : null
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row">
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
            placeholder="Rechercher par code ou libellé…"
            className="pl-9"
            aria-label="Rechercher une campagne"
          />
        </div>

        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="sm:w-56" aria-label="Filtrer par statut">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_STATUSES}>Tous les statuts</SelectItem>
            {Object.entries(CAMPAIGN_STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {campaigns.isLoading ? (
        <PageSpinner />
      ) : campaigns.isError ? (
        <ErrorState error={campaigns.error} onRetry={() => void campaigns.refetch()} />
      ) : (campaigns.data?.data.length ?? 0) === 0 &&
        !debouncedSearch &&
        status === ALL_STATUSES ? (
        <EmptyState
          icon={ClipboardList}
          title="Aucune campagne"
          description="Créez une campagne, puis importez le fichier d’inventaire du magasin concerné."
          action={
            hasRole('ADMIN', 'SUPERVISOR') ? (
              <Button asChild size="sm">
                <Link to="/campagnes/nouvelle">Créer une campagne</Link>
              </Button>
            ) : null
          }
        />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Libellé</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-center">Passage</TableHead>
                <TableHead>Créée le</TableHead>
                <TableHead>Clôturée le</TableHead>
                {hasRole('ADMIN', 'SUPERVISOR') ? <TableHead /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.data?.data.length === 0 ? (
                <TableEmpty colSpan={hasRole('ADMIN', 'SUPERVISOR') ? 7 : 6}>
                  Aucune campagne ne correspond à ces critères.
                </TableEmpty>
              ) : (
                campaigns.data?.data.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell>
                      <Link
                        to={`/campagnes/${campaign.id}`}
                        className="font-mono font-medium text-primary hover:underline"
                      >
                        {campaign.code}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-md truncate">{campaign.name}</TableCell>
                    <TableCell>
                      <CampaignStatusBadge status={campaign.status} />
                    </TableCell>
                    <TableCell className="text-center">
                      {campaign.round > 1 ? (
                        <Badge variant="outline">{campaign.round}</Badge>
                      ) : (
                        <span className="text-muted-foreground">1</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(campaign.createdAt)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(campaign.closedAt)}
                    </TableCell>
                    {hasRole('ADMIN', 'SUPERVISOR') ? (
                      <TableCell className="text-right">
                        {/* Accès direct à l'import : c'est l'action la plus
                            fréquente juste après la création d'une campagne. */}
                        {campaign.status === 'CLOSED' ? null : (
                          <Button variant="ghost" size="sm" asChild>
                            <Link to={`/campagnes/${campaign.id}`} title="Importer un fichier">
                              <Upload className="h-4 w-4" aria-hidden />
                              <span className="sr-only">Importer dans {campaign.code}</span>
                            </Link>
                          </Button>
                        )}
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <Pagination
            page={page}
            totalPages={campaigns.data?.meta.totalPages ?? 1}
            total={campaigns.data?.meta.total ?? 0}
            onChange={setPage}
          />
        </>
      )}
    </div>
  );
}

export function Pagination({
  page,
  totalPages,
  total,
  onChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) {
    return (
      <p className="text-sm text-muted-foreground">
        <span className="tabular">{total}</span> élément(s).
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">
        Page <span className="tabular">{page}</span> sur{' '}
        <span className="tabular">{totalPages}</span> — <span className="tabular">{total}</span>{' '}
        élément(s)
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          Précédent
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          Suivant
        </Button>
      </div>
    </div>
  );
}
