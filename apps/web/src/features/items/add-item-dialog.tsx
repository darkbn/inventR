import { PackagePlus } from 'lucide-react';
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
import { useAddListItem } from '@/hooks/queries';

interface AddItemDialogProps {
  listId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Ajout d'un article absent du fichier importé.
 *
 * Cas constaté en recette : un article est bien en rayon mais ne figure pas
 * dans l'extraction SAP. Sans ce point d'entrée, il n'était pas comptable, et
 * l'inventaire passait à côté d'un stock réel.
 *
 * La désignation n'est demandée que si le code est inconnu du référentiel —
 * mais on ne peut pas le savoir depuis le navigateur sans interroger l'API, et
 * la laisser facultative puis se faire refuser serait plus pénible que de la
 * proposer d'emblée. Elle est donc toujours proposée, jamais imposée : si
 * l'article existe, elle est ignorée et ne réécrit pas le référentiel.
 */
export function AddItemDialog({ listId, open, onOpenChange }: AddItemDialogProps) {
  const [articleCode, setArticleCode] = useState('');
  const [designation, setDesignation] = useState('');
  const [locationCode, setLocationCode] = useState('');
  const [unit, setUnit] = useState('');

  const addItem = useAddListItem();
  const toast = useToast();

  const reset = (): void => {
    setArticleCode('');
    setDesignation('');
    setLocationCode('');
    setUnit('');
  };

  const trimmedCode = articleCode.trim().toUpperCase();

  const handleSubmit = async (): Promise<void> => {
    try {
      const item = await addItem.mutateAsync({
        listId,
        articleCode: trimmedCode,
        ...(designation.trim() ? { designation: designation.trim() } : {}),
        ...(locationCode.trim() ? { locationCode: locationCode.trim().toUpperCase() } : {}),
        ...(unit.trim() ? { unit: unit.trim() } : {}),
      });

      toast.success(
        'Ligne ajoutée',
        `${item.article.code} — ${item.article.designation}. Quantité théorique nulle : tout ce qui sera compté apparaîtra en surplus.`,
      );
      reset();
      onOpenChange(false);
    } catch (error) {
      toast.error('Ajout impossible', errorMessage(error));
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
          <DialogTitle>Ajouter un article à la liste</DialogTitle>
          <DialogDescription>
            Pour un article présent en rayon mais absent du fichier importé.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert variant="info" title="Quantité théorique nulle">
            L’article n’existe pas dans l’extraction SAP : sa quantité attendue est 0, et tout ce
            qui sera compté ressortira comme surplus. C’est précisément le signal dont le
            gestionnaire a besoin pour créer la fiche dans l’ERP.
          </Alert>

          <div className="space-y-1.5">
            <Label htmlFor="article-code">Code article</Label>
            <Input
              id="article-code"
              value={articleCode}
              onChange={(event) => setArticleCode(event.target.value)}
              placeholder="ACCEL-0016"
              autoComplete="off"
              className="font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="article-designation">Désignation</Label>
            <Input
              id="article-designation"
              value={designation}
              onChange={(event) => setDesignation(event.target.value)}
              placeholder="PALIER REF: 0901323439"
            />
            <p className="text-xs text-muted-foreground">
              Obligatoire si le code est inconnu du référentiel. Ignorée si l’article existe déjà.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="article-location">Emplacement</Label>
              <Input
                id="article-location"
                value={locationCode}
                onChange={(event) => setLocationCode(event.target.value)}
                placeholder="1-1-C-7"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Laissé vide : la ligne rejoint « Sans emplacement ».
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="article-unit">Unité</Label>
              <Input
                id="article-unit"
                value={unit}
                onChange={(event) => setUnit(event.target.value)}
                placeholder="Unité"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            disabled={trimmedCode.length === 0}
            loading={addItem.isPending}
            onClick={() => void handleSubmit()}
          >
            <PackagePlus className="h-4 w-4" aria-hidden />
            Ajouter la ligne
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
