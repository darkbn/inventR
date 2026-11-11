import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { Prisma } from '@prisma/client';

import { ImportValidatorService } from './import-validator.service';
import { InventoryFileParserService } from './inventory-file-parser.service';

/**
 * Validation de l'analyseur contre le **fichier réel du client**.
 *
 * Les jeux d'essai synthétiques ne font que confirmer ce qu'on a prévu ; seul
 * le fichier de production révèle ce qu'on n'avait pas anticipé — ici des codes
 * articles à suffixe, des emplacements multiples et 29 % de lignes sans
 * emplacement.
 *
 * Les attentes chiffrées proviennent de l'analyse du fichier menée avant
 * l'implémentation : toute dérive signale soit une régression, soit un fichier
 * qui a changé.
 */
const SAMPLE_PATH = path.resolve(__dirname, '../../../../../../samples/Stocks_14-06-2026.xlsx');

const describeIfSample = existsSync(SAMPLE_PATH) ? describe : describe.skip;

describeIfSample('Analyse du fichier client Stocks_14-06-2026.xlsx', () => {
  const parser = new InventoryFileParserService();
  const validator = new ImportValidatorService();

  let parsed: Awaited<ReturnType<typeof parser.parse>>;
  let outcome: ReturnType<typeof validator.validate>;

  beforeAll(async () => {
    const buffer = readFileSync(SAMPLE_PATH);
    parsed = await parser.parse(buffer, 'Stocks_14-06-2026.xlsx');
    outcome = validator.validate(parsed.rows, { excludeZeroQuantity: false });
  }, 120_000);

  it('reconnaît les dix colonnes de l’export ERP', () => {
    expect(parsed.headerLineNo).toBe(1);
    expect(parsed.unknownHeaders).toEqual([]);
    expect(Object.keys(parsed.mapping).sort()).toEqual(
      [
        'articleCode',
        'brand',
        'designation',
        'location',
        'manufacturerRef',
        'quantity',
        'unit',
        'unitPrice',
        'warehouseCode',
        'warehouseLabel',
      ].sort(),
    );
  });

  it('lit les 7 961 lignes de données', () => {
    expect(parsed.rows).toHaveLength(7961);
  });

  it('accepte l’intégralité du fichier sans erreur bloquante', () => {
    if (outcome.errors.length > 0) {
      // Facilite le diagnostic en cas de régression.
      console.error(outcome.errors.slice(0, 10));
    }
    expect(outcome.errors).toHaveLength(0);
    expect(outcome.rows).toHaveLength(7961);
  });

  it('retrouve exactement la somme des quantités théoriques', () => {
    const total = outcome.rows.reduce(
      (sum, row) => sum.plus(row.theoreticalQty),
      new Prisma.Decimal(0),
    );
    expect(total.toFixed(2)).toBe('100598.09');
  });

  it('préserve les décimales sans arrondi', () => {
    const row = outcome.rows.find((entry) => entry.articleCode === 'CONVO-0689');
    expect(row?.theoreticalQty.toString()).toBe('192.024');
  });

  it('accepte les trois formes de code article présentes', () => {
    const codes = new Set(outcome.rows.map((row) => row.articleCode));
    expect(codes.has('ACCEL-0016')).toBe(true); // forme majoritaire
    expect(codes.has('ACCOU-0060L')).toBe(true); // suffixe lettre
    expect(codes.has('INOX-0001')).toBe(true); // préfixe de 4 lettres
  });

  it('rattache les lignes sans emplacement à « sans emplacement »', () => {
    const unlocated = outcome.rows.filter((row) => row.locationCode === null);
    expect(unlocated).toHaveLength(2329);

    const warning = outcome.warnings.find((entry) => entry.code === 'UNLOCATED_ROWS');
    expect(warning?.message).toContain('2329');
  });

  it('signale les emplacements multiples sans les rejeter', () => {
    const multiples = outcome.warnings.filter((entry) => entry.code === 'LOCATION_MULTIPLE');

    // Six lignes, et non quatre : outre les quatre doubles emplacements
    // structurés (« 16-7-A/16-6-B »), le fichier contient deux « LOCAL/UTILIE »
    // — un libellé libre comportant lui aussi une barre oblique.
    expect(multiples).toHaveLength(6);
    expect(multiples.every((entry) => entry.message.includes('/'))).toBe(true);
  });

  it('ne détecte qu’un seul magasin', () => {
    const warehouses = new Set(outcome.rows.map((row) => row.warehouseCode));
    expect([...warehouses]).toEqual(['19R01']);
    expect(outcome.warnings.find((entry) => entry.code === 'MULTIPLE_WAREHOUSES')).toBeUndefined();
  });

  it('conserve le prix moyen pondéré à l’échelle de la colonne', () => {
    const row = outcome.rows.find((entry) => entry.articleCode === 'ACCEL-0016');

    // La cellule contient le flottant 5689.2846499999996, dont la
    // représentation décimale courte est 5689.28465 : arrondi au supérieur sur
    // 4 décimales, soit l'échelle de la colonne numeric(16,4).
    expect(row?.unitPrice.toString()).toBe('5689.2847');
    expect(row?.brand).toBe('KRONES');
    expect(row?.manufacturerRef).toBe('0901323439');
  });

  it('relève les sept unités de gestion du fichier', () => {
    const units = new Set(outcome.rows.map((row) => row.unit));
    expect(units.size).toBe(7);
    expect(units.has('Unité')).toBe(true);
    expect(units.has('Kilogramme')).toBe(true);
  });

  it('exclut les lignes à quantité nulle sur demande', () => {
    const filtered = validator.validate(parsed.rows, { excludeZeroQuantity: true });

    expect(filtered.rows).toHaveLength(7961 - 3778);
    expect(
      filtered.warnings.find((entry) => entry.code === 'ZERO_QUANTITY_EXCLUDED'),
    ).toBeDefined();
  });

  it('analyse le fichier en moins de dix secondes', () => {
    // Repère de non-régression : l'import complet doit rester interactif.
    const started = Date.now();
    validator.validate(parsed.rows, { excludeZeroQuantity: false });
    expect(Date.now() - started).toBeLessThan(10_000);
  });
});
