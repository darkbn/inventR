import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import type { INestApplication } from '@nestjs/common';
import { ImportStatus, Prisma, Role } from '@prisma/client';
import request from 'supertest';

import { UNLOCATED_LOCATION_CODE } from '../src/common/constants/inventory.constants';
import type { PrismaService } from '../src/prisma/prisma.service';

import { createActor, type Actor } from './helpers/auth-helper';
import { seedCampaign, type SeededCampaign } from './helpers/campaign-fixture';
import { apiPath, createTestApp } from './helpers/test-app';

const SAMPLE_PATH = path.resolve(__dirname, '../../../samples/Stocks_14-06-2026.xlsx');

/** Petit CSV de travail, pour les cas d'erreur ciblés. */
const csv = (lines: string[]): Buffer => Buffer.from(lines.join('\n'), 'utf8');

const CSV_HEADER = 'Article;(Article (Désignation));Magasin;Emplacement;Quantite;Pmp';

describe('Import de fichiers (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let supervisor: Actor;
  let seeded: SeededCampaign;
  let warehouseCode: string;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await prisma.truncateAllTables();
    supervisor = await createActor(app, prisma, Role.SUPERVISOR);

    // Campagne vide : l'import est précisément ce qui va la peupler.
    seeded = await seedCampaign(prisma, { items: [] });
    const warehouse = await prisma.warehouse.findUniqueOrThrow({
      where: { id: seeded.warehouseId },
    });
    warehouseCode = warehouse.code;
  });

  const http = () => request(app.getHttpServer());

  const upload = (content: Buffer, filename: string, query: Record<string, string> = {}) =>
    http()
      .post(apiPath(`/lists/${seeded.listId}/imports`))
      .query(query)
      .set(...supervisor.auth)
      .attach('file', content, filename);

  // ==========================================================================
  describe('modèle d’import', () => {
    it('est téléchargeable sans authentification', async () => {
      // responseType('blob') : sans cela, Supertest tente de parser le corps
      // binaire et renvoie un objet au lieu d'un Buffer.
      const response = await http()
        .get(apiPath('/imports/template.xlsx'))
        .responseType('blob')
        .expect(200);

      expect(response.headers['content-type']).toContain('spreadsheetml');
      expect(response.headers['content-disposition']).toContain('InventAir-modele-import.xlsx');
      // Signature ZIP : un .xlsx est une archive.
      expect(response.body.subarray(0, 2).toString()).toBe('PK');
    });

    it('est lui-même un fichier importable', async () => {
      // Garantie de cohérence : le modèle produit doit passer notre propre
      // analyseur, sinon il induirait l'utilisateur en erreur.
      const template = await http()
        .get(apiPath('/imports/template.xlsx'))
        .responseType('blob')
        .expect(200);

      const response = await upload(template.body as Buffer, 'modele.xlsx').expect(201);

      // Les lignes d'exemple du modèle portent le magasin 19R01, pas celui de
      // la campagne de test : le contrôle de cohérence doit donc se déclencher.
      expect(response.body.rowsTotal).toBeGreaterThan(0);
      expect(
        (response.body.errors as { code: string }[]).some((e) => e.code === 'WAREHOUSE_MISMATCH'),
      ).toBe(true);
    });
  });

  // ==========================================================================
  describe('analyse', () => {
    it('ne modifie aucune donnée métier', async () => {
      await upload(
        csv([CSV_HEADER, `ACCEL-0016;PALIER;${warehouseCode};1-1-C-7;5;100`]),
        'stock.csv',
      ).expect(201);

      expect(await prisma.inventoryItem.count()).toBe(0);
      expect(await prisma.article.count()).toBe(0);
    });

    it('rapporte les erreurs ligne par ligne avec leur numéro de ligne', async () => {
      const response = await upload(
        csv([
          CSV_HEADER,
          `ACCEL-0016;PALIER;${warehouseCode};1-1-C-7;5;100`, // ligne 2 : valide
          `pas un code;PALIER;${warehouseCode};1-1-C-7;5;100`, // ligne 3 : code invalide
          `ACCEL-0020;;${warehouseCode};1-1-C-7;5;100`, // ligne 4 : désignation absente
          `ACCEL-0038;PALIER;${warehouseCode};1-1-C-7;-3;100`, // ligne 5 : quantité négative
          `ACCEL-0040;PALIER;${warehouseCode};1-1-C-7;abc;100`, // ligne 6 : quantité non numérique
        ]),
        'stock.csv',
      ).expect(201);

      expect(response.body.status).toBe(ImportStatus.REJECTED);
      expect(response.body.rowsTotal).toBe(5);
      expect(response.body.rowsOk).toBe(1);
      expect(response.body.rowsError).toBe(4);

      const errors = response.body.errors as { line: number; code: string }[];
      expect(errors.find((e) => e.line === 3)?.code).toBe('ARTICLE_CODE_FORMAT');
      expect(errors.find((e) => e.line === 4)?.code).toBe('DESIGNATION_REQUIRED');
      expect(errors.find((e) => e.line === 5)?.code).toBe('QUANTITY_NEGATIVE');
      expect(errors.find((e) => e.line === 6)?.code).toBe('QUANTITY_NOT_A_NUMBER');
    });

    it('détecte un doublon et désigne la première occurrence', async () => {
      const response = await upload(
        csv([
          CSV_HEADER,
          `ACCEL-0016;PALIER;${warehouseCode};1-1-C-7;5;100`,
          `ACCEL-0020;TUBULURE;${warehouseCode};1-1-C-7;3;100`,
          `ACCEL-0016;PALIER;${warehouseCode};1-1-C-7;7;100`,
        ]),
        'stock.csv',
      ).expect(201);

      const duplicate = (
        response.body.errors as { line: number; code: string; message: string }[]
      ).find((e) => e.code === 'DUPLICATE_ROW');

      expect(duplicate?.line).toBe(4);
      expect(duplicate?.message).toContain('ligne 2');
    });

    it('accepte le même article à deux emplacements différents', async () => {
      const response = await upload(
        csv([
          CSV_HEADER,
          `ACCEL-0016;PALIER;${warehouseCode};1-1-C-7;5;100`,
          `ACCEL-0016;PALIER;${warehouseCode};2-1-A-3;3;100`,
        ]),
        'stock.csv',
      ).expect(201);

      expect(response.body.rowsOk).toBe(2);
      expect(response.body.rowsError).toBe(0);
    });

    it('refuse un fichier portant sur un autre magasin', async () => {
      const response = await upload(
        csv([CSV_HEADER, `ACCEL-0016;PALIER;AUTRE-MAG;1-1-C-7;5;100`]),
        'stock.csv',
      ).expect(201);

      const mismatch = (response.body.errors as { code: string }[]).find(
        (e) => e.code === 'WAREHOUSE_MISMATCH',
      );
      expect(mismatch).toBeDefined();
      expect(response.body.status).toBe(ImportStatus.REJECTED);
    });

    it('rejette un fichier sans en-tête exploitable', async () => {
      await upload(csv(['Colonne A;Colonne B', 'valeur;valeur']), 'stock.csv').expect(400);
    });

    it('rejette un format non pris en charge', async () => {
      await upload(Buffer.from('contenu'), 'stock.pdf').expect(400);
    });

    it('signale les colonnes inconnues sans les refuser', async () => {
      const response = await upload(
        csv([
          `${CSV_HEADER};Colonne maison`,
          `ACCEL-0016;PALIER;${warehouseCode};1-1-C-7;5;100;valeur`,
        ]),
        'stock.csv',
      ).expect(201);

      expect(response.body.rowsOk).toBe(1);
      expect(
        (response.body.warnings as { code: string }[]).some((w) => w.code === 'UNKNOWN_COLUMNS'),
      ).toBe(true);
    });

    it('accepte la virgule comme séparateur décimal', async () => {
      const response = await upload(
        csv([CSV_HEADER, `ACCEL-0016;PALIER;${warehouseCode};1-1-C-7;12,5;1 234,56`]),
        'stock.csv',
      ).expect(201);

      expect(response.body.rowsOk).toBe(1);

      await http()
        .post(apiPath(`/imports/${response.body.id}/apply`))
        .set(...supervisor.auth)
        .expect(200);

      const item = await prisma.inventoryItem.findFirstOrThrow();
      expect(item.theoreticalQty.toString()).toBe('12.5');
      expect(item.unitPrice.toString()).toBe('1234.56');
    });
  });

  // ==========================================================================
  describe('application', () => {
    const validCsv = () =>
      csv([
        CSV_HEADER,
        `ACCEL-0016;PALIER REF: 0901323439;${warehouseCode};1-1-C-7;2;5689.2846`,
        `ACCEL-0020;TUBULURE;${warehouseCode};;1;1586.31`,
      ]);

    it('crée les lignes, les articles et les emplacements manquants', async () => {
      const analysis = await upload(validCsv(), 'stock.csv').expect(201);
      expect(analysis.body.status).toBe(ImportStatus.VALIDATED);

      const result = await http()
        .post(apiPath(`/imports/${analysis.body.id}/apply`))
        .set(...supervisor.auth)
        .expect(200);

      expect(result.body.itemsCreated).toBe(2);
      expect(result.body.articlesCreated).toBe(2);

      const items = await prisma.inventoryItem.findMany({
        include: { article: true, location: true },
      });
      expect(items).toHaveLength(2);

      // La ligne sans emplacement est rattachée à l'emplacement virtuel.
      const unlocated = items.find((item) => item.article.code === 'ACCEL-0020');
      expect(unlocated?.location.code).toBe(UNLOCATED_LOCATION_CODE);
      expect(unlocated?.location.isVirtual).toBe(true);

      // Le Pmp est figé sur la ligne, et aussi reporté sur l'article.
      const palier = items.find((item) => item.article.code === 'ACCEL-0016');
      expect(palier?.unitPrice.toString()).toBe('5689.2846');
      expect(palier?.article.lastPmp.toString()).toBe('5689.2846');
    });

    it('décompose l’emplacement pour le tri physique', async () => {
      const analysis = await upload(validCsv(), 'stock.csv').expect(201);
      await http()
        .post(apiPath(`/imports/${analysis.body.id}/apply`))
        .set(...supervisor.auth)
        .expect(200);

      const location = await prisma.location.findFirstOrThrow({ where: { code: '1-1-C-7' } });
      expect(location).toMatchObject({ aisle: 1, bay: 1, level: 'C', slot: 7 });
    });

    it('actualise la quantité théorique lors d’un second import', async () => {
      const first = await upload(validCsv(), 'stock.csv').expect(201);
      await http()
        .post(apiPath(`/imports/${first.body.id}/apply`))
        .set(...supervisor.auth)
        .expect(200);

      const second = await upload(
        csv([CSV_HEADER, `ACCEL-0016;PALIER REF: 0901323439;${warehouseCode};1-1-C-7;9;5689.2846`]),
        'stock-maj.csv',
      ).expect(201);

      const result = await http()
        .post(apiPath(`/imports/${second.body.id}/apply`))
        .set(...supervisor.auth)
        .expect(200);

      expect(result.body.itemsCreated).toBe(0);
      expect(result.body.itemsUpdated).toBe(1);

      const item = await prisma.inventoryItem.findFirstOrThrow({
        where: { article: { code: 'ACCEL-0016' } },
      });
      expect(item.theoreticalQty.toString()).toBe('9');
    });

    it('refuse d’appliquer deux fois le même import', async () => {
      const analysis = await upload(validCsv(), 'stock.csv').expect(201);

      await http()
        .post(apiPath(`/imports/${analysis.body.id}/apply`))
        .set(...supervisor.auth)
        .expect(200);

      await http()
        .post(apiPath(`/imports/${analysis.body.id}/apply`))
        .set(...supervisor.auth)
        .expect(409);
    });

    it('refuse d’appliquer un import rejeté', async () => {
      const analysis = await upload(
        csv([CSV_HEADER, `mauvais code;PALIER;${warehouseCode};1-1-C-7;5;100`]),
        'stock.csv',
      ).expect(201);

      await http()
        .post(apiPath(`/imports/${analysis.body.id}/apply`))
        .set(...supervisor.auth)
        .expect(409);
    });

    it('refuse l’import sur une campagne déjà en comptage', async () => {
      const operator = await createActor(app, prisma, Role.USER);
      const other = await seedCampaign(prisma, {
        items: [{ articleCode: 'INOX-0001', theoreticalQty: 1 }],
      });

      await http()
        .post(apiPath(`/lists/${other.listId}/assignments`))
        .set(...supervisor.auth)
        .send({ userId: operator.id })
        .expect(204);
      await http()
        .post(apiPath(`/campaigns/${other.campaignId}/open`))
        .set(...supervisor.auth)
        .expect(200);
      await http()
        .post(apiPath(`/items/${other.items[0]!.id}/counts`))
        .set(...operator.auth)
        .send({ quantity: 1, clientUuid: crypto.randomUUID() })
        .expect(201);

      // La campagne est passée en COUNTING : déplacer le périmètre maintenant
      // désorienterait les opérateurs déjà sur le terrain.
      await http()
        .post(apiPath(`/lists/${other.listId}/imports`))
        .set(...supervisor.auth)
        .attach(
          'file',
          csv([CSV_HEADER, `ACCEL-0016;PALIER;${warehouseCode};1-1-C-7;5;100`]),
          'x.csv',
        )
        .expect(409);
    });

    it('interdit l’import à un opérateur', async () => {
      const operator = await createActor(app, prisma, Role.USER);

      await http()
        .post(apiPath(`/lists/${seeded.listId}/imports`))
        .set(...operator.auth)
        .attach('file', validCsv(), 'stock.csv')
        .expect(403);
    });
  });

  // ==========================================================================
  describe('avertissements sur le référentiel', () => {
    it('signale un emplacement proche d’un emplacement existant', async () => {
      await prisma.location.create({
        data: {
          warehouseId: seeded.warehouseId,
          code: 'ARMOIRE CONSM',
          normalizedCode: 'ARMOIRE CONSM',
        },
      });

      const response = await upload(
        csv([CSV_HEADER, `ACCEL-0016;PALIER;${warehouseCode};ARMOIR CONSM;5;100`]),
        'stock.csv',
      ).expect(201);

      const variant = (response.body.warnings as { code: string; message: string }[]).find(
        (w) => w.code === 'LOCATION_VARIANTS',
      );
      expect(variant?.message).toContain('ARMOIRE CONSM');
    });

    it('annonce les créations à venir dans le référentiel', async () => {
      const response = await upload(
        csv([CSV_HEADER, `ACCEL-0016;PALIER;${warehouseCode};1-1-C-7;5;100`]),
        'stock.csv',
      ).expect(201);

      const warnings = response.body.warnings as { code: string }[];
      expect(warnings.some((w) => w.code === 'ARTICLES_CREATED')).toBe(true);
      expect(warnings.some((w) => w.code === 'LOCATIONS_CREATED')).toBe(true);
    });
  });

  // ==========================================================================
  // Le fichier réel du client, de bout en bout.
  // ==========================================================================
  (existsSync(SAMPLE_PATH) ? describe : describe.skip)('fichier client réel', () => {
    it('importe les 7 961 lignes de Stocks_14-06-2026.xlsx', async () => {
      // Le magasin de la campagne de test doit correspondre à celui du fichier.
      await prisma.warehouse.update({
        where: { id: seeded.warehouseId },
        data: { code: '19R01', label: 'MAGASIN PDR BOUFARIK' },
      });

      const buffer = readFileSync(SAMPLE_PATH);

      const analysis = await http()
        .post(apiPath(`/lists/${seeded.listId}/imports`))
        .set(...supervisor.auth)
        .attach('file', buffer, 'Stocks_14-06-2026.xlsx')
        .expect(201);

      expect(analysis.body.status).toBe(ImportStatus.VALIDATED);
      expect(analysis.body.rowsTotal).toBe(7961);
      expect(analysis.body.rowsOk).toBe(7961);
      expect(analysis.body.rowsError).toBe(0);

      const applied = await http()
        .post(apiPath(`/imports/${analysis.body.id}/apply`))
        .set(...supervisor.auth)
        .expect(200);

      expect(applied.body.itemsCreated).toBe(7961);
      expect(applied.body.articlesCreated).toBe(7961);

      // Somme des quantités théoriques, identique à celle du fichier source.
      const aggregate = await prisma.inventoryItem.aggregate({
        where: { listId: seeded.listId },
        _sum: { theoreticalQty: true },
      });
      expect(new Prisma.Decimal(aggregate._sum.theoreticalQty ?? 0).toFixed(2)).toBe('100598.09');

      // Les 2 329 lignes sans emplacement sont sur l'emplacement virtuel.
      const unlocated = await prisma.inventoryItem.count({
        where: { listId: seeded.listId, location: { code: UNLOCATED_LOCATION_CODE } },
      });
      expect(unlocated).toBe(2329);

      // Décimales préservées.
      const decimalItem = await prisma.inventoryItem.findFirstOrThrow({
        where: { article: { code: 'CONVO-0689' } },
      });
      expect(decimalItem.theoreticalQty.toString()).toBe('192.024');
    }, 180_000);
  });
});
