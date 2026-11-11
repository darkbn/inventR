import { ApiProperty, PartialType, PickType } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

import { CreateUserDto } from './create-user.dto';

/**
 * Mise à jour du profil. Ni le mot de passe ni le rôle n'y figurent : ce sont
 * des opérations sensibles, exposées sur des routes dédiées afin d'être
 * journalisées distinctement et soumises à leurs propres règles.
 */
export class UpdateUserDto extends PartialType(
  PickType(CreateUserDto, ['email', 'username', 'fullName'] as const),
) {}

export class UpdateUserRoleDto {
  @ApiProperty({ enum: Role, enumName: 'Role' })
  @IsEnum(Role)
  role!: Role;
}

export class UpdateUserStatusDto {
  @ApiProperty({
    description: 'false désactive le compte : connexion impossible et sessions révoquées.',
  })
  @IsBoolean()
  isActive!: boolean;

  @ApiProperty({ required: false, maxLength: 255, description: 'Motif, conservé au journal.' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
