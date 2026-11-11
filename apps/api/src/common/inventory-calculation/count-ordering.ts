import { CountStatus } from '@prisma/client';

/**
 * Forme minimale d'un comptage pour être ordonné. Volontairement structurelle :
 * le moteur de calcul manipule des `CountSnapshot`, les rapports des entités
 * Prisma complètes, et les deux doivent être triés par la même règle.
 */
export interface OrderableCount {
  id: string;
  countedAt: Date;
  status: CountStatus;
}

/**
 * Comptages valides d'une ligne, du plus ancien au plus récent.
 *
 * C'est la définition de « comptage 1 », « comptage 2 » et « comptage 3 » :
 * des **passages successifs**, et non des opérateurs ou des colonnes de la base.
 * La règle vit ici et nulle part ailleurs, parce que deux endroits l'utilisent
 * et qu'ils doivent s'accorder : le moteur de la Méthode 3, qui décide du
 * statut, et les rapports, qui présentent les mêmes comptages au lecteur. Les
 * voir diverger donnerait un rapport contredisant la décision du système.
 *
 * Les comptages annulés sont exclus : un comptage annulé n'est pas un passage.
 *
 * Le départage par identifiant, à horodatage égal, n'est pas une coquetterie :
 * une synchronisation hors ligne remonte régulièrement plusieurs comptages
 * portant la même seconde, et sans lui le résultat dépendrait de l'ordre
 * — arbitraire — dans lequel la base les rend.
 */
export function orderedValidCounts<T extends OrderableCount>(counts: readonly T[]): T[] {
  return counts
    .filter((count) => count.status === CountStatus.VALID)
    .sort((a, b) => {
      const delta = a.countedAt.getTime() - b.countedAt.getTime();
      return delta !== 0 ? delta : a.id.localeCompare(b.id);
    });
}
