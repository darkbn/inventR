import { ValidationPipe } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { Role, type User } from '@prisma/client';

import { AppModule } from '../../src/app.module';
import { AllExceptionsFilter } from '../../src/common/filters/all-exceptions.filter';
import { hashPassword } from '../../src/common/security/password';
import { PrismaService } from '../../src/prisma/prisma.service';

export interface TestContext {
  app: INestApplication;
  prisma: PrismaService;
}

/**
 * Démarre l'application dans la même configuration qu'en production (pipe de
 * validation et filtre d'exceptions globaux compris). Sans cela, les tests
 * valideraient un comportement que l'API réelle n'a pas.
 */
export async function createTestApp(): Promise<TestContext> {
  const moduleRef: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication({ logger: false });

  app.setGlobalPrefix(process.env.API_PREFIX ?? 'api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  await app.init();

  return { app, prisma: app.get(PrismaService) };
}

export interface SeededUser {
  user: User;
  password: string;
}

/** Crée un utilisateur de test avec un mot de passe connu. */
export async function createUser(
  prisma: PrismaService,
  overrides: Partial<{
    email: string;
    username: string;
    fullName: string;
    role: Role;
    isActive: boolean;
    password: string;
  }> = {},
): Promise<SeededUser> {
  const suffix = Math.random().toString(36).slice(2, 10);
  const password = overrides.password ?? 'MotDePasseTest123';

  const user = await prisma.user.create({
    data: {
      email: (overrides.email ?? `user-${suffix}@inventair.test`).toLowerCase(),
      username: overrides.username ?? `user-${suffix}`,
      fullName: overrides.fullName ?? 'Utilisateur de test',
      passwordHash: await hashPassword(password),
      role: overrides.role ?? Role.USER,
      isActive: overrides.isActive ?? true,
    },
  });

  return { user, password };
}

export const apiPath = (route: string): string =>
  `/${process.env.API_PREFIX ?? 'api/v1'}${route.startsWith('/') ? route : `/${route}`}`;
