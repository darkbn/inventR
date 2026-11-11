import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AssignmentAction,
  AssignmentEntityType,
  CampaignStatus,
  ItemStatus,
  ListStatus,
  Prisma,
  Role,
  type InventoryList,
} from '@prisma/client';

import { paginate, type PaginatedDto } from '../../common/dto/paginated-response.dto';
import type { AuthenticatedUser, ClientContext } from '../../common/types/authenticated-user';
import { PrismaService } from '../../prisma/prisma.service';
import { ACTIVITY_ACTION, ActivityLogsService } from '../activity-logs/activity-logs.service';

import {
  InventoryListDto,
  type AssignListUserDto,
  type AssignmentHistoryEntryDto,
  type CreateInventoryListDto,
  type ListInventoryListsQueryDto,
  type MyListDto,
  type UpdateInventoryListDto,
} from './dto/inventory-list.dto';

/** Statuts de ligne considérés comme traités pour le suivi d'avancement. */
const HANDLED_ITEM_STATUSES: ItemStatus[] = [
  ItemStatus.COUNTED,
  ItemStatus.CONFIRMED,
  ItemStatus.NOT_FOUND,
  ItemStatus.AWAITING_SECOND_COUNT,
  ItemStatus.DISCREPANCY,
];

@Injectable()
export class InventoryListsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLogs: ActivityLogsService,
  ) {}

  // ==========================================================================
  // Lecture
  // ==========================================================================

  async findAll(
    actor: AuthenticatedUser,
    query: ListInventoryListsQueryDto,
  ): Promise<PaginatedDto<InventoryListDto>> {
    const where: Prisma.InventoryListWhereInput = {
      ...(query.campaignId === undefined ? {} : { campaignId: query.campaignId }),
      ...(query.status === undefined ? {} : { status: query.status }),
      ...(query.q
        ? {
            OR: [
              { code: { contains: query.q, mode: Prisma.QueryMode.insensitive } },
              { name: { contains: query.q, mode: Prisma.QueryMode.insensitive } },
            ],
          }
        : {}),
      ...InventoryListsService.visibilityFilter(actor),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.inventoryList.count({ where }),
      this.prisma.inventoryList.findMany({
        where,
        orderBy: { code: query.sortOrder },
        skip: query.skip,
        take: query.limit,
        include: {
          _count: { select: { items: true } },
          assignments: {
            select: { user: { select: { id: true, username: true, fullName: true } } },
          },
        },
      }),
    ]);

    return paginate(
      rows.map((row) =>
        InventoryListDto.from(row, {
          itemCount: row._count.items,
          assignees: row.assignments.map((assignment) => assignment.user),
        }),
      ),
      total,
      query.page,
      query.limit,
    );
  }

  async findOne(actor: AuthenticatedUser, id: string): Promise<InventoryListDto> {
    const list = await this.prisma.inventoryList.findFirst({
      where: { id, ...InventoryListsService.visibilityFilter(actor) },
      include: {
        _count: { select: { items: true } },
        assignments: {
          select: { user: { select: { id: true, username: true, fullName: true } } },
        },
      },
    });

    if (!list) throw new NotFoundException('Liste introuvable.');

    return InventoryListDto.from(list, {
      itemCount: list._count.items,
      assignees: list.assignments.map((assignment) => assignment.user),
    });
  }

  /**
   * Listes attribuées à l'utilisateur connecté, avec leur avancement.
   *
   * C'est l'écran d'accueil de l'application mobile. Seules les campagnes
   * réellement ouvertes au comptage y figurent : une campagne en préparation ou
   * clôturée n'a rien à faire sur le terrain.
   */
  async findMine(actor: AuthenticatedUser): Promise<MyListDto[]> {
    const lists = await this.prisma.inventoryList.findMany({
      where: {
        assignments: { some: { userId: actor.id } },
        status: { in: [ListStatus.ACTIVE, ListStatus.COMPLETED] },
        campaign: {
          status: {
            in: [CampaignStatus.OPEN, CampaignStatus.COUNTING, CampaignStatus.PENDING_CLOSURE],
          },
        },
      },
      include: {
        campaign: {
          select: {
            id: true,
            code: true,
            name: true,
            status: true,
            inventoryMethod: { select: { code: true } },
          },
        },
        _count: { select: { items: true } },
      },
      orderBy: [{ campaign: { code: 'asc' } }, { code: 'asc' }],
    });

    if (lists.length === 0) return [];

    // Un seul groupBy plutôt qu'un comptage par liste : la requête reste unique
    // quel que soit le nombre de listes affectées.
    const handledCounts = await this.prisma.inventoryItem.groupBy({
      by: ['listId'],
      where: {
        listId: { in: lists.map((list) => list.id) },
        status: { in: HANDLED_ITEM_STATUSES },
      },
      _count: { _all: true },
    });

    const handledByList = new Map(handledCounts.map((entry) => [entry.listId, entry._count._all]));

    return lists.map((list) => {
      const totalItems = list._count.items;
      const countedItems = handledByList.get(list.id) ?? 0;

      return {
        id: list.id,
        code: list.code,
        name: list.name,
        status: list.status,
        campaignId: list.campaign.id,
        campaignCode: list.campaign.code,
        campaignName: list.campaign.name,
        campaignStatus: list.campaign.status,
        methodCode: list.campaign.inventoryMethod.code,
        totalItems,
        countedItems,
        remainingItems: Math.max(0, totalItems - countedItems),
      };
    });
  }

  // ==========================================================================
  // Écriture
  // ==========================================================================

  async create(
    actor: AuthenticatedUser,
    campaignId: string,
    dto: CreateInventoryListDto,
  ): Promise<InventoryListDto> {
    const campaign = await this.getOpenCampaignOrThrow(campaignId);

    const existing = await this.prisma.inventoryList.findUnique({
      where: { campaignId_code: { campaignId, code: dto.code } },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException(`La liste « ${dto.code} » existe déjà dans cette campagne.`);
    }

    const list = await this.prisma.inventoryList.create({
      data: {
        campaignId,
        code: dto.code,
        name: dto.name,
        description: dto.description ?? null,
        // Une liste créée après l'ouverture de la campagne est active d'emblée.
        status: campaign.status === CampaignStatus.DRAFT ? ListStatus.DRAFT : ListStatus.ACTIVE,
        createdById: actor.id,
        updatedById: actor.id,
      },
    });

    return InventoryListDto.from(list, { itemCount: 0, assignees: [] });
  }

  async update(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateInventoryListDto,
  ): Promise<InventoryListDto> {
    const list = await this.getWritableOrThrow(id);

    const updated = await this.prisma.inventoryList.update({
      where: { id: list.id },
      data: {
        ...(dto.name === undefined ? {} : { name: dto.name }),
        ...(dto.description === undefined ? {} : { description: dto.description }),
        ...(dto.status === undefined ? {} : { status: dto.status }),
        updatedById: actor.id,
      },
    });

    return InventoryListDto.from(updated);
  }

  /**
   * Supprime une liste. Possible uniquement tant qu'aucun comptage n'a été
   * réalisé : détruire des comptages reviendrait à effacer le travail du
   * terrain.
   */
  async remove(id: string): Promise<void> {
    const list = await this.getWritableOrThrow(id);

    const counts = await this.prisma.count.count({ where: { item: { listId: id } } });
    if (counts > 0) {
      throw new ConflictException(
        `Cette liste comporte ${counts} comptage(s) : elle ne peut plus être supprimée.`,
      );
    }

    await this.prisma.inventoryList.delete({ where: { id: list.id } });
  }

  // ==========================================================================
  // Affectations
  // ==========================================================================

  async assignUser(
    actor: AuthenticatedUser,
    listId: string,
    dto: AssignListUserDto,
    context: ClientContext,
  ): Promise<void> {
    const list = await this.getWritableOrThrow(listId);

    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { id: true, isActive: true },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable.');
    if (!user.isActive) throw new ConflictException('Impossible d’affecter un compte désactivé.');

    await this.prisma.$transaction(async (tx) => {
      await tx.listAssignment.upsert({
        where: { listId_userId: { listId, userId: dto.userId } },
        update: {},
        create: { listId, userId: dto.userId, assignedById: actor.id },
      });

      // L'affectation à une liste emporte l'appartenance à la campagne : sans
      // cela, l'opérateur ne verrait pas la campagne qui porte sa liste.
      await tx.campaignAssignment.upsert({
        where: { campaignId_userId: { campaignId: list.campaignId, userId: dto.userId } },
        update: {},
        create: { campaignId: list.campaignId, userId: dto.userId, assignedById: actor.id },
      });

      await tx.assignmentHistory.create({
        data: {
          entityType: AssignmentEntityType.LIST,
          entityId: listId,
          userId: dto.userId,
          action: AssignmentAction.ASSIGN,
          performedById: actor.id,
          payload: { listCode: list.code, campaignId: list.campaignId },
        },
      });
    });

    await this.activityLogs.record({
      actorId: actor.id,
      action: ACTIVITY_ACTION.LIST_ASSIGN,
      entityType: 'InventoryList',
      entityId: listId,
      metadata: { userId: dto.userId },
      context,
    });
  }

  async unassignUser(
    actor: AuthenticatedUser,
    listId: string,
    userId: string,
    context: ClientContext,
  ): Promise<void> {
    const list = await this.getWritableOrThrow(listId);

    const assignment = await this.prisma.listAssignment.findUnique({
      where: { listId_userId: { listId, userId } },
    });
    if (!assignment) throw new NotFoundException('Affectation introuvable.');

    await this.prisma.$transaction(async (tx) => {
      await tx.listAssignment.delete({ where: { listId_userId: { listId, userId } } });

      await tx.assignmentHistory.create({
        data: {
          entityType: AssignmentEntityType.LIST,
          entityId: listId,
          userId,
          action: AssignmentAction.UNASSIGN,
          performedById: actor.id,
          payload: { listCode: list.code, assignedAt: assignment.assignedAt.toISOString() },
        },
      });
    });

    await this.activityLogs.record({
      actorId: actor.id,
      action: ACTIVITY_ACTION.LIST_UNASSIGN,
      entityType: 'InventoryList',
      entityId: listId,
      metadata: { userId },
      context,
    });
  }

  /** Historique complet des affectations d'une liste, retraits compris. */
  async assignmentHistory(listId: string): Promise<AssignmentHistoryEntryDto[]> {
    const entries = await this.prisma.assignmentHistory.findMany({
      where: { entityType: AssignmentEntityType.LIST, entityId: listId },
      orderBy: { performedAt: 'desc' },
      include: {
        user: { select: { id: true, username: true, fullName: true } },
        performedBy: { select: { id: true, username: true, fullName: true } },
      },
    });

    return entries.map((entry) => ({
      id: entry.id,
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      user: entry.user,
      performedBy: entry.performedBy,
      performedAt: entry.performedAt,
    }));
  }

  // ==========================================================================
  // Internes
  // ==========================================================================

  private static visibilityFilter(actor: AuthenticatedUser): Prisma.InventoryListWhereInput {
    if (actor.role === Role.ADMIN || actor.role === Role.SUPERVISOR) return {};
    // Règle métier : un utilisateur ne voit que les listes qui lui sont attribuées.
    return { assignments: { some: { userId: actor.id } } };
  }

  private async getOpenCampaignOrThrow(
    campaignId: string,
  ): Promise<{ id: string; status: CampaignStatus }> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { id: true, status: true },
    });

    if (!campaign) throw new NotFoundException('Campagne introuvable.');
    if (campaign.status === CampaignStatus.CLOSED) {
      throw new ConflictException('Cette campagne est clôturée.');
    }

    return campaign;
  }

  private async getWritableOrThrow(id: string): Promise<InventoryList> {
    const list = await this.prisma.inventoryList.findUnique({
      where: { id },
      include: { campaign: { select: { status: true } } },
    });

    if (!list) throw new NotFoundException('Liste introuvable.');
    if (list.campaign.status === CampaignStatus.CLOSED) {
      throw new ConflictException(
        'La campagne de cette liste est clôturée : aucune modification n’est possible.',
      );
    }

    return list;
  }
}
