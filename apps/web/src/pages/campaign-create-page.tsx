import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Save } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { errorMessage } from '@/components/ui/error-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageSpinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';
import { PageHeader } from '@/components/layout/page-header';
import {
  useCampaignTypes,
  useCreateCampaign,
  useInventoryMethods,
  useWarehouses,
} from '@/hooks/queries';

const schema = z.object({
  code: z
    .string()
    .trim()
    .min(3, 'Au moins 3 caractères.')
    .max(64)
    .regex(/^[A-Z0-9_-]+$/, 'Majuscules, chiffres, tirets et tirets bas uniquement.'),
  name: z.string().trim().min(3, 'Au moins 3 caractères.').max(160),
  campaignTypeId: z.string().uuid('Sélectionnez un type de campagne.'),
  inventoryMethodId: z.string().uuid('Sélectionnez une méthode de calcul.'),
  warehouseId: z.string().uuid('Sélectionnez un magasin.'),
});

type FormValues = z.infer<typeof schema>;

export function CampaignCreatePage() {
  const navigate = useNavigate();
  const toast = useToast();

  const types = useCampaignTypes();
  const methods = useInventoryMethods();
  const warehouses = useWarehouses();
  const createCampaign = useCreateCampaign();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: '',
      name: '',
      campaignTypeId: '',
      inventoryMethodId: '',
      warehouseId: '',
    },
  });

  if (types.isLoading || methods.isLoading || warehouses.isLoading) return <PageSpinner />;

  const onSubmit = async (values: FormValues): Promise<void> => {
    try {
      const campaign = await createCampaign.mutateAsync(values);
      toast.success(
        'Campagne créée',
        'Ajoutez une liste, importez le fichier d’inventaire, puis ouvrez la campagne.',
      );
      navigate(`/campagnes/${campaign.id}`);
    } catch (error) {
      toast.error('Création impossible', errorMessage(error));
    }
  };

  const selectedMethod = methods.data?.find(
    (method) => method.id === form.watch('inventoryMethodId'),
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        breadcrumb={
          <Link to="/campagnes" className="inline-flex items-center gap-1 hover:underline">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Campagnes
          </Link>
        }
        title="Nouvelle campagne"
        description="La campagne est créée en préparation : aucun comptage n’est possible avant son ouverture."
      />

      <Card>
        <CardHeader>
          <CardTitle>Informations</CardTitle>
          <CardDescription>
            Le magasin et la méthode de calcul structurent toute la campagne. La méthode ne pourra
            plus être changée une fois le premier comptage enregistré.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <Field
              id="code"
              label="Code"
              required
              error={form.formState.errors.code?.message}
              hint="Identifiant court et stable, par exemple INV-2026-PDR-01."
            >
              <Input
                id="code"
                {...form.register('code')}
                onChange={(event) =>
                  form.setValue('code', event.target.value.toUpperCase(), { shouldValidate: true })
                }
                placeholder="INV-2026-PDR-01"
                className="font-mono"
              />
            </Field>

            <Field id="name" label="Libellé" required error={form.formState.errors.name?.message}>
              <Input
                id="name"
                {...form.register('name')}
                placeholder="Inventaire annuel PDR Boufarik"
              />
            </Field>

            <Field
              id="warehouseId"
              label="Magasin"
              required
              error={form.formState.errors.warehouseId?.message}
            >
              <select
                id="warehouseId"
                {...form.register('warehouseId')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Sélectionner…</option>
                {warehouses.data?.data.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.code} — {warehouse.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              id="campaignTypeId"
              label="Type de campagne"
              required
              error={form.formState.errors.campaignTypeId?.message}
            >
              <select
                id="campaignTypeId"
                {...form.register('campaignTypeId')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Sélectionner…</option>
                {types.data?.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              id="inventoryMethodId"
              label="Méthode de calcul"
              required
              error={form.formState.errors.inventoryMethodId?.message}
            >
              <select
                id="inventoryMethodId"
                {...form.register('inventoryMethodId')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Sélectionner…</option>
                {methods.data?.map((method) => (
                  <option key={method.id} value={method.id}>
                    {method.label}
                  </option>
                ))}
              </select>
            </Field>

            {selectedMethod?.description ? (
              <Alert variant="info" title={selectedMethod.label}>
                {selectedMethod.description}
              </Alert>
            ) : null}

            <div className="flex gap-2 pt-2">
              <Button type="submit" loading={form.formState.isSubmitting}>
                <Save className="h-4 w-4" aria-hidden />
                Créer la campagne
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link to="/campagnes">Annuler</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  id,
  label,
  required = false,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      {children}
      {hint && !error ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
