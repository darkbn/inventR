import { ApiProperty, ApiPropertyOptional, PartialType, PickType } from '@nestjs/swagger';
import type { Article } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

import { DEFAULT_UNIT } from '../../../common/constants/inventory.constants';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

/**
 * Format des codes articles, calibré sur le fichier de référence du client
 * (7 961 codes) : 7 901 suivent `AAAAA-9999`, les 60 autres sont des variantes
 * légitimes — suffixe lettre (`ACCOU-0060L`) ou préfixe de 4 lettres
 * (`INOX-0001`). L'expression couvre les trois formes sans rien laisser passer
 * d'arbitraire.
 */
export const ARTICLE_CODE_PATTERN = /^[A-Z0-9]{3,6}-\d{3,6}[A-Z]?$/;

const upperTrim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class ArticleDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'ACCEL-0016' })
  code!: string;

  @ApiProperty({ example: 'PALIER REF: 0901323439' })
  designation!: string;

  @ApiProperty({ example: 'Unité', description: 'Unité de gestion.' })
  unit!: string;

  @ApiPropertyOptional({ nullable: true, example: 'KRONES' })
  brand!: string | null;

  @ApiPropertyOptional({ nullable: true, example: '0901323439' })
  manufacturerRef!: string | null;

  @ApiPropertyOptional({ nullable: true, format: 'uuid' })
  categoryId!: string | null;

  @ApiPropertyOptional({ nullable: true, format: 'uuid' })
  defaultLocationId!: string | null;

  @ApiPropertyOptional({
    description:
      'Dernier prix moyen pondéré connu. Réservé aux rôles ADMIN et SUPERVISOR : ' +
      'ce champ est absent des réponses faites à un opérateur.',
    example: 5689.2846,
  })
  lastPmp?: number;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  /**
   * @param withValuation false pour le rôle USER : aucune donnée financière ne
   *   doit parvenir à l'application mobile.
   */
  static from(article: Article, withValuation: boolean): ArticleDto {
    return {
      id: article.id,
      code: article.code,
      designation: article.designation,
      unit: article.unit,
      brand: article.brand,
      manufacturerRef: article.manufacturerRef,
      categoryId: article.categoryId,
      defaultLocationId: article.defaultLocationId,
      ...(withValuation ? { lastPmp: new Prisma.Decimal(article.lastPmp).toNumber() } : {}),
      isActive: article.isActive,
      createdAt: article.createdAt,
      updatedAt: article.updatedAt,
    };
  }
}

export class CreateArticleDto {
  @ApiProperty({ example: 'ACCEL-0016', maxLength: 64 })
  @IsString()
  @MaxLength(64)
  @Matches(ARTICLE_CODE_PATTERN, {
    message:
      'Le code article doit suivre le format « LETTRES-CHIFFRES », par exemple ACCEL-0016, ACCOU-0060L ou INOX-0001.',
  })
  @Transform(upperTrim)
  code!: string;

  @ApiProperty({ example: 'PALIER REF: 0901323439', maxLength: 255 })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  @Transform(trim)
  designation!: string;

  @ApiPropertyOptional({ default: DEFAULT_UNIT, maxLength: 32 })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  @Transform(trim)
  unit?: string;

  @ApiPropertyOptional({ maxLength: 120, example: 'KRONES' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Transform(trim)
  brand?: string;

  @ApiPropertyOptional({ maxLength: 120, example: '0901323439' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Transform(trim)
  manufacturerRef?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsString()
  defaultLocationId?: string;

  @ApiPropertyOptional({ minimum: 0, description: 'Prix moyen pondéré.' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0, { message: 'Le prix moyen pondéré ne peut pas être négatif.' })
  lastPmp?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateArticleDto extends PartialType(
  PickType(CreateArticleDto, [
    'designation',
    'unit',
    'brand',
    'manufacturerRef',
    'categoryId',
    'defaultLocationId',
    'lastPmp',
    'isActive',
  ] as const),
) {}

export const ARTICLE_SORT_FIELDS = ['code', 'designation', 'brand', 'createdAt'] as const;
export type ArticleSortField = (typeof ARTICLE_SORT_FIELDS)[number];

export class ListArticlesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description:
      'Recherche sur le code, la désignation, la marque et la référence fabricant — ' +
      'les quatre critères utilisés sur le terrain.',
  })
  declare q?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ example: 'KRONES' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  brand?: string;

  @ApiPropertyOptional({ enum: ARTICLE_SORT_FIELDS, default: 'code' })
  @IsOptional()
  @IsIn(ARTICLE_SORT_FIELDS)
  sortBy: ArticleSortField = 'code';
}
