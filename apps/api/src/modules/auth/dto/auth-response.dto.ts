import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

/** Profil renvoyé après authentification et sur `GET /auth/me`. */
export class UserProfileDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'admin@inventair.local' })
  email!: string;

  @ApiProperty({ example: 'admin' })
  username!: string;

  @ApiProperty({ example: 'Administrateur InventAir' })
  fullName!: string;

  @ApiProperty({ enum: Role, enumName: 'Role' })
  role!: Role;

  @ApiProperty({ description: 'Un compte désactivé ne peut plus se connecter.' })
  isActive!: boolean;

  @ApiProperty({ required: false, nullable: true, description: 'Dernière connexion réussie.' })
  lastLoginAt!: Date | null;
}

export class AuthTokensDto {
  @ApiProperty({ description: "Jeton d'accès à placer dans l'en-tête Authorization." })
  accessToken!: string;

  @ApiProperty({ description: 'Jeton de rafraîchissement, à conserver de manière sécurisée.' })
  refreshToken!: string;

  @ApiProperty({ example: 'Bearer' })
  tokenType!: string;

  @ApiProperty({
    description: "Durée de validité restante du jeton d'accès, en secondes.",
    example: 900,
  })
  expiresIn!: number;

  @ApiProperty({ type: UserProfileDto })
  user!: UserProfileDto;
}

export class LogoutResponseDto {
  @ApiProperty({ example: 'Déconnexion effectuée.' })
  message!: string;
}
