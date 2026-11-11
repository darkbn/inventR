import type { INestApplication } from '@nestjs/common';
import { Role } from '@prisma/client';
import request from 'supertest';

import {
  CAMPAIGN_TYPE,
  INVENTORY_METHOD,
  UNLOCATED_LOCATION_CODE,
} from '../src/common/constants/inventory.constants';
import type { PrismaService } from '../src/prisma/prisma.service';

import { createActor, type Actor } from './helpers/auth-helper';
import { apiPath, createTestApp } from './helpers/test-app';

describe('Référentiels (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let admin: Actor;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await prisma.truncateAllTables();
    admin = await createActor(app, prisma, Role.ADMIN);
  });

  const http = () => request(app.getHttpServer());

  const createWarehouse = async (code = '19R01'): Promise<string> => {
    const response = await http()
      .post(apiPath('/warehouses'))
      .set(...admin.auth)
      .send({ code, label: 'MAGASIN PDR BOUFARIK' })
      .expect(201);
    return response.body.id as string;
  };

  const createLocation = async (warehouseId: string, code: string): Promise<string> => {
    const response = await http()
      .post(apiPath('/locations'))
      .set(...admin.auth)
      .send({ warehouseId, code })
      .expect(201);
    return response.body.id as string;
  };

  // --------------------------------------------------------------------------
  describe('magasins', () => {
    it('crée le magasin et son emplacement virtuel NON-LOCALISE', async () => {
      const warehouseId = await createWarehouse();

      // Sans cet emplacement, le premier import échouerait : location_id est
      // NOT NULL et 29 % des lignes du fichier source n'ont pas d'emplacement.
      const virtual = await prisma.location.findFirst({
        where: { warehouseId, code: UNLOCATED_LOCATION_CODE },
      });

      expect(virtual).not.toBeNull();
      expect(virtual?.isVirtual).toBe(true);
    });

    it('refuse un code magasin en doublon', async () => {
      await createWarehouse();
      await http()
        .post(apiPath('/warehouses'))
        .set(...admin.auth)
        .send({ code: '19R01', label: 'Doublon' })
        .expect(409);
    });

    it('masque les emplacements virtuels par défaut', async () => {
      const warehouseId = await createWarehouse();
      await createLocation(warehouseId, '1-1-C-7');

      const hidden = await http()
        .get(apiPath('/locations'))
        .query({ warehouseId })
        .set(...admin.auth)
        .expect(200);
      expect(hidden.body.meta.total).toBe(1);

      const shown = await http()
        .get(apiPath('/locations'))
        .query({ warehouseId, includeVirtual: true })
        .set(...admin.auth)
        .expect(200);
      expect(shown.body.meta.total).toBe(2);
    });
  });

  // --------------------------------------------------------------------------
  describe('emplacements', () => {
    it('décompose un code structuré pour le tri physique', async () => {
      const warehouseId = await createWarehouse();
      const id = await createLocation(warehouseId, '1-1-C-7');

      const location = await prisma.location.findUniqueOrThrow({ where: { id } });
      expect(location).toMatchObject({ aisle: 1, bay: 1, level: 'C', slot: 7 });
    });

    it('laisse un libellé libre sans décomposition', async () => {
      const warehouseId = await createWarehouse();
      const id = await createLocation(warehouseId, 'ARMOIRE CONSM');

      const location = await prisma.location.findUniqueOrThrow({ where: { id } });
      expect(location.aisle).toBeNull();
      expect(location.normalizedCode).toBe('ARMOIRE CONSM');
    });

    it('trie les emplacements dans l’ordre physique, numérique et non lexicographique', async () => {
      const warehouseId = await createWarehouse();
      for (const code of ['10-1-A-1', '2-1-A-1', '1-1-A-1']) {
        await createLocation(warehouseId, code);
      }

      const response = await http()
        .get(apiPath('/locations'))
        .query({ warehouseId, limit: 50 })
        .set(...admin.auth)
        .expect(200);

      const codes = (response.body.data as { code: string }[]).map((item) => item.code);
      expect(codes).toEqual(['1-1-A-1', '2-1-A-1', '10-1-A-1']);
    });

    it('signale les variantes orthographiques probables', async () => {
      const warehouseId = await createWarehouse();
      await createLocation(warehouseId, 'ARMOIRE CONSM');
      await createLocation(warehouseId, 'ARMOIR CONSM');
      await createLocation(warehouseId, '1-1-A-7');
      await createLocation(warehouseId, '1-1-B-7');

      const response = await http()
        .get(apiPath(`/locations/variants/${warehouseId}`))
        .set(...admin.auth)
        .expect(200);

      // Un seul groupe : les deux libellés libres. Les codes structurés voisins
      // ne doivent jamais être proposés à la fusion.
      expect(response.body).toHaveLength(1);
      const codes = [
        response.body[0].location.code,
        ...response.body[0].candidates.map((c: { code: string }) => c.code),
      ].sort();
      expect(codes).toEqual(['ARMOIR CONSM', 'ARMOIRE CONSM']);
    });

    it('refuse de fusionner deux emplacements de magasins différents', async () => {
      const first = await createWarehouse('19R01');
      const second = await createWarehouse('19R02');
      const source = await createLocation(first, 'ARMOIR CONSM');
      const target = await createLocation(second, 'ARMOIRE CONSM');

      await http()
        .post(apiPath(`/locations/${source}/merge`))
        .set(...admin.auth)
        .send({ targetLocationId: target })
        .expect(400);
    });

    it('refuse de fusionner l’emplacement virtuel', async () => {
      const warehouseId = await createWarehouse();
      const virtual = await prisma.location.findFirstOrThrow({
        where: { warehouseId, code: UNLOCATED_LOCATION_CODE },
      });
      const target = await createLocation(warehouseId, 'ARMOIRE CONSM');

      await http()
        .post(apiPath(`/locations/${virtual.id}/merge`))
        .set(...admin.auth)
        .send({ targetLocationId: target })
        .expect(400);
    });

    it('la fusion est réservée aux administrateurs', async () => {
      const supervisor = await createActor(app, prisma, Role.SUPERVISOR);
      const warehouseId = await createWarehouse();
      const source = await createLocation(warehouseId, 'ARMOIR CONSM');
      const target = await createLocation(warehouseId, 'ARMOIRE CONSM');

      await http()
        .post(apiPath(`/locations/${source}/merge`))
        .set(...supervisor.auth)
        .send({ targetLocationId: target })
        .expect(403);
    });

    it('fusionne et désactive l’emplacement source', async () => {
      const warehouseId = await createWarehouse();
      const source = await createLocation(warehouseId, 'ARMOIR CONSM');
      const target = await createLocation(warehouseId, 'ARMOIRE CONSM');

      await http()
        .post(apiPath(`/locations/${source}/merge`))
        .set(...admin.auth)
        .send({ targetLocationId: target })
        .expect(200);

      const merged = await prisma.location.findUniqueOrThrow({ where: { id: source } });
      expect(merged.isActive).toBe(false);
      expect(merged.label).toContain('fusionné');
    });
  });

  // --------------------------------------------------------------------------
  describe('articles', () => {
    const article = {
      code: 'ACCEL-0016',
      designation: 'PALIER REF: 0901323439',
      brand: 'KRONES',
      manufacturerRef: '0901323439',
      lastPmp: 5689.2846,
    };

    it('accepte les trois formats de code présents dans le fichier client', async () => {
      for (const code of ['ACCEL-0016', 'ACCOU-0060L', 'INOX-0001']) {
        await http()
          .post(apiPath('/articles'))
          .set(...admin.auth)
          .send({ ...article, code })
          .expect(201);
      }
    });

    it('rejette un code au format invalide', async () => {
      await http()
        .post(apiPath('/articles'))
        .set(...admin.auth)
        .send({ ...article, code: 'pas un code' })
        .expect(400);
    });

    it('rejette un prix moyen pondéré négatif', async () => {
      await http()
        .post(apiPath('/articles'))
        .set(...admin.auth)
        .send({ ...article, lastPmp: -1 })
        .expect(400);
    });

    it('recherche sur la marque et la référence fabricant', async () => {
      await http()
        .post(apiPath('/articles'))
        .set(...admin.auth)
        .send(article)
        .expect(201);

      for (const term of ['KRONES', '0901323439', 'PALIER', 'ACCEL']) {
        const response = await http()
          .get(apiPath('/articles'))
          .query({ q: term })
          .set(...admin.auth)
          .expect(200);
        expect(response.body.meta.total).toBe(1);
      }
    });

    it('retrouve un article par code exact — chemin du scan QR', async () => {
      await http()
        .post(apiPath('/articles'))
        .set(...admin.auth)
        .send(article)
        .expect(201);

      const response = await http()
        .get(apiPath('/articles/by-code/accel-0016'))
        .set(...admin.auth)
        .expect(200);

      expect(response.body.code).toBe('ACCEL-0016');
    });

    it('masque le prix moyen pondéré aux opérateurs', async () => {
      await http()
        .post(apiPath('/articles'))
        .set(...admin.auth)
        .send(article)
        .expect(201);
      const operator = await createActor(app, prisma, Role.USER);

      const forAdmin = await http()
        .get(apiPath('/articles'))
        .set(...admin.auth)
        .expect(200);
      expect(forAdmin.body.data[0]).toHaveProperty('lastPmp');

      // Aucune donnée financière ne doit parvenir à l'application mobile.
      const forOperator = await http()
        .get(apiPath('/articles'))
        .set(...operator.auth)
        .expect(200);
      expect(forOperator.body.data[0]).not.toHaveProperty('lastPmp');
    });

    it('interdit la création d’article à un opérateur', async () => {
      const operator = await createActor(app, prisma, Role.USER);
      await http()
        .post(apiPath('/articles'))
        .set(...operator.auth)
        .send(article)
        .expect(403);
    });
  });

  // --------------------------------------------------------------------------
  describe('paramétrage des campagnes', () => {
    beforeEach(async () => {
      // truncateAllTables a vidé le paramétrage installé par le seed.
      await prisma.campaignType.create({
        data: { code: CAMPAIGN_TYPE.SPARE_PARTS, label: 'Pièces de rechange (PDR)' },
      });
      await prisma.inventoryMethod.createMany({
        data: [
          { code: INVENTORY_METHOD.SUM, label: 'Méthode 1', config: { minCounts: 1 } },
          { code: INVENTORY_METHOD.DOUBLE_BLIND, label: 'Méthode 2', config: { minCounts: 2 } },
        ],
      });
    });

    it('expose les types de campagne', async () => {
      const response = await http()
        .get(apiPath('/campaign-types'))
        .set(...admin.auth)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].code).toBe(CAMPAIGN_TYPE.SPARE_PARTS);
    });

    it('permet d’ajouter un type sans migration de schéma', async () => {
      await http()
        .post(apiPath('/campaign-types'))
        .set(...admin.auth)
        .send({ code: 'CONSUMABLES', label: 'Consommables' })
        .expect(201);

      const response = await http()
        .get(apiPath('/campaign-types'))
        .set(...admin.auth)
        .expect(200);
      expect(response.body).toHaveLength(2);
    });

    it('expose les deux méthodes de calcul', async () => {
      const response = await http()
        .get(apiPath('/inventory-methods'))
        .set(...admin.auth)
        .expect(200);

      const codes = (response.body as { code: string }[]).map((method) => method.code);
      expect(codes).toEqual([INVENTORY_METHOD.SUM, INVENTORY_METHOD.DOUBLE_BLIND]);
    });

    it('interdit de modifier le code ou la configuration d’une méthode', async () => {
      const methods = await http()
        .get(apiPath('/inventory-methods'))
        .set(...admin.auth)
        .expect(200);

      // Ces champs n'existent pas dans le DTO : forbidNonWhitelisted les rejette.
      await http()
        .patch(apiPath(`/inventory-methods/${methods.body[0].id}`))
        .set(...admin.auth)
        .send({ code: 'METHOD_X' })
        .expect(400);

      await http()
        .patch(apiPath(`/inventory-methods/${methods.body[0].id}`))
        .set(...admin.auth)
        .send({ config: { minCounts: 99 } })
        .expect(400);

      await http()
        .patch(apiPath(`/inventory-methods/${methods.body[0].id}`))
        .set(...admin.auth)
        .send({ label: 'Méthode 1 — Somme' })
        .expect(200);
    });
  });
});
