import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CampaignStatus, CountSource, CountStatus, Prisma, Role } from '@prisma/client';

import { DUPLICATE_COUNT_MESSAGE } from '../../common/constants/inventory.constants';
import { InventoryCalculationService } from '../../common/inventory-calculation/inventory-calculation.service';
import type { AuthenticatedUser, ClientContext } from '../../common/types/authenticated-user';
import { PrismaService } from '../../prisma/prisma.service';
import { ACTIVITY_ACTION, ActivityLogsService } from '../activity-logs/activity-logs.service';
import { InventoryItemsService } from '../inventory-items/inventory-items.service';

import {
  type CancelCountDto,
  type CountDto,
  type CreateCountDto,
  type SyncCountsDto,
  type SyncCountsResultDto,
  type SyncResultEntryDto,
} from './dto/count.dto';

/** Statuts de campagne autorisant la saisie d'un comptage. */
const COUNTABLE_STATUSES: CampaignStatus[] = [
  CampaignStatus.OPEN,
  CampaignStatus.COUNTING,
  CampaignStatus.PENDING_CLOSURE,
];

interface CountableItem {
  id: string;
  listId: string;
  campaignId: string;
  campaignStatus: CampaignStatus;
  /** Code de la méthode d'inventaire de la campagne. */
  methodCode: string;
  assigned: boolean;
}

@Injectable()
export class CountsService {
  private readonly logger = new Logger(CountsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly items: InventoryItemsService,
    private readonly activityLogs: ActivityLogsService,
    private readonly calculation: InventoryCalculationService,
  ) {}

  // ==========================================================================
  // Saisie unitaire
  // ==========================================================================

  /**
   * Enregistre un comptage.
   *
   * L'idempotence repose sur `clientUuid`, généré par le terminal avant
   * l'envoi : si la réponse se perd et que le client réémet, le comptage
   * existant est renvoyé tel quel plutôt que dupliqué. C'est ce qui rend la
   * saisie hors ligne sûre.
   */
  async create(
    actor: AuthenticatedUser,
    itemId: string,
    dto: CreateCountDto,
    context: ClientContext,
  ): Promise<CountDto> {
    const existing = await this.prisma.count.findUnique({
      where: { clientUuid: dto.clientUuid },
      include: { user: { select: { username: true } } },
    });

    if (existing) {
      if (existing.itemId !== itemId || existing.userId !== actor.id) {
        throw new ConflictException(
          'Cet identifiant de comptage est déjà utilisé pour une autre saisie.',
        );
      }
      return CountsService.toDto(existing, existing.user.username);
    }

    const item = await this.loadCountableItem(actor, itemId);
    CountsService.assertCountable(item);
    await this.assertNotAlreadyCounted(actor, item);

    const created = await this.prisma.$transaction(async (tx) => {
      const count = await tx.count.create({
        data: {
          itemId,
          userId: actor.id,
          quantity: new Prisma.Decimal(dto.quantity),
          countedAt: dto.countedAt === undefined ? new Date() : new Date(dto.countedAt),
          source: dto.source ?? CountSource.MOBILE,
          clientUuid: dto.clientUuid,
          deviceId: dto.deviceId ?? null,
          note: dto.note ?? null,
        },
        include: { user: { select: { username: true } } },
      });

      // Le premier comptage fait basculer la campagne en « comptage en cours ».
      if (item.campaignStatus === CampaignStatus.OPEN) {
        await tx.campaign.update({
          where: { id: item.campaignId },
          data: { status: CampaignStatus.COUNTING },
        });
      }

      await this.items.recalculate(itemId, tx);

      return count;
    });

    await this.activityLogs.record({
      actorId: actor.id,
      action: ACTIVITY_ACTION.COUNT_CREATE,
      entityType: 'Count',
      entityId: created.id,
      metadata: { itemId, quantity: dto.quantity, source: created.source },
      context,
    });

    return CountsService.toDto(created, created.user.username);
  }

  // ==========================================================================
  // Synchronisation hors ligne
  // ==========================================================================

