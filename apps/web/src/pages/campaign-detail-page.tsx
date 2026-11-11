import {
  ArrowLeft,
  Copy,
  Download,
  FileSpreadsheet,
  FileText,
  Lock,
  PlayCircle,
  Plus,
  Trash2,
  Unlock,
  Upload,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { downloadFile } from '@/api/client';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState, errorMessage } from '@/components/ui/error-state';
import { ProgressBar } from '@/components/ui/progress-bar';
import { PageSpinner } from '@/components/ui/spinner';
import { StatCard } from '@/components/ui/stat-card';
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
import { CampaignStatusBadge, ListStatusBadge } from '@/features/campaigns/campaign-status-badge';
import { CloseCampaignDialog } from '@/features/campaigns/close-campaign-dialog';
import { DeleteCampaignDialog } from '@/features/campaigns/delete-campaign-dialog';
import { VarianceCell } from '@/features/items/variance-cell';
import {
  useCampaign,
  useCampaignDashboard,
  useLists,
  useNextRound,
  useOpenCampaign,
  useReopenCampaign,
} from '@/hooks/queries';
import { formatAmount, formatDateTime, formatPercent, formatQuantity } from '@/lib/format';

/** Palette du graphique d'avancement, alignée sur les tons sémantiques. */
const STATUS_COLORS = {
  resolved: 'hsl(142 55% 34%)',
  pending: 'hsl(215 16% 70%)',
  blocking: 'hsl(0 65% 48%)',
  notFound: 'hsl(38 92% 42%)',
} as const;

