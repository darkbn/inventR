import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AssignmentAction,
  AssignmentEntityType,
  CampaignStatus,
  ItemStatus,
  ListStatus,
  Prisma,
  Role,
  type Campaign,
} from '@prisma/client';

import { BULK_CHUNK_SIZE, CLOSURE_WARNING } from '../../common/constants/inventory.constants';
import { paginate, type PaginatedDto } from '../../common/dto/paginated-response.dto';
import { InventoryCalculationService } from '../../common/inventory-calculation/inventory-calculation.service';
import type { ItemCalculationInput } from '../../common/inventory-calculation/inventory-calculation.types';
import type { AuthenticatedUser, ClientContext } from '../../common/types/authenticated-user';
import { PrismaService } from '../../prisma/prisma.service';
import { ACTIVITY_ACTION, ActivityLogsService } from '../activity-logs/activity-logs.service';

import {
  CampaignDto,
  type AssignCampaignUserDto,
  type CloseCampaignDto,
  type ClosureReadinessDto,
  type CreateCampaignDto,
  type DeleteCampaignDto,
  type ListCampaignsQueryDto,
  type NextRoundDto,
  type ReopenCampaignDto,
  type UpdateCampaignDto,
} from './dto/campaign.dto';

/** Statuts dans lesquels la structure de la campagne reste modifiable. */
const EDITABLE_STATUSES: CampaignStatus[] = [CampaignStatus.DRAFT, CampaignStatus.OPEN];

/** Statuts depuis lesquels une clôture est envisageable. */
const CLOSABLE_STATUSES: CampaignStatus[] = [
  CampaignStatus.OPEN,
  CampaignStatus.COUNTING,
  CampaignStatus.PENDING_CLOSURE,
];

/** Ligne telle que chargée pour le calcul. */
interface ItemForCalculation {
  id: string;
  theoreticalQty: Prisma.Decimal;
  unitPrice: Prisma.Decimal;
  arbitratedQty: Prisma.Decimal | null;
  notFoundAt: Date | null;
  counts: {
    id: string;
    userId: string;
    quantity: Prisma.Decimal;
    countedAt: Date;
    status: 'VALID' | 'CANCELLED';
  }[];
}

