import { Injectable, NotFoundException } from '@nestjs/common';
import { CountStatus, ItemStatus, Prisma, Role } from '@prisma/client';

import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { PrismaService } from '../../prisma/prisma.service';

import type {
  CampaignDashboardDto,
  CounterActivityDto,
  DashboardQueryDto,
  ListProgressDto,
  TopVarianceDto,
} from './dto/dashboard.dto';

/** Nombre d'écarts les plus coûteux remontés au tableau de bord. */
const TOP_VARIANCE_LIMIT = 20;

interface VarianceAggregateRow {
  surplus_count: bigint;
  shortage_count: bigint;
  matching_count: bigint;
  surplus_quantity: Prisma.Decimal | null;
  shortage_quantity: Prisma.Decimal | null;
  surplus_value: Prisma.Decimal | null;
  shortage_value: Prisma.Decimal | null;
}

const toNumber = (value: Prisma.Decimal | null | undefined): number =>
  value === null || value === undefined ? 0 : new Prisma.Decimal(value).toNumber();

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Les montants ne sortent jamais vers un opérateur. */
  private static canSeeValuation(actor: AuthenticatedUser): boolean {
    return actor.role === Role.ADMIN || actor.role === Role.SUPERVISOR;
  }

  /**
   * Tableau de bord d'une campagne.
   *
   * Les agrégats sont calculés en base plutôt que de charger les ~8 000 lignes
   * en mémoire : le tableau de bord est consulté en continu pendant une
   * campagne, il doit rester instantané.
   */
  async dashboard(
    actor: AuthenticatedUser,
    campaignId: string,
    query: DashboardQueryDto,
  ): Promise<CampaignDashboardDto> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        inventoryMethod: { select: { code: true, label: true } },
        campaignType: { select: { label: true } },
        warehouse: { select: { code: true } },
      },
    });

    if (!campaign) throw new NotFoundException('Campagne introuvable.');

    const hideZero = query.hideZeroTheoretical;
    const withValuation = ReportsService.canSeeValuation(actor);

    const itemFilter: Prisma.InventoryItemWhereInput = {
      list: { campaignId },
      ...(hideZero ? { theoreticalQty: { gt: 0 } } : {}),
    };

    const [statusGroups, manualItems, varianceRow, topVariances, lists, counters] =
      await Promise.all([
      this.prisma.inventoryItem.groupBy({
        by: ['status'],
        where: itemFilter,
        _count: { _all: true },
      }),
      this.prisma.inventoryItem.count({ where: { ...itemFilter, isManual: true } }),
      this.varianceAggregate(campaignId, hideZero),
      this.topVariances(campaignId, hideZero, withValuation),
      this.listProgress(campaignId, hideZero),
      this.counterActivity(campaignId),
    ]);

    const byStatus = new Map(statusGroups.map((group) => [group.status, group._count._all]));
    const countOf = (status: ItemStatus): number => byStatus.get(status) ?? 0;

    const totalItems = statusGroups.reduce((sum, group) => sum + group._count._all, 0);
    const pending = countOf(ItemStatus.PENDING);
    const handled = totalItems - pending;

    return {
      campaignId: campaign.id,
      code: campaign.code,
      name: campaign.name,
      status: campaign.status,
      round: campaign.round,
      methodCode: campaign.inventoryMethod.code,
      methodLabel: campaign.inventoryMethod.label,
      campaignTypeLabel: campaign.campaignType.label,
      warehouseCode: campaign.warehouse.code,
      zeroTheoreticalHidden: hideZero,

      progress: {
        totalItems,
        pending,
        counted: countOf(ItemStatus.COUNTED),
        confirmed: countOf(ItemStatus.CONFIRMED),
        awaitingSecondCount: countOf(ItemStatus.AWAITING_SECOND_COUNT),
        awaitingThirdCount: countOf(ItemStatus.AWAITING_THIRD_COUNT),
        underInvestigation: countOf(ItemStatus.UNDER_INVESTIGATION),
        discrepancies: countOf(ItemStatus.DISCREPANCY),
        notFound: countOf(ItemStatus.NOT_FOUND),
        manualItems,
        completionPercent: totalItems === 0 ? 0 : Math.round((handled / totalItems) * 1000) / 10,
      },

      variance: {
        surplusCount: Number(varianceRow.surplus_count),
        shortageCount: Number(varianceRow.shortage_count),
        matchingCount: Number(varianceRow.matching_count),
        surplusQuantity: toNumber(varianceRow.surplus_quantity),
        shortageQuantity: Math.abs(toNumber(varianceRow.shortage_quantity)),
        ...(withValuation
          ? {
              surplusValue: toNumber(varianceRow.surplus_value),
              shortageValue: Math.abs(toNumber(varianceRow.shortage_value)),
              netValue: toNumber(varianceRow.surplus_value) + toNumber(varianceRow.shortage_value),
            }
          : {}),
      },

      topVariances,
      lists,
      counters,
      startedAt: campaign.startedAt,
      closedAt: campaign.closedAt,
    };
  }

  /** Activité de comptage par opérateur : qui a compté quoi, et quand. */
  async counterActivity(campaignId: string): Promise<CounterActivityDto[]> {
    const rows = await this.prisma.$queryRaw<
      {
        user_id: string;
        username: string;
        full_name: string;
        count_entries: bigint;
        items_covered: bigint;
        total_quantity: Prisma.Decimal | null;
        first_count_at: Date | null;
        last_count_at: Date | null;
      }[]
    >`
      SELECT u."id"                        AS user_id,
             u."username",
             u."full_name",
             count(*)::bigint              AS count_entries,
             count(DISTINCT c."item_id")::bigint AS items_covered,
             sum(c."quantity")             AS total_quantity,
             min(c."counted_at")           AS first_count_at,
             max(c."counted_at")           AS last_count_at
      FROM "inventory"."counts" c
      JOIN "inventory"."inventory_items" i ON i."id" = c."item_id"
      JOIN "inventory"."inventory_lists" l ON l."id" = i."list_id"
      JOIN "inventory"."users" u ON u."id" = c."user_id"
      WHERE l."campaign_id" = ${campaignId}::uuid
        AND c."status" = 'VALID'::"inventory"."CountStatus"
      GROUP BY u."id", u."username", u."full_name"
      ORDER BY count_entries DESC
    `;

    return rows.map((row) => ({
      userId: row.user_id,
      username: row.username,
      fullName: row.full_name,
      countEntries: Number(row.count_entries),
      itemsCovered: Number(row.items_covered),
      totalQuantity: toNumber(row.total_quantity),
      firstCountAt: row.first_count_at,
      lastCountAt: row.last_count_at,
    }));
  }

  /**
   * Lignes de la campagne, destinées aux exports.
   * Chargées une seule fois, triées dans l'ordre physique.
   */
  async campaignRows(campaignId: string): Promise<
    Prisma.InventoryItemGetPayload<{
      include: {
        article: true;
        location: true;
        list: { select: { code: true; name: true } };
        counts: { include: { user: { select: { username: true; fullName: true } } } };
      };
    }>[]
  > {
    return this.prisma.inventoryItem.findMany({
      where: { list: { campaignId } },
      include: {
        article: true,
        location: true,
        list: { select: { code: true, name: true } },
        counts: { include: { user: { select: { username: true, fullName: true } } } },
      },
      orderBy: [
        { list: { code: 'asc' } },
        { location: { isVirtual: 'asc' } },
        { location: { aisle: { sort: 'asc', nulls: 'last' } } },
        { location: { bay: { sort: 'asc', nulls: 'last' } } },
        { location: { level: { sort: 'asc', nulls: 'last' } } },
        { location: { slot: { sort: 'asc', nulls: 'last' } } },
        { article: { code: 'asc' } },
      ],
    });
  }

  // ==========================================================================
  // Agrégats
  // ==========================================================================

  /**
   * Comptage et valorisation des écarts, en une seule requête.
   *
   * Seules les lignes résolues (`final_qty` renseignée) entrent dans le calcul :
   * une ligne pas encore comptée n'est ni un surplus ni un manque.
   */
  private async varianceAggregate(
    campaignId: string,
    hideZero: boolean,
  ): Promise<VarianceAggregateRow> {
    const zeroFilter = hideZero ? Prisma.sql`AND i."theoretical_qty" > 0` : Prisma.empty;

    const rows = await this.prisma.$queryRaw<VarianceAggregateRow[]>`
      WITH resolved AS (
        SELECT i."final_qty" - i."theoretical_qty" AS variance,
               (i."final_qty" - i."theoretical_qty") * i."unit_price" AS variance_value
        FROM "inventory"."inventory_items" i
        JOIN "inventory"."inventory_lists" l ON l."id" = i."list_id"
        WHERE l."campaign_id" = ${campaignId}::uuid
          AND i."final_qty" IS NOT NULL
          ${zeroFilter}
      )
      SELECT
        count(*) FILTER (WHERE variance > 0)::bigint AS surplus_count,
        count(*) FILTER (WHERE variance < 0)::bigint AS shortage_count,
        count(*) FILTER (WHERE variance = 0)::bigint AS matching_count,
        coalesce(sum(variance)       FILTER (WHERE variance > 0), 0) AS surplus_quantity,
        coalesce(sum(variance)       FILTER (WHERE variance < 0), 0) AS shortage_quantity,
        coalesce(sum(variance_value) FILTER (WHERE variance > 0), 0) AS surplus_value,
        coalesce(sum(variance_value) FILTER (WHERE variance < 0), 0) AS shortage_value
      FROM resolved
    `;

    return (
      rows[0] ?? {
        surplus_count: 0n,
        shortage_count: 0n,
        matching_count: 0n,
        surplus_quantity: null,
        shortage_quantity: null,
        surplus_value: null,
        shortage_value: null,
      }
    );
  }

  /** Écarts les plus importants, classés par valeur absolue de leur montant. */
  private async topVariances(
    campaignId: string,
    hideZero: boolean,
    withValuation: boolean,
  ): Promise<TopVarianceDto[]> {
    const items = await this.prisma.inventoryItem.findMany({
      where: {
        list: { campaignId },
        finalQty: { not: null },
        ...(hideZero ? { theoreticalQty: { gt: 0 } } : {}),
      },
      include: {
        article: { select: { code: true, designation: true } },
        location: { select: { code: true } },
      },
    });

    return items
      .map((item) => {
        const theoreticalQty = toNumber(item.theoreticalQty);
        const finalQty = toNumber(item.finalQty);
        const variance = finalQty - theoreticalQty;

        return {
          itemId: item.id,
          articleCode: item.article.code,
          designation: item.article.designation,
          locationCode: item.location.code,
          theoreticalQty,
          finalQty,
          variance,
          ...(withValuation ? { varianceValue: variance * toNumber(item.unitPrice) } : {}),
          // Classement par impact financier quand il est connu, sinon par
          // ampleur de l'écart : sur un magasin de PDR, dix vis manquantes
          // pèsent moins qu'un roulement.
          sortKey: Math.abs(withValuation ? variance * toNumber(item.unitPrice) : variance),
        };
      })
      .filter((entry) => entry.variance !== 0)
      .sort((a, b) => b.sortKey - a.sortKey)
      .slice(0, TOP_VARIANCE_LIMIT)
      .map(({ sortKey: _sortKey, ...entry }) => entry);
  }

  private async listProgress(campaignId: string, hideZero: boolean): Promise<ListProgressDto[]> {
    const lists = await this.prisma.inventoryList.findMany({
      where: { campaignId },
      include: {
        assignments: { select: { user: { select: { fullName: true } } } },
      },
      orderBy: { code: 'asc' },
    });

    if (lists.length === 0) return [];

    const listIds = lists.map((list) => list.id);
    const zeroFilter = hideZero ? { theoreticalQty: { gt: 0 } } : {};

    const [totals, handled] = await Promise.all([
      this.prisma.inventoryItem.groupBy({
        by: ['listId'],
        where: { listId: { in: listIds }, ...zeroFilter },
        _count: { _all: true },
      }),
      this.prisma.inventoryItem.groupBy({
        by: ['listId'],
        where: {
          listId: { in: listIds },
          ...zeroFilter,
          status: { not: ItemStatus.PENDING },
        },
        _count: { _all: true },
      }),
    ]);

    const totalByList = new Map(totals.map((entry) => [entry.listId, entry._count._all]));
    const handledByList = new Map(handled.map((entry) => [entry.listId, entry._count._all]));

    return lists.map((list) => {
      const totalItems = totalByList.get(list.id) ?? 0;
      const handledItems = handledByList.get(list.id) ?? 0;

      return {
        listId: list.id,
        code: list.code,
        name: list.name,
        totalItems,
        handledItems,
        completionPercent:
          totalItems === 0 ? 0 : Math.round((handledItems / totalItems) * 1000) / 10,
        assignees: list.assignments.map((assignment) => assignment.user.fullName),
      };
    });
  }

  /** Comptages d'une campagne, pour la feuille détaillée des exports. */
  async campaignCounts(campaignId: string): Promise<
    {
      itemId: string;
      articleCode: string;
      designation: string;
      locationCode: string;
      username: string;
      fullName: string;
      quantity: number;
      countedAt: Date;
      source: string;
      status: CountStatus;
    }[]
  > {
    const counts = await this.prisma.count.findMany({
      where: { item: { list: { campaignId } } },
      include: {
        user: { select: { username: true, fullName: true } },
        item: {
          select: {
            id: true,
            article: { select: { code: true, designation: true } },
            location: { select: { code: true } },
          },
        },
      },
      orderBy: { countedAt: 'asc' },
    });

    return counts.map((count) => ({
      itemId: count.item.id,
      articleCode: count.item.article.code,
      designation: count.item.article.designation,
      locationCode: count.item.location.code,
      username: count.user.username,
      fullName: count.user.fullName,
      quantity: toNumber(count.quantity),
      countedAt: count.countedAt,
      source: count.source,
      status: count.status,
    }));
  }
}
