/**
 * Conservation des jetons côté navigateur.
 *
 * `localStorage` est retenu en connaissance de cause : l'API est consommée par
 * trois clients distincts (web, Android, outils), ce qui rend le schéma
 * « Bearer » incontournable, et un cookie httpOnly n'est pas exploitable par
 * l'application mobile. Le risque résiduel de vol par XSS est contenu par une
 * durée de vie courte du jeton d'accès (15 minutes), la rotation du jeton de
 * rafraîchissement et la détection de rejeu côté serveur.
 */

const ACCESS_TOKEN_KEY = 'inventair.accessToken';
const REFRESH_TOKEN_KEY = 'inventair.refreshToken';

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
}

export const tokenStorage = {
  read(): StoredTokens | null {
    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

    if (!accessToken || !refreshToken) return null;
    return { accessToken, refreshToken };
  },

  write(tokens: StoredTokens): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  },

  clear(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};
