import { Package, QrCode, Search } from 'lucide-react';
import { useState } from 'react';

import { API_BASE_URL } from '@/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { useArticles } from '@/hooks/queries';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { Pagination } from '@/pages/campaigns-page';
import { formatAmount } from '@/lib/format';

const PAGE_SIZE = 25;

export function ArticlesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [qrCode, setQrCode] = useState<string | null>(null);

  const debouncedSearch = useDebouncedValue(search, 350);
  const articles = useArticles({
    page,
    limit: PAGE_SIZE,
    ...(debouncedSearch ? { q: debouncedSearch } : {}),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Articles"
        description="Référentiel alimenté automatiquement par les imports. La recherche porte aussi sur la marque et la référence fabricant."
      />

      <div className="relative max-w-xl">
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
          placeholder="Code, désignation, marque ou référence fabricant…"
          className="pl-9"
          aria-label="Rechercher un article"
        />
      </div>

      {articles.isLoading ? (
        <PageSpinner />
      ) : articles.isError ? (
        <ErrorState error={articles.error} onRetry={() => void articles.refetch()} />
      ) : (articles.data?.data.length ?? 0) === 0 && !debouncedSearch ? (
        <EmptyState
          icon={Package}
          title="Aucun article"
          description="Les articles sont créés automatiquement lors du premier import d’inventaire."
        />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Désignation</TableHead>
                <TableHead>Unité</TableHead>
                <TableHead>Marque</TableHead>
                <TableHead>Réf. fabricant</TableHead>
                <TableHead className="text-right">Pmp</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {articles.data?.data.length === 0 ? (
                <TableEmpty colSpan={7}>Aucun article ne correspond à cette recherche.</TableEmpty>
              ) : (
                articles.data?.data.map((article) => (
                  <TableRow key={article.id}>
                    <TableCell className="font-mono text-sm font-medium">{article.code}</TableCell>
                    <TableCell className="max-w-md truncate">{article.designation}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{article.unit}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {article.brand ?? '—'}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {article.manufacturerRef ?? '—'}
                    </TableCell>
                    <TableCell className="text-right tabular">
                      {formatAmount(article.lastPmp)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setQrCode(article.code)}>
                        <QrCode className="h-4 w-4" aria-hidden />
                        <span className="sr-only">QR code de {article.code}</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <Pagination
            page={page}
            totalPages={articles.data?.meta.totalPages ?? 1}
            total={articles.data?.meta.total ?? 0}
            onChange={setPage}
          />
        </>
      )}

      <Dialog open={qrCode !== null} onOpenChange={(open) => !open && setQrCode(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>QR code — {qrCode}</DialogTitle>
            <DialogDescription>
              Lisible par l’application mobile. Le code brut est également accepté, pour rester
              compatible avec les étiquettes fournisseur déjà posées.
            </DialogDescription>
          </DialogHeader>
          {qrCode ? (
            <div className="flex justify-center p-4">
              <img
                src={`${API_BASE_URL}/qr/articles/${encodeURIComponent(qrCode)}.png?size=320`}
                alt={`QR code de l'article ${qrCode}`}
                width={320}
                height={320}
                className="rounded-lg border"
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
