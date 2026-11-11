import { AlertTriangle } from 'lucide-react';
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
import { useToast } from '@/components/ui/toast';
import { useDeleteCampaign } from '@/hooks/queries';
import type { Campaign } from '@/api/types';

interface DeleteCampaignDialogProps {
  campaign: Campaign;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Appelé après une suppression réussie : la page courante n'existe plus. */
  onDeleted: () => void;
}

/** Longueur minimale du motif, alignée sur la validation de l'API. */
const MIN_REASON_LENGTH = 10;

/**
 * Confirmation de suppression définitive d'une campagne.
 *
 * La saisie du code n'est pas une formalité décorative : c'est le seul garde-fou
 * qui résiste à un clic sur la mauvaise ligne d'une liste de campagnes qui se
 * ressemblent toutes. Un bouton « Confirmer » se clique sans lire ; un code se
 * recopie en regardant ce qu'on détruit.
 *
 * Le motif part au journal d'activité avec le décompte des listes, lignes et
 * comptages supprimés — c'est tout ce qu'il restera de la campagne.
 */
export function DeleteCampaignDialog({
  campaign,
  open,
  onOpenChange,
  onDeleted,
}: DeleteCampaignDialogProps) {
  const [confirmCode, setConfirmCode] = useState('');
  const [reason, setReason] = useState('');
  const deleteCampaign = useDeleteCampaign();
  const toast = useToast();

  const codeMatches = confirmCode.trim().toUpperCase() === campaign.code;
  const reasonValid = reason.trim().length >= MIN_REASON_LENGTH;

  const reset = (): void => {
    setConfirmCode('');
    setReason('');
  };

  const handleSubmit = async (): Promise<void> => {
    try {
      await deleteCampaign.mutateAsync({
        id: campaign.id,
        confirmCode: confirmCode.trim().toUpperCase(),
        reason: reason.trim(),
      });

      toast.success(
        'Campagne supprimée',
        `La campagne ${campaign.code} et toutes ses données ont été supprimées.`,
      );
      reset();
      onOpenChange(false);
      onDeleted();
    } catch (error) {
      toast.error('Suppression impossible', errorMessage(error));
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Supprimer la campagne {campaign.code}</DialogTitle>
          <DialogDescription>
            Cette action est définitive et ne peut pas être annulée.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert variant="danger" title="Ce qui sera détruit">
            <ul className="list-disc space-y-0.5 pl-4">
              <li>Toutes les listes de comptage de cette campagne</li>
              <li>Toutes les lignes d’inventaire et leurs quantités</li>
              <li>
                <strong>Tous les comptages saisis par les opérateurs</strong>, y compris ceux
                remontés depuis les terminaux
              </li>
              <li>Les affectations et les rapports déjà générés</li>
            </ul>
          </Alert>

          <div className="space-y-1.5">
            <Label htmlFor="confirm-code">
              Saisissez le code de la campagne pour confirmer :{' '}
              <span className="font-mono font-semibold">{campaign.code}</span>
            </Label>
            <Input
              id="confirm-code"
              value={confirmCode}
              onChange={(event) => setConfirmCode(event.target.value)}
              placeholder={campaign.code}
              autoComplete="off"
              className="font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="delete-reason">
              Motif de la suppression ({MIN_REASON_LENGTH} caractères minimum)
            </Label>
            <Input
              id="delete-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Campagne de test créée par erreur"
            />
            <p className="text-xs text-muted-foreground">
              Journalisé avec le décompte de ce qui a été supprimé. C’est la seule trace qui
              subsistera.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            variant="destructive"
            disabled={!codeMatches || !reasonValid}
            loading={deleteCampaign.isPending}
            onClick={() => void handleSubmit()}
          >
            <AlertTriangle className="h-4 w-4" aria-hidden />
            Supprimer définitivement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
