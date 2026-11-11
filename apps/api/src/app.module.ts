import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'node:crypto';

import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { InventoryCalculationModule } from './common/inventory-calculation/inventory-calculation.module';
import { StorageModule } from './common/storage/storage.module';
import { resolveRootEnvPath } from './config/env-path';
import { validateEnvironment, type EnvironmentVariables } from './config/env.validation';
import { ActivityLogsModule } from './modules/activity-logs/activity-logs.module';
import { ArticlesModule } from './modules/articles/articles.module';
import { AuthModule } from './modules/auth/auth.module';
import { CampaignSettingsModule } from './modules/campaign-settings/campaign-settings.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { CountsModule } from './modules/counts/counts.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from './modules/auth/guards/roles.guard';
import { HealthModule } from './modules/health/health.module';
import { ImportsModule } from './modules/imports/imports.module';
import { InventoryItemsModule } from './modules/inventory-items/inventory-items.module';
import { InventoryListsModule } from './modules/inventory-lists/inventory-lists.module';
import { LocationsModule } from './modules/locations/locations.module';
import { QrModule } from './modules/qr/qr.module';
import { ReportsModule } from './modules/reports/reports.module';
import { UsersModule } from './modules/users/users.module';
import { WarehousesModule } from './modules/warehouses/warehouses.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: resolveRootEnvPath(),
      validate: validateEnvironment,
    }),

    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) => ({
        pinoHttp: {
          level: config.get('LOG_LEVEL', { infer: true }),
          // En développement, des logs lisibles ; en production, du JSON structuré
          // exploitable par un collecteur.
          transport: config.get('LOG_PRETTY', { infer: true })
            ? { target: 'pino-pretty', options: { singleLine: true, translateTime: 'HH:MM:ss' } }
            : undefined,
          genReqId: (req, res) => {
            const existing = req.headers['x-request-id'];
            const id = typeof existing === 'string' && existing !== '' ? existing : randomUUID();
            res.setHeader('x-request-id', id);
            return id;
          },
          // Aucun secret ne doit atterrir dans les logs.
          redact: {
            paths: [
              'req.headers.authorization',
              'req.headers.cookie',
              'req.body.password',
              'req.body.currentPassword',
              'req.body.newPassword',
              'req.body.refreshToken',
              'res.headers["set-cookie"]',
            ],
            censor: '[masqué]',
          },
          autoLogging: {
            // Le healthcheck est appelé en boucle par Docker : on ne pollue pas les logs.
            ignore: (req) => req.url?.endsWith('/health') === true,
          },
        },
      }),
    }),

    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) => ({
        // Un seul limiteur global : tout limiteur déclaré ici s'applique à
        // l'ensemble des routes. Les routes d'authentification resserrent cette
        // limite localement via le décorateur @AuthThrottle().
        throttlers: [
          {
            name: 'default',
            ttl: config.get('THROTTLE_TTL', { infer: true }),
            limit: config.get('THROTTLE_LIMIT', { infer: true }),
          },
        ],
      }),
    }),

    PrismaModule,
    ActivityLogsModule,
    InventoryCalculationModule,
    StorageModule,
    AuthModule,
    HealthModule,

    // Référentiels
    UsersModule,
    WarehousesModule,
    LocationsModule,
    CategoriesModule,
    ArticlesModule,
    CampaignSettingsModule,

    // Cœur métier
    CampaignsModule,
    InventoryListsModule,
    InventoryItemsModule,
    CountsModule,

    // Fichiers et restitution
    ImportsModule,
    ReportsModule,
    QrModule,
  ],
  providers: [
    // L'ordre de déclaration est l'ordre d'exécution : on limite le débit avant
    // de vérifier le jeton (une attaque par force brute ne doit pas coûter une
    // vérification Argon2), puis on contrôle le rôle une fois l'identité connue.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
