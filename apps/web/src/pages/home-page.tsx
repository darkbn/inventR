import { ClipboardList, Package, Plus, TrendingDown, TrendingUp, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { ProgressBar } from '@/components/ui/progress-bar';
import { PageSpinner } from '@/components/ui/spinner';
import { StatCard } from '@/components/ui/stat-card';
import { PageHeader } from '@/components/layout/page-header';
import { useAuth } from '@/features/auth/auth-context';
import { CampaignStatusBadge } from '@/features/campaigns/campaign-status-badge';
import { useArticles, useCampaignDashboardStatic, useCampaigns, useUsers } from '@/hooks/queries';
import { formatDate } from '@/lib/format';

/**
 * Accueil. Le contenu dépend du rôle : un administrateur veut l'état du parc,
 * un superviseur l'avancement de ses campagnes, un opérateur l'accès direct à
 * ses listes — ce dernier passe surtout par l'application mobile, mais la
 * consultation web doit rester possible depuis une tablette.
 */
export function HomePage() {
  const { user, hasRole } = useAuth();
  const isManager = hasRole('ADMIN', 'SUPERVISOR');

  const campaigns = useCampaigns({ limit: 6, sortBy: 'createdAt', sortOrder: 'desc' });
  const users = useUsers({ limit: 1, isActive: true });
  const articles = useArticles({ limit: 1 });

  if (campaigns.isLoading) return <PageSpinner />;
  if (campaigns.isError) {
    return <ErrorState error={campaigns.error} onRetry={() => void campaigns.refetch()} />;
  }

  const rows = campaigns.data?.data ?? [];
  const active = rows.filter((campaign) => campaign.status !== 'CLOSED');

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Bonjour ${user?.fullName.split(' ')[0] ?? ''}`}
        description={
          isManager
            ? 'Vue d’ensemble des campagnes et du référentiel.'
            : 'Vos campagnes et listes de comptage.'
        }
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Campagnes en cours"
          value={active.length}
          icon={ClipboardList}
          tone="primary"
          hint={`${campaigns.data?.meta.total ?? 0} au total`}
        />
        {isManager ? (
          <>
            <StatCard label="Comptes actifs" value={users.data?.meta.total ?? '—'} icon={Users} />
            <StatCard
              label="Articles au référentiel"
              value={articles.data?.meta.total ?? '—'}
              icon={Package}
            />
            <StatCard
              label="Campagnes clôturées"
              value={(campaigns.data?.meta.total ?? 0) - active.length}
              icon={TrendingUp}
            />
          </>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Campagnes récentes</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="Aucune campagne"
              description={
                isManager
                  ? 'Créez une campagne, importez le fichier d’inventaire, puis attribuez les listes aux opérateurs.'
                  : 'Aucune liste ne vous a encore été attribuée.'
              }
              action={
                isManager ? (
                  <Button asChild size="sm">
                    <Link to="/campagnes/nouvelle">Créer une campagne</Link>
                  </Button>
                ) : null
              }
            />
          ) : (
            <ul className="divide-y">
              {rows.map((campaign) => (
                <li key={campaign.id}>
                  <Link
                    to={`/campagnes/${campaign.id}`}
                    className="flex flex-col gap-2 py-3 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-medium">{campaign.code}</span>
                        <CampaignStatusBadge status={campaign.status} />
                        {campaign.round > 1 ? (
                          <Badge variant="outline">Passage {campaign.round}</Badge>
                        ) : null}
                      </div>
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">
                        {campaign.name}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {campaign.closedAt
                        ? `Clôturée le ${formatDate(campaign.closedAt)}`
                        : campaign.startedAt
                          ? `Ouverte le ${formatDate(campaign.startedAt)}`
                          : `Créée le ${formatDate(campaign.createdAt)}`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {isManager && active.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Avancement des campagnes en cours</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {active.map((campaign) => (
              <ActiveCampaignRow key={campaign.id} campaignId={campaign.id} code={campaign.code} />
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

/** Ligne d'avancement : chaque campagne charge son propre tableau de bord. */
function ActiveCampaignRow({ campaignId, code }: { campaignId: string; code: string }) {
  const { data: dashboard } = useCampaignDashboardStatic(campaignId);

  if (!dashboard) {
    return (
      <div className="space-y-1.5">
        <p className="font-mono text-sm">{code}</p>
        <ProgressBar value={0} label={`Avancement de ${code}`} />
      </div>
    );
  }

  const { progress, variance } = dashboard;

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <Link to={`/campagnes/${campaignId}`} className="font-mono font-medium hover:underline">
          {code}
        </Link>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 text-surplus">
            <TrendingUp className="h-3.5 w-3.5" aria-hidden />
            {variance.surplusCount} surplus
          </span>
          <span className="inline-flex items-center gap-1 text-shortage">
            <TrendingDown className="h-3.5 w-3.5" aria-hidden />
            {variance.shortageCount} manques
          </span>
          <span className="tabular">{progress.completionPercent} %</span>
        </div>
      </div>
      <ProgressBar value={progress.completionPercent} label={`Avancement de ${code}`} />
    </div>
  );
}