  /**
   * Reçoit la file d'attente d'un terminal revenu en ligne.
   *
   * Chaque comptage est traité **indépendamment** : une ligne rejetée (article
   * retiré de la liste, campagne entre-temps clôturée) ne doit pas faire échouer
   * tout le lot, sinon le terminal resterait bloqué avec une file inexploitable.
   * Le client purge sa file sur la foi du résultat ligne par ligne.
   */
  async sync(
    actor: AuthenticatedUser,
    dto: SyncCountsDto,
    context: ClientContext,
  ): Promise<SyncCountsResultDto> {
    const results: SyncResultEntryDto[] = [];
    let created = 0;
    let duplicates = 0;
    let rejected = 0;

    for (const entry of dto.counts) {
      try {
        const alreadyKnown = await this.prisma.count.findUnique({
          where: { clientUuid: entry.clientUuid },
          select: { id: true },
        });

        if (alreadyKnown) {
          duplicates += 1;
          results.push({ clientUuid: entry.clientUuid, outcome: 'duplicate', reason: null });
          continue;
        }

        await this.create(actor, entry.itemId, entry, context);
        created += 1;
        results.push({ clientUuid: entry.clientUuid, outcome: 'created', reason: null });
      } catch (error) {
        rejected += 1;
        const reason = error instanceof Error ? error.message : 'Erreur inconnue';
        results.push({ clientUuid: entry.clientUuid, outcome: 'rejected', reason });
        this.logger.warn(
          `Comptage rejeté en synchronisation (clientUuid=${entry.clientUuid}) : ${reason}`,
        );
      }
    }

    await this.activityLogs.record({
      actorId: actor.id,
      action: ACTIVITY_ACTION.COUNT_SYNC,
      entityType: 'Count',
      metadata: { received: dto.counts.length, created, duplicates, rejected },
      context,
    });

    return { received: dto.counts.length, created, duplicates, rejected, results };
  }

  // ==========================================================================
  // Consultation et annulation
  // ==========================================================================

  /** Historique des comptages d'une ligne. */
  async findByItem(actor: AuthenticatedUser, itemId: string): Promise<CountDto[]> {
    await this.loadCountableItem(actor, itemId);

    const counts = await this.prisma.count.findMany({
      where: { itemId },
      orderBy: { countedAt: 'desc' },
      include: { user: { select: { username: true } } },
    });

    return counts.map((count) => CountsService.toDto(count, count.user.username));
  }

  /** Comptages réalisés par l'utilisateur connecté — écran « mes comptages ». */
  async findMine(actor: AuthenticatedUser, limit: number): Promise<CountDto[]> {
    const counts = await this.prisma.count.findMany({
      where: { userId: actor.id },
      orderBy: { countedAt: 'desc' },
      take: limit,
      include: { user: { select: { username: true } } },
    });

    return counts.map((count) => CountsService.toDto(count, count.user.username));
  }

