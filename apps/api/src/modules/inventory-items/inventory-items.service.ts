import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CampaignStatus, CountStatus, ItemStatus, Prisma, Role } from '@prisma/client';

import {
  DEFAULT_UNIT,
  UNLOCATED_LOCATION_CODE,
  UNLOCATED_LOCATION_LABEL,
} from '../../common/constants/inventory.constants';
import { paginate, type PaginatedDto } from '../../common/dto/paginated-response.dto';
import { InventoryCalculationService } from '../../common/inventory-calculation/inventory-calculation.service';
import type { AuthenticatedUser, ClientContext } from '../../common/types/authenticated-user';
import { normalizeLocationCode, parseLocationCode } from '../../common/utils/location-code';
import { PrismaService } from '../../prisma/prisma.service';
import { ACTIVITY_ACTION, ActivityLogsService } from '../activity-logs/activity-logs.service';

import {
  decimalToNumber,
  type AddListItemDto,
  type ArbitrateItemDto,
  type InventoryItemDto,
  type ItemFilter,
  type ListItemsQueryDto,
  type MarkNotFoundDto,
} from './dto/inventory-item.dto';

/**
 * Tri par défaut : l'emplacement d'abord, dans l'ordre physique de parcours de
 * l'entrepôt, puis la désignation. Les emplacements non structurés suivent, et
 * l'emplacement virtuel NON-LOCALISE ferme la marche — inutile d'envoyer le
 * magasinier chercher au hasard avant d'avoir fini les allées.
 */
const PHYSICAL_ITEM_ORDER: Prisma.InventoryItemOrderByWithRelationInput[] = [
  { location: { isVirtual: 'asc' } },
  { location: { aisle: { sort: 'asc', nulls: 'last' } } },
  { location: { bay: { sort: 'asc', nulls: 'last' } } },
  { location: { level: { sort: 'asc', nulls: 'last' } } },
  { location: { slot: { sort: 'asc', nulls: 'last' } } },
  { location: { code: 'asc' } },
  { article: { designation: 'asc' } },
];

const ITEM_INCLUDE = {
  article: {
    select: {
      id: true,
      code: true,
      designation: true,
      unit: true,
      brand: true,
      manufacturerRef: true,
    },
  },
  location: { select: { id: true, code: true, label: true, isVirtual: true } },
} satisfies Prisma.InventoryItemInclude;

