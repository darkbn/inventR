import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound, Search, ShieldCheck, UserPlus, Users } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { apiPatch, apiPost } from '@/api/client';
import type { Role, User } from '@/api/types';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState, errorMessage } from '@/components/ui/error-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { useToast } from '@/components/ui/toast';
import { PageHeader } from '@/components/layout/page-header';
import { useAuth } from '@/features/auth/auth-context';
import { Pagination } from '@/pages/campaigns-page';
import { useUsers } from '@/hooks/queries';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { formatDateTime } from '@/lib/format';
import { ROLE_LABELS } from '@/lib/labels';
import { useQueryClient } from '@tanstack/react-query';

const PAGE_SIZE = 25;

const createSchema = z.object({
  email: z.string().trim().email('Adresse e-mail invalide.'),
  username: z
    .string()
    .trim()
    .min(3, 'Au moins 3 caractères.')
    .max(64)
    .regex(/^[a-zA-Z0-9._-]+$/, 'Lettres, chiffres, point, tiret et tiret bas uniquement.'),
  fullName: z.string().trim().min(2, 'Au moins 2 caractères.').max(160),
  password: z
    .string()
    .min(12, 'Au moins 12 caractères.')
    .max(128)
    .regex(/(?=.*[A-Za-z])(?=.*\d)/, 'Au moins une lettre et un chiffre.'),
  role: z.enum(['ADMIN', 'SUPERVISOR', 'USER']),
});

type CreateValues = z.infer<typeof createSchema>;

export function UsersPage() {
  const { user: currentUser, hasRole } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const debouncedSearch = useDebouncedValue(search, 350);
  const users = useUsers({
    page,
    limit: PAGE_SIZE,
    ...(debouncedSearch ? { q: debouncedSearch } : {}),
  });

  const isAdmin = hasRole('ADMIN');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Utilisateurs"
        description={
          isAdmin
            ? 'Comptes, rôles et activation.'
            : 'Un superviseur gère les comptes opérateurs. Les comptes administrateurs ne lui sont pas visibles.'
        }
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <UserPlus className="h-4 w-4" aria-hidden />
            Nouveau compte
          </Button>
        }
      />

      <div className="relative max-w-md">
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
          placeholder="Nom, identifiant ou e-mail…"
          className="pl-9"
          aria-label="Rechercher un compte"
        />
      </div>

      {users.isLoading ? (
        <PageSpinner />
      ) : users.isError ? (
        <ErrorState error={users.error} onRetry={() => void users.refetch()} />
      ) : (users.data?.data.length ?? 0) === 0 && !debouncedSearch ? (
        <EmptyState icon={Users} title="Aucun compte" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Identifiant</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Dernière connexion</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.data?.data.length === 0 ? (
                <TableEmpty colSpan={7}>Aucun compte ne correspond à cette recherche.</TableEmpty>
              ) : (
                users.data?.data.map((user) => (
                  <UserRow key={user.id} user={user} isSelf={user.id === currentUser?.id} />
                ))
              )}
            </TableBody>
          </Table>

          <Pagination
            page={page}
            totalPages={users.data?.meta.totalPages ?? 1}
            total={users.data?.meta.total ?? 0}
            onChange={setPage}
          />
        </>
      )}

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} isAdmin={isAdmin} />
    </div>
  );
}

// ============================================================================

