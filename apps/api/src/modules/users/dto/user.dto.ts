import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role, type User } from '@prisma/client';

/**
 * Projection publique d'un compte. Le hash du mot de passe n'y figure pas et ne
 * doit jamais y figurer : c'est la seule forme sous laquelle un utilisateur sort
 * de l'API.
 */
export class UserDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'k.benali@inventair.local' })
  email!: string;

  @ApiProperty({ example: 'k.benali' })
  username!: string;

  @ApiProperty({ example: 'Karim Benali' })
  fullName!: string;

  @ApiProperty({ enum: Role, enumName: 'Role' })
  role!: Role;

  @ApiProperty()
  isActive!: boolean;

  @ApiPropertyOptional({ nullable: true, type: Date })
  lastLoginAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  static from(user: User): UserDto {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
