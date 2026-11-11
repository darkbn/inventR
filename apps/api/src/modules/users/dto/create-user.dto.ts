import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

/** Longueur minimale imposée à la création. Argon2 n'a pas de limite haute utile. */
export const MIN_PASSWORD_LENGTH = 12;

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class CreateUserDto {
  @ApiProperty({ example: 'k.benali@inventair.local', maxLength: 255 })
  @IsEmail({}, { message: "L'adresse e-mail est invalide." })
  @MaxLength(255)
  // Mise en minuscules systématique : une contrainte CHECK en base l'impose
  // également, afin que l'unicité ne puisse pas être contournée par la casse.
  @Transform(({ value }: { value: unknown }): unknown =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email!: string;

  @ApiProperty({
    example: 'k.benali',
    description:
      "Identifiant court, pratique à saisir sur un terminal d'entrepôt. " +
      'Lettres, chiffres, point, tiret et tiret bas.',
    maxLength: 64,
  })
  @IsString()
  @MinLength(3)
  @MaxLength(64)
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message:
      "Le nom d'utilisateur ne peut contenir que des lettres, chiffres, points, tirets et tirets bas.",
  })
  @Transform(trim)
  username!: string;

  @ApiProperty({ example: 'Karim Benali', maxLength: 160 })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  @Transform(trim)
  fullName!: string;

  @ApiProperty({
    minLength: MIN_PASSWORD_LENGTH,
    maxLength: 128,
    description: 'Au moins 12 caractères, dont une lettre et un chiffre.',
  })
  @IsString()
  @MinLength(MIN_PASSWORD_LENGTH, {
    message: `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`,
  })
  @MaxLength(128)
  @Matches(/(?=.*[A-Za-z])(?=.*\d)/, {
    message: 'Le mot de passe doit contenir au moins une lettre et un chiffre.',
  })
  password!: string;

  @ApiProperty({
    enum: Role,
    enumName: 'Role',
    description:
      'Un superviseur ne peut créer que des comptes de rôle USER ; seul un administrateur peut attribuer les rôles ADMIN et SUPERVISOR.',
  })
  @IsEnum(Role)
  role!: Role;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
