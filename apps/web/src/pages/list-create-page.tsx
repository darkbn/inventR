import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Save } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { errorMessage } from '@/components/ui/error-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';
import { PageHeader } from '@/components/layout/page-header';
import { useCreateList } from '@/hooks/queries';

const schema = z.object({
  code: z
    .string()
    .trim()
    .min(1, 'Le code est obligatoire.')
    .max(64)
    .regex(/^[A-Z0-9_-]+$/, 'Majuscules, chiffres, tirets et tirets bas uniquement.'),
  name: z.string().trim().min(2, 'Au moins 2 caractères.').max(160),
  description: z.string().trim().max(1000).optional(),
});

type FormValues = z.infer<typeof schema>;

export function ListCreatePage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const createList = useCreateList();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { code: '', name: '', description: '' },
  });

  const onSubmit = async (values: FormValues): Promise<void> => {
    if (!campaignId) return;

    try {
      const list = await createList.mutateAsync({
        campaignId,
        code: values.code,
        name: values.name,
        ...(values.description ? { description: values.description } : {}),
      });
      toast.success('Liste créée', 'Importez maintenant le fichier d’inventaire correspondant.');
      navigate(`/listes/${list.id}/import`);
    } catch (error) {
      toast.error('Création impossible', errorMessage(error));
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        breadcrumb={
          <Link
            to={`/campagnes/${campaignId ?? ''}`}
            className="inline-flex items-center gap-1 hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Retour à la campagne
          </Link>
        }
        title="Nouvelle liste de comptage"
        description="Une liste correspond à un périmètre confié à un ou plusieurs opérateurs : une zone, une allée, un magasinier."
      />

      <Card>
        <CardHeader>
          <CardTitle>Informations</CardTitle>
          <CardDescription>
            Découper une campagne en plusieurs listes permet de répartir le comptage et de suivre
            l’avancement zone par zone.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="code" required>
                Code
              </Label>
              <Input
                id="code"
                {...form.register('code')}
                onChange={(event) =>
                  form.setValue('code', event.target.value.toUpperCase(), { shouldValidate: true })
                }
                placeholder="ZONE-A"
                className="font-mono"
              />
              {form.formState.errors.code ? (
                <p className="text-sm text-destructive">{form.formState.errors.code.message}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="name" required>
                Libellé
              </Label>
              <Input id="name" {...form.register('name')} placeholder="Zone A — allées 1 à 10" />
              {form.formState.errors.name ? (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                {...form.register('description')}
                placeholder="Précisions de périmètre, consignes particulières…"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" loading={form.formState.isSubmitting}>
                <Save className="h-4 w-4" aria-hidden />
                Créer la liste
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link to={`/campagnes/${campaignId ?? ''}`}>Annuler</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
