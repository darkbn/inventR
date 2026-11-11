import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import type { AuthenticatedUser } from '../../../common/types/authenticated-user';
import type { EnvironmentVariables } from '../../../config/env.validation';
import { PrismaService } from '../../../prisma/prisma.service';
import { TOKEN_TYPE, type AccessTokenPayload } from '../auth.constants';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService<EnvironmentVariables, true>,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_ACCESS_SECRET', { infer: true }),
    });
  }

  /**
   * L'utilisateur est rechargé depuis la base à chaque requête plutôt que d'être
   * reconstruit depuis le jeton. C'est une requête de plus, mais c'est ce qui rend
   * la désactivation d'un compte et le changement de rôle **immédiatement**
   * effectifs : sinon un jeton émis avant la désactivation resterait valable
   * jusqu'à son expiration.
   */
  async validate(payload: AccessTokenPayload): Promise<AuthenticatedUser> {
    if (payload.typ !== TOKEN_TYPE.ACCESS) {
      throw new UnauthorizedException('Type de jeton incorrect.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, username: true, fullName: true, role: true, isActive: true },
    });

    if (!user) {
      throw new UnauthorizedException('Compte introuvable.');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Ce compte est désactivé.');
    }

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
    };
  }
}
