import { InternalServerErrorException } from '@nestjs/common';
import { CountStatus, ItemStatus, Prisma } from '@prisma/client';

import { INVENTORY_METHOD } from '../constants/inventory.constants';

import { InventoryCalculationService } from './inventory-calculation.service';
import type { CountSnapshot, ItemCalculationInput } from './inventory-calculation.types';

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

describe('InventoryCalculationService', () => {
  let service: InventoryCalculationService;

  beforeEach(() => {
    service = new InventoryCalculationService();
    clock = 0;
  });

  // ==========================================================================
  describe('Méthode 1 — somme cumulative', () => {
    const method = INVENTORY_METHOD.SUM;

    it('additionne tous les comptages valides', () => {
      // 12 + 8 + 5 = 25, y compris deux comptages du même opérateur : en
      // Méthode 1, chaque saisie est une portion distincte du périmètre.
      const result = service.calculate(
        method,
        input({ counts: [count('karim', 12), count('yacine', 8), count('karim', 5)] }),
      );

      expect(result.status).toBe(ItemStatus.COUNTED);
      expect(result.finalQty?.toString()).toBe('25');
      expect(result.validCountCount).toBe(3);
      expect(result.distinctCounterCount).toBe(2);
    });

    it('gère les quantités décimales sans perte de précision', () => {
      // Le fichier client contient 30 valeurs décimales, dont 192.024.
      const result = service.calculate(
        method,
        input({
          theoreticalQty: d('192.024'),
          counts: [count('karim', '96.012'), count('yacine', '96.012')],
        }),
      );

      expect(result.finalQty?.toString()).toBe('192.024');
      expect(result.variance?.toString()).toBe('0');
    });

    it('ignore les comptages annulés', () => {
      const result = service.calculate(
        method,
        input({
          counts: [count('karim', 12), count('yacine', 100, { status: CountStatus.CANCELLED })],
        }),
      );

      expect(result.finalQty?.toString()).toBe('12');
      expect(result.validCountCount).toBe(1);
    });

    it('laisse une ligne jamais comptée en attente, et non introuvable', () => {
      // Distinction essentielle : « pas encore traité » n'est pas « absent du
      // stock ». La conversion en 0 n'a lieu qu'à la clôture.
      const result = service.calculate(method, input());

      expect(result.status).toBe(ItemStatus.PENDING);
      expect(result.finalQty).toBeNull();
      expect(result.variance).toBeNull();
    });

    it('ne bloque jamais la clôture', () => {
      expect(service.calculate(method, input()).blocksClosure).toBe(false);
      expect(service.calculate(method, input({ counts: [count('karim', 1)] })).blocksClosure).toBe(
        false,
      );
    });
  });

  // ==========================================================================
  describe('Méthode 2 — double comptage contradictoire', () => {
    const method = INVENTORY_METHOD.DOUBLE_BLIND;

    it('confirme lorsque deux opérateurs concordent', () => {
      const result = service.calculate(
        method,
        input({ counts: [count('karim', 40), count('yacine', 40)] }),
      );

      expect(result.status).toBe(ItemStatus.CONFIRMED);
      expect(result.finalQty?.toString()).toBe('40');
      expect(result.blocksClosure).toBe(false);
    });

    it('attend un second comptage après une seule saisie', () => {
      const result = service.calculate(method, input({ counts: [count('karim', 40)] }));

      expect(result.status).toBe(ItemStatus.AWAITING_SECOND_COUNT);
      expect(result.finalQty).toBeNull();
      expect(result.blocksClosure).toBe(true);
    });

    it('ne compte qu’une voix par opérateur, même après plusieurs saisies', () => {
      // Sans cette règle, un opérateur pourrait à lui seul « confirmer » une
      // valeur en la saisissant deux fois : le comptage ne serait plus
      // contradictoire.
      const result = service.calculate(
        method,
        input({ counts: [count('karim', 40), count('karim', 40)] }),
      );

      expect(result.status).toBe(ItemStatus.AWAITING_SECOND_COUNT);
    });

    it('retient le dernier comptage de chaque opérateur', () => {
      // Karim se corrige : 37 puis 40. Yacine a compté 40 → concordance.
      const result = service.calculate(
        method,
        input({ counts: [count('karim', 37), count('yacine', 40), count('karim', 40)] }),
      );

      expect(result.status).toBe(ItemStatus.CONFIRMED);
      expect(result.finalQty?.toString()).toBe('40');
    });

    it('déclare un litige lorsque deux opérateurs divergent', () => {
      const result = service.calculate(
        method,
        input({ counts: [count('karim', 40), count('yacine', 37)] }),
      );

      expect(result.status).toBe(ItemStatus.DISCREPANCY);
      expect(result.finalQty).toBeNull();
      expect(result.blocksClosure).toBe(true);
    });

    it('tranche un litige par majorité stricte au troisième comptage', () => {
      const result = service.calculate(
        method,
        input({ counts: [count('karim', 40), count('yacine', 37), count('sofiane', 40)] }),
      );

      expect(result.status).toBe(ItemStatus.CONFIRMED);
      expect(result.finalQty?.toString()).toBe('40');
    });

    it('maintient le litige en l’absence de majorité stricte', () => {
      // Trois valeurs différentes : aucune ne l'emporte, l'arbitrage humain
      // est obligatoire.
      const result = service.calculate(
        method,
        input({ counts: [count('karim', 40), count('yacine', 37), count('sofiane', 35)] }),
      );

      expect(result.status).toBe(ItemStatus.DISCREPANCY);
      expect(result.blocksClosure).toBe(true);
    });

    it('maintient le litige en cas d’égalité parfaite', () => {
      const result = service.calculate(
        method,
        input({
          counts: [
            count('karim', 40),
            count('yacine', 37),
            count('sofiane', 40),
            count('amine', 37),
          ],
        }),
      );

      expect(result.status).toBe(ItemStatus.DISCREPANCY);
    });
  });

  // ==========================================================================
  describe('arbitrage du superviseur', () => {
    it('prime sur un litige', () => {
      const result = service.calculate(
        INVENTORY_METHOD.DOUBLE_BLIND,
        input({
          counts: [count('karim', 40), count('yacine', 37)],
          arbitratedQty: d(38),
        }),
      );

      expect(result.status).toBe(ItemStatus.CONFIRMED);
      expect(result.finalQty?.toString()).toBe('38');
      expect(result.blocksClosure).toBe(false);
    });

    it('prime également en Méthode 1', () => {
      const result = service.calculate(
        INVENTORY_METHOD.SUM,
        input({ counts: [count('karim', 12)], arbitratedQty: d(20) }),
      );

      expect(result.finalQty?.toString()).toBe('20');
    });

    it('permet d’arbitrer à zéro', () => {
      // Distinguer « arbitré à 0 » de « pas d'arbitrage » : un simple test de
      // véracité confondrait les deux.
      const result = service.calculate(
        INVENTORY_METHOD.DOUBLE_BLIND,
        input({ counts: [count('karim', 40), count('yacine', 37)], arbitratedQty: d(0) }),
      );

      expect(result.status).toBe(ItemStatus.CONFIRMED);
      expect(result.finalQty?.toString()).toBe('0');
    });
  });

  // ==========================================================================
  describe('article déclaré introuvable', () => {
    it('est marqué NOT_FOUND sans quantité tant que la campagne est ouverte', () => {
      const result = service.calculate(INVENTORY_METHOD.SUM, input({ markedNotFound: true }));

      expect(result.status).toBe(ItemStatus.NOT_FOUND);
      expect(result.finalQty).toBeNull();
      expect(result.blocksClosure).toBe(false);
    });

    it('cède devant un comptage effectif', () => {
      // Un opérateur déclare l'article introuvable, un autre le trouve :
      // l'observation positive et datée l'emporte.
      const result = service.calculate(
        INVENTORY_METHOD.SUM,
        input({ markedNotFound: true, counts: [count('yacine', 5)] }),
      );

      expect(result.status).toBe(ItemStatus.COUNTED);
      expect(result.finalQty?.toString()).toBe('5');
    });
  });

  // ==========================================================================
  describe('calcul des écarts', () => {
    it('qualifie un surplus', () => {
      const result = service.calculate(
        INVENTORY_METHOD.SUM,
        input({ theoreticalQty: d(30), counts: [count('karim', 35)] }),
      );

      expect(result.variance?.toString()).toBe('5');
      expect(result.absoluteDifference?.toString()).toBe('5');
      expect(result.varianceRate).toBeCloseTo(0.1667, 4);
    });

    it('qualifie un manque', () => {
      const result = service.calculate(
        INVENTORY_METHOD.SUM,
        input({ theoreticalQty: d(30), counts: [count('karim', 25)] }),
      );

      expect(result.variance?.toString()).toBe('-5');
      expect(result.absoluteDifference?.toString()).toBe('5');
      expect(result.varianceRate).toBeCloseTo(-0.1667, 4);
    });

    it('valorise l’écart au Pmp figé sur la ligne', () => {
      const result = service.calculate(
        INVENTORY_METHOD.SUM,
        input({
          theoreticalQty: d(2),
          unitPrice: d('5689.2846'),
          counts: [count('karim', 1)],
        }),
      );

      expect(result.variance?.toString()).toBe('-1');
      expect(result.varianceValue?.toString()).toBe('-5689.2846');
    });

    it('ne calcule pas de taux sur une quantité théorique nulle', () => {
      // 3 778 lignes du fichier client sont à 0 : un taux y serait une
      // variation infinie, dénuée de sens.
      const result = service.calculate(
        INVENTORY_METHOD.SUM,
        input({ theoreticalQty: d(0), counts: [count('karim', 7)] }),
      );

      expect(result.variance?.toString()).toBe('7');
      expect(result.varianceRate).toBeNull();
    });

    it('n’expose aucun écart tant que la ligne n’est pas résolue', () => {
      const result = service.calculate(
        INVENTORY_METHOD.DOUBLE_BLIND,
        input({ counts: [count('karim', 40), count('yacine', 37)] }),
      );

      expect(result.variance).toBeNull();
      expect(result.varianceValue).toBeNull();
    });
  });

  // ==========================================================================
  describe('calcul à la clôture', () => {
    it('met à 0 une ligne jamais comptée', () => {
      const result = service.calculateAtClosure(
        INVENTORY_METHOD.SUM,
        input({ theoreticalQty: d(30) }),
      );

      expect(result.status).toBe(ItemStatus.NOT_FOUND);
      expect(result.finalQty?.toString()).toBe('0');
      expect(result.variance?.toString()).toBe('-30');
    });

    it('met à 0 une ligne déclarée introuvable', () => {
      const result = service.calculateAtClosure(
        INVENTORY_METHOD.SUM,
        input({ theoreticalQty: d(12), markedNotFound: true }),
      );

      expect(result.finalQty?.toString()).toBe('0');
      expect(result.variance?.toString()).toBe('-12');
    });

    it('valorise la perte des articles non trouvés', () => {
      const result = service.calculateAtClosure(
        INVENTORY_METHOD.SUM,
        input({ theoreticalQty: d(2), unitPrice: d('5689.2846') }),
      );

      expect(result.varianceValue?.toString()).toBe('-11378.5692');
    });

    it('ne touche pas aux lignes effectivement comptées', () => {
      const result = service.calculateAtClosure(
        INVENTORY_METHOD.SUM,
        input({ theoreticalQty: d(30), counts: [count('karim', 28)] }),
      );

      expect(result.status).toBe(ItemStatus.COUNTED);
      expect(result.finalQty?.toString()).toBe('28');
    });

    it('laisse un litige bloquant : la clôture doit être refusée en amont', () => {
      const result = service.calculateAtClosure(
        INVENTORY_METHOD.DOUBLE_BLIND,
        input({ counts: [count('karim', 40), count('yacine', 37)] }),
      );

      expect(result.status).toBe(ItemStatus.DISCREPANCY);
      expect(result.finalQty).toBeNull();
      expect(result.blocksClosure).toBe(true);
    });
  });

  // ==========================================================================
  describe('extensibilité', () => {
    it('expose les méthodes implémentées', () => {
      expect(service.supportedMethods().sort()).toEqual(
        [INVENTORY_METHOD.SUM, INVENTORY_METHOD.DOUBLE_BLIND, INVENTORY_METHOD.PROGRESSIVE].sort(),
      );
    });

    it('échoue bruyamment sur une méthode inconnue', () => {
      // Produire un résultat par défaut fausserait silencieusement un
      // inventaire : mieux vaut une erreur explicite.
      expect(() => service.calculate('METHOD_INCONNUE', input())).toThrow(
        InternalServerErrorException,
      );
    });
  });
});
