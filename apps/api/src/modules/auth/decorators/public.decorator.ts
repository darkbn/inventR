import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Rend une route accessible sans jeton. Le JwtAuthGuard étant global,
 * l'authentification est le comportement par défaut : toute exception doit être
 * déclarée explicitement, ce qui évite d'exposer une route par oubli.
 */
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC_KEY, true);
