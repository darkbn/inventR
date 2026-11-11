import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

import { MIN_PASSWORD_LENGTH } from './create-user.dto';

/** Réinitialisation par un administrateur, sans connaître l'ancien mot de passe. */
export class ResetPasswordDto {
  @ApiProperty({ minLength: MIN_PASSWORD_LENGTH, maxLength: 128 })
  @IsString()
  @MinLength(MIN_PASSWORD_LENGTH, {
    message: `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`,
  })
  @MaxLength(128)
  @Matches(/(?=.*[A-Za-z])(?=.*\d)/, {
    message: 'Le mot de passe doit contenir au moins une lettre et un chiffre.',
  })
  newPassword!: string;
}

/** Changement de mot de passe par l'utilisateur lui-même. */
export class ChangePasswordDto extends ResetPasswordDto {
  @ApiProperty({ description: 'Mot de passe actuel, exigé pour confirmer l’identité.' })
  @IsString()
  @MaxLength(128)
  currentPassword!: string;
}
