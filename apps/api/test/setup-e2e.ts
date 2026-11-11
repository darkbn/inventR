/**
 * Garde-fou des tests d'intégration : ils tronquent la base entre chaque suite.
 * Pointer par mégarde sur une base de développement ou de production serait
 * destructeur, d'où cette vérification au chargement.
 */
process.env.NODE_ENV = 'test';

const databaseUrl = process.env.DATABASE_URL ?? '';

if (databaseUrl === '') {
  throw new Error("DATABASE_URL doit être défini pour exécuter les tests d'intégration.");
}

if (!/test/i.test(databaseUrl)) {
  throw new Error(
    "Par sécurité, les tests d'intégration exigent une DATABASE_URL contenant « test ». " +
      `Valeur reçue : ${databaseUrl.replace(/:[^:@]*@/, ':***@')}`,
  );
}