@Injectable()
export class CampaignsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calculation: InventoryCalculationService,
    private readonly activityLogs: ActivityLogsService,
  ) {}

  // ==========================================================================
  // Lecture
  // ==========================================================================

  async findAll(
    actor: AuthenticatedUser,
    query: ListCampaignsQueryDto,
  ): Promise<PaginatedDto<CampaignDto>> {
    const where: Prisma.CampaignWhereInput = {
      ...(query.status === undefined ? {} : { status: query.status }),
      ...(query.warehouseId === undefined ? {} : { warehouseId: query.warehouseId }),
      ...(query.campaignTypeId === undefined ? {} : { campaignTypeId: query.campaignTypeId }),
      ...(query.q
        ? {
            OR: [
              { code: { contains: query.q, mode: Prisma.QueryMode.insensitive } },
              { name: { contains: query.q, mode: Prisma.QueryMode.insensitive } },
            ],
          }
        : {}),
      ...CampaignsService.visibilityFilter(actor),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.campaign.count({ where }),
      this.prisma.campaign.findMany({
        where,
        orderBy: { [query.sortBy]: query.sortOrder },
        skip: query.skip,
        take: query.limit,
      }),
    ]);

    return paginate(
      rows.map((row) => CampaignDto.from(row)),
      total,
      query.page,
      query.limit,
    );
  }

  async findOne(actor: AuthenticatedUser, id: string): Promise<CampaignDto> {
    return CampaignDto.from(await this.getVisibleOrThrow(actor, id));
  }

  // ==========================================================================
  // Cycle de vie
  // ==========================================================================

  async create(actor: AuthenticatedUser, dto: CreateCampaignDto): Promise<CampaignDto> {
    await this.assertCodeAvailable(dto.code);
    await this.assertReferencesExist(dto);

    const campaign = await this.prisma.campaign.create({
      data: {
        code: dto.code,
        name: dto.name,
        campaignTypeId: dto.campaignTypeId,
        inventoryMethodId: dto.inventoryMethodId,
        warehouseId: dto.warehouseId,
        status: CampaignStatus.DRAFT,
        round: 1,
        createdById: actor.id,
        updatedById: actor.id,
      },
    });

    return CampaignDto.from(campaign);
  }

  async update(actor: AuthenticatedUser, id: string, dto: UpdateCampaignDto): Promise<CampaignDto> {
    const campaign = await this.getVisibleOrThrow(actor, id);
    CampaignsService.assertEditable(campaign);

    // Changer la méthode après le premier comptage réinterpréterait des saisies
    // déjà réalisées : une somme deviendrait un double comptage, ou l'inverse.
    if (
      dto.inventoryMethodId !== undefined &&
      dto.inventoryMethodId !== campaign.inventoryMethodId
    ) {
      await this.assertNoCountsYet(id);
      await this.assertMethodExists(dto.inventoryMethodId);
    }

    if (dto.campaignTypeId !== undefined) {
      await this.assertTypeExists(dto.campaignTypeId);
    }

    const updated = await this.prisma.campaign.update({
      where: { id },
      data: {
        ...(dto.name === undefined ? {} : { name: dto.name }),
        ...(dto.campaignTypeId === undefined ? {} : { campaignTypeId: dto.campaignTypeId }),
        ...(dto.inventoryMethodId === undefined
          ? {}
          : { inventoryMethodId: dto.inventoryMethodId }),
        updatedById: actor.id,
      },
    });

    return CampaignDto.from(updated);
  }

  /** Ouvre la campagne au comptage. Les listes deviennent visibles des opérateurs. */
  async open(actor: AuthenticatedUser, id: string): Promise<CampaignDto> {
    const campaign = await this.getVisibleOrThrow(actor, id);

    if (campaign.status !== CampaignStatus.DRAFT) {
      throw new ConflictException(
        `Seule une campagne en préparation peut être ouverte (statut actuel : ${campaign.status}).`,
      );
    }

    const itemCount = await this.prisma.inventoryItem.count({
      where: { list: { campaignId: id } },
    });

    if (itemCount === 0) {
      throw new ConflictException(
        "Cette campagne ne comporte aucune ligne d'inventaire. Importez un fichier avant de l'ouvrir.",
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.inventoryList.updateMany({
        where: { campaignId: id, status: ListStatus.DRAFT },
        data: { status: ListStatus.ACTIVE },
      });

      return tx.campaign.update({
        where: { id },
        data: { status: CampaignStatus.OPEN, startedAt: new Date(), updatedById: actor.id },
      });
    });

    return CampaignDto.from(updated);
  }

  /**
   * Bilan avant clôture : combien de lignes passeront à 0, et qu'est-ce qui
   * bloque encore. Appelé par l'interface pour composer l'écran de confirmation.
   */
  async closureReadiness(actor: AuthenticatedUser, id: string): Promise<ClosureReadinessDto> {
    const campaign = await this.getVisibleOrThrow(actor, id);
    const methodCode = await this.methodCodeOf(campaign);
    const items = await this.loadItemsForCalculation(id);

    const tally = {
      pending: 0,
      notFound: 0,
      awaiting: 0,
      discrepancy: 0,
      resolved: 0,
    };

    for (const item of items) {
      const { status } = this.calculation.calculate(methodCode, CampaignsService.toInput(item));

      if (status === ItemStatus.PENDING) tally.pending += 1;
      else if (status === ItemStatus.NOT_FOUND) tally.notFound += 1;
      else if (status === ItemStatus.AWAITING_SECOND_COUNT) tally.awaiting += 1;
      else if (status === ItemStatus.DISCREPANCY) tally.discrepancy += 1;
      else tally.resolved += 1;
    }

    const blockingReasons: string[] = [];

    if (!CLOSABLE_STATUSES.includes(campaign.status)) {
      blockingReasons.push(`Le statut « ${campaign.status} » ne permet pas la clôture.`);
    }
    if (items.length === 0) {
      blockingReasons.push("La campagne ne comporte aucune ligne d'inventaire.");
    }
    if (tally.awaiting > 0) {
      blockingReasons.push(`${tally.awaiting} ligne(s) attendent un second comptage (Méthode 2).`);
    }
    if (tally.discrepancy > 0) {
      blockingReasons.push(
        `${tally.discrepancy} litige(s) non tranché(s) : arbitrez-les ou faites réaliser un troisième comptage.`,
      );
    }

    return {
      canClose: blockingReasons.length === 0,
      totalItems: items.length,
      pendingItems: tally.pending,
      notFoundItems: tally.notFound,
      awaitingSecondCount: tally.awaiting,
      discrepancies: tally.discrepancy,
      resolvedItems: tally.resolved,
      blockingReasons,
      warning: CLOSURE_WARNING,
    };
  }

  /**
   * Clôture la campagne.
   *
   * Tout se joue dans une seule transaction : calcul des quantités finales,
   * mise à zéro des articles non trouvés, passage au statut CLOSED et écriture
   * du journal. Une clôture partielle laisserait un inventaire à moitié figé,
   * impossible à interpréter.
   */
  async close(
    actor: AuthenticatedUser,
    id: string,
    dto: CloseCampaignDto,
    context: ClientContext,
  ): Promise<CampaignDto> {
    const campaign = await this.getVisibleOrThrow(actor, id);

    if (campaign.status === CampaignStatus.CLOSED) {
      throw new ConflictException('Cette campagne est déjà clôturée.');
    }

    if (!dto.confirmZeroMissing) {
      throw new BadRequestException(CLOSURE_WARNING);
    }

    const readiness = await this.closureReadiness(actor, id);
    if (!readiness.canClose) {
      throw new ConflictException({
        message: 'La campagne ne peut pas être clôturée en l’état.',
        code: 'CLOSURE_BLOCKED',
        details: readiness.blockingReasons,
      });
    }

    const methodCode = await this.methodCodeOf(campaign);
    const items = await this.loadItemsForCalculation(id);

    // Le calcul est fait hors transaction : il est purement en mémoire, et le
    // sortir de là réduit d'autant la durée du verrou sur ~8 000 lignes.
    const resolved = items.map((item) => {
      const result = this.calculation.calculateAtClosure(
        methodCode,
        CampaignsService.toInput(item),
      );
      return {
        id: item.id,
        finalQty: result.finalQty ?? new Prisma.Decimal(0),
        status: result.status,
      };
    });

    const zeroed = resolved.filter((item) => item.status === ItemStatus.NOT_FOUND).length;
    const closedAt = new Date();

    const updated = await this.prisma.$transaction(
      async (tx) => {
        await CampaignsService.applyFinalQuantities(tx, resolved);

        await tx.inventoryList.updateMany({
          where: { campaignId: id },
          data: { status: ListStatus.COMPLETED },
        });

        const closed = await tx.campaign.update({
          where: { id },
          data: {
            status: CampaignStatus.CLOSED,
            closedAt,
            closedById: actor.id,
            missingZeroedAt: closedAt,
            updatedById: actor.id,
          },
        });

        // Journal écrit dans la transaction : une clôture sans trace, ou une
        // trace sans clôture, seraient toutes deux ingérables en audit.
        await this.activityLogs.recordInTransaction(tx, {
          actorId: actor.id,
          action: ACTIVITY_ACTION.CAMPAIGN_CLOSE,
          entityType: 'Campaign',
          entityId: id,
          metadata: {
            totalItems: resolved.length,
            zeroedItems: zeroed,
            method: methodCode,
            ...(dto.note === undefined ? {} : { note: dto.note }),
          },
          context,
        });

        return closed;
      },
      { timeout: 120_000, maxWait: 10_000 },
    );

    return CampaignDto.from(updated);
  }

  /**
   * Réouvre une campagne clôturée. Réservé aux administrateurs, motif
   * obligatoire : la clôture est en principe définitive.
   */
  async reopen(
    actor: AuthenticatedUser,
    id: string,
    dto: ReopenCampaignDto,
    context: ClientContext,
  ): Promise<CampaignDto> {
    if (actor.role !== Role.ADMIN) {
      throw new ForbiddenException('Seul un administrateur peut rouvrir une campagne clôturée.');
    }

    const campaign = await this.getVisibleOrThrow(actor, id);

    if (campaign.status !== CampaignStatus.CLOSED) {
      throw new ConflictException("Cette campagne n'est pas clôturée.");
    }

    const hasChildren = await this.prisma.campaign.count({ where: { parentCampaignId: id } });
    if (hasChildren > 0) {
      throw new ConflictException(
        'Un passage suivant a déjà été créé à partir de cette campagne : la rouvrir rendrait les deux incohérents.',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const reopened = await tx.campaign.update({
        where: { id },
        data: {
          status: CampaignStatus.COUNTING,
          closedAt: null,
          closedById: null,
          missingZeroedAt: null,
          reopenedAt: new Date(),
          reopenedById: actor.id,
          reopenReason: dto.reason,
          updatedById: actor.id,
        },
      });

      await tx.inventoryList.updateMany({
        where: { campaignId: id },
        data: { status: ListStatus.ACTIVE },
      });

      await this.activityLogs.recordInTransaction(tx, {
        actorId: actor.id,
        action: ACTIVITY_ACTION.CAMPAIGN_REOPEN,
        entityType: 'Campaign',
        entityId: id,
        metadata: { reason: dto.reason },
        context,
      });

      return reopened;
    });

    return CampaignDto.from(updated);
  }

  /**
   * Crée le passage suivant à partir des résultats du passage courant.
   *
   * Seules les lignes **en écart**, **non trouvées** ou **litigieuses** sont
   * reprises : recompter l'intégralité du magasin n'aurait aucun intérêt, et
   * le second passage doit rester rapide.
   */
  async nextRound(
    actor: AuthenticatedUser,
    id: string,
    dto: NextRoundDto,
    context: ClientContext,
  ): Promise<CampaignDto> {
    const parent = await this.getVisibleOrThrow(actor, id);

    if (parent.status !== CampaignStatus.CLOSED) {
      throw new ConflictException(
        'Le passage suivant ne peut être créé qu’à partir d’une campagne clôturée.',
      );
    }

    const existingChild = await this.prisma.campaign.findFirst({
      where: { parentCampaignId: id },
      select: { code: true },
    });
    if (existingChild) {
      throw new ConflictException(
        `Un passage suivant existe déjà pour cette campagne : ${existingChild.code}.`,
      );
    }

    const methodId = dto.inventoryMethodId ?? parent.inventoryMethodId;
    if (dto.inventoryMethodId !== undefined) {
      await this.assertMethodExists(dto.inventoryMethodId);
    }

    const code = dto.code ?? `${parent.code}-R${parent.round + 1}`;
    await this.assertCodeAvailable(code);

    // Lignes à recompter : écart non nul, non trouvées, ou jamais résolues.
    const itemsToCarry = await this.prisma.inventoryItem.findMany({
      where: {
        list: { campaignId: id },
        OR: [
          { status: ItemStatus.NOT_FOUND },
          { status: ItemStatus.DISCREPANCY },
          { status: ItemStatus.AWAITING_SECOND_COUNT },
          { NOT: { finalQty: { equals: this.prisma.inventoryItem.fields.theoreticalQty } } },
        ],
      },
      select: {
        articleId: true,
        locationId: true,
        theoreticalQty: true,
        finalQty: true,
        unitPrice: true,
        lineNo: true,
        list: { select: { code: true, name: true, description: true } },
      },
      orderBy: { lineNo: 'asc' },
    });

    if (itemsToCarry.length === 0) {
      throw new ConflictException(
        'Aucun écart à recompter : cette campagne ne justifie pas de second passage.',
      );
    }

    const created = await this.prisma.$transaction(
      async (tx) => {
        const campaign = await tx.campaign.create({
          data: {
            code,
            name: `${parent.name} — passage ${parent.round + 1}`,
            campaignTypeId: parent.campaignTypeId,
            inventoryMethodId: methodId,
            warehouseId: parent.warehouseId,
            status: CampaignStatus.DRAFT,
            round: parent.round + 1,
            parentCampaignId: parent.id,
            createdById: actor.id,
            updatedById: actor.id,
          },
        });

        // Les lignes sont regroupées dans les mêmes listes que le passage
        // précédent, pour que les opérateurs retrouvent leur périmètre.
        const listIdByCode = new Map<string, string>();

        for (const item of itemsToCarry) {
          if (listIdByCode.has(item.list.code)) continue;
          const list = await tx.inventoryList.create({
            data: {
              campaignId: campaign.id,
              code: item.list.code,
              name: item.list.name,
              description: item.list.description,
              status: ListStatus.DRAFT,
              createdById: actor.id,
              updatedById: actor.id,
            },
          });
          listIdByCode.set(item.list.code, list.id);
        }

        await tx.inventoryItem.createMany({
          data: itemsToCarry.map((item, index) => ({
            listId: listIdByCode.get(item.list.code) as string,
            articleId: item.articleId,
            locationId: item.locationId,
            lineNo: index + 1,
            // Par défaut on recompte ce que l'on croit désormais détenir ; sur
            // demande, on repart de la quantité théorique d'origine.
            theoreticalQty: dto.keepOriginalTheoretical
              ? item.theoreticalQty
              : (item.finalQty ?? item.theoreticalQty),
            unitPrice: item.unitPrice,
            status: ItemStatus.PENDING,
          })),
        });

        // Les affectations du passage précédent sont reconduites : la même
        // équipe recompte, c'est le fonctionnement attendu.
        const parentAssignments = await tx.campaignAssignment.findMany({
          where: { campaignId: parent.id },
          select: { userId: true },
        });

        if (parentAssignments.length > 0) {
          await tx.campaignAssignment.createMany({
            data: parentAssignments.map((assignment) => ({
              campaignId: campaign.id,
              userId: assignment.userId,
              assignedById: actor.id,
            })),
          });
        }

        await this.activityLogs.recordInTransaction(tx, {
          actorId: actor.id,
          action: ACTIVITY_ACTION.CAMPAIGN_NEXT_ROUND,
          entityType: 'Campaign',
          entityId: campaign.id,
          metadata: {
            parentCampaignId: parent.id,
            round: campaign.round,
            carriedItems: itemsToCarry.length,
          },
          context,
        });

        return campaign;
      },
      { timeout: 120_000, maxWait: 10_000 },
    );

    return CampaignDto.from(created);
  }

  // ==========================================================================
  // Affectations
  // ==========================================================================

  async assignUser(
    actor: AuthenticatedUser,
    campaignId: string,
    dto: AssignCampaignUserDto,
    context: ClientContext,
  ): Promise<void> {
    const campaign = await this.getVisibleOrThrow(actor, campaignId);
    CampaignsService.assertNotClosed(campaign);

    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { id: true, isActive: true },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable.');
    if (!user.isActive) {
      throw new ConflictException('Impossible d’affecter un compte désactivé.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.campaignAssignment.upsert({
        where: { campaignId_userId: { campaignId, userId: dto.userId } },
        update: {},
        create: { campaignId, userId: dto.userId, assignedById: actor.id },
      });

      // Toute modification d'affectation est historisée — exigence métier.
      await tx.assignmentHistory.create({
        data: {
          entityType: AssignmentEntityType.CAMPAIGN,
          entityId: campaignId,
          userId: dto.userId,
          action: AssignmentAction.ASSIGN,
          performedById: actor.id,
          payload: { campaignCode: campaign.code },
        },
      });
    });

    await this.activityLogs.record({
      actorId: actor.id,
      action: ACTIVITY_ACTION.CAMPAIGN_ASSIGN,
      entityType: 'Campaign',
      entityId: campaignId,
      metadata: { userId: dto.userId },
      context,
    });
  }

  async unassignUser(
    actor: AuthenticatedUser,
    campaignId: string,
    userId: string,
    context: ClientContext,
  ): Promise<void> {
    const campaign = await this.getVisibleOrThrow(actor, campaignId);
    CampaignsService.assertNotClosed(campaign);

    const assignment = await this.prisma.campaignAssignment.findUnique({
      where: { campaignId_userId: { campaignId, userId } },
    });
    if (!assignment) throw new NotFoundException('Affectation introuvable.');

    await this.prisma.$transaction(async (tx) => {
      await tx.campaignAssignment.delete({
        where: { campaignId_userId: { campaignId, userId } },
      });

      await tx.assignmentHistory.create({
        data: {
          entityType: AssignmentEntityType.CAMPAIGN,
          entityId: campaignId,
          userId,
          action: AssignmentAction.UNASSIGN,
          performedById: actor.id,
          payload: { campaignCode: campaign.code, assignedAt: assignment.assignedAt.toISOString() },
        },
      });
    });

    await this.activityLogs.record({
      actorId: actor.id,
      action: ACTIVITY_ACTION.CAMPAIGN_UNASSIGN,
      entityType: 'Campaign',
      entityId: campaignId,
      metadata: { userId },
      context,
    });
  }

  // ==========================================================================
  // Internes
  // ==========================================================================

  /** Un opérateur ne voit que les campagnes où une liste lui est attribuée. */
  private static visibilityFilter(actor: AuthenticatedUser): Prisma.CampaignWhereInput {
    if (actor.role === Role.ADMIN || actor.role === Role.SUPERVISOR) return {};

    return {
      lists: { some: { assignments: { some: { userId: actor.id } } } },
    };
  }

  /**
   * Supprime définitivement une campagne et tout ce qu'elle porte.
   *
   * Trois garde-fous, dans cet ordre :
   *
   * 1. **Administrateur seul.** La suppression détruit des comptages signés par
   *    des opérateurs ; elle ne relève pas de la conduite quotidienne d'un
   *    inventaire.
   * 2. **Jamais une campagne clôturée.** Une campagne close est un dossier
   *    d'inventaire : il se consulte, il ne s'efface pas. Pour corriger une
   *    clôture erronée, il faut d'abord la rouvrir — geste lui-même tracé.
   * 3. **Jamais une campagne ayant engendré un passage suivant.** Le passage
   *    suivant cite ses lignes d'origine ; supprimer le parent le rendrait
   *    illisible.
   *
   * Le journal est écrit **avant** la suppression, avec le décompte de ce qui
   * disparaît. Sans cela il ne resterait aucune trace de ce que la base
   * contenait — et c'est précisément ce qu'on veut pouvoir reconstituer.
   *
   * La cascade (listes → lignes → comptages, affectations, rapports) est
   * assurée par les contraintes de clés étrangères, pas par du code applicatif.
   */
  async remove(
    actor: AuthenticatedUser,
    id: string,
    dto: DeleteCampaignDto,
    context: ClientContext,
  ): Promise<void> {
    if (actor.role !== Role.ADMIN) {
      throw new ForbiddenException('Seul un administrateur peut supprimer une campagne.');
    }

    const campaign = await this.getVisibleOrThrow(actor, id);

    if (campaign.status === CampaignStatus.CLOSED) {
      throw new ConflictException(
        'Une campagne clôturée ne peut pas être supprimée : elle constitue le dossier de l’inventaire. Rouvrez-la d’abord si elle doit être corrigée.',
      );
    }

    const children = await this.prisma.campaign.count({ where: { parentCampaignId: id } });
    if (children > 0) {
      throw new ConflictException(
        'Un passage suivant a été créé à partir de cette campagne : supprimez-le avant de supprimer celle-ci.',
      );
    }

    if (dto.confirmCode !== campaign.code) {
      throw new BadRequestException(
        `Le code saisi ne correspond pas. Pour confirmer la suppression, saisissez « ${campaign.code} ».`,
      );
    }

    const [lists, items, counts] = await this.prisma.$transaction([
      this.prisma.inventoryList.count({ where: { campaignId: id } }),
      this.prisma.inventoryItem.count({ where: { list: { campaignId: id } } }),
      this.prisma.count.count({ where: { item: { list: { campaignId: id } } } }),
    ]);

    await this.prisma.$transaction(async (tx) => {
      // Journaliser d'abord : après le DELETE, plus rien ne permettrait de dire
      // ce que la campagne contenait ni qui l'a supprimée.
      await this.activityLogs.recordInTransaction(tx, {
        actorId: actor.id,
        action: ACTIVITY_ACTION.CAMPAIGN_DELETE,
        entityType: 'Campaign',
        entityId: id,
        metadata: {
          code: campaign.code,
          name: campaign.name,
          status: campaign.status,
          round: campaign.round,
          reason: dto.reason,
          deleted: { lists, items, counts },
        },
        context,
      });

      await tx.campaign.delete({ where: { id } });
    });
  }

  private async getVisibleOrThrow(actor: AuthenticatedUser, id: string): Promise<Campaign> {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, ...CampaignsService.visibilityFilter(actor) },
    });

    if (!campaign) throw new NotFoundException('Campagne introuvable.');
    return campaign;
  }

  private static assertEditable(campaign: Campaign): void {
    if (!EDITABLE_STATUSES.includes(campaign.status)) {
      throw new ConflictException(
        `Une campagne au statut « ${campaign.status} » ne peut plus être modifiée.`,
      );
    }
  }

  private static assertNotClosed(campaign: Campaign): void {
    if (campaign.status === CampaignStatus.CLOSED) {
      throw new ConflictException('Cette campagne est clôturée.');
    }
  }

  private async methodCodeOf(campaign: Campaign): Promise<string> {
    const method = await this.prisma.inventoryMethod.findUniqueOrThrow({
      where: { id: campaign.inventoryMethodId },
      select: { code: true },
    });
    return method.code;
  }

  private loadItemsForCalculation(campaignId: string): Promise<ItemForCalculation[]> {
    return this.prisma.inventoryItem.findMany({
      where: { list: { campaignId } },
      select: {
        id: true,
        theoreticalQty: true,
        unitPrice: true,
        arbitratedQty: true,
        notFoundAt: true,
        counts: {
          select: { id: true, userId: true, quantity: true, countedAt: true, status: true },
        },
      },
    });
  }

  private static toInput(item: ItemForCalculation): ItemCalculationInput {
    return {
      theoreticalQty: item.theoreticalQty,
      unitPrice: item.unitPrice,
      arbitratedQty: item.arbitratedQty,
      markedNotFound: item.notFoundAt !== null,
      counts: item.counts,
    };
  }

  /**
   * Écrit les quantités finales par lots.
   *
   * Un `UPDATE` par ligne représenterait près de 8 000 allers-retours dans une
   * même transaction. On passe par un `UPDATE … FROM (VALUES …)` par paquet de
   * 500, soit une quinzaine de requêtes au total.
   */
  private static async applyFinalQuantities(
    tx: Prisma.TransactionClient,
    resolved: { id: string; finalQty: Prisma.Decimal; status: ItemStatus }[],
  ): Promise<void> {
    for (let offset = 0; offset < resolved.length; offset += BULK_CHUNK_SIZE) {
      const chunk = resolved.slice(offset, offset + BULK_CHUNK_SIZE);

      const values = chunk.map(
        (item) =>
          Prisma.sql`(${item.id}::uuid, ${item.finalQty.toString()}::numeric, ${item.status}::"inventory"."ItemStatus")`,
      );

      await tx.$executeRaw`
        UPDATE "inventory"."inventory_items" AS target
        SET "final_qty" = source.final_qty,
            "status" = source.status,
            "updated_at" = now()
        FROM (VALUES ${Prisma.join(values)}) AS source(id, final_qty, status)
        WHERE target."id" = source.id
      `;
    }
  }

  private async assertCodeAvailable(code: string): Promise<void> {
    const existing = await this.prisma.campaign.findUnique({
      where: { code },
      select: { id: true },
    });
    if (existing) throw new ConflictException(`La campagne « ${code} » existe déjà.`);
  }

  private async assertReferencesExist(dto: CreateCampaignDto): Promise<void> {
    await this.assertTypeExists(dto.campaignTypeId);
    await this.assertMethodExists(dto.inventoryMethodId);

    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id: dto.warehouseId },
      select: { isActive: true },
    });
    if (!warehouse) throw new NotFoundException('Magasin introuvable.');
    if (!warehouse.isActive) throw new ConflictException('Ce magasin est désactivé.');
  }

  private async assertTypeExists(campaignTypeId: string): Promise<void> {
    const type = await this.prisma.campaignType.findUnique({
      where: { id: campaignTypeId },
      select: { isActive: true },
    });
    if (!type) throw new NotFoundException('Type de campagne introuvable.');
    if (!type.isActive) throw new ConflictException('Ce type de campagne est désactivé.');
  }

  private async assertMethodExists(inventoryMethodId: string): Promise<void> {
    const method = await this.prisma.inventoryMethod.findUnique({
      where: { id: inventoryMethodId },
      select: { code: true, isActive: true },
    });
    if (!method) throw new NotFoundException("Méthode d'inventaire introuvable.");
    if (!method.isActive) throw new ConflictException("Cette méthode d'inventaire est désactivée.");

    // Une méthode présente en base mais sans stratégie associée produirait des
    // calculs impossibles : on le détecte à la configuration, pas à la clôture.
    if (!this.calculation.supportedMethods().includes(method.code)) {
      throw new ConflictException(
        `La méthode « ${method.code} » n'a pas d'implémentation de calcul disponible.`,
      );
    }
  }

  private async assertNoCountsYet(campaignId: string): Promise<void> {
    const counts = await this.prisma.count.count({
      where: { item: { list: { campaignId } } },
    });

    if (counts > 0) {
      throw new ConflictException(
        'Des comptages ont déjà été enregistrés : la méthode de calcul ne peut plus être changée.',
      );
    }
  }
}
