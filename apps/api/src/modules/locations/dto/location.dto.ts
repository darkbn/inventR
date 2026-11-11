import { ApiProperty, ApiPropertyOptional, PartialType, PickType } from '@nestjs/swagger';
import type { Location } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class LocationDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  warehouseId!: string;

  @ApiProperty({ example: '1-1-C-7' })
  code!: string;

  @ApiPropertyOptional({ nullable: true })
  label!: string | null;

  @ApiProperty({
    example: '1-1-C-7',
    description: 'Forme canonique : majuscules, sans accents, espaces compressés.',
  })
  normalizedCode!: string;

  @ApiPropertyOptional({ nullable: true, description: 'Allée, pour le tri physique.' })
  aisle!: number | null;

  @ApiPropertyOptional({ nullable: true, description: 'Travée.' })
  bay!: number | null;

  @ApiPropertyOptional({ nullable: true, description: 'Niveau.' })
  level!: string | null;

  @ApiPropertyOptional({ nullable: true, description: 'Case.' })
  slot!: number | null;

  @ApiProperty({
    description:
      'Emplacement fictif (NON-LOCALISE) rattachant les lignes sans emplacement renseigné.',
  })
  isVirtual!: boolean;

  @ApiProperty()
  isActive!: boolean;

  @ApiPropertyOptional({ description: "Nombre de lignes d'inventaire à cet emplacement." })
  itemCount?: number;

  static from(location: Location, itemCount?: number): LocationDto {
    return {
      id: location.id,
      warehouseId: location.warehouseId,
      code: location.code,
      label: location.label,
      normalizedCode: location.normalizedCode,
      aisle: location.aisle,
      bay: location.bay,
      level: location.level,
      slot: location.slot,
      isVirtual: location.isVirtual,
      isActive: location.isActive,
      ...(itemCount === undefined ? {} : { itemCount }),
    };
  }
}

export class CreateLocationDto {
  @ApiProperty({ format: 'uuid', description: 'Magasin de rattachement.' })
  @IsUUID()
  warehouseId!: string;

  @ApiProperty({
    example: '1-1-C-7',
    description:
      'Code tel qu’il figure sur l’étiquette. Les formats « allée-travée-niveau[-case] » ' +
      'sont automatiquement décomposés pour permettre un tri physique.',
    maxLength: 64,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  @Transform(trim)
  code!: string;

  @ApiPropertyOptional({ maxLength: 160 })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  @Transform(trim)
  label?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateLocationDto extends PartialType(
  PickType(CreateLocationDto, ['code', 'label', 'isActive'] as const),
) {}

export class ListLocationsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid', description: 'Restreint à un magasin.' })
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @ApiPropertyOptional({
    default: false,
    description: 'Inclure les emplacements virtuels (NON-LOCALISE).',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }): unknown => {
    if (typeof value === 'boolean') return value;
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  includeVirtual = false;
}

export class MergeLocationsDto {
  @ApiProperty({
    format: 'uuid',
    description:
      'Emplacement à conserver. Toutes les lignes d’inventaire de l’emplacement ' +
      'courant y seront rattachées, puis l’emplacement courant sera désactivé.',
  })
  @IsUUID()
  targetLocationId!: string;
}

export class LocationVariantDto {
  @ApiProperty({ type: LocationDto })
  @Type(() => LocationDto)
  location!: LocationDto;

  @ApiProperty({ type: [LocationDto], description: 'Variantes orthographiques probables.' })
  @Type(() => LocationDto)
  candidates!: LocationDto[];
}
