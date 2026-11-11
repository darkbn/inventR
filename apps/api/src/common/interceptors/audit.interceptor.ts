import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Prisma } from '@prisma/client';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { ActivityLogsService } from '../../modules/activity-logs/activity-logs.service';
import { AUDIT_KEY, type AuditMetadata } from '../decorators/audit.decorator';
import type { RequestWithUser } from '../types/authenticated-user';
import { clientContextFrom } from '../utils/client-context';

/**
 * Écrit une entrée de journal après l'exécution réussie d'une route annotée
 * `@Audit(...)`.
 *
 * Les échecs ne sont pas tracés ici : une action rejetée n'a rien modifié, et
 * les tentatives qui méritent une trace (échec d'authentification, accès refusé)
 * sont journalisées explicitement là où elles sont détectées.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly activityLogs: ActivityLogsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const metadata = this.reflector.getAllAndOverride<AuditMetadata | undefined>(AUDIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!metadata) return next.handle();

    const request = context.switchToHttp().getRequest<RequestWithUser>();

    return next.handle().pipe(
      tap((result: unknown) => {
        void this.activityLogs.record({
          actorId: request.user?.id ?? null,
          action: metadata.action,
          entityType: metadata.entityType,
          entityId: AuditInterceptor.resolveEntityId(result, request),
          metadata: AuditInterceptor.capture(request, metadata.captureFields),
          context: clientContextFrom(request),
        });
      }),
    );
  }

  /** Identifiant de la ressource : celui de la réponse, sinon celui de l'URL. */
  private static resolveEntityId(result: unknown, request: RequestWithUser): string | null {
    if (result !== null && typeof result === 'object' && 'id' in result) {
      const id = result.id;
      if (typeof id === 'string') return id;
    }

    const paramId = (request.params as Record<string, string | undefined>)['id'];
    return paramId ?? null;
  }

  /**
   * N'extrait du corps que les champs explicitement déclarés. Copier la charge
   * utile entière risquerait d'écrire un mot de passe en clair dans le journal.
   */
  private static capture(
    request: RequestWithUser,
    fields: string[] | undefined,
  ): Prisma.InputJsonObject {
    if (!fields || fields.length === 0) return {};

    const body = request.body as Record<string, unknown> | undefined;
    if (!body) return {};

    // Type mutable local : Prisma.InputJsonObject est en lecture seule.
    const captured: Record<string, string | number | boolean | null> = {};
    for (const field of fields) {
      const value = body[field];
      // Seules les valeurs scalaires sont conservées : un objet imbriqué pourrait
      // transporter des données qu'on ne veut pas voir atterrir dans le journal.
      if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean' ||
        value === null
      ) {
        captured[field] = value;
      }
    }
    return captured;
  }
}
