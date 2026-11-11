import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { PageSpinner } from '@/components/ui/spinner';
import { useAuth } from '@/features/auth/auth-context';
import type { Role } from '@/api/types';

/**
 * Garde de routage.
 *
 * Elle ne remplace pas le contrôle d'accès de l'API — qui reste le seul
 * rempart — mais évite d'afficher un écran vide puis une erreur 403 à un
 * utilisateur qui n'a rien à faire là.
 */
export function RequireAuth({ roles }: { roles?: Role[] }) {
  const { user, initializing } = useAuth();
  const location = useLocation();

  if (initializing) return <PageSpinner label="Vérification de la session…" />;

  if (!user) {
    // L'adresse demandée est mémorisée pour y revenir après connexion.
    return <Navigate to="/connexion" replace state={{ from: location.pathname }} />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
