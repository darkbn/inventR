import type { INestApplication } from '@nestjs/common';
import { Role } from '@prisma/client';
import request from 'supertest';

import type { PrismaService } from '../src/prisma/prisma.service';

import { apiPath, createTestApp, createUser } from './helpers/test-app';

describe('Authentification (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await prisma.truncateAllTables();
  });

  const http = () => request(app.getHttpServer());

  // --------------------------------------------------------------------------
  describe('POST /auth/login', () => {
    it('authentifie avec une adresse e-mail et renvoie un couple de jetons', async () => {
      const { user, password } = await createUser(prisma, { role: Role.SUPERVISOR });

      const response = await http()
        .post(apiPath('/auth/login'))
        .send({ login: user.email, password })
        .expect(200);

      expect(response.body).toMatchObject({
        tokenType: 'Bearer',
        user: { id: user.id, email: user.email, role: Role.SUPERVISOR },
      });
      expect(typeof response.body.accessToken).toBe('string');
      expect(typeof response.body.refreshToken).toBe('string');
      expect(response.body.expiresIn).toBeGreaterThan(0);
    });

    it("authentifie également avec le nom d'utilisateur", async () => {
      const { user, password } = await createUser(prisma);

      await http()
        .post(apiPath('/auth/login'))
        .send({ login: user.username, password })
        .expect(200);
    });

    it('ne renvoie jamais le hash du mot de passe', async () => {
      const { user, password } = await createUser(prisma);

      const response = await http()
        .post(apiPath('/auth/login'))
        .send({ login: user.email, password })
        .expect(200);

      expect(JSON.stringify(response.body)).not.toContain('argon2');
      expect(response.body.user).not.toHaveProperty('passwordHash');
    });

    it('renvoie le même message pour un compte inconnu, un mot de passe erroné et un compte désactivé', async () => {
      const { user } = await createUser(prisma);
      const disabled = await createUser(prisma, { isActive: false });

      const unknown = await http()
        .post(apiPath('/auth/login'))
        .send({ login: 'inconnu@inventair.test', password: 'MotDePasseTest123' })
        .expect(401);

      const wrongPassword = await http()
        .post(apiPath('/auth/login'))
        .send({ login: user.email, password: 'MauvaisMotDePasse1' })
        .expect(401);

      const inactive = await http()
        .post(apiPath('/auth/login'))
        .send({ login: disabled.user.email, password: disabled.password })
        .expect(401);

      // Aucune de ces réponses ne doit permettre de distinguer les trois cas :
      // c'est ce qui empêche d'énumérer les comptes existants.
      expect(unknown.body.message).toBe('Identifiants invalides.');
      expect(wrongPassword.body.message).toBe(unknown.body.message);
      expect(inactive.body.message).toBe(unknown.body.message);
    });

    it('journalise les échecs de connexion', async () => {
      await http()
        .post(apiPath('/auth/login'))
        .send({ login: 'inconnu@inventair.test', password: 'MotDePasseTest123' })
        .expect(401);

      const logs = await prisma.activityLog.findMany({ where: { action: 'AUTH_LOGIN_FAILURE' } });
      expect(logs).toHaveLength(1);
    });

    it('rejette une charge utile comportant un champ non déclaré', async () => {
      const { user, password } = await createUser(prisma);

      const response = await http()
        .post(apiPath('/auth/login'))
        .send({ login: user.email, password, role: 'ADMIN' })
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_FAILED');
    });
  });

  // --------------------------------------------------------------------------
  describe('GET /auth/me', () => {
    it('refuse une requête sans jeton', async () => {
      await http().get(apiPath('/auth/me')).expect(401);
    });

    it('refuse un jeton fantaisiste', async () => {
      await http().get(apiPath('/auth/me')).set('Authorization', 'Bearer pas-un-jeton').expect(401);
    });

    it('renvoie le profil courant', async () => {
      const { user, password } = await createUser(prisma, { role: Role.ADMIN });
      const login = await http()
        .post(apiPath('/auth/login'))
        .send({ login: user.email, password })
        .expect(200);

      const response = await http()
        .get(apiPath('/auth/me'))
        .set('Authorization', `Bearer ${login.body.accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({ id: user.id, role: Role.ADMIN });
    });

    it('rejette immédiatement un jeton encore valide si le compte est désactivé', async () => {
      const { user, password } = await createUser(prisma);
      const login = await http()
        .post(apiPath('/auth/login'))
        .send({ login: user.email, password })
        .expect(200);

      // La désactivation doit prendre effet sans attendre l'expiration du jeton.
      await prisma.user.update({ where: { id: user.id }, data: { isActive: false } });

      await http()
        .get(apiPath('/auth/me'))
        .set('Authorization', `Bearer ${login.body.accessToken}`)
        .expect(401);
    });
  });

  // --------------------------------------------------------------------------
  describe('POST /auth/refresh', () => {
    it('émet un nouveau couple et révoque le jeton présenté (rotation)', async () => {
      const { user, password } = await createUser(prisma);
      const login = await http()
        .post(apiPath('/auth/login'))
        .send({ login: user.email, password })
        .expect(200);

      const refreshed = await http()
        .post(apiPath('/auth/refresh'))
        .send({ refreshToken: login.body.refreshToken })
        .expect(200);

      expect(refreshed.body.refreshToken).not.toBe(login.body.refreshToken);

      const revoked = await prisma.refreshToken.findFirst({
        where: { userId: user.id, revokedAt: { not: null } },
      });
      expect(revoked).not.toBeNull();
      expect(revoked?.replacedById).not.toBeNull();
    });

    it('invalide toutes les sessions lorsqu’un jeton déjà utilisé est rejoué', async () => {
      const { user, password } = await createUser(prisma);
      const login = await http()
        .post(apiPath('/auth/login'))
        .send({ login: user.email, password })
        .expect(200);

      const refreshed = await http()
        .post(apiPath('/auth/refresh'))
        .send({ refreshToken: login.body.refreshToken })
        .expect(200);

      // Rejeu de l'ancien jeton : signe d'un vol de session.
      await http()
        .post(apiPath('/auth/refresh'))
        .send({ refreshToken: login.body.refreshToken })
        .expect(401);

      // Le jeton légitime émis entre-temps doit lui aussi avoir été invalidé.
      await http()
        .post(apiPath('/auth/refresh'))
        .send({ refreshToken: refreshed.body.refreshToken })
        .expect(401);

      const active = await prisma.refreshToken.count({
        where: { userId: user.id, revokedAt: null },
      });
      expect(active).toBe(0);
    });

    it("refuse d'utiliser un jeton d'accès comme jeton de rafraîchissement", async () => {
      const { user, password } = await createUser(prisma);
      const login = await http()
        .post(apiPath('/auth/login'))
        .send({ login: user.email, password })
        .expect(200);

      await http()
        .post(apiPath('/auth/refresh'))
        .send({ refreshToken: login.body.accessToken })
        .expect(401);
    });
  });

  // --------------------------------------------------------------------------
  describe('POST /auth/logout', () => {
    it('révoque le jeton de rafraîchissement courant', async () => {
      const { user, password } = await createUser(prisma);
      const login = await http()
        .post(apiPath('/auth/login'))
        .send({ login: user.email, password })
        .expect(200);

      await http()
        .post(apiPath('/auth/logout'))
        .set('Authorization', `Bearer ${login.body.accessToken}`)
        .send({ refreshToken: login.body.refreshToken })
        .expect(200);

      await http()
        .post(apiPath('/auth/refresh'))
        .send({ refreshToken: login.body.refreshToken })
        .expect(401);
    });

    it('révoque toutes les sessions via /auth/logout-all', async () => {
      const { user, password } = await createUser(prisma);
      const first = await http()
        .post(apiPath('/auth/login'))
        .send({ login: user.email, password })
        .expect(200);
      await http().post(apiPath('/auth/login')).send({ login: user.email, password }).expect(200);

      await http()
        .post(apiPath('/auth/logout-all'))
        .set('Authorization', `Bearer ${first.body.accessToken}`)
        .expect(200);

      const active = await prisma.refreshToken.count({
        where: { userId: user.id, revokedAt: null },
      });
      expect(active).toBe(0);
    });
  });
});
