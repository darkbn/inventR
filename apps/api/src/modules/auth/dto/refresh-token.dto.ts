import { ApiProperty } from '@nestjs/swagger';
import { IsJWT, IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Jeton de rafraîchissement obtenu lors de la connexion.',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…',
  })
  @IsString()
  @IsNotEmpty({ message: 'Le jeton de rafraîchissement est obligatoire.' })
  @IsJWT({ message: 'Le jeton de rafraîchissement est malformé.' })
  refreshToken!: string;
}
