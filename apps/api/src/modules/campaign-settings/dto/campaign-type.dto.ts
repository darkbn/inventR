import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import type { CampaignType } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CampaignTypeDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'SPARE_PARTS' })
  code!: string;

  @ApiProperty({ example: 'Pièces de rechange (PDR)' })
  label!: string;

  @ApiProperty()
  isActive!: boolean;

  @ApiPropertyOptional({ description: 'Nombre de campagnes de ce type.' })
  campaignCount?: number;

  static from(type: CampaignType, campaignCount?: number): CampaignTypeDto {
    return {
      id: type.id,
      code: type.code,
      label: type.label,
      isActive: type.isActive,
      ...(campaignCount === undefined ? {} : { campaignCount }),
    };
  }
}

export class CreateCampaignTypeDto {
  @ApiProperty({
    example: 'CONSUMABLES',
    description:
      'Code technique. Les types sont une table et non une énumération figée : ' +
      'de nouveaux types peuvent être ajoutés sans migration de schéma.',
    maxLength: 32,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(32)
  @Matches(/^[A-Z0-9_]+$/, {
    message: 'Le code ne peut contenir que des majuscules, chiffres et tirets bas.',
  })
  @Transform(({ value }: { value: unknown }): unknown =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  code!: string;

  @ApiProperty({ example: 'Consommables', maxLength: 120 })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Transform(({ value }: { value: unknown }): unknown =>
    typeof value === 'string' ? value.trim() : value,
  )
  label!: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCampaignTypeDto extends PartialType(CreateCampaignTypeDto) {}
