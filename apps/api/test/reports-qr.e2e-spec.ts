import type { INestApplication } from '@nestjs/common';
import { Role } from '@prisma/client';
import request from 'supertest';

import { INVENTORY_METHOD } from '../src/common/constants/inventory.constants';
import { QrService } from '../src/modules/qr/qr.service';
import type { PrismaService } from '../src/prisma/prisma.service';

import { createActor, type Actor } from './helpers/auth-helper';
import { newClientUuid, seedCampaign, type SeededCampaign } from './helpers/campaign-fixture';
import { apiPath, createTestApp } from './helpers/test-app';

describe('Rapports et QR codes (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let supervisor: Actor;
  let karim: Actor;
  let yacine: Actor;
  let seeded: SeededCampaign;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  const count = (actor: Actor, itemId: string, quantity: number) =>
    http()
      .post(apiPath(`/items/${itemId}/counts`))
      .set(...actor.auth)
      .send({ quantity, clientUuid: newClientUuid() });

  beforeEach(async () => {
    await prisma.truncateAllTables();
    supervisor = await createActor(app, prisma, Role.SUPERVISOR);
    karim = await createActor(app, prisma, Role.USER);
    yacine = await createActor(app, prisma, Role.USER);

    seeded = await seedCampaign(prisma, {
      methodCode: INVENTORY_METHOD.SUM,
      items: [
        // Surplus de 5, valorisé 500.
        { articleCode: 'ACCEL-0016', theoreticalQty: 30, unitPrice: 100, locationCode: '1-1-C-7' },
        // Manque de 2, valorisé 20 000 : plus coûteux malgré un écart plus petit.
        {
          articleCode: 'ACCEL-0020',
          theoreticalQty: 10,
          unitPrice: 10000,
          locationCode: '2-1-A-3',
        },
        // Conforme.
        { articleCode: 'ACCEL-0038', theoreticalQty: 4, unitPrice: 50, locationCode: '1-1-C-8' },
        // Jamais comptée.
        { articleCode: 'INOX-0001', theoreticalQty: 7, unitPrice: 25 },
        // Théorique nulle : masquée par défaut.
        { articleCode: 'ACCEG-0001', theoreticalQty: 0, unitPrice: 10 },
      ],
    });

    for (const operator of [karim, yacine]) {
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

    await count(karim, seeded.itemByCode('ACCEL-0016').id, 20).expect(201);
    await count(yacine, seeded.itemByCode('ACCEL-0016').id, 15).expect(201);
    await count(karim, seeded.itemByCode('ACCEL-0020').id, 8).expect(201);
    await count(yacine, seeded.itemByCode('ACCEL-0038').id, 4).expect(201);
  });

  // ==========================================================================
  describe('tableau de bord', () => {
    it('restitue l’avancement et les écarts', async () => {
      const response = await http()
        .get(apiPath(`/campaigns/${seeded.campaignId}/dashboard`))
        .set(...supervisor.auth)
        .expect(200);

      const body = response.body;

      // La ligne à quantité théorique nulle est exclue par défaut : 4 et non 5.
      expect(body.zeroTheoreticalHidden).toBe(true);
      expect(body.progress.totalItems).toBe(4);
      expect(body.progress.counted).toBe(3);
      expect(body.progress.pending).toBe(1);
      expect(body.progress.completionPercent).toBe(75);

      expect(body.variance.surplusCount).toBe(1); // ACCEL-0016 : 35 contre 30
      expect(body.variance.shortageCount).toBe(1); // ACCEL-0020 : 8 contre 10
      expect(body.variance.matchingCount).toBe(1); // ACCEL-0038
      expect(body.variance.surplusQuantity).toBe(5);
      expect(body.variance.shortageQuantity).toBe(2);
      expect(body.variance.surplusValue).toBe(500);
      expect(body.variance.shortageValue).toBe(20000);
      expect(body.variance.netValue).toBe(-19500);
    });

    it('inclut les lignes à quantité nulle sur demande', async () => {
      const response = await http()
        .get(apiPath(`/campaigns/${seeded.campaignId}/dashboard`))
        .query({ hideZeroTheoretical: false })
        .set(...supervisor.auth)
        .expect(200);

      expect(response.body.progress.totalItems).toBe(5);
    });

    it('classe les écarts par impact financier, pas par ampleur', async () => {
      const response = await http()
        .get(apiPath(`/campaigns/${seeded.campaignId}/dashboard`))
        .set(...supervisor.auth)
        .expect(200);

      const top = response.body.topVariances as { articleCode: string; varianceValue: number }[];

      // Le manque de 2 unités à 10 000 pèse plus que le surplus de 5 à 100.
      expect(top[0]?.articleCode).toBe('ACCEL-0020');
      expect(top[0]?.varianceValue).toBe(-20000);
      expect(top[1]?.articleCode).toBe('ACCEL-0016');
      expect(top).toHaveLength(2);
    });

    it('détaille l’activité de chaque opérateur', async () => {
      const response = await http()
        .get(apiPath(`/campaigns/${seeded.campaignId}/dashboard`))
        .set(...supervisor.auth)
        .expect(200);

      const counters = response.body.counters as { username: string; countEntries: number }[];
      expect(counters).toHaveLength(2);

      const karimStats = counters.find((entry) => entry.username === karim.username);
      expect(karimStats?.countEntries).toBe(2);
    });

    it('donne l’avancement liste par liste', async () => {
      const response = await http()
        .get(apiPath(`/campaigns/${seeded.campaignId}/dashboard`))
        .set(...supervisor.auth)
        .expect(200);

      const lists = response.body.lists as {
        code: string;
        completionPercent: number;
        assignees: string[];
      }[];
      expect(lists).toHaveLength(1);
      expect(lists[0]?.completionPercent).toBe(75);
      expect(lists[0]?.assignees).toHaveLength(2);
    });

    it('reste interdit aux opérateurs', async () => {
      await http()
        .get(apiPath(`/campaigns/${seeded.campaignId}/dashboard`))
        .set(...karim.auth)
        .expect(403);
    });
  });

  // ==========================================================================
  describe('exports', () => {
    it('produit un classeur Excel complet', async () => {
      const response = await http()
        .get(apiPath(`/reports/campaigns/${seeded.campaignId}.xlsx`))
        .set(...supervisor.auth)
        .responseType('blob')
        .expect(200);

      expect(response.headers['content-type']).toContain('spreadsheetml');
      expect(response.headers['content-disposition']).toContain('.xlsx');
      expect((response.body as Buffer).subarray(0, 2).toString()).toBe('PK');
      expect((response.body as Buffer).length).toBeGreaterThan(5000);
    });

    it('produit un rapport PDF', async () => {
      const response = await http()
        .get(apiPath(`/reports/campaigns/${seeded.campaignId}.pdf`))
        .set(...supervisor.auth)
        .responseType('blob')
        .expect(200);

      expect(response.headers['content-type']).toContain('application/pdf');
      // Signature PDF.
      expect((response.body as Buffer).subarray(0, 5).toString()).toBe('%PDF-');
      expect((response.body as Buffer).length).toBeGreaterThan(2000);
    });

    it('expose le détail par opérateur', async () => {
      const response = await http()
        .get(apiPath(`/reports/campaigns/${seeded.campaignId}/by-user`))
        .set(...supervisor.auth)
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toHaveProperty('firstCountAt');
      expect(response.body[0]).toHaveProperty('lastCountAt');
    });

    it('refuse les exports à un opérateur', async () => {
      await http()
        .get(apiPath(`/reports/campaigns/${seeded.campaignId}.xlsx`))
        .set(...karim.auth)
        .expect(403);
    });
  });

  // ==========================================================================
  describe('QR codes', () => {
    it('produit le PNG d’un article', async () => {
      const response = await http()
        .get(apiPath('/qr/articles/ACCEL-0016.png'))
        .set(...karim.auth)
        .responseType('blob')
        .expect(200);

      expect(response.headers['content-type']).toBe('image/png');
      // Signature PNG.
      expect((response.body as Buffer).subarray(1, 4).toString()).toBe('PNG');
    });

    it('renvoie 404 sur un code article inconnu', async () => {
      await http()
        .get(apiPath('/qr/articles/ZZZZZ-9999.png'))
        .set(...karim.auth)
        .expect(404);
    });

    it('produit la planche d’étiquettes d’une liste', async () => {
      const response = await http()
        .get(apiPath(`/qr/lists/${seeded.listId}/labels.pdf`))
        .set(...supervisor.auth)
        .responseType('blob')
        .expect(200);

      expect(response.headers['content-type']).toBe('application/pdf');
      expect((response.body as Buffer).subarray(0, 5).toString()).toBe('%PDF-');
    });

    it('réserve la planche d’étiquettes au superviseur', async () => {
      await http()
        .get(apiPath(`/qr/lists/${seeded.listId}/labels.pdf`))
        .set(...karim.auth)
        .expect(403);
    });
  });

  // ==========================================================================
  describe('format du contenu encodé', () => {
    it('encode un objet structuré', () => {
      expect(QrService.buildPayload('ART', 'accel-0016')).toBe('{"t":"ART","c":"ACCEL-0016"}');
    });

    it('relit sa propre production', () => {
      const payload = QrService.buildPayload('LOC', '1-1-C-7');
      expect(QrService.parsePayload(payload)).toEqual({ t: 'LOC', c: '1-1-C-7' });
    });

    it('accepte une étiquette fournisseur ne portant que le code', () => {
      // Compatibilité avec les étiquettes déjà posées en rayon.
      expect(QrService.parsePayload('accel-0016')).toEqual({ t: 'ART', c: 'ACCEL-0016' });
    });

    it('rejette un contenu structuré mais invalide', () => {
      expect(QrService.parsePayload('{"t":"XXX","c":"ABC"}')).toBeNull();
      expect(QrService.parsePayload('{pas du json')).toBeNull();
      expect(QrService.parsePayload('   ')).toBeNull();
    });
  });
});
