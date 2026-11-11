import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { PageSpinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PageHeader } from '@/components/layout/page-header';
import { useCampaignTypes, useInventoryMethods } from '@/hooks/queries';

export function SettingsPage() {
  const types = useCampaignTypes();
  const methods = useInventoryMethods();

  if (types.isLoading || methods.isLoading) return <PageSpinner />;
  if (types.isError) return <ErrorState error={types.error} onRetry={() => void types.refetch()} />;
  if (methods.isError) {
    return <ErrorState error={methods.error} onRetry={() => void methods.refetch()} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Paramétrage" description="Types de campagne et méthodes de calcul." />

      <Card>
        <CardHeader>
          <CardTitle>Types de campagne</CardTitle>
          <CardDescription>
            Table extensible : un nouveau type s’ajoute sans migration de schéma.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Libellé</TableHead>
                <TableHead className="text-right">Campagnes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {types.data?.map((type) => (
                <TableRow key={type.id}>
                  <TableCell className="font-mono text-sm">{type.code}</TableCell>
                  <TableCell>{type.label}</TableCell>
                  <TableCell className="text-right tabular">{type.campaignCount ?? 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Méthodes de calcul</CardTitle>
          <CardDescription>
            Le code et la configuration ne sont pas modifiables : ils détermineraient
            rétroactivement le résultat de campagnes en cours.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {methods.data?.map((method) => (
            <div key={method.id} className="rounded-lg border p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-medium">{method.code}</span>
                <Badge variant="secondary">{method.label}</Badge>
                <span className="text-xs text-muted-foreground">
                  {method.campaignCount ?? 0} campagne(s)
                </span>
              </div>
              {method.description ? (
                <p className="text-sm text-muted-foreground">{method.description}</p>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
