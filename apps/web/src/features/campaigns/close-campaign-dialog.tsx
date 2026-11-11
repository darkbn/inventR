import { AlertTriangle, Lock } from 'lucide-react';
import { useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { errorMessage } from '@/components/ui/error-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';
import { useCloseCampaign, useClosureReadiness } from '@/hooks/queries';

/** Saisie exigée pour confirmer : empêche un clic réflexe sur une action définitive. */
const CONFIRMATION_WORD = 'CLOTURER';

export function CloseCampaignDialog({
  campaignId,
  campaignCode,
  open,
  onOpenChange,
}: {
  campaignId: string;
  campaignCode: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const readiness = useClosureReadiness(campaignId, open);
  const closeCampaign = useCloseCampaign();
  const toast = useToast();

  const [confirmation, setConfirmation] = useState('');
  const [note, setNote] = useState('');

  const canSubmit = readiness.data?.canClose === true && confirmation.trim() === CONFIRMATION_WORD;

  const handleClose = async (): Promise<void> => {
    try {
      await closeCampaign.mutateAsync({
        id: campaignId,
        confirmZeroMissing: true,
        note: note || undefined,
      });
      toast.success(
        'Campagne clôturée',
        'Les articles non trouvés ont été mis à quantité 0. L’opération est définitive.',
      );
      onOpenChange(false);
      setConfirmation('');
      setNote('');
    } catch (error) {
      toast.error('Clôture impossible', errorMessage(error));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" aria-hidden />
            Clôturer la campagne {campaignCode}
          </DialogTitle>
          <DialogDescription>
            La clôture est définitive. Seul un administrateur peut rouvrir une campagne, avec un
            motif écrit.
          </DialogDescription>
        </DialogHeader>

        {readiness.isLoading ? (
          <Spinner label="Analyse de la campagne…" />
        ) : readiness.isError ? (
          <Alert variant="danger">{errorMessage(readiness.error)}</Alert>
        ) : readiness.data ? (
          <div className="space-y-4">
            {readiness.data.canClose ? (
              // L'avertissement provient de l'API : web et mobile affichent
              // ainsi rigoureusement le même texte.
              <Alert variant="warning" title={readiness.data.warning}>
                <p>
                  <strong className="tabular">
                    {readiness.data.pendingItems + readiness.data.notFoundItems}
                  </strong>{' '}
                  ligne(s) passeront à la quantité 0 :{' '}
                  <span className="tabular">{readiness.data.pendingItems}</span> jamais comptée(s)
                  et <span className="tabular">{readiness.data.notFoundItems}</span> déclarée(s)
                  introuvable(s).
                </p>
              </Alert>
            ) : (
              <Alert variant="danger" title="La campagne ne peut pas être clôturée">
                <ul className="list-inside list-disc space-y-1">
                  {readiness.data.blockingReasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </Alert>
            )}

            <dl className="grid grid-cols-2 gap-3 rounded-lg border p-4 text-sm sm:grid-cols-3">
              <Metric label="Lignes au total" value={readiness.data.totalItems} />
              <Metric label="Résolues" value={readiness.data.resolvedItems} />
              <Metric label="Jamais comptées" value={readiness.data.pendingItems} />
              <Metric label="Non trouvées" value={readiness.data.notFoundItems} />
              <Metric
                label="2e comptage attendu"
                value={readiness.data.awaitingSecondCount}
                alert={readiness.data.awaitingSecondCount > 0}
              />
              <Metric
                label="Litiges"
                value={readiness.data.discrepancies}
                alert={readiness.data.discrepancies > 0}
              />
            </dl>

            {readiness.data.canClose ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="closure-note">Commentaire de clôture (facultatif)</Label>
                  <Input
                    id="closure-note"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Observations, personnes présentes…"
                    maxLength={500}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="closure-confirm" required>
                    Saisissez « {CONFIRMATION_WORD} » pour confirmer
                  </Label>
                  <Input
                    id="closure-confirm"
                    value={confirmation}
                    onChange={(event) => setConfirmation(event.target.value.toUpperCase())}
                    autoComplete="off"
                    placeholder={CONFIRMATION_WORD}
                  />
                </div>
              </>
            ) : null}
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            variant="destructive"
            disabled={!canSubmit}
            loading={closeCampaign.isPending}
            onClick={() => void handleClose()}
          >
            <AlertTriangle className="h-4 w-4" aria-hidden />
            Clôturer définitivement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Metric({
  label,
  value,
  alert = false,
}: {
  label: string;
  value: number;
  alert?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={`text-lg font-semibold tabular ${alert ? 'text-destructive' : ''}`}>
        {value}
      </dd>
    </div>
  );
}
