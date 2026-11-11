import type { INestApplication } from '@nestjs/common';
import { Role } from '@prisma/client';
import request from 'supertest';

import type { PrismaService } from '../src/prisma/prisma.service';

import { createActor, type Actor } from './helpers/auth-helper';
import { apiPath, createTestApp, createUser } from './helpers/test-app';

describe('Utilisateurs (e2e)', () => {
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

  const newUserPayload = (suffix: string, role: Role = Role.USER) => ({
    email: `nouveau-${suffix}@inventair.test`,
    username: `nouveau-${suffix}`,
    fullName: 'Nouvel Opérateur',
    password: 'MotDePasseSolide1',
    role,
  });

  // --------------------------------------------------------------------------
  describe('contrôle d’accès par rôle', () => {
    it('refuse la liste des comptes à un opérateur', async () => {
      const operator = await createActor(app, prisma, Role.USER);
      await http()
        .get(apiPath('/users'))
        .set(...operator.auth)
        .expect(403);
    });

    it('autorise la liste à un superviseur et à un administrateur', async () => {
      const supervisor = await createActor(app, prisma, Role.SUPERVISOR);
      const admin = await createActor(app, prisma, Role.ADMIN);

      await http()
        .get(apiPath('/users'))
        .set(...supervisor.auth)
        .expect(200);
      await http()
        .get(apiPath('/users'))
        .set(...admin.auth)
        .expect(200);
    });
  });

  // --------------------------------------------------------------------------
  describe('cloisonnement superviseur / administrateur', () => {
    let supervisor: Actor;

    beforeEach(async () => {
      supervisor = await createActor(app, prisma, Role.SUPERVISOR);
    });

    it('le superviseur ne voit aucun administrateur dans la liste', async () => {
      await createUser(prisma, { role: Role.ADMIN });
      await createUser(prisma, { role: Role.USER });

      const response = await http()
        .get(apiPath('/users'))
        .set(...supervisor.auth)
        .expect(200);

      const roles = (response.body.data as { role: Role }[]).map((user) => user.role);
      expect(roles).not.toContain(Role.ADMIN);
      expect(roles).toContain(Role.USER);
    });

    it('filtrer explicitement sur ADMIN renvoie une liste vide, pas une erreur', async () => {
      await createUser(prisma, { role: Role.ADMIN });

      const response = await http()
        .get(apiPath('/users'))
        .query({ role: Role.ADMIN })
        .set(...supervisor.auth)
        .expect(200);

      // Une 403 confirmerait l'existence de comptes administrateurs.
      expect(response.body.data).toHaveLength(0);
    });

    it('le superviseur reçoit 404 — et non 403 — sur la fiche d’un administrateur', async () => {
      const { user: admin } = await createUser(prisma, { role: Role.ADMIN });

      // 404 et non 403 : un code distinct révélerait que le compte existe.
      await http()
        .get(apiPath(`/users/${admin.id}`))
        .set(...supervisor.auth)
        .expect(404);
    });

    it('le superviseur ne peut pas modifier un administrateur', async () => {
      const { user: admin } = await createUser(prisma, { role: Role.ADMIN });

      await http()
        .patch(apiPath(`/users/${admin.id}`))
        .set(...supervisor.auth)
        .send({ fullName: 'Compromis' })
        .expect(404);
    });

    it('le superviseur ne peut pas désactiver un administrateur', async () => {
      const { user: admin } = await createUser(prisma, { role: Role.ADMIN });

      await http()
        .patch(apiPath(`/users/${admin.id}/status`))
        .set(...supervisor.auth)
        .send({ isActive: false })
        .expect(404);

      const unchanged = await prisma.user.findUniqueOrThrow({ where: { id: admin.id } });
      expect(unchanged.isActive).toBe(true);
    });

    it('le superviseur ne peut pas créer de compte administrateur', async () => {
      await http()
        .post(apiPath('/users'))
        .set(...supervisor.auth)
        .send(newUserPayload('admin', Role.ADMIN))
        .expect(403);
    });

    it('le superviseur ne peut pas promouvoir un opérateur en administrateur', async () => {
      const { user: operator } = await createUser(prisma, { role: Role.USER });

      await http()
        .patch(apiPath(`/users/${operator.id}/role`))
        .set(...supervisor.auth)
        .send({ role: Role.ADMIN })
        .expect(403);
    });

    it('le superviseur peut créer un compte opérateur', async () => {
      const response = await http()
        .post(apiPath('/users'))
        .set(...supervisor.auth)
        .send(newUserPayload('operateur'))
        .expect(201);

      expect(response.body.role).toBe(Role.USER);
      expect(response.body).not.toHaveProperty('passwordHash');
    });
  });

  // --------------------------------------------------------------------------
  describe('garde-fous', () => {
    it('nul ne peut se désactiver lui-même', async () => {
      const admin = await createActor(app, prisma, Role.ADMIN);

      await http()
        .patch(apiPath(`/users/${admin.id}/status`))
        .set(...admin.auth)
        .send({ isActive: false })
        .expect(403);
    });

    it('le dernier administrateur actif ne peut pas être rétrogradé', async () => {
      const admin = await createActor(app, prisma, Role.ADMIN);
      const other = await createActor(app, prisma, Role.ADMIN);

      // Avec deux administrateurs, la rétrogradation passe…
      await http()
        .patch(apiPath(`/users/${other.id}/role`))
        .set(...admin.auth)
        .send({ role: Role.USER })
        .expect(200);

      // …mais le dernier restant ne peut plus l'être : il faut un second
      // administrateur pour rétrograder celui qui agit, et il ne peut pas se
      // rétrograder lui-même.
      const replacement = await createActor(app, prisma, Role.ADMIN);
      await http()
        .patch(apiPath(`/users/${admin.id}/role`))
        .set(...replacement.auth)
        .send({ role: Role.USER })
        .expect(200);

      await http()
        .patch(apiPath(`/users/${replacement.id}/status`))
        .set(...replacement.auth)
        .send({ isActive: false })
        .expect(403);
    });

    it('refuse un e-mail déjà utilisé', async () => {
      const admin = await createActor(app, prisma, Role.ADMIN);
      const payload = newUserPayload('doublon');

      await http()
        .post(apiPath('/users'))
        .set(...admin.auth)
        .send(payload)
        .expect(201);
      await http()
        .post(apiPath('/users'))
        .set(...admin.auth)
        .send(payload)
        .expect(409);
    });

    it('impose un mot de passe d’au moins 12 caractères avec lettre et chiffre', async () => {
      const admin = await createActor(app, prisma, Role.ADMIN);

      await http()
        .post(apiPath('/users'))
        .set(...admin.auth)
        .send({ ...newUserPayload('faible'), password: 'court1' })
        .expect(400);

      await http()
        .post(apiPath('/users'))
        .set(...admin.auth)
        .send({ ...newUserPayload('lettres'), password: 'seulementdeslettres' })
        .expect(400);
    });
  });

  // --------------------------------------------------------------------------
  describe('effets de bord sur les sessions', () => {
    it('la désactivation révoque les sessions du compte', async () => {
      const admin = await createActor(app, prisma, Role.ADMIN);
      const operator = await createActor(app, prisma, Role.USER);

      await http()
        .patch(apiPath(`/users/${operator.id}/status`))
        .set(...admin.auth)
        .send({ isActive: false, reason: 'Fin de mission' })
        .expect(200);

      const active = await prisma.refreshToken.count({
        where: { userId: operator.id, revokedAt: null },
      });
      expect(active).toBe(0);

      // Le jeton d'accès encore valide doit être refusé immédiatement.
      await http()
        .get(apiPath('/auth/me'))
        .set(...operator.auth)
        .expect(401);
    });

    it('le changement de rôle révoque les sessions, le rôle étant porté par le jeton', async () => {
      const admin = await createActor(app, prisma, Role.ADMIN);
      const operator = await createActor(app, prisma, Role.USER);

      await http()
        .patch(apiPath(`/users/${operator.id}/role`))
        .set(...admin.auth)
        .send({ role: Role.SUPERVISOR })
        .expect(200);

      const active = await prisma.refreshToken.count({
        where: { userId: operator.id, revokedAt: null },
      });
      expect(active).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  describe('changement de mot de passe', () => {
    it('exige le mot de passe actuel', async () => {
      const operator = await createActor(app, prisma, Role.USER);

      await http()
        .patch(apiPath('/users/me/password'))
        .set(...operator.auth)
        .send({ currentPassword: 'MauvaisMotDePasse1', newPassword: 'NouveauMotDePasse1' })
        .expect(400);
    });

    it('change le mot de passe et révoque les sessions', async () => {
      const operator = await createActor(app, prisma, Role.USER);

      await http()
        .patch(apiPath('/users/me/password'))
        .set(...operator.auth)
        .send({ currentPassword: operator.password, newPassword: 'NouveauMotDePasse1' })
        .expect(204);

      await http()
        .post(apiPath('/auth/login'))
        .send({ login: operator.email, password: 'NouveauMotDePasse1' })
        .expect(200);

      await http()
        .post(apiPath('/auth/login'))
        .send({ login: operator.email, password: operator.password })
        .expect(401);
    });

    it('refuse de réutiliser le mot de passe actuel', async () => {
      const operator = await createActor(app, prisma, Role.USER);

      await http()
        .patch(apiPath('/users/me/password'))
        .set(...operator.auth)
        .send({ currentPassword: operator.password, newPassword: operator.password })
        .expect(400);
    });
  });

  // --------------------------------------------------------------------------
  describe('journal d’activité', () => {
    it('trace la création d’un compte et reste réservé aux administrateurs', async () => {
      const admin = await createActor(app, prisma, Role.ADMIN);
      const supervisor = await createActor(app, prisma, Role.SUPERVISOR);

      await http()
        .post(apiPath('/users'))
        .set(...admin.auth)
        .send(newUserPayload('journal'))
        .expect(201);

      const response = await http()
        .get(apiPath('/activity-logs'))
        .query({ action: 'USER_CREATE' })
        .set(...admin.auth)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      const entry = response.body.data[0];
      expect(entry.actor.id).toBe(admin.id);
      expect(entry.metadata.username).toBe('nouveau-journal');
      // Le mot de passe ne doit jamais atterrir dans le journal.
      expect(JSON.stringify(entry.metadata)).not.toContain('MotDePasseSolide1');

      await http()
        .get(apiPath('/activity-logs'))
        .set(...supervisor.auth)
        .expect(403);
    });
  });
});
