import { Prisma, type PrismaClient } from '@prisma/client';

import {
  CAMPAIGN_TYPE,
  INVENTORY_METHOD,
  UNLOCATED_LOCATION_CODE,
} from '../../src/common/constants/inventory.constants';
import { normalizeLocationCode, parseLocationCode } from '../../src/common/utils/location-code';

export interface SeededItem {
  id: string;
  articleCode: string;
  locationCode: string;
  theoreticalQty: number;
}

export interface SeededCampaign {
  campaignId: string;
  listId: string;
  warehouseId: string;
  methodId: string;
  items: SeededItem[];
  itemByCode: (code: string) => SeededItem;
}

export interface ItemSpec {
  articleCode: string;
  designation?: string;
  locationCode?: string;
  theoreticalQty: number;
  unitPrice?: number;
}

/**
 * Monte une campagne complète directement en base.
 *
 * Passer par l'API supposerait l'import de fichiers, qui relève d'une étape
 * ultérieure ; les tests du cœur métier doivent pouvoir s'exécuter sans lui.
 */
export async function seedCampaign(
  prisma: PrismaClient,
  options: {
    methodCode?: string;
    code?: string;
    items: ItemSpec[];
  },
): Promise<SeededCampaign> {
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  const methodCode = options.methodCode ?? INVENTORY_METHOD.SUM;

  const warehouse = await prisma.warehouse.create({
    data: { code: `MAG-${suffix}`, label: 'Magasin de test' },
  });

  await prisma.location.create({
    data: {
      warehouseId: warehouse.id,
      code: UNLOCATED_LOCATION_CODE,
      normalizedCode: UNLOCATED_LOCATION_CODE,
      isVirtual: true,
    },
  });

  const campaignType = await prisma.campaignType.upsert({
    where: { code: CAMPAIGN_TYPE.SPARE_PARTS },
    update: {},
    create: { code: CAMPAIGN_TYPE.SPARE_PARTS, label: 'Pièces de rechange (PDR)' },
  });

  const method = await prisma.inventoryMethod.upsert({
    where: { code: methodCode },
    update: {},
    create: { code: methodCode, label: methodCode, config: {} },
  });

  const campaign = await prisma.campaign.create({
    data: {
      code: options.code ?? `INV-${suffix}`,
      name: 'Campagne de test',
      campaignTypeId: campaignType.id,
      inventoryMethodId: method.id,
      warehouseId: warehouse.id,
      round: 1,
    },
  });

  const list = await prisma.inventoryList.create({
    data: { campaignId: campaign.id, code: 'ZONE-A', name: 'Zone A' },
  });

  const items: SeededItem[] = [];

  for (const [index, spec] of options.items.entries()) {
    const article = await prisma.article.upsert({
      where: { code: spec.articleCode },
      update: {},
      create: {
        code: spec.articleCode,
        designation: spec.designation ?? `Article ${spec.articleCode}`,
      },
    });

    const locationCode = spec.locationCode ?? UNLOCATED_LOCATION_CODE;
    const location = await prisma.location.upsert({
      where: { warehouseId_code: { warehouseId: warehouse.id, code: locationCode } },
      update: {},
      create: {
        warehouseId: warehouse.id,
        code: locationCode,
        normalizedCode: normalizeLocationCode(locationCode),
        ...parseLocationCode(locationCode),
      },
    });

    const item = await prisma.inventoryItem.create({
      data: {
        listId: list.id,
        articleId: article.id,
        locationId: location.id,
        lineNo: index + 1,
        theoreticalQty: new Prisma.Decimal(spec.theoreticalQty),
        unitPrice: new Prisma.Decimal(spec.unitPrice ?? 0),
      },
    });

    items.push({
      id: item.id,
      articleCode: spec.articleCode,
      locationCode,
      theoreticalQty: spec.theoreticalQty,
    });
  }

  return {
    campaignId: campaign.id,
    listId: list.id,
    warehouseId: warehouse.id,
    methodId: method.id,
    items,
    itemByCode: (code: string) => {
      const found = items.find((item) => item.articleCode === code);
      if (!found) throw new Error(`Article ${code} absent de la campagne de test.`);
      return found;
    },
  };
}

/** UUID v4 pour les clés d'idempotence des comptages. */
export const newClientUuid = (): string => crypto.randomUUID();
