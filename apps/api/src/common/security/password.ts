import * as argon2 from 'argon2';

/**
 * Paramètres Argon2id alignés sur les recommandations OWASP (Password Storage
 * Cheat Sheet) : 19 MiB de mémoire, 2 itérations, parallélisme 1.
 *
 * Ces options sont partagées par le module d'authentification et par le seed :
 * un hash produit ici doit rester vérifiable là-bas.
 */
export const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
};

export function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, ARGON2_OPTIONS);
}

/**
 * Vérifie un mot de passe. Ne propage jamais d'exception : un hash corrompu ou
 * d'un format inconnu doit se traduire par un échec d'authentification, pas par
 * une erreur 500 qui renseignerait un attaquant.
 */
export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain, ARGON2_OPTIONS);
  } catch {
    return false;
  }
}
