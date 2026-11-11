import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { apiGet, apiPost, setSessionExpiredHandler } from '@/api/client';
import { tokenStorage } from '@/api/tokens';
import type { AuthTokens, Role, UserProfile } from '@/api/types';

interface AuthContextValue {
  user: UserProfile | null;
  /** `true` tant que la session initiale n'a pas été vérifiée. */
  initializing: boolean;
  login: (login: string, password: string) => Promise<UserProfile>;
  logout: () => Promise<void>;
  /** L'utilisateur possède-t-il l'un des rôles demandés ? */
  hasRole: (...roles: Role[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [initializing, setInitializing] = useState(true);
  const queryClient = useQueryClient();

  /**
   * Vérification de la session au démarrage.
   *
   * On interroge `/auth/me` plutôt que de se fier aux jetons présents en
   * stockage : un compte peut avoir été désactivé ou son rôle modifié depuis la
   * dernière visite, et l'API est seule à faire foi.
   */
  useEffect(() => {
    let cancelled = false;

    const restore = async (): Promise<void> => {
      if (!tokenStorage.read()) {
        if (!cancelled) setInitializing(false);
        return;
      }

      try {
        const profile = await apiGet<UserProfile>('/auth/me');
        if (!cancelled) setUser(profile);
      } catch {
        // Jeton périmé ou compte désactivé : on repart d'une session propre.
        tokenStorage.clear();
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setInitializing(false);
      }
    };

    void restore();
    return () => {
      cancelled = true;
    };
  }, []);

  // L'intercepteur Axios signale ici une session définitivement perdue, afin
  // que l'interface bascule immédiatement sur l'écran de connexion.
  useEffect(() => {
    setSessionExpiredHandler(() => {
      setUser(null);
      queryClient.clear();
    });
  }, [queryClient]);

  const login = useCallback(async (loginValue: string, password: string): Promise<UserProfile> => {
    const tokens = await apiPost<AuthTokens>('/auth/login', {
      login: loginValue,
      password,
    });

    tokenStorage.write({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
    setUser(tokens.user);
    return tokens.user;
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    const tokens = tokenStorage.read();

    if (tokens) {
      try {
        await apiPost('/auth/logout', { refreshToken: tokens.refreshToken });
      } catch {
        // Une déconnexion ne doit jamais échouer côté client : même si le
        // serveur est injoignable, la session locale doit être effacée.
      }
    }

    tokenStorage.clear();
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  const hasRole = useCallback(
    (...roles: Role[]): boolean => (user ? roles.includes(user.role) : false),
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ user, initializing, login, logout, hasRole }),
    [user, initializing, login, logout, hasRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth doit être utilisé dans un AuthProvider.');
  return context;
}
