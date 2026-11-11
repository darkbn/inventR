import {
  ForbiddenException,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '@prisma/client';

import type { RequestWithUser } from '../../../common/types/authenticated-user';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Contrôle d'accès par rôle, en complément de l'authentification.
 *
 * Ce garde ne traite que le niveau « grossier » (quel rôle peut atteindre quelle
 * route). Les règles fines dépendant de la ressource visée — un superviseur ne
 * peut pas modifier un administrateur, un utilisateur ne voit que les listes qui
 * lui sont attribuées — relèvent des services, qui seuls connaissent la ressource.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const requiredRoles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Aucune restriction déclarée : la route est ouverte à tout compte authentifié.
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<RequestWithUser>();

    if (!user) {
      throw new ForbiddenException('Accès refusé.');
    }

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException(
        `Cette action requiert l'un des rôles suivants : ${requiredRoles.join(', ')}.`,
      );
    }

    return true;
  }
}
