import { AlertTriangle, ArrowLeft, CheckCircle2, Download, FileUp, Info, Play } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { downloadFile } from '@/api/client';
import type { ImportBatch } from '@/api/types';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorState, errorMessage } from '@/components/ui/error-state';
import { Label } from '@/components/ui/label';
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
import { useAnalyzeImport, useApplyImport, useList, useListImports } from '@/hooks/queries';
import { IMPORT_STATUS_LABELS } from '@/lib/labels';
import { formatDateTime } from '@/lib/format';

/** Au-delà, la table d'erreurs devient illisible : le reste est résumé. */
const MAX_DISPLAYED_ERRORS = 200;

export function ImportPage() {
  const { listId } = useParams<{ listId: string }>();
  const toast = useToast();

  const list = useList(listId);
  const history = useListImports(listId);
  const analyze = useAnalyzeImport();
  const apply = useApplyImport();

  const [file, setFile] = useState<File | null>(null);
  const [excludeZeroQuantity, setExcludeZeroQuantity] = useState(false);
  const [updateExisting, setUpdateExisting] = useState(true);
  const [batch, setBatch] = useState<ImportBatch | null>(null);

  if (list.isLoading) return <PageSpinner />;
  if (list.isError) return <ErrorState error={list.error} onRetry={() => void list.refetch()} />;
  if (!listId) return null;

  const handleAnalyze = async (): Promise<void> => {
    if (!file) return;

    try {
      const result = await analyze.mutateAsync({
        listId,
        file,
        excludeZeroQuantity,
        updateExisting,
      });
      setBatch(result);

      if (result.status === 'VALIDATED') {
        toast.success(
          'Fichier analysé',
          `${result.rowsOk} ligne(s) prêtes à être importées. Rien n’a encore été écrit.`,
        );
      } else {
        toast.notify({
          tone: 'warning',
          title: 'Fichier rejeté',
          description: `${result.rowsError} ligne(s) comportent une erreur bloquante.`,
        });
      }
    } catch (error) {
      toast.error('Analyse impossible', errorMessage(error));
    }
  };

  const handleApply = async (): Promise<void> => {
    if (!batch) return;

    try {
      const result = await apply.mutateAsync({ batchId: batch.id, listId });
      toast.success(
        'Import appliqué',
        `${result.itemsCreated} ligne(s) créée(s), ${result.itemsUpdated} mise(s) à jour en ${(result.durationMs / 1000).toFixed(1)} s.`,
      );
      setBatch(null);
      setFile(null);
    } catch (error) {
      toast.error('Application impossible', errorMessage(error));
    }
  };

  const handleTemplate = async (): Promise<void> => {
    try {
      await downloadFile('/imports/template.xlsx', 'InventAir-modele-import.xlsx');
    } catch (error) {
      toast.error('Téléchargement impossible', errorMessage(error));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={
          <Link
            to={`/campagnes/${list.data?.campaignId ?? ''}`}
            className="inline-flex items-center gap-1 hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Retour à la campagne
          </Link>
        }
        title={`Import — ${list.data?.name ?? ''}`}
        description="Le dépôt analyse le fichier sans rien modifier. L’écriture n’a lieu qu’à l’application."
        actions={
          <Button variant="outline" onClick={() => void handleTemplate()}>
            <Download className="h-4 w-4" aria-hidden />
            Télécharger le modèle
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Déposer un fichier</CardTitle>
          <CardDescription>
            Formats acceptés : Excel (.xlsx) et CSV. Les en-têtes de votre export ERP sont reconnus
            tels quels ; les colonnes inconnues sont ignorées.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="import-file" required>
              Fichier d’inventaire
            </Label>
            <input
              id="import-file"
              type="file"
              accept=".xlsx,.xlsm,.csv,.txt"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setBatch(null);
              }}
              className="block w-full cursor-pointer rounded-md border border-input bg-background text-sm file:mr-4 file:cursor-pointer file:border-0 file:bg-secondary file:px-4 file:py-2.5 file:text-sm file:font-medium file:text-secondary-foreground"
            />
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Options</legend>

            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={excludeZeroQuantity}
                onChange={(event) => setExcludeZeroQuantity(event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-input"
              />
              <span>
                Exclure les lignes à quantité théorique nulle
                <span className="block text-xs text-muted-foreground">
                  Les conserver permet de détecter un surplus sur un article théoriquement absent —
                  c’est l’intérêt même d’un inventaire.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={updateExisting}
                onChange={(event) => setUpdateExisting(event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-input"
              />
              <span>
                Mettre à jour les lignes déjà présentes
                <span className="block text-xs text-muted-foreground">
                  Rafraîchit la quantité théorique des lignes existantes au lieu de les ignorer.
                </span>
              </span>
            </label>
          </fieldset>

          <Button disabled={!file} loading={analyze.isPending} onClick={() => void handleAnalyze()}>
            <FileUp className="h-4 w-4" aria-hidden />
            Analyser le fichier
          </Button>
        </CardContent>
      </Card>

      {batch ? (
        <ImportReport batch={batch} onApply={handleApply} applying={apply.isPending} />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Imports précédents</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fichier</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Lignes</TableHead>
                <TableHead className="text-right">Erreurs</TableHead>
                <TableHead>Déposé le</TableHead>
                <TableHead>Appliqué le</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(history.data?.length ?? 0) === 0 ? (
                <TableEmpty colSpan={6}>Aucun import sur cette liste.</TableEmpty>
              ) : (
                history.data?.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="max-w-xs truncate">{entry.filename}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          entry.status === 'APPLIED'
                            ? 'success'
                            : entry.status === 'REJECTED'
                              ? 'danger'
                              : 'secondary'
                        }
                      >
                        {IMPORT_STATUS_LABELS[entry.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular">{entry.rowsOk}</TableCell>
                    <TableCell className="text-right tabular">{entry.rowsError}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(entry.createdAt)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(entry.appliedAt)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function ImportReport({
  batch,
  onApply,
  applying,
}: {
  batch: ImportBatch;
  onApply: () => Promise<void>;
  applying: boolean;
}) {
  const displayedErrors = batch.errors.slice(0, MAX_DISPLAYED_ERRORS);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rapport d’analyse</CardTitle>
        <CardDescription>
          Aucune donnée n’a été modifiée. Vérifiez le rapport, puis appliquez l’import.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Lignes lues" value={batch.rowsTotal} />
          <StatCard label="Lignes valides" value={batch.rowsOk} tone="surplus" />
          <StatCard
            label="Lignes en erreur"
            value={batch.rowsError}
            tone={batch.rowsError > 0 ? 'shortage' : 'neutral'}
          />
        </div>

        {batch.status === 'VALIDATED' ? (
          <Alert variant="success" title="Le fichier est prêt à être importé">
            Les <strong className="tabular">{batch.rowsOk}</strong> lignes valides seront écrites
            dans la liste. Les articles et emplacements inconnus seront créés au passage.
          </Alert>
        ) : (
          <Alert variant="danger" title="Le fichier ne peut pas être importé en l’état">
            Corrigez les lignes signalées ci-dessous, puis déposez le fichier à nouveau.
          </Alert>
        )}

        {batch.warnings.length > 0 ? (
          <div className="space-y-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Info className="h-4 w-4 text-primary" aria-hidden />
              Avertissements ({batch.warnings.length})
            </h3>
            <ul className="space-y-1.5 rounded-lg border bg-muted/30 p-4 text-sm">
              {batch.warnings.map((warning, index) => (
                <li key={`${warning.code}-${index}`} className="flex gap-2">
                  <span className="text-muted-foreground">
                    {warning.line === null ? '—' : `L.${warning.line}`}
                  </span>
                  <span>{warning.message}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {batch.errors.length > 0 ? (
          <div className="space-y-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden />
              Erreurs bloquantes ({batch.errors.length})
            </h3>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Ligne</TableHead>
                  <TableHead className="w-48">Colonne</TableHead>
                  <TableHead>Problème</TableHead>
                  <TableHead className="w-40">Valeur lue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedErrors.map((error, index) => (
                  <TableRow key={`${error.line}-${error.code}-${index}`}>
                    <TableCell className="tabular font-medium">{error.line}</TableCell>
                    <TableCell className="font-mono text-xs">{error.column}</TableCell>
                    <TableCell>{error.message}</TableCell>
                    <TableCell className="max-w-[10rem] truncate font-mono text-xs text-muted-foreground">
                      {error.value ?? '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {batch.errors.length > MAX_DISPLAYED_ERRORS ? (
              <p className="text-sm text-muted-foreground">
                {batch.errors.length - MAX_DISPLAYED_ERRORS} erreur(s) supplémentaires ne sont pas
                affichées.
              </p>
            ) : null}
          </div>
        ) : null}

        {batch.status === 'VALIDATED' ? (
          <Button loading={applying} onClick={() => void onApply()}>
            <Play className="h-4 w-4" aria-hidden />
            Appliquer l’import ({batch.rowsOk} lignes)
          </Button>
        ) : null}

        {batch.status === 'APPLIED' ? (
          <Alert variant="success" title="Import appliqué">
            <CheckCircle2 className="inline h-4 w-4" aria-hidden /> Les lignes sont désormais
            visibles dans la liste.
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  );
}
