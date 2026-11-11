import type { Request } from 'express';

import type { ClientContext } from '../types/authenticated-user';

/**
 * Extrait l'IP et l'agent utilisateur de la requête, pour journalisation.
 *
 * `request.ip` tient compte de `X-Forwarded-For` parce que l'application active
 * `trust proxy` : derrière Nginx, c'est bien l'adresse du client final qui est
 * enregistrée, et non celle du reverse proxy.
 */
export function clientContextFrom(request: Request): ClientContext {
  const userAgent = request.headers['user-agent'];

  return {
    ip: request.ip,
    userAgent: typeof userAgent === 'string' ? userAgent : undefined,
  };
}