function UserRow({ user, isSelf }: { user: User; isSelf: boolean }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const refresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: ['users'] });
  };

  const toggleStatus = async (): Promise<void> => {
    setBusy(true);
    try {
      await apiPatch(`/users/${user.id}/status`, { isActive: !user.isActive });
      toast.success(
        user.isActive ? 'Compte désactivé' : 'Compte réactivé',
        user.isActive ? 'Les sessions ouvertes ont été révoquées.' : undefined,
      );
      await refresh();
    } catch (error) {
      toast.error('Opération impossible', errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const changeRole = async (role: Role): Promise<void> => {
    setBusy(true);
    try {
      await apiPatch(`/users/${user.id}/role`, { role });
      toast.success('Rôle modifié', 'Les sessions du compte ont été révoquées.');
      await refresh();
    } catch (error) {
      toast.error('Modification impossible', errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async (): Promise<void> => {
    const newPassword = window.prompt(
      'Nouveau mot de passe (12 caractères minimum, au moins une lettre et un chiffre).',
    );
    if (newPassword === null) return;

    setBusy(true);
    try {
      await apiPatch(`/users/${user.id}/password`, { newPassword });
      toast.success('Mot de passe réinitialisé', 'Toutes les sessions du compte sont révoquées.');
    } catch (error) {
      toast.error('Réinitialisation impossible', errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <TableRow>
      <TableCell className="font-medium">
        {user.fullName}
        {isSelf ? (
          <Badge variant="outline" className="ml-2">
            Vous
          </Badge>
        ) : null}
      </TableCell>
      <TableCell className="font-mono text-sm">{user.username}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
      <TableCell>
        <select
          value={user.role}
          disabled={busy || isSelf}
          onChange={(event) => void changeRole(event.target.value as Role)}
          className="h-8 rounded-md border border-input bg-background px-2 text-sm disabled:opacity-60"
          aria-label={`Rôle de ${user.fullName}`}
        >
          {(Object.keys(ROLE_LABELS) as Role[]).map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role]}
            </option>
          ))}
        </select>
      </TableCell>
      <TableCell>
        <Badge variant={user.isActive ? 'success' : 'muted'}>
          {user.isActive ? 'Actif' : 'Désactivé'}
        </Badge>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {formatDateTime(user.lastLoginAt)}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => void resetPassword()}>
            <KeyRound className="h-4 w-4" aria-hidden />
            <span className="sr-only">Réinitialiser le mot de passe</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={busy || isSelf}
            onClick={() => void toggleStatus()}
            // Un compte ne peut pas se désactiver lui-même : l'API le refuse,
            // autant ne pas proposer l'action.
            title={isSelf ? 'Vous ne pouvez pas désactiver votre propre compte.' : undefined}
          >
            {user.isActive ? 'Désactiver' : 'Réactiver'}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

// ============================================================================

function CreateUserDialog({
  open,
  onOpenChange,
  isAdmin,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin: boolean;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();

  const form = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { email: '', username: '', fullName: '', password: '', role: 'USER' },
  });

  const onSubmit = async (values: CreateValues): Promise<void> => {
    try {
      await apiPost('/users', values);
      toast.success('Compte créé', `${values.fullName} peut désormais se connecter.`);
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      form.reset();
      onOpenChange(false);
    } catch (error) {
      toast.error('Création impossible', errorMessage(error));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau compte</DialogTitle>
          <DialogDescription>
            Le mot de passe est communiqué à l’utilisateur, qui pourra le changer depuis son profil.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {!isAdmin ? (
            <Alert variant="info">
              En tant que superviseur, vous ne pouvez créer que des comptes opérateurs.
            </Alert>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="fullName" required>
              Nom complet
            </Label>
            <Input id="fullName" {...form.register('fullName')} placeholder="Karim Benali" />
            {form.formState.errors.fullName ? (
              <p className="text-sm text-destructive">{form.formState.errors.fullName.message}</p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="username" required>
                Identifiant
              </Label>
              <Input id="username" {...form.register('username')} placeholder="k.benali" />
              {form.formState.errors.username ? (
                <p className="text-sm text-destructive">{form.formState.errors.username.message}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="role" required>
                Rôle
              </Label>
              <select
                id="role"
                {...form.register('role')}
                disabled={!isAdmin}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60"
              >
                <option value="USER">{ROLE_LABELS.USER}</option>
                {isAdmin ? (
                  <>
                    <option value="SUPERVISOR">{ROLE_LABELS.SUPERVISOR}</option>
                    <option value="ADMIN">{ROLE_LABELS.ADMIN}</option>
                  </>
                ) : null}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" required>
              Adresse e-mail
            </Label>
            <Input
              id="email"
              type="email"
              {...form.register('email')}
              placeholder="k.benali@inventair.local"
            />
            {form.formState.errors.email ? (
              <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" required>
              Mot de passe
            </Label>
            <Input id="password" type="text" autoComplete="off" {...form.register('password')} />
            {form.formState.errors.password ? (
              <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                12 caractères minimum, au moins une lettre et un chiffre.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" loading={form.formState.isSubmitting}>
              <ShieldCheck className="h-4 w-4" aria-hidden />
              Créer le compte
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
