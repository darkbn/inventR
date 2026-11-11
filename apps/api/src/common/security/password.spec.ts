import { ARGON2_OPTIONS, hashPassword, verifyPassword } from './password';

describe('password', () => {
  const plain = 'MotDePasseRobuste123';

  it('produit un hash Argon2id', async () => {
    const hash = await hashPassword(plain);
    expect(hash.startsWith('$argon2id$')).toBe(true);
  });

  it('ne stocke jamais le mot de passe en clair', async () => {
    const hash = await hashPassword(plain);
    expect(hash).not.toContain(plain);
  });

  it('produit un hash différent à chaque appel (sel aléatoire)', async () => {
    const [first, second] = await Promise.all([hashPassword(plain), hashPassword(plain)]);
    expect(first).not.toBe(second);
  });

  it('valide le bon mot de passe', async () => {
    const hash = await hashPassword(plain);
    await expect(verifyPassword(hash, plain)).resolves.toBe(true);
  });

  it('rejette un mot de passe erroné', async () => {
    const hash = await hashPassword(plain);
    await expect(verifyPassword(hash, 'MauvaisMotDePasse1')).resolves.toBe(false);
  });

  it('renvoie false — et ne lève pas — sur un hash corrompu', async () => {
    // Un hash illisible doit se traduire par un échec d'authentification, pas par
    // une erreur 500 qui renseignerait un attaquant sur l'état de la base.
    await expect(verifyPassword('pas-un-hash', plain)).resolves.toBe(false);
    await expect(verifyPassword('', plain)).resolves.toBe(false);
  });

  it('applique les paramètres recommandés par l’OWASP', () => {
    expect(ARGON2_OPTIONS.memoryCost).toBeGreaterThanOrEqual(19_456);
    expect(ARGON2_OPTIONS.timeCost).toBeGreaterThanOrEqual(2);
  });
});