export function CampaignDetailPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const { hasRole } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [hideZero, setHideZero] = useState(true);
  const [closeOpen, setCloseOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const campaign = useCampaign(campaignId);
  const dashboard = useCampaignDashboard(campaignId, hideZero);
  const lists = useLists({ campaignId, limit: 100 });

  const openCampaign = useOpenCampaign();
  const reopenCampaign = useReopenCampaign();
  const nextRound = useNextRound();

  const isManager = hasRole('ADMIN', 'SUPERVISOR');
  const isAdmin = hasRole('ADMIN');

  if (campaign.isLoading || dashboard.isLoading) return <PageSpinner />;
  if (campaign.isError) {
    return <ErrorState error={campaign.error} onRetry={() => void campaign.refetch()} />;
  }
  if (dashboard.isError) {
    return <ErrorState error={dashboard.error} onRetry={() => void dashboard.refetch()} />;
  }
  if (!campaign.data || !dashboard.data || !campaignId) return null;

  const data = dashboard.data;
  const { progress, variance } = data;
  // Tout ce qui empêche la clôture, y compris les statuts propres à la
  // Méthode 3 : en oublier un laisserait le superviseur devant un refus de
  // clôture sans savoir ce qui le motive.
  const blocking =
    progress.awaitingSecondCount +
    progress.awaitingThirdCount +
    progress.underInvestigation +
    progress.discrepancies;

  const handleOpen = async (): Promise<void> => {
    try {
      await openCampaign.mutateAsync(campaignId);
      toast.success('Campagne ouverte', 'Les opérateurs affectés voient désormais leurs listes.');
    } catch (error) {
      toast.error('Ouverture impossible', errorMessage(error));
    }
  };

  const handleReopen = async (): Promise<void> => {
    const reason = window.prompt(
      'Motif de la réouverture (10 caractères minimum). Cette action est journalisée.',
    );
    if (reason === null) return;

    try {
      await reopenCampaign.mutateAsync({ id: campaignId, reason });
      toast.success('Campagne rouverte', 'Le comptage est de nouveau possible.');
    } catch (error) {
      toast.error('Réouverture impossible', errorMessage(error));
    }
  };

  const handleNextRound = async (): Promise<void> => {
    try {
      const created = await nextRound.mutateAsync({ id: campaignId });
      toast.success(
        `Passage ${created.round} créé`,
        'Seules les lignes en écart, non trouvées ou litigieuses ont été reprises.',
      );
      navigate(`/campagnes/${created.id}`);
    } catch (error) {
      toast.error('Création impossible', errorMessage(error));
    }
  };

  /**
   * Raccourci vers l'import.
   *
   * Importer suppose une liste de destination, ce que l'utilisateur n'a pas de
   * raison de deviner. Le bouton mène donc directement au bon endroit : la
   * création de liste s'il n'y en a aucune — l'écran enchaîne ensuite de
   * lui-même sur l'import —, l'import direct s'il n'y en a qu'une, et le choix
   * de la liste au-delà.
   */
  const handleImport = (): void => {
    const rows = lists.data?.data ?? [];

    if (rows.length === 0) {
      navigate(`/campagnes/${campaignId}/listes/nouvelle`);
      return;
    }

    if (rows.length === 1 && rows[0]) {
      navigate(`/listes/${rows[0].id}/import`);
      return;
    }

    document.getElementById('listes-de-comptage')?.scrollIntoView({ behavior: 'smooth' });
    toast.notify({
      tone: 'info',
      title: 'Choisissez la liste à alimenter',
      description: 'Cette campagne comporte plusieurs listes : sélectionnez celle à importer.',
    });
  };

  const handleExport = async (format: 'xlsx' | 'pdf'): Promise<void> => {
    try {
      await downloadFile(
        `/reports/campaigns/${campaignId}.${format}?hideZeroTheoretical=${String(hideZero)}`,
        `InventAir-${data.code}.${format}`,
      );
    } catch (error) {
      toast.error('Export impossible', errorMessage(error));
    }
  };

  const progressChartData = [
    {
      name: 'Résolues',
      value: progress.counted + progress.confirmed,
      color: STATUS_COLORS.resolved,
    },
    { name: 'Non comptées', value: progress.pending, color: STATUS_COLORS.pending },
    { name: 'Non trouvées', value: progress.notFound, color: STATUS_COLORS.notFound },
    { name: 'Bloquantes', value: blocking, color: STATUS_COLORS.blocking },
  ].filter((entry) => entry.value > 0);

  const topChartData = data.topVariances.slice(0, 8).map((entry) => ({
    name: entry.articleCode,
    ecart: entry.variance,
    valeur: entry.varianceValue ?? 0,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={
          <Link to="/campagnes" className="inline-flex items-center gap-1 hover:underline">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Campagnes
          </Link>
        }
        title={data.name}
        description={`${data.campaignTypeLabel} · Magasin ${data.warehouseCode} · ${data.methodLabel}`}
        actions={
          <>
            {isManager && campaign.data.status !== 'CLOSED' ? (
              <Button variant="secondary" onClick={handleImport}>
                <Upload className="h-4 w-4" aria-hidden />
                Importer un fichier
              </Button>
            ) : null}

            <Button variant="outline" onClick={() => void handleExport('xlsx')}>
              <FileSpreadsheet className="h-4 w-4" aria-hidden />
              Excel
            </Button>
            <Button variant="outline" onClick={() => void handleExport('pdf')}>
              <FileText className="h-4 w-4" aria-hidden />
              PDF
            </Button>

            {isManager && campaign.data.status === 'DRAFT' ? (
              <Button onClick={() => void handleOpen()} loading={openCampaign.isPending}>
                <PlayCircle className="h-4 w-4" aria-hidden />
                Ouvrir au comptage
              </Button>
            ) : null}

            {isManager && ['OPEN', 'COUNTING', 'PENDING_CLOSURE'].includes(campaign.data.status) ? (
              <Button variant="destructive" onClick={() => setCloseOpen(true)}>
                <Lock className="h-4 w-4" aria-hidden />
                Clôturer
              </Button>
            ) : null}

            {isManager && campaign.data.status === 'CLOSED' ? (
              <Button onClick={() => void handleNextRound()} loading={nextRound.isPending}>
                <Copy className="h-4 w-4" aria-hidden />
                Créer le passage suivant
              </Button>
            ) : null}

            {isAdmin && campaign.data.status === 'CLOSED' ? (
              <Button
                variant="outline"
                onClick={() => void handleReopen()}
                loading={reopenCampaign.isPending}
              >
                <Unlock className="h-4 w-4" aria-hidden />
                Rouvrir
              </Button>
            ) : null}

            {/* Une campagne clôturée est un dossier d'inventaire : l'API refuse
                de la supprimer, le bouton ne s'affiche donc pas. */}
            {isAdmin && campaign.data.status !== 'CLOSED' ? (
              <Button variant="outline" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="h-4 w-4" aria-hidden />
                Supprimer
              </Button>
            ) : null}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-sm font-medium">{data.code}</span>
        <CampaignStatusBadge status={data.status} />
        {data.round > 1 ? <Badge variant="outline">Passage {data.round}</Badge> : null}
        <span className="text-sm text-muted-foreground">
          Ouverte le {formatDateTime(data.startedAt)}
          {data.closedAt ? ` · Clôturée le ${formatDateTime(data.closedAt)}` : ''}
        </span>
      </div>

      {campaign.data.reopenReason ? (
        <Alert variant="warning" title="Campagne rouverte par un administrateur">
          {campaign.data.reopenReason}
        </Alert>
      ) : null}

      {blocking > 0 ? (
        <Alert variant="danger" title="Des lignes bloquent la clôture">
          <span className="tabular">{progress.awaitingSecondCount}</span> en attente d’un 2e
          comptage, <span className="tabular">{progress.awaitingThirdCount}</span> d’un 3e,{' '}
          <span className="tabular">{progress.underInvestigation}</span> sous enquête et{' '}
          <span className="tabular">{progress.discrepancies}</span> litige(s) à trancher. Les
          lignes sous enquête ne se résoudront pas par un comptage de plus : elles attendent votre
          décision.
        </Alert>
      ) : null}

      {progress.manualItems > 0 ? (
        <Alert variant="warning" title="Articles absents du fichier importé">
          <span className="tabular">{progress.manualItems}</span> ligne(s) ont été ajoutées sur le
          terrain : ces articles existent en rayon mais pas dans l’extraction SAP. Tout ce qui y
          sera compté apparaît en surplus — ce sont autant de fiches à créer dans l’ERP.
        </Alert>
      ) : null}

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={hideZero}
          onChange={(event) => setHideZero(event.target.checked)}
          className="h-4 w-4 rounded border-input"
        />
        Masquer les lignes dont la quantité théorique est nulle
      </label>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Avancement"
          value={formatPercent(progress.completionPercent)}
          hint={`${progress.totalItems} ligne(s)`}
          tone="primary"
        />
        <StatCard
          label="Surplus"
          value={variance.surplusCount}
          hint={`+${formatQuantity(variance.surplusQuantity)} unité(s)`}
          tone="surplus"
        />
        <StatCard
          label="Manques"
          value={variance.shortageCount}
          hint={`−${formatQuantity(variance.shortageQuantity)} unité(s)`}
          tone="shortage"
        />
        <StatCard
          label="Écart net valorisé"
          value={formatAmount(variance.netValue)}
          hint={`Surplus ${formatAmount(variance.surplusValue)} · Manques ${formatAmount(variance.shortageValue)}`}
          tone={(variance.netValue ?? 0) < 0 ? 'shortage' : 'surplus'}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Répartition des lignes</CardTitle>
          </CardHeader>
          <CardContent>
            {progressChartData.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                Aucune ligne à afficher.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={progressChartData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                  >
                    {progressChartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatQuantity(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Écarts les plus significatifs</CardTitle>
          </CardHeader>
          <CardContent>
            {topChartData.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                Aucun écart constaté.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={topChartData} layout="vertical" margin={{ left: 24 }}>
                  <XAxis type="number" tickFormatter={(value: number) => formatQuantity(value)} />
                  <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => formatQuantity(value)} />
                  <Bar dataKey="ecart" name="Écart">
                    {topChartData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={entry.ecart > 0 ? STATUS_COLORS.resolved : STATUS_COLORS.blocking}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle id="listes-de-comptage">Listes de comptage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(lists.data?.data.length ?? 0) === 0 ? (
            <EmptyState
              icon={Upload}
              title="Aucune liste de comptage"
              description={
                'Une liste délimite le périmètre confié aux opérateurs : une zone, une allée, ' +
                'un magasinier. C’est elle qui reçoit le fichier d’inventaire importé.'
              }
              action={
                isManager ? (
                  <Button asChild>
                    <Link to={`/campagnes/${campaignId}/listes/nouvelle`}>
                      <Upload className="h-4 w-4" aria-hidden />
                      Créer une liste et importer un fichier
                    </Link>
                  </Button>
                ) : null
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Libellé</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Lignes</TableHead>
                  <TableHead>Avancement</TableHead>
                  <TableHead>Opérateurs</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {lists.data?.data.map((list) => {
                  const listProgress = data.lists.find((entry) => entry.listId === list.id);

                  return (
                    <TableRow key={list.id}>
                      <TableCell className="font-mono">{list.code}</TableCell>
                      <TableCell>{list.name}</TableCell>
                      <TableCell>
                        <ListStatusBadge status={list.status} />
                      </TableCell>
                      <TableCell className="text-right tabular">{list.itemCount ?? 0}</TableCell>
                      <TableCell className="w-40">
                        <div className="flex items-center gap-2">
                          <ProgressBar value={listProgress?.completionPercent ?? 0} />
                          <span className="w-12 shrink-0 text-right text-xs tabular text-muted-foreground">
                            {listProgress?.completionPercent ?? 0} %
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {(list.assignees?.length ?? 0) === 0 ? (
                          <span className="text-sm text-muted-foreground">Non attribuée</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {list.assignees?.map((assignee) => (
                              <Badge key={assignee.id} variant="secondary">
                                {assignee.fullName}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {isManager ? (
                            <Button variant="ghost" size="sm" asChild>
                              <Link to={`/listes/${list.id}/import`}>
                                <Upload className="h-4 w-4" aria-hidden />
                                <span className="sr-only">Importer</span>
                              </Link>
                            </Button>
                          ) : null}
                          <Button variant="outline" size="sm" asChild>
                            <Link to={`/listes/${list.id}`}>Ouvrir</Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {isManager && (lists.data?.data.length ?? 0) > 0 ? (
            <Button variant="outline" size="sm" asChild>
              <Link to={`/campagnes/${campaignId}/listes/nouvelle`}>
                <Plus className="h-4 w-4" aria-hidden />
                Ajouter une liste
              </Link>
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Détail des écarts</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Emplacement</TableHead>
                  <TableHead>Article</TableHead>
                  <TableHead className="text-right">Théorique</TableHead>
                  <TableHead className="text-right">Compté</TableHead>
                  <TableHead className="text-right">Écart</TableHead>
                  <TableHead className="text-right">Valeur</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.topVariances.length === 0 ? (
                  <TableEmpty colSpan={6}>Aucun écart constaté à ce stade.</TableEmpty>
                ) : (
                  data.topVariances.map((entry) => (
                    <TableRow key={entry.itemId}>
                      <TableCell className="font-mono text-sm">{entry.locationCode}</TableCell>
                      <TableCell>
                        <p className="font-mono text-sm">{entry.articleCode}</p>
                        <p className="max-w-[18rem] truncate text-xs text-muted-foreground">
                          {entry.designation}
                        </p>
                      </TableCell>
                      <TableCell className="text-right tabular">
                        {formatQuantity(entry.theoreticalQty)}
                      </TableCell>
                      <TableCell className="text-right tabular">
                        {formatQuantity(entry.finalQty)}
                      </TableCell>
                      <TableCell className="text-right">
                        <VarianceCell value={entry.variance} />
                      </TableCell>
                      <TableCell className="text-right tabular">
                        {formatAmount(entry.varianceValue)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activité par opérateur</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Opérateur</TableHead>
                  <TableHead className="text-right">Comptages</TableHead>
                  <TableHead className="text-right">Lignes</TableHead>
                  <TableHead>Dernier comptage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.counters.length === 0 ? (
                  <TableEmpty colSpan={4}>Aucun comptage enregistré.</TableEmpty>
                ) : (
                  data.counters.map((counter) => (
                    <TableRow key={counter.userId}>
                      <TableCell>
                        <p className="font-medium">{counter.fullName}</p>
                        <p className="text-xs text-muted-foreground">{counter.username}</p>
                      </TableCell>
                      <TableCell className="text-right tabular">{counter.countEntries}</TableCell>
                      <TableCell className="text-right tabular">{counter.itemsCovered}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDateTime(counter.lastCountAt)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button variant="ghost" size="sm" asChild>
          <a
            href={`/api/v1/reports/campaigns/${campaignId}/by-user`}
            target="_blank"
            rel="noreferrer"
          >
            <Download className="h-4 w-4" aria-hidden />
            Données brutes par opérateur
          </a>
        </Button>
      </div>

      <CloseCampaignDialog
        campaignId={campaignId}
        campaignCode={data.code}
        open={closeOpen}
        onOpenChange={setCloseOpen}
      />

      <DeleteCampaignDialog
        campaign={campaign.data}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        // La campagne n'existe plus : rester sur sa page afficherait une erreur.
        onDeleted={() => navigate('/campagnes')}
      />
    </div>
  );
}
