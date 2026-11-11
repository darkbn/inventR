import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';

import { tokenStorage, type StoredTokens } from './tokens';

/** Corps d'erreur normalisé renvoyé par l'API. */
export interface ApiErrorBody {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
  timestamp: string;
  path: string;
}

/** Erreur exploitable par l'interface, débarrassée des détails d'Axios. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** Messages de validation, lorsqu'ils existent, pour affichage champ par champ. */
  get validationMessages(): string[] {
    return Array.isArray(this.details)
      ? this.details.filter((d): d is string => typeof d === 'string')
      : [];
  }
}

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

/** Routes dont un 401 ne doit jamais déclencher de tentative de rafraîchissement. */
const AUTH_ROUTES = ['/auth/login', '/auth/refresh', '/auth/logout'];

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

/** Appelé quand la session est définitivement perdue (déconnexion forcée). */
let onSessionExpired: () => void = () => undefined;

export function setSessionExpiredHandler(handler: () => void): void {
  onSessionExpired = handler;
}

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60_000,
  headers: { 'Content-Type': 'application/json' },
});

// --- Requête : jeton d'accès ------------------------------------------------
api.interceptors.request.use((config) => {
  const tokens = tokenStorage.read();
  if (tokens && config.headers) {
    config.headers.Authorization = `Bearer ${tokens.accessToken}`;
  }
  return config;
});

/**
 * Rafraîchissement du jeton, mutualisé.
 *
 * Plusieurs requêtes peuvent échouer en 401 simultanément — un tableau de bord
 * en déclenche volontiers cinq d'un coup. Sans ce verrou, chacune tenterait un
 * rafraîchissement : la rotation côté serveur invaliderait les suivants, et la
 * détection de rejeu déconnecterait l'utilisateur. On ne lance donc qu'un seul
 * rafraîchissement, et toutes les requêtes en attente partagent son résultat.
 */
let refreshInFlight: Promise<StoredTokens> | null = null;

async function refreshTokens(): Promise<StoredTokens> {
  const current = tokenStorage.read();
  if (!current) throw new ApiError(401, 'NO_SESSION', 'Session absente.');

  // Instance distincte : celle-ci ne doit pas repasser par les intercepteurs,
  // sous peine de boucle infinie en cas d'échec.
  const response = await axios.post<{ accessToken: string; refreshToken: string }>(
    `${API_BASE_URL}/auth/refresh`,
    { refreshToken: current.refreshToken },
    { headers: { 'Content-Type': 'application/json' }, timeout: 20_000 },
  );

  const tokens: StoredTokens = {
    accessToken: response.data.accessToken,
    refreshToken: response.data.refreshToken,
  };

  tokenStorage.write(tokens);
  return tokens;
}

// --- Réponse : rafraîchissement puis rejeu ----------------------------------
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorBody>) => {
    const config = error.config as RetriableConfig | undefined;
    const status = error.response?.status;

    const isRefreshable =
      status === 401 &&
      config !== undefined &&
      config._retried !== true &&
      !AUTH_ROUTES.some((route) => config.url?.includes(route));

    if (isRefreshable) {
      config._retried = true;

      try {
        refreshInFlight ??= refreshTokens().finally(() => {
          refreshInFlight = null;
        });

        const tokens = await refreshInFlight;
        config.headers.Authorization = `Bearer ${tokens.accessToken}`;
        return await api.request(config);
      } catch {
        tokenStorage.clear();
        onSessionExpired();
        throw new ApiError(401, 'SESSION_EXPIRED', 'Votre session a expiré. Reconnectez-vous.');
      }
    }

    throw toApiError(error);
  },
);

function toApiError(error: AxiosError<ApiErrorBody>): ApiError {
  const body = error.response?.data;

  if (body && typeof body.message === 'string') {
    return new ApiError(
      body.statusCode ?? error.response?.status ?? 500,
      body.code ?? 'ERROR',
      body.message,
      body.details,
    );
  }

  if (error.code === 'ECONNABORTED') {
    return new ApiError(408, 'TIMEOUT', 'Le serveur met trop de temps à répondre.');
  }

  if (error.response === undefined) {
    return new ApiError(
      0,
      'NETWORK_ERROR',
      'Le serveur est injoignable. Vérifiez votre connexion réseau.',
    );
  }

  return new ApiError(error.response.status, 'ERROR', 'Une erreur inattendue est survenue.');
}

// --- Raccourcis typés --------------------------------------------------------

export async function apiGet<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await api.get<T>(url, config);
  return response.data;
}

export async function apiPost<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const response = await api.post<T>(url, body, config);
  return response.data;
}

export async function apiPatch<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const response = await api.patch<T>(url, body, config);
  return response.data;
}

export async function apiDelete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await api.delete<T>(url, config);
  return response.data;
}

/**
 * Télécharge un fichier produit par l'API et déclenche l'enregistrement.
 * Le nom proposé provient de l'en-tête `Content-Disposition` quand il est
 * présent : c'est le serveur qui nomme ses exports.
 */
export async function downloadFile(url: string, fallbackName: string): Promise<void> {
  const response = await api.get<Blob>(url, { responseType: 'blob' });

  const disposition = response.headers['content-disposition'] as string | undefined;
  const match = disposition ? /filename="?([^"]+)"?/.exec(disposition) : null;
  const filename = match?.[1] ?? fallbackName;

  const objectUrl = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}
