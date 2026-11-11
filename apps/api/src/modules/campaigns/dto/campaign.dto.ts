import { ApiProperty, ApiPropertyOptional, PartialType, PickType } from '@nestjs/swagger';
import { CampaignStatus, type Campaign } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsNotEmpty,
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

export class CampaignDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'INV-2026-PDR-01' })
  code!: string;

  @ApiProperty({ example: 'Inventaire annuel PDR Boufarik' })
  name!: string;

  @ApiProperty({ format: 'uuid' })
  campaignTypeId!: string;

  @ApiProperty({ format: 'uuid' })
  inventoryMethodId!: string;

  @ApiProperty({ format: 'uuid' })
  warehouseId!: string;

  @ApiProperty({ enum: CampaignStatus, enumName: 'CampaignStatus' })
  status!: CampaignStatus;

  @ApiProperty({
    example: 1,
    description: 'Numéro de passage : 1 = campagne initiale, 2 = recomptage des écarts.',
  })
  round!: number;

  @ApiPropertyOptional({ nullable: true, format: 'uuid', description: 'Passage précédent.' })
  parentCampaignId!: string | null;

  @ApiPropertyOptional({ nullable: true, type: Date })
  startedAt!: Date | null;

  @ApiPropertyOptional({ nullable: true, type: Date })
  closedAt!: Date | null;

  @ApiPropertyOptional({ nullable: true, format: 'uuid' })
  closedById!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    type: Date,
    description: 'Horodatage de la mise à 0 des articles non trouvés, lors de la clôture.',
  })
  missingZeroedAt!: Date | null;

  @ApiPropertyOptional({ nullable: true, type: Date })
  reopenedAt!: Date | null;

  @ApiPropertyOptional({ nullable: true })
  reopenReason!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  static from(campaign: Campaign): CampaignDto {
    return {
      id: campaign.id,
      code: campaign.code,
      name: campaign.name,
      campaignTypeId: campaign.campaignTypeId,
      inventoryMethodId: campaign.inventoryMethodId,
      warehouseId: campaign.warehouseId,
      status: campaign.status,
      round: campaign.round,
      parentCampaignId: campaign.parentCampaignId,
      startedAt: campaign.startedAt,
      closedAt: campaign.closedAt,
      closedById: campaign.closedById,
      missingZeroedAt: campaign.missingZeroedAt,
      reopenedAt: campaign.reopenedAt,
      reopenReason: campaign.reopenReason,
      createdAt: campaign.createdAt,
      updatedAt: campaign.updatedAt,
    };
  }
}

export class CreateCampaignDto {
  @ApiProperty({ example: 'INV-2026-PDR-01', maxLength: 64 })
  @IsString()
  @MinLength(3)
  @MaxLength(64)
  @Matches(/^[A-Z0-9_-]+$/, {
    message:
      'Le code campagne ne peut contenir que des majuscules, chiffres, tirets et tirets bas.',
  })
  @Transform(({ value }: { value: unknown }): unknown =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  code!: string;

  @ApiProperty({ example: 'Inventaire annuel PDR Boufarik', maxLength: 160 })
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  @Transform(trim)
  name!: string;

  @ApiProperty({ format: 'uuid', description: 'Matière première, PDR, produits finis…' })
  @IsUUID()
  campaignTypeId!: string;

  @ApiProperty({
    format: 'uuid',
    description: 'Méthode de calcul appliquée à toutes les lignes de la campagne.',
  })
  @IsUUID()
  inventoryMethodId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  warehouseId!: string;
}

/** Le magasin et le passage sont figés à la création : ils structurent les lignes. */
export class UpdateCampaignDto extends PartialType(
  PickType(CreateCampaignDto, ['name', 'campaignTypeId', 'inventoryMethodId'] as const),
) {}

export class CloseCampaignDto {
  @ApiProperty({
    description:
      'Confirmation explicite de la mise à zéro des articles non trouvés. La ' +
      'clôture est refusée sans cette confirmation : c’est la contrepartie de ' +
      'l’avertissement affiché à l’utilisateur.',
    example: true,
  })
  @IsBoolean()
  confirmZeroMissing!: boolean;

