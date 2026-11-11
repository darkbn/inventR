import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';

/** Corps d'erreur normalisé, identique pour toutes les routes de l'API. */
export interface ApiErrorBody {
  statusCode: number;
  /** Code applicatif stable, destiné au client (web et mobile). */
  code: string;
  message: string;
  details?: unknown;
  timestamp: string;
  path: string;
}

/** Seuil au-delà duquel une erreur est considérée comme interne (et journalisée). */
const SERVER_ERROR_THRESHOLD: number = HttpStatus.INTERNAL_SERVER_ERROR;

interface NormalizedError {
  status: number;
  code: string;
  message: string;
  details?: unknown;
}

/**
 * Filtre d'exceptions global.
 *
 * Objectif de sécurité : aucune erreur inattendue ne doit révéler la structure
 * interne (requête SQL, pile d'appels, nom de contrainte). Les erreurs non
 * maîtrisées sont journalisées intégralement côté serveur mais renvoyées au
 * client sous une forme générique.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const normalized = this.normalize(exception);

    if (normalized.status >= SERVER_ERROR_THRESHOLD) {
      this.logger.error(
        `${request.method} ${request.url} → ${normalized.status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ApiErrorBody = {
      statusCode: normalized.status,
      code: normalized.code,
      message: normalized.message,
      ...(normalized.details === undefined ? {} : { details: normalized.details }),
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(normalized.status).json(body);
  }

  private normalize(exception: unknown): NormalizedError {
    if (exception instanceof HttpException) {
      return this.fromHttpException(exception);
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.fromPrismaError(exception);
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      return {
        status: HttpStatus.BAD_REQUEST,
        code: 'INVALID_QUERY',
        message: 'Requête invalide.',
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_ERROR',
      message: 'Une erreur interne est survenue.',
    };
  }

  private fromHttpException(exception: HttpException): NormalizedError {
    const status = exception.getStatus();
    const payload = exception.getResponse();

    if (typeof payload === 'string') {
      return { status, code: this.codeFromStatus(status), message: payload };
    }

    const record = payload as Record<string, unknown>;
    const rawMessage = record['message'];

    // ValidationPipe renvoie un tableau de messages : il part dans `details`
    // pour que le client puisse les afficher champ par champ.
    if (Array.isArray(rawMessage)) {
      return {
        status,
        code: 'VALIDATION_FAILED',
        message: 'Les données envoyées sont invalides.',
        details: rawMessage,
      };
    }

    return {
      status,
      code: typeof record['code'] === 'string' ? record['code'] : this.codeFromStatus(status),
      message: typeof rawMessage === 'string' ? rawMessage : exception.message,
      details: record['details'],
    };
  }

  private fromPrismaError(exception: Prisma.PrismaClientKnownRequestError): NormalizedError {
    switch (exception.code) {
      case 'P2002':
        return {
          status: HttpStatus.CONFLICT,
          code: 'DUPLICATE_RESOURCE',
          message: 'Cette ressource existe déjà.',
          details: { fields: exception.meta?.['target'] },
        };
      case 'P2003':
        return {
          status: HttpStatus.CONFLICT,
          code: 'FOREIGN_KEY_CONSTRAINT',
          message: 'Référence invalide vers une autre ressource.',
        };
      case 'P2025':
        return {
          status: HttpStatus.NOT_FOUND,
          code: 'RESOURCE_NOT_FOUND',
          message: 'Ressource introuvable.',
        };
      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          code: 'DATABASE_ERROR',
          message: 'Une erreur est survenue lors de l’accès aux données.',
        };
    }
  }

  private codeFromStatus(status: number): string {
    const codes: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
      [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
      [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
      [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
      [HttpStatus.CONFLICT]: 'CONFLICT',
      [HttpStatus.UNPROCESSABLE_ENTITY]: 'UNPROCESSABLE_ENTITY',
      [HttpStatus.TOO_MANY_REQUESTS]: 'TOO_MANY_REQUESTS',
    };
    return codes[status] ?? 'ERROR';
  }
}
