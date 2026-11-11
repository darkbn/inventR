import { Warehouse as WarehouseIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
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
import { useWarehouses } from '@/hooks/queries';

export function WarehousesPage() {
  const warehouses = useWarehouses();

  if (warehouses.isLoading) return <PageSpinner />;
  if (warehouses.isError) {
    return <ErrorState error={warehouses.error} onRetry={() => void warehouses.refetch()} />;
  }

  const rows = warehouses.data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Magasins"
        description="Chaque magasin possède un emplacement virtuel « NON-LOCALISE », qui reçoit les lignes importées sans emplacement."
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={WarehouseIcon}
          title="Aucun magasin"
          description="Le magasin est créé au premier import, ou par le seed initial."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Libellé</TableHead>
              <TableHead className="text-right">Emplacements</TableHead>
              <TableHead>État</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((warehouse) => (
              <TableRow key={warehouse.id}>
                <TableCell className="font-mono font-medium">{warehouse.code}</TableCell>
                <TableCell>{warehouse.label}</TableCell>
                <TableCell className="text-right tabular">{warehouse.locationCount ?? 0}</TableCell>
                <TableCell>
                  <Badge variant={warehouse.isActive ? 'secondary' : 'muted'}>
                    {warehouse.isActive ? 'Actif' : 'Désactivé'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
