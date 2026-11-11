import type { INestApplication } from '@nestjs/common';
import { CampaignStatus, ItemStatus, Role } from '@prisma/client';
import request from 'supertest';

import { INVENTORY_METHOD } from '../src/common/constants/inventory.constants';
import type { PrismaService } from '../src/prisma/prisma.service';

import { createActor, type Actor } from './helpers/auth-helper';
import { newClientUuid, seedCampaign, type SeededCampaign } from './helpers/campaign-fixture';
import { apiPath, createTestApp } from './helpers/test-app';

describe('Cycle de vie d’une campagne (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let supervisor: Actor;
  let admin: Actor;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await prisma.truncateAllTables();
    supervisor = await createActor(app, prisma, Role.SUPERVISOR);
    admin = await createActor(app, prisma, Role.ADMIN);
  });

  const http = () => request(app.getHttpServer());

  /** Affecte un opérateur à la liste et ouvre la campagne au comptage. */
  const startCampaign = async (seeded: SeededCampaign, operators: Actor[]): Promise<void> => {
    for (const operator of operators) {
      await http()
        .post(apiPath(`/lists/${seeded.listId}/assignments`))
        .set(...supervisor.auth)
        .send({ userId: operator.id })
        .expect(204);
    }

    await http()
      .post(apiPath(`/campaigns/${seeded.campaignId}/open`))
      .set(...supervisor.auth)
      .expect(200);
  };

  const countItem = (actor: Actor, itemId: string, quantity: number) =>
    http()
      .post(apiPath(`/items/${itemId}/counts`))
      .set(...actor.auth)
      .send({ quantity, clientUuid: newClientUuid() });

  // ==========================================================================
  describe('ouverture', () => {
    it('refuse d’ouvrir une campagne sans aucune ligne', async () => {
      const seeded = await seedCampaign(prisma, { items: [] });

      const response = await http()
        .post(apiPath(`/campaigns/${seeded.campaignId}/open`))
        .set(...supervisor.auth)
        .expect(409);

      expect(response.body.message).toContain('aucune ligne');
    });

    it('refuse tout comptage tant que la campagne est en préparation', async () => {
      const seeded = await seedCampaign(prisma, {
        items: [{ articleCode: 'ACCEL-0016', theoreticalQty: 10 }],
      });
      const operator = await createActor(app, prisma, Role.USER);

      await http()
        .post(apiPath(`/lists/${seeded.listId}/assignments`))
        .set(...supervisor.auth)
        .send({ userId: operator.id })
        .expect(204);

      await countItem(operator, seeded.items[0]!.id, 5).expect(409);
    });

    it('bascule en COUNTING au premier comptage', async () => {
      const seeded = await seedCampaign(prisma, {
        items: [{ articleCode: 'ACCEL-0016', theoreticalQty: 10 }],
      });
      const operator = await createActor(app, prisma, Role.USER);
      await startCampaign(seeded, [operator]);

      await countItem(operator, seeded.items[0]!.id, 8).expect(201);

      const campaign = await prisma.campaign.findUniqueOrThrow({
        where: { id: seeded.campaignId },
      });
      expect(campaign.status).toBe(CampaignStatus.COUNTING);
    });
  });

  // ==========================================================================
  describe('cloisonnement des opérateurs', () => {
    it('un opérateur ne voit que les listes qui lui sont attribuées', async () => {
      const mine = await seedCampaign(prisma, {
        items: [{ articleCode: 'ACCEL-0016', theoreticalQty: 1 }],
      });
      const other = await seedCampaign(prisma, {
        items: [{ articleCode: 'ACCEL-0020', theoreticalQty: 1 }],
      });

      const operator = await createActor(app, prisma, Role.USER);
      await startCampaign(mine, [operator]);
      await startCampaign(other, []);

      const myLists = await http()
        .get(apiPath('/my/lists'))
        .set(...operator.auth)
        .expect(200);
      expect(myLists.body).toHaveLength(1);
      expect(myLists.body[0].id).toBe(mine.listId);

      // 404 et non 403 : l'existence d'une liste non attribuée n'a pas à être révélée.
      await http()
        .get(apiPath(`/lists/${other.listId}/items`))
        .set(...operator.auth)
        .expect(404);
    });

    it('un opérateur ne peut pas compter sur une liste qui ne lui est pas attribuée', async () => {
      const seeded = await seedCampaign(prisma, {
        items: [{ articleCode: 'ACCEL-0016', theoreticalQty: 1 }],
      });
      const assigned = await createActor(app, prisma, Role.USER);
      const intruder = await createActor(app, prisma, Role.USER);
      await startCampaign(seeded, [assigned]);

      await countItem(intruder, seeded.items[0]!.id, 5).expect(404);
    });

    it('masque la valorisation aux opérateurs', async () => {
      const seeded = await seedCampaign(prisma, {
        items: [{ articleCode: 'ACCEL-0016', theoreticalQty: 2, unitPrice: 5689.2846 }],
      });
      const operator = await createActor(app, prisma, Role.USER);
      await startCampaign(seeded, [operator]);

      const forOperator = await http()
        .get(apiPath(`/lists/${seeded.listId}/items`))
        .set(...operator.auth)
        .expect(200);
      expect(forOperator.body.data[0]).not.toHaveProperty('varianceValue');
      expect(forOperator.body.data[0]).not.toHaveProperty('unitPrice');

      const forSupervisor = await http()
        .get(apiPath(`/lists/${seeded.listId}/items`))
        .set(...supervisor.auth)
        .expect(200);
      expect(forSupervisor.body.data[0].unitPrice).toBeCloseTo(5689.2846, 4);
    });
  });

  // ==========================================================================
  describe('Méthode 1 — somme cumulative', () => {
    let seeded: SeededCampaign;
    let karim: Actor;
    let yacine: Actor;

    beforeEach(async () => {
      seeded = await seedCampaign(prisma, {
        methodCode: INVENTORY_METHOD.SUM,
        items: [
          { articleCode: 'ACCEL-0016', theoreticalQty: 30, unitPrice: 100 },
          { articleCode: 'ACCEL-0020', theoreticalQty: 5 },
        ],
      });
      karim = await createActor(app, prisma, Role.USER);
      yacine = await createActor(app, prisma, Role.USER);
      await startCampaign(seeded, [karim, yacine]);
    });

    it('additionne les saisies de plusieurs opérateurs', async () => {
      const item = seeded.itemByCode('ACCEL-0016');

      await countItem(karim, item.id, 12).expect(201);
      await countItem(yacine, item.id, 8).expect(201);
      await countItem(karim, item.id, 5).expect(201);

      const response = await http()
        .get(apiPath(`/items/${item.id}`))
        .set(...supervisor.auth)
        .expect(200);

      expect(response.body.status).toBe(ItemStatus.COUNTED);
      expect(response.body.finalQty).toBe(25);
      expect(response.body.variance).toBe(-5);
      expect(response.body.varianceValue).toBe(-500);
    });

    it('exclut du calcul un comptage annulé', async () => {
      const item = seeded.itemByCode('ACCEL-0016');

      const first = await countItem(karim, item.id, 12).expect(201);
      await countItem(yacine, item.id, 8).expect(201);

      await http()
        .patch(apiPath(`/counts/${first.body.id}/cancel`))
        .set(...karim.auth)
        .send({ reason: 'Erreur de saisie' })
        .expect(200);

      const response = await http()
        .get(apiPath(`/items/${item.id}`))
        .set(...supervisor.auth)
        .expect(200);
      expect(response.body.finalQty).toBe(8);
    });

    it('refuse une quantité négative', async () => {
      await countItem(karim, seeded.items[0]!.id, -1).expect(400);
    });

    it('filtre les lignes restantes du point de vue de l’opérateur', async () => {
      await countItem(karim, seeded.itemByCode('ACCEL-0016').id, 10).expect(201);

      const remaining = await http()
        .get(apiPath(`/lists/${seeded.listId}/items`))
        .query({ filter: 'remaining' })
        .set(...karim.auth)
        .expect(200);
      expect(remaining.body.data.map((i: { article: { code: string } }) => i.article.code)).toEqual(
        ['ACCEL-0020'],
      );

      // Pour Yacine, la ligne comptée par Karim reste à compter.
      const remainingForYacine = await http()
        .get(apiPath(`/lists/${seeded.listId}/items`))
        .query({ filter: 'remaining' })
        .set(...yacine.auth)
        .expect(200);
      expect(remainingForYacine.body.meta.total).toBe(2);
    });

    it('clôture et met à 0 les lignes jamais comptées', async () => {
      const counted = seeded.itemByCode('ACCEL-0016');
      await countItem(karim, counted.id, 28).expect(201);

      const readiness = await http()
        .get(apiPath(`/campaigns/${seeded.campaignId}/closure-readiness`))
        .set(...supervisor.auth)
        .expect(200);

      expect(readiness.body.canClose).toBe(true);
      expect(readiness.body.pendingItems).toBe(1);
      expect(readiness.body.warning).toBe(
        'Les articles non trouvés seront mis à quantité 0. Voulez-vous continuer ?',
      );

      await http()
        .post(apiPath(`/campaigns/${seeded.campaignId}/close`))
        .set(...supervisor.auth)
        .send({ confirmZeroMissing: true })
        .expect(200);

      const zeroed = await prisma.inventoryItem.findUniqueOrThrow({
        where: { id: seeded.itemByCode('ACCEL-0020').id },
      });
      expect(zeroed.status).toBe(ItemStatus.NOT_FOUND);
      expect(zeroed.finalQty?.toString()).toBe('0');

      const kept = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: counted.id } });
      expect(kept.finalQty?.toString()).toBe('28');
    });

    it('refuse la clôture sans confirmation explicite', async () => {
      await countItem(karim, seeded.items[0]!.id, 30).expect(201);

      const response = await http()
        .post(apiPath(`/campaigns/${seeded.campaignId}/close`))
        .set(...supervisor.auth)
        .send({ confirmZeroMissing: false })
        .expect(400);

      expect(response.body.message).toContain('quantité 0');

      const campaign = await prisma.campaign.findUniqueOrThrow({
        where: { id: seeded.campaignId },
      });
      expect(campaign.status).not.toBe(CampaignStatus.CLOSED);
    });
  });

  // ==========================================================================
  describe('Méthode 2 — double comptage contradictoire', () => {
    let seeded: SeededCampaign;
    let karim: Actor;
    let yacine: Actor;
    let sofiane: Actor;

    beforeEach(async () => {
      seeded = await seedCampaign(prisma, {
        methodCode: INVENTORY_METHOD.DOUBLE_BLIND,
        items: [{ articleCode: 'ACCEL-0016', theoreticalQty: 40 }],
      });
      karim = await createActor(app, prisma, Role.USER);
      yacine = await createActor(app, prisma, Role.USER);
      sofiane = await createActor(app, prisma, Role.USER);
      await startCampaign(seeded, [karim, yacine, sofiane]);
    });

    const item = () => seeded.items[0]!.id;

    it('bloque la clôture tant qu’un second comptage manque', async () => {
      await countItem(karim, item(), 40).expect(201);

      const readiness = await http()
        .get(apiPath(`/campaigns/${seeded.campaignId}/closure-readiness`))
        .set(...supervisor.auth)
        .expect(200);

      expect(readiness.body.canClose).toBe(false);
      expect(readiness.body.awaitingSecondCount).toBe(1);

      await http()
        .post(apiPath(`/campaigns/${seeded.campaignId}/close`))
        .set(...supervisor.auth)
        .send({ confirmZeroMissing: true })
        .expect(409);
    });

    it('confirme la quantité quand deux opérateurs concordent', async () => {
      await countItem(karim, item(), 40).expect(201);
      await countItem(yacine, item(), 40).expect(201);

      const response = await http()
        .get(apiPath(`/items/${item()}`))
        .set(...supervisor.auth)
        .expect(200);
      expect(response.body.status).toBe(ItemStatus.CONFIRMED);
      expect(response.body.finalQty).toBe(40);
    });

    it('bloque la clôture sur un litige, puis le tranche par un troisième comptage', async () => {
      await countItem(karim, item(), 40).expect(201);
      await countItem(yacine, item(), 37).expect(201);

      let state = await http()
        .get(apiPath(`/items/${item()}`))
        .set(...supervisor.auth)
        .expect(200);
      expect(state.body.status).toBe(ItemStatus.DISCREPANCY);

      const blocked = await http()
        .post(apiPath(`/campaigns/${seeded.campaignId}/close`))
        .set(...supervisor.auth)
        .send({ confirmZeroMissing: true })
        .expect(409);
      expect(blocked.body.code).toBe('CLOSURE_BLOCKED');

      // Majorité stricte : 40 l'emporte.
      await countItem(sofiane, item(), 40).expect(201);

      state = await http()
        .get(apiPath(`/items/${item()}`))
        .set(...supervisor.auth)
        .expect(200);
      expect(state.body.status).toBe(ItemStatus.CONFIRMED);
      expect(state.body.finalQty).toBe(40);

      await http()
        .post(apiPath(`/campaigns/${seeded.campaignId}/close`))
        .set(...supervisor.auth)
        .send({ confirmZeroMissing: true })
        .expect(200);
    });

    it('permet au superviseur d’arbitrer un litige', async () => {
      await countItem(karim, item(), 40).expect(201);
      await countItem(yacine, item(), 37).expect(201);

      // Un opérateur ne peut pas arbitrer.
      await http()
        .patch(apiPath(`/items/${item()}/arbitrate`))
        .set(...karim.auth)
        .send({ quantity: 38, note: 'Tentative' })
        .expect(403);

      const arbitrated = await http()
        .patch(apiPath(`/items/${item()}/arbitrate`))
        .set(...supervisor.auth)
        .send({ quantity: 38, note: 'Recomptage contradictoire en présence du chef magasinier' })
        .expect(200);

      expect(arbitrated.body.status).toBe(ItemStatus.CONFIRMED);
      expect(arbitrated.body.finalQty).toBe(38);

      await http()
        .post(apiPath(`/campaigns/${seeded.campaignId}/close`))
        .set(...supervisor.auth)
        .send({ confirmZeroMissing: true })
        .expect(200);
    });

    it('ne retient qu’une voix par opérateur', async () => {
      await countItem(karim, item(), 40).expect(201);
      await countItem(karim, item(), 40).expect(201);

      const state = await http()
        .get(apiPath(`/items/${item()}`))
        .set(...supervisor.auth)
        .expect(200);
      expect(state.body.status).toBe(ItemStatus.AWAITING_SECOND_COUNT);
    });
  });

  // ==========================================================================
  describe('clôture et réouverture', () => {
    let seeded: SeededCampaign;
    let operator: Actor;

    beforeEach(async () => {
      seeded = await seedCampaign(prisma, {
        items: [{ articleCode: 'ACCEL-0016', theoreticalQty: 30 }],
      });
      operator = await createActor(app, prisma, Role.USER);
      await startCampaign(seeded, [operator]);
      await countItem(operator, seeded.items[0]!.id, 25).expect(201);
    });

    const close = () =>
      http()
        .post(apiPath(`/campaigns/${seeded.campaignId}/close`))
        .set(...supervisor.auth)
        .send({ confirmZeroMissing: true });

    it('la clôture est irréversible pour un superviseur', async () => {
      await close().expect(200);

      await close().expect(409);

      // Plus aucun comptage n'est accepté.
      await countItem(operator, seeded.items[0]!.id, 99).expect(409);

      // Et le superviseur ne peut pas rouvrir.
      await http()
        .post(apiPath(`/campaigns/${seeded.campaignId}/reopen`))
        .set(...supervisor.auth)
        .send({ reason: 'Je voudrais corriger un comptage' })
        .expect(403);
    });

    it('seul un administrateur peut rouvrir, avec un motif explicite', async () => {
      await close().expect(200);

      await http()
        .post(apiPath(`/campaigns/${seeded.campaignId}/reopen`))
        .set(...admin.auth)
        .send({ reason: 'court' })
        .expect(400);

      await http()
        .post(apiPath(`/campaigns/${seeded.campaignId}/reopen`))
        .set(...admin.auth)
        .send({ reason: 'Erreur de périmètre détectée après clôture, recomptage zone A requis' })
        .expect(200);

      const campaign = await prisma.campaign.findUniqueOrThrow({
        where: { id: seeded.campaignId },
      });
      expect(campaign.status).toBe(CampaignStatus.COUNTING);
      expect(campaign.reopenReason).toContain('Erreur de périmètre');

      // Le comptage redevient possible.
      await countItem(operator, seeded.items[0]!.id, 5).expect(201);
    });

    it('journalise la clôture dans la même transaction', async () => {
      await close().expect(200);

      const logs = await prisma.activityLog.findMany({ where: { action: 'CAMPAIGN_CLOSE' } });
      expect(logs).toHaveLength(1);
      expect(logs[0]?.entityId).toBe(seeded.campaignId);
    });
  });

  // ==========================================================================
  describe('passage suivant', () => {
    it('ne reprend que les lignes en écart', async () => {
      const seeded = await seedCampaign(prisma, {
        items: [
          { articleCode: 'ACCEL-0016', theoreticalQty: 30 }, // comptée juste → non reprise
          { articleCode: 'ACCEL-0020', theoreticalQty: 10 }, // écart → reprise
          { articleCode: 'ACCEL-0038', theoreticalQty: 7 }, // jamais comptée → reprise à 0
        ],
      });
      const operator = await createActor(app, prisma, Role.USER);
      await startCampaign(seeded, [operator]);

      await countItem(operator, seeded.itemByCode('ACCEL-0016').id, 30).expect(201);
      await countItem(operator, seeded.itemByCode('ACCEL-0020').id, 8).expect(201);

      await http()
        .post(apiPath(`/campaigns/${seeded.campaignId}/close`))
        .set(...supervisor.auth)
        .send({ confirmZeroMissing: true })
        .expect(200);

      const next = await http()
        .post(apiPath(`/campaigns/${seeded.campaignId}/next-round`))
        .set(...supervisor.auth)
        .send({})
        .expect(201);

      expect(next.body.round).toBe(2);
      expect(next.body.parentCampaignId).toBe(seeded.campaignId);

      const carried = await prisma.inventoryItem.findMany({
        where: { list: { campaignId: next.body.id } },
        include: { article: { select: { code: true } } },
      });

      const codes = carried.map((item) => item.article.code).sort();
      expect(codes).toEqual(['ACCEL-0020', 'ACCEL-0038']);

      // La quantité théorique du second passage est la quantité finale du premier.
      const recounted = carried.find((item) => item.article.code === 'ACCEL-0020');
      expect(recounted?.theoreticalQty.toString()).toBe('8');
    });

    it('conserve la quantité théorique d’origine sur demande', async () => {
      const seeded = await seedCampaign(prisma, {
        items: [{ articleCode: 'ACCEL-0020', theoreticalQty: 10 }],
      });
      const operator = await createActor(app, prisma, Role.USER);
      await startCampaign(seeded, [operator]);
      await countItem(operator, seeded.items[0]!.id, 8).expect(201);

      await http()
        .post(apiPath(`/campaigns/${seeded.campaignId}/close`))
        .set(...supervisor.auth)
        .send({ confirmZeroMissing: true })
        .expect(200);

      const next = await http()
        .post(apiPath(`/campaigns/${seeded.campaignId}/next-round`))
        .set(...supervisor.auth)
        .send({ keepOriginalTheoretical: true })
        .expect(201);

      const carried = await prisma.inventoryItem.findFirstOrThrow({
        where: { list: { campaignId: next.body.id } },
      });
      expect(carried.theoreticalQty.toString()).toBe('10');
    });

    it('refuse un second passage sur une campagne sans écart', async () => {
      const seeded = await seedCampaign(prisma, {
        items: [{ articleCode: 'ACCEL-0016', theoreticalQty: 30 }],
      });
      const operator = await createActor(app, prisma, Role.USER);
      await startCampaign(seeded, [operator]);
      await countItem(operator, seeded.items[0]!.id, 30).expect(201);

      await http()
        .post(apiPath(`/campaigns/${seeded.campaignId}/close`))
        .set(...supervisor.auth)
        .send({ confirmZeroMissing: true })
        .expect(200);

      await http()
        .post(apiPath(`/campaigns/${seeded.campaignId}/next-round`))
        .set(...supervisor.auth)
        .send({})
        .expect(409);
    });

    it('interdit de rouvrir une campagne dont le passage suivant existe', async () => {
      const seeded = await seedCampaign(prisma, {
        items: [{ articleCode: 'ACCEL-0020', theoreticalQty: 10 }],
      });
      const operator = await createActor(app, prisma, Role.USER);
      await startCampaign(seeded, [operator]);
      await countItem(operator, seeded.items[0]!.id, 8).expect(201);

      await http()
        .post(apiPath(`/campaigns/${seeded.campaignId}/close`))
        .set(...supervisor.auth)
        .send({ confirmZeroMissing: true })
        .expect(200);
      await http()
        .post(apiPath(`/campaigns/${seeded.campaignId}/next-round`))
        .set(...supervisor.auth)
        .send({})
        .expect(201);

      await http()
        .post(apiPath(`/campaigns/${seeded.campaignId}/reopen`))
        .set(...admin.auth)
        .send({ reason: 'Tentative de réouverture après création du second passage' })
        .expect(409);
    });
  });

  // ==========================================================================
  describe('articles non trouvés', () => {
    it('ne met pas la quantité à 0 avant la clôture', async () => {
      const seeded = await seedCampaign(prisma, {
        items: [{ articleCode: 'ACCEL-0016', theoreticalQty: 30 }],
      });
      const operator = await createActor(app, prisma, Role.USER);
      await startCampaign(seeded, [operator]);

      const marked = await http()
        .patch(apiPath(`/items/${seeded.items[0]!.id}/not-found`))
        .set(...operator.auth)
        .send({ note: 'Emplacement vide' })
        .expect(200);

      expect(marked.body.status).toBe(ItemStatus.NOT_FOUND);
      // La mise à 0 n'intervient qu'à la clôture, après confirmation.
      expect(marked.body.finalQty).toBeNull();
    });

    it('cède devant un comptage effectif', async () => {
      const seeded = await seedCampaign(prisma, {
        items: [{ articleCode: 'ACCEL-0016', theoreticalQty: 30 }],
      });
      const karim = await createActor(app, prisma, Role.USER);
      const yacine = await createActor(app, prisma, Role.USER);
      await startCampaign(seeded, [karim, yacine]);

      await http()
        .patch(apiPath(`/items/${seeded.items[0]!.id}/not-found`))
        .set(...karim.auth)
        .send({})
        .expect(200);

      await countItem(yacine, seeded.items[0]!.id, 5).expect(201);

      const state = await http()
        .get(apiPath(`/items/${seeded.items[0]!.id}`))
        .set(...supervisor.auth)
        .expect(200);
      expect(state.body.status).toBe(ItemStatus.COUNTED);
      expect(state.body.finalQty).toBe(5);
    });
  });
});
