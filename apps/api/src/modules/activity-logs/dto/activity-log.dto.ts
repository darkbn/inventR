import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { ActivityLog, Prisma } from '@prisma/client';
import { IsISO8601, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class ActivityLogActorDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  username!: string;

  @ApiProperty()
  fullName!: string;
}

export class ActivityLogDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiPropertyOptional({
    type: ActivityLogActorDto,
    nullable: true,
    description: 'Auteur de l’action. Nul si le compte a été supprimé.',
  })
  actor!: ActivityLogActorDto | null;

  @ApiProperty({ example: 'USER_CHANGE_ROLE' })
  action!: string;

  @ApiProperty({ example: 'User' })
  entityType!: string;

  @ApiPropertyOptional({ nullable: true })
  entityId!: string | null;

  @ApiProperty({ description: 'Contexte de l’action, sans aucune donnée sensible.' })
  metadata!: Prisma.JsonValue;

  @ApiPropertyOptional({ nullable: true })
  ip!: string | null;

  @ApiPropertyOptional({ nullable: true })
  userAgent!: string | null;

  @ApiProperty()
  createdAt!: Date;

  static from(
    log: ActivityLog & { actor: { id: string; username: string; fullName: string } | null },
  ): ActivityLogDto {
    return {
      id: log.id,
      actor: log.actor,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      metadata: log.metadata,
      ip: log.ip,
      userAgent: log.userAgent,
      createdAt: log.createdAt,
    };
  }
}

export class ListActivityLogsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid', description: 'Filtrer sur un auteur.' })
  @IsOptional()
  @IsUUID()
  actorId?: string;

  @ApiPropertyOptional({ example: 'CAMPAIGN_CLOSE' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  action?: string;

  @ApiPropertyOptional({ example: 'Campaign' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  entityType?: string;

  @ApiPropertyOptional({ description: 'Filtrer sur une ressource précise.' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  entityId?: string;

  @ApiPropertyOptional({ description: 'Borne inférieure, au format ISO 8601.' })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ description: 'Borne supérieure, au format ISO 8601.' })
  @IsOptional()
  @IsISO8601()
  to?: string;
}
