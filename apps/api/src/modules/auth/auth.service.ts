import { Injectable, UnauthorizedException, type OnModuleInit } from '@nestjs/common';
import type { User } from '@prisma/client';
import { randomBytes } from 'node:crypto';

import type { ClientContext } from '../../common/types/authenticated-user';
import { hashPassword, verifyPassword } from '../../common/security/password';
import { PrismaService } from '../../prisma/prisma.service';
import { ACTIVITY_ACTION, ActivityLogsService } from '../activity-logs/activity-logs.service';

import type { AuthTokensDto, UserProfileDto } from './dto/auth-response.dto';
import type { LoginDto } from './dto/login.dto';
import { TokenService, type IssuedTokens } from './token.service';

@Injectable()
export class AuthService implements OnModuleInit {
  /**
   * Hash factice utilisé lorsqu'aucun compte ne correspond à l'identifiant.
   * Il permet de consacrer le même temps de calcul qu'une vérification réelle et
   * d'éviter qu'un attaquant ne devine, au chronomètre, quels comptes existent.
   */
  private decoyHash = '';

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
    private readonly activityLogs: ActivityLogsService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.decoyHash = await hashPassword(randomBytes(32).toString('hex'));
  }

  async login(dto: LoginDto, context: ClientContext): Promise<AuthTokensDto> {
    const user = await this.findByLogin(dto.login);

    // Le message d'erreur est rigoureusement identique dans les trois cas
    // (compte inexistant, mot de passe faux, compte désactivé) : rien ne doit
    // permettre d'énumérer les comptes existants.
    const credentialsAreValid = user
      ? await verifyPassword(user.passwordHash, dto.password)
      : await this.burnTime(dto.password);

    if (!user || !credentialsAreValid || !user.isActive) {
      await this.activityLogs.record({
        actorId: user?.id ?? null,
        action: ACTIVITY_ACTION.LOGIN_FAILURE,
        entityType: 'User',
        entityId: user?.id ?? null,
        metadata: {
          login: dto.login,
          reason: !user ? 'UNKNOWN_LOGIN' : !credentialsAreValid ? 'BAD_PASSWORD' : 'INACTIVE',
        },
        context,
      });

      throw new UnauthorizedException('Identifiants invalides.');
    }

    const tokens = await this.tokenService.issuePair(user, context);

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await this.activityLogs.record({
      actorId: user.id,
      action: ACTIVITY_ACTION.LOGIN_SUCCESS,
      entityType: 'User',
      entityId: user.id,
      metadata: { role: user.role },
      context,
    });

    return this.toAuthResponse(tokens, updated);
  }

  async refresh(refreshToken: string, context: ClientContext): Promise<AuthTokensDto> {
    const { tokens, user } = await this.tokenService.rotate(refreshToken, context);

    await this.activityLogs.record({
      actorId: user.id,
      action: ACTIVITY_ACTION.TOKEN_REFRESH,
      entityType: 'User',
      entityId: user.id,
      context,
    });

    return this.toAuthResponse(tokens, user);
  }

  async logout(refreshToken: string, actorId: string, context: ClientContext): Promise<void> {
    await this.tokenService.revoke(refreshToken);

    await this.activityLogs.record({
      actorId,
      action: ACTIVITY_ACTION.LOGOUT,
      entityType: 'User',
      entityId: actorId,
      context,
    });
  }

  /** Déconnecte toutes les sessions de l'utilisateur, tous appareils confondus. */
  async logoutAll(actorId: string, context: ClientContext): Promise<number> {
    const revoked = await this.tokenService.revokeAllForUser(actorId);

    await this.activityLogs.record({
      actorId,
      action: ACTIVITY_ACTION.LOGOUT,
      entityType: 'User',
      entityId: actorId,
      metadata: { scope: 'ALL_SESSIONS', revoked },
      context,
    });

    return revoked;
  }

  async getProfile(userId: string): Promise<UserProfileDto> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return AuthService.toProfile(user);
  }

  /** L'identifiant accepté est indifféremment l'e-mail ou le nom d'utilisateur. */
  private findByLogin(login: string): Promise<User | null> {
    const normalized = login.trim();

    return this.prisma.user.findFirst({
      where: {
        OR: [{ email: normalized.toLowerCase() }, { username: normalized }],
      },
    });
  }

  /** Consomme le temps d'une vérification Argon2 sans rien authentifier. */
  private async burnTime(password: string): Promise<false> {
    await verifyPassword(this.decoyHash, password);
    return false;
  }

  private toAuthResponse(tokens: IssuedTokens, user: User): AuthTokensDto {
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenType: 'Bearer',
      expiresIn: tokens.expiresIn,
      user: AuthService.toProfile(user),
    };
  }

  /** Projette l'entité User en profil public : le hash ne sort jamais de l'API. */
  private static toProfile(user: User): UserProfileDto {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
    };
  }
}
