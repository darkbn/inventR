import type { INestApplication } from '@nestjs/common';
import { CountSource, Role } from '@prisma/client';
import request from 'supertest';

import type { PrismaService } from '../src/prisma/prisma.service';

import { createActor, type Actor } from './helpers/auth-helper';
import { newClientUuid, seedCampaign, type SeededCampaign } from './helpers/campaign-fixture';
import { apiPath, createTestApp } from './helpers/test-app';

describe('Synchronisation des comptages hors ligne (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let supervisor: Actor;
  let operator: Actor;
  let seeded: SeededCampaign;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await prisma.truncateAllTables();
    supervisor = await createActor(app, prisma, Role.SUPERVISOR);
    operator = await createActor(app, prisma, Role.USER);

    seeded = await seedCampaign(prisma, {
      items: [
        { articleCode: 'ACCEL-0016', theoreticalQty: 30 },
        { articleCode: 'ACCEL-0020', theoreticalQty: 10 },
        { articleCode: 'ACCEL-0038', theoreticalQty: 5 },
      ],
    });

    await request(app.getHttpServer())
      .post(apiPath(`/lists/${seeded.listId}/assignments`))
      .set(...supervisor.auth)
      .send({ userId: operator.id })
      .expect(204);

    await request(app.getHttpServer())
      .post(apiPath(`/campaigns/${seeded.campaignId}/open`))
      .set(...supervisor.auth)
      .expect(200);
  });

  const http = () => request(app.getHttpServer());

  // ==========================================================================
  describe('idempotence', () => {
    it('ne duplique pas un comptage rejoué sur la route unitaire', async () => {
      const clientUuid = newClientUuid();
      const itemId = seeded.items[0]!.id;

      const first = await http()
        .post(apiPath(`/items/${itemId}/counts`))
        .set(...operator.auth)
        .send({ quantity: 12, clientUuid })
        .expect(201);

      // Le terminal n'a pas reçu la réponse et réémet.
      const replay = await http()
        .post(apiPath(`/items/${itemId}/counts`))
        .set(...operator.auth)
        .send({ quantity: 12, clientUuid })
        .expect(201);

      expect(replay.body.id).toBe(first.body.id);

      const stored = await prisma.count.count({ where: { itemId } });
      expect(stored).toBe(1);
    });

    it('refuse de réutiliser un identifiant pour une autre ligne', async () => {
      const clientUuid = newClientUuid();

      await http()
        .post(apiPath(`/items/${seeded.items[0]!.id}/counts`))
        .set(...operator.auth)
        .send({ quantity: 12, clientUuid })
        .expect(201);

      await http()
        .post(apiPath(`/items/${seeded.items[1]!.id}/counts`))
        .set(...operator.auth)
        .send({ quantity: 3, clientUuid })
        .expect(409);
    });

    it('rejette un identifiant qui n’est pas un UUID v4', async () => {
      await http()
        .post(apiPath(`/items/${seeded.items[0]!.id}/counts`))
        .set(...operator.auth)
        .send({ quantity: 12, clientUuid: 'pas-un-uuid' })
        .expect(400);
    });
  });

  // ==========================================================================
  describe('envoi groupé', () => {
    it('enregistre toute la file d’attente et conserve les horodatages du terrain', async () => {
      // Saisies faites en mode avion deux heures plus tôt.
      const offlineTime = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

      const payload = {
        counts: seeded.items.map((item, index) => ({
          itemId: item.id,
          quantity: index + 1,
          clientUuid: newClientUuid(),
          countedAt: offlineTime,
          source: CountSource.MOBILE,
          deviceId: 'TC-21-MAGASIN-03',
        })),
      };

      const response = await http()
        .post(apiPath('/counts/sync'))
        .set(...operator.auth)
        .send(payload)
        .expect(200);

      expect(response.body).toMatchObject({ received: 3, created: 3, duplicates: 0, rejected: 0 });

      const stored = await prisma.count.findMany({ orderBy: { quantity: 'asc' } });
      expect(stored).toHaveLength(3);
      // L'heure de saisie sur le terrain fait foi, pas celle de la réception.
      expect(stored[0]?.countedAt.toISOString()).toBe(offlineTime);
      expect(stored[0]?.deviceId).toBe('TC-21-MAGASIN-03');
    });

    it('signale les doublons sans les enregistrer deux fois', async () => {
      const shared = newClientUuid();
      const entry = { itemId: seeded.items[0]!.id, quantity: 7, clientUuid: shared };

      await http()
        .post(apiPath('/counts/sync'))
        .set(...operator.auth)
        .send({ counts: [entry] })
        .expect(200);

      // Le réseau a coupé avant l'accusé de réception : le terminal réémet.
      const replay = await http()
        .post(apiPath('/counts/sync'))
        .set(...operator.auth)
        .send({ counts: [entry] })
        .expect(200);

      expect(replay.body).toMatchObject({ received: 1, created: 0, duplicates: 1, rejected: 0 });
      expect(replay.body.results[0].outcome).toBe('duplicate');

      expect(await prisma.count.count()).toBe(1);
    });

    it('isole les rejets : une entrée invalide ne fait pas échouer le lot', async () => {
      // Sans cette garantie, un seul comptage litigieux bloquerait définitivement
      // la file d'attente du terminal.
      const valid = { itemId: seeded.items[0]!.id, quantity: 5, clientUuid: newClientUuid() };
      const orphan = {
        itemId: '00000000-0000-4000-8000-000000000000',
        quantity: 3,
        clientUuid: newClientUuid(),
      };
      const alsoValid = { itemId: seeded.items[1]!.id, quantity: 2, clientUuid: newClientUuid() };

      const response = await http()
        .post(apiPath('/counts/sync'))
        .set(...operator.auth)
        .send({ counts: [valid, orphan, alsoValid] })
        .expect(200);

      expect(response.body).toMatchObject({ received: 3, created: 2, rejected: 1 });
      expect(response.body.results[1].outcome).toBe('rejected');
      expect(response.body.results[1].reason).toBeTruthy();

      expect(await prisma.count.count()).toBe(2);
    });

    it('recalcule l’état des lignes après synchronisation', async () => {
      await http()
        .post(apiPath('/counts/sync'))
        .set(...operator.auth)
        .send({
          counts: [
            { itemId: seeded.items[0]!.id, quantity: 12, clientUuid: newClientUuid() },
            { itemId: seeded.items[0]!.id, quantity: 8, clientUuid: newClientUuid() },
          ],
        })
        .expect(200);

      const item = await prisma.inventoryItem.findUniqueOrThrow({
        where: { id: seeded.items[0]!.id },
      });
      expect(item.finalQty?.toString()).toBe('20');
    });

    it('refuse un lot vide ou démesuré', async () => {
      await http()
        .post(apiPath('/counts/sync'))
        .set(...operator.auth)
        .send({ counts: [] })
        .expect(400);

      const oversized = Array.from({ length: 501 }, () => ({
        itemId: seeded.items[0]!.id,
        quantity: 1,
        clientUuid: newClientUuid(),
      }));

      await http()
        .post(apiPath('/counts/sync'))
        .set(...operator.auth)
        .send({ counts: oversized })
        .expect(400);
    });

    it('rejette les comptages d’une liste non attribuée', async () => {
      const other = await seedCampaign(prisma, {
        items: [{ articleCode: 'INOX-0001', theoreticalQty: 4 }],
      });

      const response = await http()
        .post(apiPath('/counts/sync'))
        .set(...operator.auth)
        .send({
          counts: [{ itemId: other.items[0]!.id, quantity: 4, clientUuid: newClientUuid() }],
        })
        .expect(200);

      expect(response.body.rejected).toBe(1);
      expect(await prisma.count.count()).toBe(0);
    });
  });

  // ==========================================================================
  describe('historique', () => {
    it('expose mes comptages, du plus récent au plus ancien', async () => {
      for (const item of seeded.items) {
        await http()
          .post(apiPath(`/items/${item.id}/counts`))
          .set(...operator.auth)
          .send({ quantity: 1, clientUuid: newClientUuid() })
          .expect(201);
      }

      const response = await http()
        .get(apiPath('/my/counts'))
        .set(...operator.auth)
        .expect(200);

      expect(response.body).toHaveLength(3);
      const dates = (response.body as { countedAt: string }[]).map((c) =>
        new Date(c.countedAt).getTime(),
      );
      expect([...dates].sort((a, b) => b - a)).toEqual(dates);
    });

    it('conserve un comptage annulé, avec son motif', async () => {
      const created = await http()
        .post(apiPath(`/items/${seeded.items[0]!.id}/counts`))
        .set(...operator.auth)
        .send({ quantity: 12, clientUuid: newClientUuid() })
        .expect(201);

      await http()
        .patch(apiPath(`/counts/${created.body.id}/cancel`))
        .set(...operator.auth)
        .send({ reason: 'Confusion avec un autre emplacement' })
        .expect(200);

      const history = await http()
        .get(apiPath(`/items/${seeded.items[0]!.id}/counts`))
        .set(...supervisor.auth)
        .expect(200);

      // Le comptage reste au dossier : il est exclu du calcul, pas effacé.
      expect(history.body).toHaveLength(1);
      expect(history.body[0].status).toBe('CANCELLED');
      expect(history.body[0].note).toContain('Confusion');
    });

    it('empêche un opérateur d’annuler le comptage d’un collègue', async () => {
      const colleague = await createActor(app, prisma, Role.USER);
      await http()
        .post(apiPath(`/lists/${seeded.listId}/assignments`))
        .set(...supervisor.auth)
        .send({ userId: colleague.id })
        .expect(204);

      const created = await http()
        .post(apiPath(`/items/${seeded.items[0]!.id}/counts`))
        .set(...colleague.auth)
        .send({ quantity: 12, clientUuid: newClientUuid() })
        .expect(201);

      await http()
        .patch(apiPath(`/counts/${created.body.id}/cancel`))
        .set(...operator.auth)
        .send({ reason: 'Pas de moi' })
        .expect(404);

      // Le superviseur, lui, peut annuler le comptage de son équipe.
      await http()
        .patch(apiPath(`/counts/${created.body.id}/cancel`))
        .set(...supervisor.auth)
        .send({ reason: 'Erreur constatée au contrôle' })
        .expect(200);
    });
  });
});
