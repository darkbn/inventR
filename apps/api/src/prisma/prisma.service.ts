import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Client Prisma exposé comme provider Nest.
 *
 * La connexion est établie au démarrage du module (et non paresseusement à la
 * première requête) afin qu'une base injoignable fasse échouer le démarrage de
 * l'API plutôt que la première requête utilisateur.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'warn' },
        { emit: 'event', level: 'error' },
      ],
      errorFormat: 'minimal',
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Connexion PostgreSQL établie');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /**
   * Vide toutes les tables métier. Réservé aux tests d'intégration : la méthode
   * refuse de s'exécuter en dehors de NODE_ENV=test.
   */
  async truncateAllTables(): Promise<void> {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error("truncateAllTables() est interdit hors de l'environnement de test");
    }

    const rows = await this.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'inventory' AND tablename <> '_prisma_migrations'
    `;

    if (rows.length === 0) return;

    const tables = rows.map((row) => `"inventory"."${row.tablename}"`).join(', ');
    await this.$executeRawUnsafe(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`);
  }
}
