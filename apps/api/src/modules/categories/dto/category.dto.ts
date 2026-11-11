import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import type { Category } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

const upperTrim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class CategoryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'ROULEMENTS' })
  code!: string;

  @ApiProperty({ example: 'Roulements et paliers' })
  label!: string;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  static from(category: Category): CategoryDto {
    return {
      id: category.id,
      code: category.code,
      label: category.label,
      isActive: category.isActive,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }
}

export class CreateCategoryDto {
  @ApiProperty({
    example: 'ROULEMENTS',
    description: 'Code technique, normalisé en majuscules. Lettres, chiffres, tirets.',
    maxLength: 32,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(32)
  @Matches(/^[A-Z0-9_-]+$/, {
    message: 'Le code ne peut contenir que des lettres majuscules, chiffres, tirets et tirets bas.',
  })
  @Transform(upperTrim)
  code!: string;

  @ApiProperty({ example: 'Roulements et paliers', maxLength: 160 })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  @Transform(trim)
  label!: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}

export class ListCategoriesQueryDto extends PaginationQueryDto {}
