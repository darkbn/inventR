import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: "Adresse e-mail ou nom d'utilisateur.",
    example: 'admin@inventair.local',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty({ message: "L'identifiant est obligatoire." })
  @MaxLength(255)
  // Un identifiant saisi au terminal durci d'un entrepôt traîne souvent une
  // espace parasite : on la retire avant validation.
  @Transform(({ value }: { value: unknown }): unknown =>
    typeof value === 'string' ? value.trim() : value,
  )
  login!: string;

  @ApiProperty({
    description: 'Mot de passe du compte.',
    example: 'MotDePasseRobuste123',
    minLength: 8,
    maxLength: 128,
  })
  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères.' })
  // Argon2 n'a pas de limite basse comme bcrypt, mais plafonner protège d'un déni
  // de service par hachage d'une entrée volumineuse.
  @MaxLength(128)
  password!: string;
}
