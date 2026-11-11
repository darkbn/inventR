import { ScrollText } from 'lucide-react';
import { useState } from 'react';

import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
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
import { PageHeader } from '@/components/layout/page-header';
import { useActivityLogs } from '@/hooks/queries';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { Pagination } from '@/pages/campaigns-page';
import { formatDateTime } from '@/lib/format';

const PAGE_SIZE = 50;

export function ActivityLogsPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');

  const debouncedAction = useDebouncedValue(action, 350);
  const logs = useActivityLogs({
    page,
    limit: PAGE_SIZE,
    ...(debouncedAction ? { action: debouncedAction } : {}),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Journal d’activité"
        description="Actions sensibles : comptes, imports, comptages, clôtures, fusions d’emplacements. Du plus récent au plus ancien."
      />

      <Input
        value={action}
        onChange={(event) => {
          setAction(event.target.value.toUpperCase());
          setPage(1);
        }}
        placeholder="Filtrer par action exacte, ex. CAMPAIGN_CLOSE"
        className="max-w-md font-mono"
        aria-label="Filtrer par action"
      />

      {logs.isLoading ? (
        <PageSpinner />
      ) : logs.isError ? (
        <ErrorState error={logs.error} onRetry={() => void logs.refetch()} />
      ) : (logs.data?.data.length ?? 0) === 0 && !debouncedAction ? (
        <EmptyState icon={ScrollText} title="Journal vide" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Auteur</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Ressource</TableHead>
                <TableHead>Détails</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.data?.data.length === 0 ? (
                <TableEmpty colSpan={5}>Aucune entrée pour ce filtre.</TableEmpty>
              ) : (
                logs.data?.data.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {formatDateTime(log.createdAt)}
                    </TableCell>
                    <TableCell className="text-sm">{log.actor?.fullName ?? 'Système'}</TableCell>
                    <TableCell className="font-mono text-xs">{log.action}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {log.entityType}
                    </TableCell>
                    <TableCell className="max-w-md">
                      <code className="block truncate text-xs text-muted-foreground">
                        {JSON.stringify(log.metadata)}
                      </code>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <Pagination
            page={page}
            totalPages={logs.data?.meta.totalPages ?? 1}
            total={logs.data?.meta.total ?? 0}
            onChange={setPage}
          />
        </>
      )}
    </div>
  );
}
