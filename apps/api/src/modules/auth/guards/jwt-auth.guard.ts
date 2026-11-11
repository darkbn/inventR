import { Injectable, UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

import type { AuthenticatedUser } from '../../../common/types/authenticated-user';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Garde d'authentification appliquée **globalement**.
 *
 * Conséquence voulue : une nouvelle route est protégée par défaut. Pour l'ouvrir,
 * il faut le déclarer explicitement avec `@Public()` — on ne peut donc pas
 * exposer une route par simple oubli.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  override canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    return super.canActivate(context);
  }

  /**
   * Uniformise les réponses d'échec. Passport renvoie par défaut un message
   * anglais générique (« Unauthorized ») ; on conserve les messages explicites
   * levés par la stratégie (compte désactivé, compte introuvable) et on traduit
   * les autres cas, sans jamais détailler la raison technique du rejet.
   */
  override handleRequest<TUser = AuthenticatedUser>(
    err: unknown,
    user: TUser | false,
    info: unknown,
  ): TUser {
    if (err instanceof Error) throw err;

    if (!user) {
      const reason =
        info instanceof Error && info.name === 'TokenExpiredError'
          ? "Jeton d'accès expiré."
          : "Jeton d'accès absent ou invalide.";
      throw new UnauthorizedException(reason);
    }

    return user;
  }
}
