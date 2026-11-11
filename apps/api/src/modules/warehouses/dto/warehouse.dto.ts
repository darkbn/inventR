import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import type { Warehouse } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class WarehouseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: '19R01' })
  code!: string;

  @ApiProperty({ example: 'MAGASIN PDR BOUFARIK' })
  label!: string;

  @ApiProperty()
  isActive!: boolean;

  @ApiPropertyOptional({ description: "Nombre d'emplacements rattachés." })
  locationCount?: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  static from(warehouse: Warehouse, locationCount?: number): WarehouseDto {
    return {
      id: warehouse.id,
      code: warehouse.code,
      label: warehouse.label,
      isActive: warehouse.isActive,
      ...(locationCount === undefined ? {} : { locationCount }),
      createdAt: warehouse.createdAt,
      updatedAt: warehouse.updatedAt,
    };
  }
}

export class CreateWarehouseDto {
  @ApiProperty({
    example: '19R01',
    description: 'Code magasin tel qu’il figure dans le système source.',
    maxLength: 32,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  @Matches(/^[A-Z0-9_-]+$/, {
    message: 'Le code magasin ne peut contenir que des majuscules, chiffres, tirets et tirets bas.',
  })
  @Transform(({ value }: { value: unknown }): unknown =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  code!: string;

  @ApiProperty({ example: 'MAGASIN PDR BOUFARIK', maxLength: 160 })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  @Transform(({ value }: { value: unknown }): unknown =>
    typeof value === 'string' ? value.trim() : value,
  )
  label!: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateWarehouseDto extends PartialType(CreateWarehouseDto) {}

export class ListWarehousesQueryDto extends PaginationQueryDto {}