@Injectable()
export class InventoryItemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calculation: InventoryCalculationService,
    private readonly activityLogs: ActivityLogsService,
  ) {}

  // ==========================================================================
  // Lecture
  // ==========================================================================

  async findByList(
    actor: AuthenticatedUser,
    listId: string,
    query: ListItemsQueryDto,
  ): Promise<PaginatedDto<InventoryItemDto>> {
    await this.assertListAccessible(actor, listId);

    const where: Prisma.InventoryItemWhereInput = {
      listId,
      ...(query.hideZeroTheoretical ? { theoreticalQty: { gt: 0 } } : {}),
      ...(query.location === undefined ? {} : { location: { code: query.location } }),
      ...(query.q ? InventoryItemsService.searchFilter(query.q) : {}),
      ...InventoryItemsService.statusFilter(query.filter, actor.id),
    };

    const orderBy = InventoryItemsService.orderBy(query);

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.inventoryItem.count({ where }),
      this.prisma.inventoryItem.findMany({
        where,
        orderBy,
        skip: query.skip,
        take: query.limit,
        include: {
          ...ITEM_INCLUDE,
          counts: {
            where: { status: CountStatus.VALID },
            select: { userId: true, quantity: true, countedAt: true },
            orderBy: { countedAt: 'desc' },
          },
        },
      }),
    ]);

    const withValuation = InventoryItemsService.canSeeValuation(actor);
    const isAgent = InventoryItemsService.isAgent(actor);

    return paginate(
      rows.map((row) => InventoryItemsService.toDto(row, actor.id, withValuation, isAgent)),
      total,
      query.page,
      query.limit,
    );
  }

  async findOne(actor: AuthenticatedUser, id: string): Promise<InventoryItemDto> {
    const item = await this.prisma.inventoryItem.findUnique({
      where: { id },
      include: {
        ...ITEM_INCLUDE,
        counts: {
          where: { status: CountStatus.VALID },
          select: { userId: true, quantity: true, countedAt: true },
          orderBy: { countedAt: 'desc' },
        },
      },
    });

    if (!item) throw new NotFoundException('Ligne d’inventaire introuvable.');
    await this.assertListAccessible(actor, item.listId);

    return InventoryItemsService.toDto(
      item,
      actor.id,
      InventoryItemsService.canSeeValuation(actor),
      InventoryItemsService.isAgent(actor),
    );
  }

  // ==========================================================================
  // Écriture
  // ==========================================================================

  /**
   * Ajoute une ligne absente du fichier importé.
   *
   * Cas relevé en recette : l'opérateur trouve en rayon un article qui ne
   * figure pas dans l'extraction SAP. Sans ce point d'entrée, la seule issue
   * était de ne pas le compter — l'inventaire passait alors à côté d'un stock
   * bien réel.
   *
   * Trois partis pris :
   *
   * — **La quantité théorique vaut 0, toujours.** L'article est absent de
   *   l'ERP : tout ce qui sera compté est un surplus, et c'est exactement ce
   *   que le gestionnaire doit voir pour décider de le créer dans SAP.
   *
   * — **L'article et l'emplacement sont créés s'ils manquent**, comme à
   *   l'import. Exiger qu'un administrateur crée d'abord la fiche bloquerait
   *   l'opérateur en rayon pour un gain nul.
   *
   * — **Aucun comptage n'est enregistré ici.** La ligne est créée vide puis
   *   comptée par le circuit normal : la saisie passe ainsi par les mêmes
   *   règles de méthode et le même verrou de double comptage que les autres.
   */
  async addItem(
    actor: AuthenticatedUser,
    listId: string,
    dto: AddListItemDto,
    context: ClientContext,
  ): Promise<InventoryItemDto> {
    await this.assertListAccessible(actor, listId);

    const list = await this.prisma.inventoryList.findUniqueOrThrow({
      where: { id: listId },
      select: { id: true, campaign: { select: { status: true, warehouseId: true } } },
    });

    const campaignStatus = list.campaign.status;

    if (campaignStatus === CampaignStatus.CLOSED) {
      throw new ConflictException(
        'Cette campagne est clôturée : aucune ligne ne peut plus y être ajoutée.',
      );
    }

    if (campaignStatus === CampaignStatus.DRAFT) {
      throw new ConflictException("Cette campagne n'est pas encore ouverte au comptage.");
    }

    const articleCode = dto.articleCode.trim().toUpperCase();

    if (articleCode.length === 0) {
      throw new BadRequestException('Le code article est obligatoire.');
    }

    const warehouseId = list.campaign.warehouseId;

    const created = await this.prisma.$transaction(async (tx) => {
      const article = await InventoryItemsService.resolveArticle(tx, articleCode, dto);
      const location = await InventoryItemsService.resolveLocation(tx, warehouseId, dto.locationCode);

      const existing = await tx.inventoryItem.findUnique({
        where: {
          listId_articleId_locationId: { listId, articleId: article.id, locationId: location.id },
        },
        select: { id: true },
      });

      if (existing) {
        // L'article est déjà dans la liste : il faut compter la ligne existante,
        // pas en créer un doublon qui fausserait le décompte d'avancement.
        throw new ConflictException(
          `L’article ${articleCode} figure déjà dans cette liste à l’emplacement ${location.code}. Comptez la ligne existante.`,
        );
      }

      // Les lignes ajoutées se placent après celles du fichier : la
      // numérotation d'origine reste intacte et l'on distingue d'un coup d'œil
      // ce qui vient de SAP de ce qui vient du terrain.
      const last = await tx.inventoryItem.aggregate({
        where: { listId },
        _max: { lineNo: true },
      });

      return tx.inventoryItem.create({
        data: {
          listId,
          articleId: article.id,
          locationId: location.id,
          lineNo: (last._max.lineNo ?? 0) + 1,
          theoreticalQty: new Prisma.Decimal(0),
          // Pmp de la fiche article s'il est connu : l'écart reste valorisé.
          unitPrice: article.lastPmp ?? new Prisma.Decimal(0),
          isManual: true,
          addedById: actor.id,
          addedAt: new Date(),
        },
        select: { id: true },
      });
    });

    await this.activityLogs.record({
      actorId: actor.id,
      action: ACTIVITY_ACTION.ITEM_ADD_MANUAL,
      entityType: 'InventoryItem',
      entityId: created.id,
      metadata: {
        listId,
        articleCode,
        ...(dto.locationCode === undefined ? {} : { locationCode: dto.locationCode }),
        ...(dto.note === undefined ? {} : { note: dto.note }),
      },
      context,
    });

    return this.findOne(actor, created.id);
  }

  /** Article du référentiel, créé au passage s'il est inconnu. */
  private static async resolveArticle(
    tx: Prisma.TransactionClient,
    code: string,
    dto: AddListItemDto,
  ): Promise<{ id: string; lastPmp: Prisma.Decimal | null }> {
    const existing = await tx.article.findUnique({
      where: { code },
      select: { id: true, lastPmp: true },
    });

    if (existing) return existing;

    const designation = dto.designation?.trim();

    if (!designation) {
      throw new BadRequestException(
        `L’article ${code} est inconnu du référentiel : sa désignation est obligatoire pour le créer.`,
      );
    }

    return tx.article.create({
      data: { code, designation, unit: dto.unit?.trim() || DEFAULT_UNIT },
      select: { id: true, lastPmp: true },
    });
  }

  /**
   * Emplacement du magasin, créé s'il est inconnu. Sans code fourni, la ligne
   * rejoint l'emplacement virtuel NON-LOCALISE — le même que celui utilisé à
   * l'import pour les lignes sans emplacement renseigné.
   */
  private static async resolveLocation(
    tx: Prisma.TransactionClient,
    warehouseId: string,
    rawCode: string | undefined,
  ): Promise<{ id: string; code: string }> {
    const code = rawCode?.trim().toUpperCase();

    if (!code) {
      return tx.location.upsert({
        where: { warehouseId_code: { warehouseId, code: UNLOCATED_LOCATION_CODE } },
        update: {},
        create: {
          warehouseId,
          code: UNLOCATED_LOCATION_CODE,
          label: UNLOCATED_LOCATION_LABEL,
          normalizedCode: normalizeLocationCode(UNLOCATED_LOCATION_CODE),
          isVirtual: true,
        },
        select: { id: true, code: true },
      });
    }

    return tx.location.upsert({
      where: { warehouseId_code: { warehouseId, code } },
      update: {},
      create: {
        warehouseId,
        code,
        normalizedCode: normalizeLocationCode(code),
        ...parseLocationCode(code),
      },
      select: { id: true, code: true },
    });
  }

  /** L'opérateur déclare n'avoir pas trouvé l'article à son emplacement. */
  async markNotFound(
    actor: AuthenticatedUser,
    id: string,
    dto: MarkNotFoundDto,
    context: ClientContext,
  ): Promise<InventoryItemDto> {
    const item = await this.getWritableOrThrow(actor, id);

    await this.prisma.inventoryItem.update({
      where: { id: item.id },
      data: { notFoundAt: new Date(), notFoundById: actor.id },
    });

    await this.recalculate(id);

    await this.activityLogs.record({
      actorId: actor.id,
      action: ACTIVITY_ACTION.ITEM_MARK_NOT_FOUND,
      entityType: 'InventoryItem',
      entityId: id,
      metadata: { ...(dto.note === undefined ? {} : { note: dto.note }) },
      context,
    });

    return this.findOne(actor, id);
  }

  /** Annule une déclaration « introuvable ». */
  async clearNotFound(actor: AuthenticatedUser, id: string): Promise<InventoryItemDto> {
    const item = await this.getWritableOrThrow(actor, id);

    await this.prisma.inventoryItem.update({
      where: { id: item.id },
      data: { notFoundAt: null, notFoundById: null },
    });

    await this.recalculate(id);
    return this.findOne(actor, id);
  }

  /**
   * Arbitrage du superviseur : tranche un litige de Méthode 2.
   *
   * La valeur saisie prime sur tous les comptages — c'est sa raison d'être. Le
   * motif est obligatoire, car cette décision engage le résultat de l'inventaire.
   */
  async arbitrate(
    actor: AuthenticatedUser,
    id: string,
    dto: ArbitrateItemDto,
    context: ClientContext,
  ): Promise<InventoryItemDto> {
    const item = await this.getWritableOrThrow(actor, id);

    await this.prisma.inventoryItem.update({
      where: { id: item.id },
      data: {
        arbitratedQty: new Prisma.Decimal(dto.quantity),
        arbitratedById: actor.id,
        arbitratedAt: new Date(),
        arbitrationNote: dto.note,
      },
    });

    await this.recalculate(id);

    await this.activityLogs.record({
      actorId: actor.id,
      action: ACTIVITY_ACTION.ITEM_ARBITRATE,
      entityType: 'InventoryItem',
      entityId: id,
      metadata: { quantity: dto.quantity, note: dto.note },
      context,
    });

    return this.findOne(actor, id);
  }

  /**
   * Recalcule le statut et la quantité retenue d'une ligne.
   *
   * Appelé après chaque écriture qui influe sur le résultat : comptage,
   * annulation, arbitrage, déclaration « introuvable ». Maintenir ces champs à
   * jour évite de recalculer des milliers de lignes à chaque affichage, et rend
   * le suivi de campagne instantané.
   */
  async recalculate(itemId: string, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? this.prisma;

    const item = await client.inventoryItem.findUnique({
      where: { id: itemId },
      select: {
        id: true,
        theoreticalQty: true,
        unitPrice: true,
        arbitratedQty: true,
        notFoundAt: true,
        counts: {
          select: { id: true, userId: true, quantity: true, countedAt: true, status: true },
        },
        list: { select: { campaign: { select: { inventoryMethod: { select: { code: true } } } } } },
      },
    });

    if (!item) return;

    const result = this.calculation.calculate(item.list.campaign.inventoryMethod.code, {
      theoreticalQty: item.theoreticalQty,
      unitPrice: item.unitPrice,
      arbitratedQty: item.arbitratedQty,
      markedNotFound: item.notFoundAt !== null,
      counts: item.counts,
    });

    await client.inventoryItem.update({
      where: { id: itemId },
      data: { status: result.status, finalQty: result.finalQty },
    });
  }

  // ==========================================================================
  // Internes
  // ==========================================================================

  private static canSeeValuation(actor: AuthenticatedUser): boolean {
    return actor.role === Role.ADMIN || actor.role === Role.SUPERVISOR;
  }

  /**
   * Opérateur de comptage : ne doit voir ni le théorique, ni la quantité
   * retenue, ni l'écart.
   */
  private static isAgent(actor: AuthenticatedUser): boolean {
    return actor.role === Role.USER;
  }

  /** Recherche sur les cinq critères utilisés sur le terrain. */
  private static searchFilter(term: string): Prisma.InventoryItemWhereInput {
    const contains = { contains: term, mode: Prisma.QueryMode.insensitive } as const;

    return {
      OR: [
        { article: { code: contains } },
        { article: { designation: contains } },
        { article: { brand: contains } },
        { article: { manufacturerRef: contains } },
        { location: { normalizedCode: contains } },
      ],
    };
  }

  /**
   * Les filtres sont relatifs à l'utilisateur : en double comptage, une ligne
   * déjà traitée par un collègue reste à compter pour moi.
   */
  private static statusFilter(filter: ItemFilter, userId: string): Prisma.InventoryItemWhereInput {
    const countedByMe: Prisma.InventoryItemWhereInput = {
      counts: { some: { userId, status: CountStatus.VALID } },
    };

    switch (filter) {
      case 'remaining':
        return { NOT: countedByMe, notFoundAt: null };
      case 'counted':
        return countedByMe;
      case 'not_found':
        return { status: ItemStatus.NOT_FOUND };
      case 'discrepancy':
        // Tout ce qui empêche la clôture : comptage supplémentaire attendu,
        // litige de Méthode 2 ou enquête de Méthode 3.
        return {
          status: {
            in: [
              ItemStatus.DISCREPANCY,
              ItemStatus.AWAITING_SECOND_COUNT,
              ItemStatus.AWAITING_THIRD_COUNT,
              ItemStatus.UNDER_INVESTIGATION,
            ],
          },
        };
      case 'investigation':
        // Réservé au superviseur : les lignes qu'aucun comptage ne départagera.
        return { status: ItemStatus.UNDER_INVESTIGATION };
      case 'manual':
        return { isManual: true };
      case 'all':
      default:
        return {};
    }
  }

  private static orderBy(query: ListItemsQueryDto): Prisma.InventoryItemOrderByWithRelationInput[] {
    switch (query.sortBy) {
      case 'designation':
        return [{ article: { designation: query.sortOrder } }, ...PHYSICAL_ITEM_ORDER];
      case 'code':
        return [{ article: { code: query.sortOrder } }];
      case 'lineNo':
        return [{ lineNo: query.sortOrder }];
      case 'location':
      default:
        return PHYSICAL_ITEM_ORDER;
    }
  }

  /**
   * Rang du prochain comptage attendu, déduit du statut persisté.
   *
   * Dériver du statut plutôt que de rejouer le calcul évite de recharger les
   * comptages de chaque ligne pour afficher une page de 200 : le statut est
   * déjà maintenu à jour par `recalculate`, et la correspondance est exacte.
   */
  private static expectedCountNumber(status: ItemStatus): number | null {
    switch (status) {
      case ItemStatus.PENDING:
        return 1;
      case ItemStatus.AWAITING_SECOND_COUNT:
        return 2;
      case ItemStatus.AWAITING_THIRD_COUNT:
        return 3;
      default:
        return null;
    }
  }

  private static toDto(
    item: Prisma.InventoryItemGetPayload<{ include: typeof ITEM_INCLUDE }> & {
      counts: { userId: string; quantity: Prisma.Decimal; countedAt: Date }[];
    },
    currentUserId: string,
    withValuation: boolean,
    isAgent: boolean,
  ): InventoryItemDto {
    const myCounts = item.counts.filter((count) => count.userId === currentUserId);
    const finalQty = decimalToNumber(item.finalQty);
    const theoreticalQty = decimalToNumber(item.theoreticalQty) ?? 0;
    const variance = finalQty === null ? null : finalQty - theoreticalQty;

    return {
      id: item.id,
      listId: item.listId,
      article: item.article,
      location: item.location,
      // Masquage côté serveur, et non côté client : un opérateur qui connaît le
      // théorique avant de compter tend à le confirmer plutôt qu'à compter.
      // Retirer la valeur de la réponse est la seule garantie qui tienne — elle
      // ne transite pas, ne s'enregistre pas sur le terminal, et ne peut pas
      // ressortir d'un écran oublié.
      theoreticalQty: isAgent ? null : theoreticalQty,
      finalQty: isAgent ? null : finalQty,
      arbitratedQty: isAgent ? null : decimalToNumber(item.arbitratedQty),
      status: item.status,
      variance: isAgent ? null : variance,
      ...(withValuation
        ? {
            unitPrice: decimalToNumber(item.unitPrice) ?? 0,
            varianceValue:
              variance === null ? null : variance * (decimalToNumber(item.unitPrice) ?? 0),
          }
        : {}),
      countCount: item.counts.length,
      countedByMe: myCounts.length > 0,
      // Les comptages sont triés du plus récent au plus ancien. Sa propre
      // saisie reste visible à l'opérateur : c'est la sienne, et elle lui sert
      // à vérifier ce qu'il a envoyé.
      myLastQuantity: myCounts[0] ? decimalToNumber(myCounts[0].quantity) : null,
      lineNo: item.lineNo,
      isManual: item.isManual,
      expectedCountNumber: InventoryItemsService.expectedCountNumber(item.status),
    };
  }

  /** Un opérateur n'accède qu'aux listes qui lui sont attribuées. */
  private async assertListAccessible(actor: AuthenticatedUser, listId: string): Promise<void> {
    if (actor.role === Role.ADMIN || actor.role === Role.SUPERVISOR) {
      const exists = await this.prisma.inventoryList.count({ where: { id: listId } });
      if (exists === 0) throw new NotFoundException('Liste introuvable.');
      return;
    }

    const assigned = await this.prisma.inventoryList.count({
      where: { id: listId, assignments: { some: { userId: actor.id } } },
    });

    // 404 et non 403 : l'existence d'une liste non attribuée n'a pas à être
    // révélée à l'opérateur.
    if (assigned === 0) throw new NotFoundException('Liste introuvable.');
  }

  private async getWritableOrThrow(
    actor: AuthenticatedUser,
    id: string,
  ): Promise<{ id: string; listId: string }> {
    const item = await this.prisma.inventoryItem.findUnique({
      where: { id },
      select: {
        id: true,
        listId: true,
        list: { select: { campaign: { select: { status: true } } } },
      },
    });

    if (!item) throw new NotFoundException('Ligne d’inventaire introuvable.');
    await this.assertListAccessible(actor, item.listId);

    const status = item.list.campaign.status;

    if (status === CampaignStatus.CLOSED) {
      throw new ConflictException(
        'Cette campagne est clôturée : plus aucune modification n’est possible.',
      );
    }

    if (status === CampaignStatus.DRAFT) {
      throw new ConflictException("Cette campagne n'est pas encore ouverte au comptage.");
    }

    return { id: item.id, listId: item.listId };
  }
}
