import { CountStatus, ItemStatus, Prisma } from '@prisma/client';

import { INVENTORY_METHOD } from '../constants/inventory.constants';

import { InventoryCalculationService } from './inventory-calculation.service';
import type { CountSnapshot, ItemCalculationInput } from './inventory-calculation.types';

/**
 * Méthode 3 — référence exécutable de la règle arrêtée avec l'exploitant lors
 * de la recette du 11/11/2026.
 *
 * Ces tests ne cherchent pas la couverture de code : chacun transcrit une ligne
 * du cahier des charges. Si l'un d'eux change, c'est que la règle métier a
 * changé — et cela se discute avec l'exploitant, pas dans un correctif.
 *
 *   C1 = T                 → OK
 *   sinon C2 = T ou C2 = C1 → OK
 *         sinon C3 = T      → OK
 *               sinon       → ENQUÊTE (superviseur, motif obligatoire)
 */

const d = (value: number | string): Prisma.Decimal => new Prisma.Decimal(value);

let clock = 0;

/** Comptages horodatés dans l'ordre de création, pour des tests déterministes. */
const count = (
  userId: string,
  quantity: number | string,
  overrides: Partial<CountSnapshot> = {},
): CountSnapshot => ({
  id: `count-${(clock += 1)}`,
  userId,
  quantity: d(quantity),
  countedAt: new Date(2026, 0, 1, 8, clock),
  status: CountStatus.VALID,
  ...overrides,
});

const input = (overrides: Partial<ItemCalculationInput> = {}): ItemCalculationInput => ({
  theoreticalQty: d(30),
  unitPrice: d(0),
  counts: [],
  arbitratedQty: null,
  markedNotFound: false,
  ...overrides,
});

