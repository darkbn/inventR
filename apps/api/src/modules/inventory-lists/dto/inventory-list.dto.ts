import { ApiProperty, ApiPropertyOptional, PartialType, PickType } from '@nestjs/swagger';
import { CampaignStatus, ListStatus, type InventoryList } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class ListAssigneeDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  username!: string;

  @ApiProperty()
  fullName!: string;
}

export class InventoryListDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  campaignId!: string;

  @ApiProperty({ example: 'ZONE-A' })
  code!: string;

  @ApiProperty({ example: 'Zone A — allées 1 à 10' })
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty({ enum: ListStatus, enumName: 'ListStatus' })
  status!: ListStatus;

  @ApiPropertyOptional({ description: 'Nombre de lignes de la liste.' })
  itemCount?: number;

  @ApiPropertyOptional({ type: [ListAssigneeDto], description: 'Opérateurs affectés.' })
  assignees?: ListAssigneeDto[];

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  static from(
    list: InventoryList,
    extras: { itemCount?: number; assignees?: ListAssigneeDto[] } = {},
  ): InventoryListDto {
    return {
      id: list.id,
      campaignId: list.campaignId,
      code: list.code,
      name: list.name,
      description: list.description,
      status: list.status,
      ...(extras.itemCount === undefined ? {} : { itemCount: extras.itemCount }),
      ...(extras.assignees === undefined ? {} : { assignees: extras.assignees }),
      createdAt: list.createdAt,
      updatedAt: list.updatedAt,
    };
  }
}

/** Vue allégée destinée à l'application mobile : « mes listes attribuées ». */
export class MyListDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'ZONE-A' })
  code!: string;

  @ApiProperty({ example: 'Zone A — allées 1 à 10' })
  name!: string;

  @ApiProperty({ enum: ListStatus, enumName: 'ListStatus' })
  status!: ListStatus;

  @ApiProperty({ format: 'uuid' })
  campaignId!: string;

  @ApiProperty({ example: 'INV-2026-PDR-01' })
  campaignCode!: string;

  @ApiProperty({ example: 'Inventaire annuel PDR Boufarik' })
  campaignName!: string;

  @ApiProperty({ enum: CampaignStatus, enumName: 'CampaignStatus' })
  campaignStatus!: CampaignStatus;

  @ApiProperty({ example: 'METHOD_2', description: 'Méthode de calcul de la campagne.' })
  methodCode!: string;

  @ApiProperty({ description: 'Nombre total de lignes.' })
  totalItems!: number;

  @ApiProperty({ description: 'Lignes déjà comptées par au moins un opérateur.' })
  countedItems!: number;

  @ApiProperty({ description: 'Lignes restant à traiter.' })
  remainingItems!: number;
}

export class CreateInventoryListDto {
  @ApiProperty({ example: 'ZONE-A', maxLength: 64 })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  @Matches(/^[A-Z0-9_-]+$/, {
    message: 'Le code liste ne peut contenir que des majuscules, chiffres, tirets et tirets bas.',
  })
  @Transform(({ value }: { value: unknown }): unknown =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  code!: string;

  @ApiProperty({ example: 'Zone A — allées 1 à 10', maxLength: 160 })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  @Transform(trim)
  name!: string;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(trim)
  description?: string;
}

export class UpdateInventoryListDto extends PartialType(
  PickType(CreateInventoryListDto, ['name', 'description'] as const),
) {
  @ApiPropertyOptional({ enum: ListStatus, enumName: 'ListStatus' })
  @IsOptional()
  @IsEnum(ListStatus)
  status?: ListStatus;
}

export class AssignListUserDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  userId!: string;
}

export class ListInventoryListsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  campaignId?: string;

  @ApiPropertyOptional({ enum: ListStatus, enumName: 'ListStatus' })
  @IsOptional()
  @IsEnum(ListStatus)
  status?: ListStatus;
}

/** Entrée de l'historique des affectations. */
export class AssignmentHistoryEntryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: ['CAMPAIGN', 'LIST'] })
  entityType!: string;

  @ApiProperty({ format: 'uuid' })
  entityId!: string;

  @ApiProperty({ enum: ['ASSIGN', 'UNASSIGN'] })
  action!: string;

  @ApiProperty({ type: ListAssigneeDto, description: 'Personne concernée.' })
  user!: ListAssigneeDto;

  @ApiPropertyOptional({
    type: ListAssigneeDto,
    nullable: true,
    description: 'Auteur de la modification.',
  })
  performedBy!: ListAssigneeDto | null;

  @ApiProperty()
  performedAt!: Date;
}
