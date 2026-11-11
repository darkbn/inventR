import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import type { AuthenticatedUser, RequestWithUser } from '../../../common/types/authenticated-user';

/**
 * Injecte l'utilisateur authentifié dans une méthode de contrôleur.
 *
 * @example
 *   findMine(@CurrentUser() user: AuthenticatedUser) { … }
 *   findMine(@CurrentUser('id') userId: string) { … }
 */
export const CurrentUser = createParamDecorator(
  (property: keyof AuthenticatedUser | undefined, context: ExecutionContext): unknown => {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    return property ? request.user[property] : request.user;
  },
);
