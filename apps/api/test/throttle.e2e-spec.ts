import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { apiPath, createTestApp } from './helpers/test-app';

/**
 * Le plafond est fixé à 100 requêtes par la configuration des tests
 * (cf. test/run-e2e.mjs) ; en production il vaut THROTTLE_AUTH_LIMIT, soit 10.
 * Chaque fichier de test construit sa propre application, donc son propre
 * compteur : ce fichier peut saturer le quota sans perturber les autres.
 */
const AUTH_LIMIT = Number.parseInt(process.env.THROTTLE_AUTH_LIMIT ?? '100', 10);

describe('Limitation de débit (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    ({ app } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  it('plafonne les tentatives de connexion répétées', async () => {
    const server = app.getHttpServer();

    // Corps volontairement incomplet : la requête est comptabilisée par le
    // limiteur (qui s'exécute avant la validation) sans coûter de hachage Argon2.
    for (let attempt = 0; attempt < AUTH_LIMIT; attempt += 1) {
      await request(server).post(apiPath('/auth/login')).send({ login: 'x@y.test' });
    }

    const blocked = await request(server)
      .post(apiPath('/auth/login'))
      .send({ login: 'x@y.test', password: 'MotDePasseTest123' });

    expect(blocked.status).toBe(429);
  });

  it("n'applique pas la limite stricte des routes d'authentification au reste de l'API", async () => {
    // Le healthcheck relève du limiteur global (bien plus permissif) : il doit
    // rester disponible même après saturation du quota de connexion.
    await request(app.getHttpServer()).get(apiPath('/health')).expect(200);
  });
});
