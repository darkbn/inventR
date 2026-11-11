import { Throttle } from '@nestjs/throttler';

/**
 * Limitation renforcée des routes d'authentification (anti-force brute).
 *
 * Les valeurs sont lues directement dans l'environnement plutôt que via
 * ConfigService : un décorateur est évalué au chargement de la classe, avant que
 * l'injection de dépendances n'existe. Les mêmes variables sont validées au
 * démarrage par `env.validation.ts`, donc une valeur incohérente fait de toute
 * façon échouer le lancement de l'API ; les valeurs de repli ci-dessous ne
 * servent qu'aux tests unitaires, qui n'ont pas d'environnement complet.
 */
function positiveIntFromEnv(name: string, fallback: number): number {
  const parsed = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const AuthThrottle = (): MethodDecorator & ClassDecorator =>
  Throttle({
    default: {
      ttl: positiveIntFromEnv('THROTTLE_AUTH_TTL', 60_000),
      limit: positiveIntFromEnv('THROTTLE_AUTH_LIMIT', 10),
    },
  });
