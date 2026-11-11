import axios from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError, api, setSessionExpiredHandler } from './client';
import { tokenStorage } from './tokens';

/**
 * Tests de l'intercepteur de rafraîchissement.
 *
 * C'est la pièce la plus délicate du client : un défaut s'y traduit soit par
 * des déconnexions intempestives, soit par une boucle de requêtes. On vérifie
 * en particulier qu'un rafraîchissement unique dessert plusieurs requêtes
 * tombées simultanément en 401 — plusieurs rafraîchissements concurrents
 * déclencheraient la détection de rejeu côté serveur et invalideraient toutes
 * les sessions.
 */
describe('intercepteur de rafraîchissement', () => {
  beforeEach(() => {
    localStorage.clear();
    tokenStorage.write({ accessToken: 'acces-initial', refreshToken: 'refresh-initial' });
    setSessionExpiredHandler(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('rafraîchit puis rejoue la requête initiale', async () => {
    const refreshSpy = vi.spyOn(axios, 'post').mockResolvedValue({
      data: { accessToken: 'acces-neuf', refreshToken: 'refresh-neuf' },
    });

    let attempt = 0;
    const requestSpy = vi.spyOn(api, 'request').mockImplementation(() => {
      attempt += 1;
      return Promise.resolve({ data: { ok: true } });
    });

    const rejection = {
      config: { url: '/campaigns', headers: {}, _retried: false },
      response: { status: 401, data: undefined },
      isAxiosError: true,
    };

    const handler = getResponseErrorHandler();
    const result = await handler(rejection);

    expect(refreshSpy).toHaveBeenCalledTimes(1);
    expect(requestSpy).toHaveBeenCalledTimes(1);
    expect(attempt).toBe(1);
    expect(result).toEqual({ data: { ok: true } });
    // Les nouveaux jetons remplacent les anciens en stockage.
    expect(tokenStorage.read()?.accessToken).toBe('acces-neuf');
  });

  it('ne rafraîchit pas deux fois la même requête', async () => {
    const refreshSpy = vi.spyOn(axios, 'post');

    const handler = getResponseErrorHandler();

    // `_retried` déjà positionné : la requête a déjà été rejouée une fois.
    await expect(
      handler({
        config: { url: '/campaigns', headers: {}, _retried: true },
        response: { status: 401, data: { statusCode: 401, code: 'X', message: 'Refusé' } },
        isAxiosError: true,
      }),
    ).rejects.toBeInstanceOf(ApiError);

    expect(refreshSpy).not.toHaveBeenCalled();
  });

  it('ne tente aucun rafraîchissement sur les routes d’authentification', async () => {
    const refreshSpy = vi.spyOn(axios, 'post');
    const handler = getResponseErrorHandler();

    await expect(
      handler({
        config: { url: '/auth/login', headers: {}, _retried: false },
        response: {
          status: 401,
          data: { statusCode: 401, code: 'UNAUTHORIZED', message: 'Identifiants invalides.' },
        },
        isAxiosError: true,
      }),
    ).rejects.toMatchObject({ message: 'Identifiants invalides.' });

    // Sans cette protection, un mot de passe erroné déclencherait un
    // rafraîchissement, puis une boucle.
    expect(refreshSpy).not.toHaveBeenCalled();
  });

  it('efface la session et prévient l’application si le rafraîchissement échoue', async () => {
    vi.spyOn(axios, 'post').mockRejectedValue(new Error('refresh refusé'));

    const onExpired = vi.fn();
    setSessionExpiredHandler(onExpired);

    const handler = getResponseErrorHandler();

    await expect(
      handler({
        config: { url: '/campaigns', headers: {}, _retried: false },
        response: { status: 401, data: undefined },
        isAxiosError: true,
      }),
    ).rejects.toMatchObject({ code: 'SESSION_EXPIRED' });

    expect(tokenStorage.read()).toBeNull();
    expect(onExpired).toHaveBeenCalledTimes(1);
  });

  it('transforme une panne réseau en message compréhensible', async () => {
    const handler = getResponseErrorHandler();

    await expect(
      handler({
        config: { url: '/campaigns', headers: {}, _retried: false },
        response: undefined,
        isAxiosError: true,
      }),
    ).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });
});

/** Récupère le gestionnaire d'erreur enregistré sur l'instance Axios. */
function getResponseErrorHandler(): (error: unknown) => Promise<unknown> {
  const manager = api.interceptors.response as unknown as {
    handlers: { rejected: (error: unknown) => Promise<unknown> }[];
  };

  const handler = manager.handlers.find((entry) => entry?.rejected)?.rejected;
  if (!handler) throw new Error('Aucun intercepteur de réponse enregistré.');
  return handler;
}
