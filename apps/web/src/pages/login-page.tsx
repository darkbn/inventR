import { zodResolver } from '@hookform/resolvers/zod';
import { FileSpreadsheet, LogIn } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { errorMessage } from '@/components/ui/error-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageSpinner } from '@/components/ui/spinner';
import { useAuth } from '@/features/auth/auth-context';

const loginSchema = z.object({
  login: z.string().trim().min(1, "L'identifiant est obligatoire."),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères.'),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { user, initializing, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { login: '', password: '' },
  });

  if (initializing) return <PageSpinner label="Vérification de la session…" />;

  if (user) {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from ?? '/'} replace />;
  }

  const onSubmit = async (values: LoginValues): Promise<void> => {
    setServerError(null);

    try {
      await login(values.login, values.password);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from ?? '/', { replace: true });
    } catch (error) {
      setServerError(errorMessage(error));
      form.resetField('password');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2">
          <FileSpreadsheet className="h-7 w-7 text-primary" aria-hidden />
          <span className="text-2xl font-semibold tracking-tight">InventAir</span>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Connexion</CardTitle>
            <CardDescription>
              Identifiez-vous avec votre adresse e-mail ou votre nom d’utilisateur.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
              {serverError ? <Alert variant="danger">{serverError}</Alert> : null}

              <div className="space-y-1.5">
                <Label htmlFor="login" required>
                  Identifiant
                </Label>
                <Input
                  id="login"
                  autoComplete="username"
                  autoFocus
                  placeholder="k.benali ou k.benali@inventair.local"
                  aria-invalid={form.formState.errors.login !== undefined}
                  aria-describedby={form.formState.errors.login ? 'login-error' : undefined}
                  {...form.register('login')}
                />
                {form.formState.errors.login ? (
                  <p id="login-error" className="text-sm text-destructive">
                    {form.formState.errors.login.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" required>
                  Mot de passe
                </Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  aria-invalid={form.formState.errors.password !== undefined}
                  aria-describedby={form.formState.errors.password ? 'password-error' : undefined}
                  {...form.register('password')}
                />
                {form.formState.errors.password ? (
                  <p id="password-error" className="text-sm text-destructive">
                    {form.formState.errors.password.message}
                  </p>
                ) : null}
              </div>

              <Button type="submit" className="w-full" loading={form.formState.isSubmitting}>
                <LogIn className="h-4 w-4" aria-hidden />
                Se connecter
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          En cas d’oubli de mot de passe, contactez un administrateur : lui seul peut le
          réinitialiser.
        </p>
      </div>
    </div>
  );
}
