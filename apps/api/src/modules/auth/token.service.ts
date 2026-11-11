import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { User } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';

import type { ClientContext } from '../../common/types/authenticated-user';
import type { EnvironmentVariables } from '../../config/env.validation';
import { PrismaService } from '../../prisma/prisma.service';

import { TOKEN_TYPE, type AccessTokenPayload, type RefreshTokenPayload } from './auth.constants';

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  /** Durée de vie restante du jeton d'accès, en secondes. */
  expiresIn: number;
}

/**
 * Émission, rotation et révocation des jetons.
 *
 * Le jeton de rafraîchissement n'est jamais stocké en clair : seule son empreinte
 * SHA-256 est enregistrée. SHA-256 (et non Argon2) est ici le bon choix — le jeton
 * est une valeur à forte entropie générée par le serveur, pas un secret choisi par
 * un humain : il n'y a rien à ralentir contre une attaque par dictionnaire, et un
 * rafraîchissement doit rester rapide.
 */
@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
    private readonly prisma: PrismaService,
  ) {}

  private static hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /** Émet un couple de jetons et enregistre le jeton de rafraîchissement. */
  async issuePair(user: User, context: ClientContext = {}): Promise<IssuedTokens> {
    const accessPayload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      typ: TOKEN_TYPE.ACCESS,
    };

    const accessToken = await this.jwt.signAsync(accessPayload, {
      secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
      expiresIn: this.config.get('JWT_ACCESS_TTL', { infer: true }),
    });

    const jti = randomUUID();
    const refreshPayload: RefreshTokenPayload = {
      sub: user.id,
      jti,
      typ: TOKEN_TYPE.REFRESH,
    };

    const refreshToken = await this.jwt.signAsync(refreshPayload, {
      secret: this.config.get('JWT_REFRESH_SECRET', { infer: true }),
      expiresIn: this.config.get('JWT_REFRESH_TTL', { infer: true }),
    });

    await this.prisma.refreshToken.create({
      data: {
        id: jti,
        userId: user.id,
        tokenHash: TokenService.hash(refreshToken),
        expiresAt: this.expiryOf(refreshToken),
        userAgent: context.userAgent?.slice(0, 255),
        ip: context.ip?.slice(0, 64),
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.secondsUntilExpiry(accessToken),
    };
  }

  /**
   * Échange un jeton de rafraîchissement contre un nouveau couple (rotation).
   *
   * Si un jeton **déjà révoqué** est présenté, on considère qu'il a été dérobé :
   * toutes les sessions de l'utilisateur sont alors invalidées. C'est la détection
   * de rejeu recommandée par l'OWASP pour les refresh tokens rotatifs.
   */
  async rotate(
    presentedToken: string,
    context: ClientContext = {},
  ): Promise<{ tokens: IssuedTokens; user: User }> {
    const payload = await this.verifyRefreshToken(presentedToken);

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: TokenService.hash(presentedToken) },
      include: { user: true },
    });

    if (!stored || stored.id !== payload.jti || stored.userId !== payload.sub) {
      throw new UnauthorizedException('Jeton de rafraîchissement invalide.');
    }

    if (stored.revokedAt !== null) {
      this.logger.warn(
        `Rejeu d'un jeton révoqué détecté (utilisateur ${stored.userId}) : toutes les sessions sont invalidées.`,
      );
      await this.revokeAllForUser(stored.userId);
      throw new UnauthorizedException('Session invalidée. Veuillez vous reconnecter.');
    }

    if (stored.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Jeton de rafraîchissement expiré.');
    }

    if (!stored.user.isActive) {
      throw new UnauthorizedException('Ce compte est désactivé.');
    }

    const tokens = await this.issuePair(stored.user, context);

    // Rotation : l'ancien jeton est révoqué et pointe vers son remplaçant, ce qui
    // permet de reconstituer une chaîne de sessions lors d'un audit.
    const replacement = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: TokenService.hash(tokens.refreshToken) },
      select: { id: true },
    });

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date(), replacedById: replacement?.id ?? null },
    });

    return { tokens, user: stored.user };
  }

  /** Révoque un jeton précis (déconnexion de l'appareil courant). */
  async revoke(presentedToken: string): Promise<void> {
    const tokenHash = TokenService.hash(presentedToken);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });

    // Déconnexion idempotente : un jeton inconnu ou déjà révoqué n'est pas une
    // erreur, et ne doit surtout pas révéler s'il a existé.
    if (!stored || stored.revokedAt !== null) return;

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
  }

  /** Révoque toutes les sessions d'un utilisateur. Renvoie le nombre révoqué. */
  async revokeAllForUser(userId: string): Promise<number> {
    const result = await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return result.count;
  }

  /** Purge les jetons expirés depuis plus de 30 jours (tâche d'entretien). */
  async purgeExpired(): Promise<number> {
    const threshold = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const result = await this.prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: threshold } },
    });
    return result.count;
  }

  private async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    try {
      const payload = await this.jwt.verifyAsync<RefreshTokenPayload>(token, {
        secret: this.config.get('JWT_REFRESH_SECRET', { infer: true }),
      });

      if (payload.typ !== TOKEN_TYPE.REFRESH) {
        throw new UnauthorizedException('Type de jeton incorrect.');
      }

      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Jeton de rafraîchissement invalide ou expiré.');
    }
  }

  /** Lit la date d'expiration inscrite dans le jeton : la signature fait foi. */
  private expiryOf(token: string): Date {
    const decoded = this.jwt.decode<{ exp?: number } | null>(token);
    if (!decoded?.exp) {
      throw new Error("Le jeton émis ne comporte pas de date d'expiration.");
    }
    return new Date(decoded.exp * 1000);
  }

  private secondsUntilExpiry(token: string): number {
    return Math.max(0, Math.floor((this.expiryOf(token).getTime() - Date.now()) / 1000));
  }
}
