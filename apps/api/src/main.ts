import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { Logger as PinoLogger } from 'nestjs-pino';

import { AppModule } from './app.module';
import { NodeEnv, type EnvironmentVariables } from './config/env.validation';
import { buildOpenApiDocument } from './config/openapi';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // Les logs émis pendant l'initialisation sont mis en tampon puis rejoués par
    // Pino une fois celui-ci disponible : rien n'est perdu au démarrage.
    bufferLogs: true,
  });

  app.useLogger(app.get(PinoLogger));

  const config = app.get(ConfigService<EnvironmentVariables, true>);
  const isProduction = config.get('NODE_ENV', { infer: true }) === NodeEnv.Production;
  const apiPrefix = config.get('API_PREFIX', { infer: true });
  const port = config.get('API_PORT', { infer: true });

  app.setGlobalPrefix(apiPrefix);

  // L'API est servie derrière Nginx : sans cela, l'IP vue par le rate limiter et
  // par les logs serait celle du reverse proxy pour tout le monde.
  app.set('trust proxy', 1);

  app.use(
    helmet({
      // L'API ne sert pas de HTML ; la CSP par défaut gênerait Swagger UI.
      contentSecurityPolicy: isProduction ? undefined : false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  const corsOrigins = config
    .get('CORS_ORIGINS', { infer: true })
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin !== '');

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id', 'Content-Disposition'],
    maxAge: 86_400,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      // Toute propriété non déclarée dans le DTO est retirée…
      whitelist: true,
      // …et sa seule présence fait échouer la requête : pas d'injection de champ.
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
      stopAtFirstError: false,
    }),
  );

  app.enableShutdownHooks();

  // --- Documentation OpenAPI ---------------------------------------------------
  // La construction du document est testée (openapi.e2e-spec.ts) : une erreur de
  // schéma ne doit pas se découvrir au démarrage en production.
  SwaggerModule.setup(`${apiPrefix}/docs`, app, buildOpenApiDocument(app), {
    swaggerOptions: { persistAuthorization: true },
    customSiteTitle: 'InventAir API',
  });

  await app.listen(port, '0.0.0.0');

  const logger = app.get(PinoLogger);
  logger.log(`API démarrée sur le port ${port} — préfixe /${apiPrefix}`);
  logger.log(`Documentation OpenAPI : /${apiPrefix}/docs`);
}

void bootstrap();