  /**
   * Annule un comptage. Le comptage n'est jamais supprimé : il reste au dossier
   * avec son auteur, sa date et le motif de l'annulation. Seul son exclusion du
   * calcul change.
   */
  async cancel(
    actor: AuthenticatedUser,
    countId: string,
    dto: CancelCountDto,
    context: ClientContext,
  ): Promise<CountDto> {
    const count = await this.prisma.count.findUnique({
      where: { id: countId },
      include: {
        user: { select: { username: true } },
        item: {
          select: { id: true, list: { select: { campaign: { select: { status: true } } } } },
        },
      },
    });

    if (!count) throw new NotFoundException('Comptage introuvable.');

    // Un opérateur ne peut annuler que ses propres saisies ; un superviseur peut
    // annuler celles de son équipe.
    const isSupervisor = actor.role === Role.ADMIN || actor.role === Role.SUPERVISOR;
    if (!isSupervisor && count.userId !== actor.id) {
      throw new NotFoundException('Comptage introuvable.');
    }

    if (count.status === CountStatus.CANCELLED) {
      return CountsService.toDto(count, count.user.username);
    }

    if (count.item.list.campaign.status === CampaignStatus.CLOSED) {
      throw new ConflictException(
        'Cette campagne est clôturée : les comptages ne peuvent plus être modifiés.',
      );
    }

    const cancelled = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.count.update({
        where: { id: countId },
        data: {
          status: CountStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelledById: actor.id,
          note: dto.reason,
        },
        include: { user: { select: { username: true } } },
      });

      await this.items.recalculate(count.item.id, tx);

      return updated;
    });

    await this.activityLogs.record({
      actorId: actor.id,
      action: ACTIVITY_ACTION.COUNT_CANCEL,
      entityType: 'Count',
      entityId: countId,
      metadata: { reason: dto.reason, itemId: count.item.id },
      context,
    });

    return CountsService.toDto(cancelled, cancelled.user.username);
  }

  // ==========================================================================
  // Internes
  // ==========================================================================

  private async loadCountableItem(
    actor: AuthenticatedUser,
    itemId: string,
  ): Promise<CountableItem> {
    const item = await this.prisma.inventoryItem.findUnique({
      where: { id: itemId },
      select: {
        id: true,
        listId: true,
        list: {
          select: {
            campaignId: true,
            campaign: {
              select: { status: true, inventoryMethod: { select: { code: true } } },
            },
            assignments: { where: { userId: actor.id }, select: { userId: true } },
          },
        },
      },
    });

    if (!item) throw new NotFoundException('Ligne d’inventaire introuvable.');

    const assigned = item.list.assignments.length > 0;
    const isSupervisor = actor.role === Role.ADMIN || actor.role === Role.SUPERVISOR;

    // Un opérateur ne compte que sur les listes qui lui sont attribuées. 404 et
    // non 403 : l'existence de la ligne n'a pas à lui être révélée.
    if (!isSupervisor && !assigned) {
      throw new NotFoundException('Ligne d’inventaire introuvable.');
    }

    return {
      id: item.id,
      listId: item.listId,
      campaignId: item.list.campaignId,
      campaignStatus: item.list.campaign.status,
      methodCode: item.list.campaign.inventoryMethod.code,
      assigned,
    };
  }

  /**
   * Refuse un second comptage de la même ligne par le même opérateur.
   *
   * Constat de la recette du 11/11/2026 : un article scanné deux fois voyait sa
   * quantité s'additionner silencieusement. En somme cumulative c'est le
   * principe de la méthode ; partout ailleurs c'est une fausse manœuvre dont
   * personne ne s'aperçoit avant l'analyse des écarts.
   *
   * Le blocage est volontairement sec : l'opérateur ne peut pas corriger
   * lui-même, car une correction silencieuse rouvrirait exactement la porte que
   * l'on ferme. Seul un superviseur annule le comptage précédent — l'annulation
   * est tracée, datée et motivée.
   */
  private async assertNotAlreadyCounted(
    actor: AuthenticatedUser,
    item: CountableItem,
  ): Promise<void> {
    if (this.calculation.allowsRepeatCountByUser(item.methodCode)) return;

    const previous = await this.prisma.count.findFirst({
      where: { itemId: item.id, userId: actor.id, status: CountStatus.VALID },
      orderBy: { countedAt: 'desc' },
      select: { quantity: true, countedAt: true },
    });

    if (!previous) return;

    throw new ConflictException({
      message: DUPLICATE_COUNT_MESSAGE,
      // Détail exploité par le mobile pour afficher ce qui a déjà été saisi,
      // plutôt qu'un refus sans explication devant un opérateur en rayon.
      code: 'COUNT_ALREADY_RECORDED',
      details: {
        quantity: new Prisma.Decimal(previous.quantity).toNumber(),
        countedAt: previous.countedAt,
      },
    });
  }

  private static assertCountable(item: CountableItem): void {
    if (item.campaignStatus === CampaignStatus.CLOSED) {
      throw new ConflictException(
        'Cette campagne est clôturée : plus aucun comptage ne peut être enregistré.',
      );
    }

    if (!COUNTABLE_STATUSES.includes(item.campaignStatus)) {
      throw new ConflictException("Cette campagne n'est pas ouverte au comptage.");
    }
  }

  private static toDto(
    count: {
      id: string;
      itemId: string;
      userId: string;
      quantity: Prisma.Decimal;
      countedAt: Date;
      source: CountSource;
      clientUuid: string;
      deviceId: string | null;
      note: string | null;
      status: CountStatus;
      cancelledAt: Date | null;
    },
    username: string,
  ): CountDto {
    return {
      id: count.id,
      itemId: count.itemId,
      userId: count.userId,
      username,
      quantity: new Prisma.Decimal(count.quantity).toNumber(),
      countedAt: count.countedAt,
      source: count.source,
      clientUuid: count.clientUuid,
      deviceId: count.deviceId,
      note: count.note,
      status: count.status,
      cancelledAt: count.cancelledAt,
    };
  }
}
