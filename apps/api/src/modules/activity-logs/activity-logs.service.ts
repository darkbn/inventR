import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import type { ClientContext } from '../../common/types/authenticated-user';
import { PrismaService } from '../../prisma/prisma.service';

/** Actions sensibles tracées dans le journal d'activité. */
export const ACTIVITY_ACTION = {
  LOGIN_SUCCESS: 'AUTH_LOGIN_SUCCESS',
  LOGIN_FAILURE: 'AUTH_LOGIN_FAILURE',
  LOGOUT: 'AUTH_LOGOUT',
  TOKEN_REFRESH: 'AUTH_TOKEN_REFRESH',
  TOKEN_REUSE_DETECTED: 'AUTH_TOKEN_REUSE_DETECTED',

  CAMPAIGN_CLOSE: 'CAMPAIGN_CLOSE',
  CAMPAIGN_REOPEN: 'CAMPAIGN_REOPEN',
  CAMPAIGN_NEXT_ROUND: 'CAMPAIGN_NEXT_ROUND',
  CAMPAIGN_DELETE: 'CAMPAIGN_DELETE',
  CAMPAIGN_ASSIGN: 'CAMPAIGN_ASSIGN',
  CAMPAIGN_UNASSIGN: 'CAMPAIGN_UNASSIGN',

  LIST_ASSIGN: 'LIST_ASSIGN',
  LIST_UNASSIGN: 'LIST_UNASSIGN',

  COUNT_CREATE: 'COUNT_CREATE',
  COUNT_SYNC: 'COUNT_SYNC',
  COUNT_CANCEL: 'COUNT_CANCEL',
  ITEM_MARK_NOT_FOUND: 'ITEM_MARK_NOT_FOUND',
  ITEM_ARBITRATE: 'ITEM_ARBITRATE',
  ITEM_ADD_MANUAL: 'ITEM_ADD_MANUAL',
} as const;

export interface RecordActivityInput {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
  context?: ClientContext;
}

@Injectable()
export class ActivityLogsService {
  private readonly logger = new Logger(ActivityLogsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Enregistre une action sensible.
   *
   * L'écriture du journal ne doit jamais faire échouer l'action métier qu'elle
   * accompagne : une erreur ici est journalisée côté serveur puis absorbée. En
   * contrepartie, les écritures qui doivent être atomiques avec leur opération
   * (clôture de campagne, import) passent par `recordInTransaction`.
   */
  async record(input: RecordActivityInput): Promise<void> {
    try {
      await this.prisma.activityLog.create({ data: this.toCreateInput(input) });
    } catch (error) {
      this.logger.error(
        `Échec d'écriture du journal d'activité (${input.action})`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /**
   * Variante transactionnelle : l'entrée de journal est écrite dans la même
   * transaction que l'opération métier, et son échec annule l'ensemble.
   */
  async recordInTransaction(
    tx: Prisma.TransactionClient,
    input: RecordActivityInput,
  ): Promise<void> {
    await tx.activityLog.create({ data: this.toCreateInput(input) });
  }

  private toCreateInput(input: RecordActivityInput): Prisma.ActivityLogCreateInput {
    return {
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      metadata: input.metadata ?? {},
      ip: input.context?.ip?.slice(0, 64) ?? null,
      userAgent: input.context?.userAgent?.slice(0, 255) ?? null,
      ...(input.actorId ? { actor: { connect: { id: input.actorId } } } : {}),
    };
  }
}