  @ApiPropertyOptional({ maxLength: 500, description: 'Commentaire de clôture, journalisé.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class ReopenCampaignDto {
  @ApiProperty({
    maxLength: 500,
    description:
      'Motif de la réouverture. Obligatoire : la clôture est en principe ' +
      'définitive, toute exception doit être justifiée et tracée.',
  })
  @IsString()
  @IsNotEmpty({ message: 'Le motif de réouverture est obligatoire.' })
  @MinLength(10, { message: 'Le motif doit être explicite (10 caractères minimum).' })
  @MaxLength(500)
  @Transform(trim)
  reason!: string;
}

export class DeleteCampaignDto {
  @ApiProperty({
    maxLength: 64,
    description:
      'Code exact de la campagne à supprimer. Le redemander évite qu’une ' +
      'suppression définitive parte d’un clic sur la mauvaise ligne : c’est la ' +
      'seule confirmation qui engage réellement celui qui la saisit.',
  })
  @IsString()
  @IsNotEmpty({ message: 'Le code de la campagne est obligatoire.' })
  @MaxLength(64)
  @Transform(({ value }: { value: unknown }): unknown =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  confirmCode!: string;

  @ApiProperty({
    maxLength: 500,
    description: 'Motif de la suppression, journalisé avant que la campagne ne disparaisse.',
  })
  @IsString()
  @IsNotEmpty({ message: 'Le motif de suppression est obligatoire.' })
  @MinLength(10, { message: 'Le motif doit être explicite (10 caractères minimum).' })
  @MaxLength(500)
  @Transform(trim)
  reason!: string;
}

export class NextRoundDto {
  @ApiPropertyOptional({ maxLength: 64, description: 'Code de la nouvelle campagne.' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Matches(/^[A-Z0-9_-]+$/)
  @Transform(({ value }: { value: unknown }): unknown =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  code?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Méthode du nouveau passage. Par défaut, celle du passage précédent. Il est ' +
      'courant de basculer en Méthode 2 pour fiabiliser les écarts détectés.',
  })
  @IsOptional()
  @IsUUID()
  inventoryMethodId?: string;

  @ApiPropertyOptional({
    default: false,
    description:
      'true conserve la quantité théorique d’origine. Par défaut, la quantité ' +
      'théorique du nouveau passage est la quantité finale du précédent : on ' +
      'recompte ce que l’on croit désormais détenir.',
  })
  @IsOptional()
  @IsBoolean()
  keepOriginalTheoretical?: boolean;
}

export class AssignCampaignUserDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  userId!: string;
}

export const CAMPAIGN_SORT_FIELDS = ['code', 'name', 'createdAt', 'status', 'round'] as const;
export type CampaignSortField = (typeof CAMPAIGN_SORT_FIELDS)[number];

export class ListCampaignsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: CampaignStatus, enumName: 'CampaignStatus' })
  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  campaignTypeId?: string;

  @ApiPropertyOptional({ enum: CAMPAIGN_SORT_FIELDS, default: 'createdAt' })
  @IsOptional()
  @IsIn(CAMPAIGN_SORT_FIELDS)
  sortBy: CampaignSortField = 'createdAt';
}

/** Bilan avant clôture : ce qui reste à traiter. */
export class ClosureReadinessDto {
  @ApiProperty()
  canClose!: boolean;

  @ApiProperty({ description: 'Nombre total de lignes de la campagne.' })
  totalItems!: number;

  @ApiProperty({ description: 'Lignes jamais comptées, qui passeront à 0.' })
  pendingItems!: number;

  @ApiProperty({ description: 'Lignes déclarées introuvables, qui passeront à 0.' })
  notFoundItems!: number;

  @ApiProperty({ description: 'Lignes en attente d’un second comptage (Méthode 2).' })
  awaitingSecondCount!: number;

  @ApiProperty({ description: 'Litiges non tranchés (Méthode 2).' })
  discrepancies!: number;

  @ApiProperty({ description: 'Lignes résolues.' })
  resolvedItems!: number;

  @ApiProperty({
    type: [String],
    description: 'Raisons qui empêchent la clôture. Vide si la campagne est clôturable.',
  })
  blockingReasons!: string[];

  @ApiProperty({
    description: 'Avertissement à présenter à l’utilisateur avant confirmation.',
    example: 'Les articles non trouvés seront mis à quantité 0. Voulez-vous continuer ?',
  })
  warning!: string;
}