describe('Méthode 3 — comptages successifs et enquête', () => {
  const method = INVENTORY_METHOD.PROGRESSIVE;
  let service: InventoryCalculationService;

  beforeEach(() => {
    service = new InventoryCalculationService();
    clock = 0;
  });

  /** Comptages chronologiques, un opérateur distinct par passage. */
  const run = (
    theoretical: number,
    quantities: number[],
    overrides: Partial<ItemCalculationInput> = {},
  ) =>
    service.calculate(
      method,
      input({
        theoreticalQty: d(theoretical),
        counts: quantities.map((quantity, index) => count(`agent-${index + 1}`, quantity)),
        ...overrides,
      }),
    );

  // ==========================================================================
  describe('comptage 1', () => {
    it('clôt la ligne quand le comptage confirme le théorique', () => {
      const result = run(30, [30]);

      expect(result.status).toBe(ItemStatus.CONFIRMED);
      expect(result.finalQty?.toString()).toBe('30');
      expect(result.variance?.toString()).toBe('0');
      expect(result.blocksClosure).toBe(false);
      expect(result.expectedCountNumber).toBeNull();
    });

    it('réclame un second comptage quand il diverge du théorique', () => {
      const result = run(30, [28]);

      expect(result.status).toBe(ItemStatus.AWAITING_SECOND_COUNT);
      expect(result.finalQty).toBeNull();
      expect(result.expectedCountNumber).toBe(2);
      // Rien n'est retenu : l'écart ne doit pas peser dans les rapports tant
      // que la ligne n'est pas tranchée.
      expect(result.variance).toBeNull();
      expect(result.blocksClosure).toBe(true);
    });
  });

  // ==========================================================================
  describe('comptage 2', () => {
    it('clôt la ligne quand il confirme le théorique', () => {
      const result = run(30, [28, 30]);

      expect(result.status).toBe(ItemStatus.CONFIRMED);
      expect(result.finalQty?.toString()).toBe('30');
    });

    it('clôt la ligne quand il concorde avec le premier comptage', () => {
      // Deux opérateurs trouvent 28 là où SAP annonce 30 : l'écart est réel.
      const result = run(30, [28, 28]);

      expect(result.status).toBe(ItemStatus.CONFIRMED);
      expect(result.finalQty?.toString()).toBe('28');
      expect(result.variance?.toString()).toBe('-2');
    });

    it('réclame un troisième comptage quand il diffère du théorique et du premier', () => {
      const result = run(30, [28, 25]);

      expect(result.status).toBe(ItemStatus.AWAITING_THIRD_COUNT);
      expect(result.finalQty).toBeNull();
      expect(result.expectedCountNumber).toBe(3);
      expect(result.blocksClosure).toBe(true);
    });
  });

  // ==========================================================================
  describe('comptage 3', () => {
    it('clôt la ligne uniquement s’il confirme le théorique', () => {
      const result = run(30, [28, 25, 30]);

      expect(result.status).toBe(ItemStatus.CONFIRMED);
      expect(result.finalQty?.toString()).toBe('30');
    });

    it('déclenche l’enquête quand il rejoint un comptage précédent sans confirmer le théorique', () => {
      // Choix explicite de l'exploitant : au 3e passage, une majorité entre
      // comptages ne suffit plus à trancher à la place de l'humain.
      const result = run(30, [28, 25, 28]);

      expect(result.status).toBe(ItemStatus.UNDER_INVESTIGATION);
      expect(result.finalQty).toBeNull();
      expect(result.requiresInvestigation).toBe(true);
      expect(result.blocksClosure).toBe(true);
    });

    it('déclenche l’enquête sur trois valeurs différentes', () => {
      expect(run(30, [28, 25, 22]).status).toBe(ItemStatus.UNDER_INVESTIGATION);
    });

    it('reste en enquête même si d’autres comptages arrivent ensuite', () => {
      // Un 4e comptage spontané ne rouvre pas la mécanique automatique : seul
      // le superviseur clôt une ligne sous enquête.
      expect(run(30, [28, 25, 22, 30]).status).toBe(ItemStatus.UNDER_INVESTIGATION);
    });
  });

  // ==========================================================================
  describe('enquête — le 4e niveau', () => {
    it('la quantité du superviseur prime et clôt la ligne', () => {
      const result = run(30, [28, 25, 22], { arbitratedQty: d(26) });

      expect(result.status).toBe(ItemStatus.CONFIRMED);
      expect(result.finalQty?.toString()).toBe('26');
      expect(result.variance?.toString()).toBe('-4');
      expect(result.blocksClosure).toBe(false);
      expect(result.requiresInvestigation).toBe(false);
    });

    it('valorise l’écart au Pmp figé à l’import', () => {
      const result = service.calculate(
        method,
        input({
          theoreticalQty: d(30),
          unitPrice: d('12.5000'),
          counts: [count('a', 28), count('b', 25), count('c', 22)],
          arbitratedQty: d(26),
        }),
      );

      // (26 − 30) × 12,50 = −50,00
      expect(result.varianceValue?.toString()).toBe('-50');
    });
  });

  // ==========================================================================
  describe('cas limites', () => {
    it('une ligne sans comptage attend le premier', () => {
      const result = run(30, []);

      expect(result.status).toBe(ItemStatus.PENDING);
      expect(result.expectedCountNumber).toBe(1);
      // PENDING n'est pas bloquant : la mise à 0 se décide à la clôture.
      expect(result.blocksClosure).toBe(false);
    });

    it('un comptage à 0 confirme un théorique à 0', () => {
      const result = run(0, [0]);

      expect(result.status).toBe(ItemStatus.CONFIRMED);
      expect(result.finalQty?.toString()).toBe('0');
      // Taux indéfini sur un théorique nul, jamais une division par zéro.
      expect(result.varianceRate).toBeNull();
    });

    it('un article trouvé sur une ligne ajoutée manuellement part en second comptage', () => {
      // Ligne créée sur le terrain : théorique 0, 4 unités trouvées en rayon.
      const result = run(0, [4]);

      expect(result.status).toBe(ItemStatus.AWAITING_SECOND_COUNT);
      expect(result.expectedCountNumber).toBe(2);
    });

    it('compare sur la valeur décimale et non sur sa représentation', () => {
      // 192,024 saisi « 192.0240 » : même quantité, la ligne doit être close.
      const result = service.calculate(
        method,
        input({ theoreticalQty: d('192.024'), counts: [count('a', '192.0240')] }),
      );

      expect(result.status).toBe(ItemStatus.CONFIRMED);
    });

    it('ignore les comptages annulés dans la chronologie', () => {
      const result = service.calculate(
        method,
        input({
          theoreticalQty: d(30),
          counts: [
            count('a', 28),
            count('b', 999, { status: CountStatus.CANCELLED }),
            count('c', 28),
          ],
        }),
      );

      // Le comptage annulé ne vaut ni passage ni valeur : restent C1 = C2 = 28.
      expect(result.status).toBe(ItemStatus.CONFIRMED);
      expect(result.finalQty?.toString()).toBe('28');
      expect(result.validCountCount).toBe(2);
    });

    it('ordonne les comptages par horodatage, pas par ordre d’arrivée', () => {
      // Synchronisation hors ligne : le terminal remonte le 2e comptage avant
      // le 1er. La chronologie du terrain doit primer sur l'ordre de réception.
      const later = count('b', 30, { countedAt: new Date(2026, 0, 1, 10, 0) });
      const earlier = count('a', 28, { countedAt: new Date(2026, 0, 1, 9, 0) });

      const result = service.calculate(
        method,
        input({ theoreticalQty: d(30), counts: [later, earlier] }),
      );

      // C1 = 28 (≠ 30), puis C2 = 30 (= théorique) → confirmé.
      expect(result.status).toBe(ItemStatus.CONFIRMED);
      expect(result.finalQty?.toString()).toBe('30');
    });

    it('départage deux comptages strictement simultanés de façon stable', () => {
      // Même horodatage à la milliseconde près : cas réel d'un lot remonté en
      // une seule synchronisation. Le résultat ne doit pas dépendre du hasard.
      const at = new Date(2026, 0, 1, 9, 0);
      const counts = [count('a', 28, { countedAt: at }), count('b', 25, { countedAt: at })];

      const forward = service.calculate(method, input({ counts }));
      const reversed = service.calculate(method, input({ counts: [...counts].reverse() }));

      expect(forward.status).toBe(reversed.status);
      expect(forward.finalQty).toBe(reversed.finalQty);
    });

    it('une déclaration « introuvable » sans comptage reste prioritaire', () => {
      expect(run(30, [], { markedNotFound: true }).status).toBe(ItemStatus.NOT_FOUND);
    });
  });

  // ==========================================================================
  describe('clôture', () => {
    it('met à 0 une ligne jamais comptée', () => {
      const result = service.calculateAtClosure(method, input({ counts: [] }));

      expect(result.status).toBe(ItemStatus.NOT_FOUND);
      expect(result.finalQty?.toString()).toBe('0');
      expect(result.variance?.toString()).toBe('-30');
      expect(result.expectedCountNumber).toBeNull();
    });

    it('ne met pas à 0 une ligne sous enquête : elle bloque la clôture', () => {
      const result = service.calculateAtClosure(
        method,
        input({ counts: [count('a', 28), count('b', 25), count('c', 22)] }),
      );

      expect(result.status).toBe(ItemStatus.UNDER_INVESTIGATION);
      expect(result.finalQty).toBeNull();
      expect(result.blocksClosure).toBe(true);
    });
  });

  // ==========================================================================
  describe('verrou de recomptage', () => {
    it('interdit à un opérateur de compter deux fois en Méthode 3', () => {
      expect(service.allowsRepeatCountByUser(INVENTORY_METHOD.PROGRESSIVE)).toBe(false);
    });

    it('l’interdit aussi en double comptage contradictoire', () => {
      expect(service.allowsRepeatCountByUser(INVENTORY_METHOD.DOUBLE_BLIND)).toBe(false);
    });

    it('l’autorise en somme cumulative, où c’est le principe même', () => {
      expect(service.allowsRepeatCountByUser(INVENTORY_METHOD.SUM)).toBe(true);
    });
  });
});
