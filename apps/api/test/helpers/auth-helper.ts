import type { INestApplication } from '@nestjs/common';
import { Role } from '@prisma/client';
import request from 'supertest';

import type { PrismaService } from '../../src/prisma/prisma.service';

import { apiPath, createUser } from './test-app';

export interface Actor {
  id: string;
  email: string;
  username: string;
  password: string;
  accessToken: string;
  /** En-tête prêt à l'emploi : `.set(...actor.auth)`. */
  auth: [string, string];
}

/** Crée un compte du rôle demandé et ouvre une session pour lui. */
export async function createActor(
  app: INestApplication,
  prisma: PrismaService,
  role: Role = Role.USER,
): Promise<Actor> {
  const { user, password } = await createUser(prisma, { role });

  const response = await request(app.getHttpServer())
    .post(apiPath('/auth/login'))
    .send({ login: user.email, password })
    .expect(200);

  const accessToken = response.body.accessToken as string;

  return {
    id: user.id,
    email: user.email,
    username: user.username,
    password,
    accessToken,
    auth: ['Authorization', `Bearer ${accessToken}`],
  };
}
