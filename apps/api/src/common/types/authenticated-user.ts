import type { Role } from '@prisma/client';
import type { Request } from 'express';

/**
 * Identité attachée à la requête après validation du jeton d'accès.
 * Volontairement minimale : tout besoin supplémentaire passe par une requête
 * explicite en base, pour ne pas transporter d'état obsolète dans le JWT.
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  username: string;
  fullName: string;
  role: Role;
}

/** Requête Express dont l'utilisateur a été authentifié par le JwtAuthGuard. */
export interface RequestWithUser extends Request {
  user: AuthenticatedUser;
}

/** Contexte client, journalisé avec les jetons et les actions sensibles. */
export interface ClientContext {
  ip?: string;
  userAgent?: string;
}
