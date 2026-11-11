import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ItemStatus, Prisma } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

/**
 * Filtres de la liste de comptage, tels qu'attendus sur le terrain.
 *
 * Leur sémantique est **relative à l'utilisateur connecté** : sur une campagne
 * en double comptage, une ligne déjà comptée par un collègue reste à compter
 * pour moi. C'est la seule lecture utile pour l'opérateur.
 */
export const ITEM_FILTERS = [
  'all',
  'remaining',
  'counted',
  'not_found',
  'discrepancy',
  'investigation',
  'manual',
] as const;
export type ItemFilter = (typeof ITEM_FILTERS)[number];

export const ITEM_SORT_FIELDS = ['location', 'designation', 'code', 'lineNo'] as const;
export type ItemSortField = (typeof ITEM_SORT_FIELDS)[number];

export class ItemArticleDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'ACCEL-0016' })
  code!: string;

  @ApiProperty({ example: 'PALIER REF: 0901323439' })
  designation!: string;

  @ApiProperty({ example: 'Unité' })
  unit!: string;

  @ApiPropertyOptional({ nullable: true, example: 'KRONES' })
  brand!: string | null;

  @ApiPropertyOptional({ nullable: true, example: '0901323439' })
  manufacturerRef!: string | null;
}

export class ItemLocationDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: '1-1-C-7' })
  code!: string;

  @ApiPropertyOptional({ nullable: true })
  label!: string | null;

  @ApiProperty({
    description: 'Emplacement fictif regroupant les articles sans emplacement renseigné.',
  })
  isVirtual!: boolean;
}

export class InventoryItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  listId!: string;

  @ApiProperty({ type: ItemArticleDto })
  article!: ItemArticleDto;

  @ApiProperty({ type: ItemLocationDto })
  location!: ItemLocationDto;

  @ApiPropertyOptional({
    nullable: true,
    example: 2,
    description:
      'Quantité attendue, issue de l’extraction SAP importée. **Toujours `null` ' +
      'pour un opérateur** : connaître le théorique avant de compter oriente le ' +
      'comptage, et la valeur ne doit donc jamais quitter le serveur à destination ' +
      'd’un terminal de saisie.',
  })
  theoreticalQty!: number | null;

  @ApiPropertyOptional({
    nullable: true,
    description:
      'Quantité retenue. Nulle tant que la ligne n’est pas résolue, et toujours ' +
      'nulle pour un opérateur.',
  })
  finalQty!: number | null;

  @ApiPropertyOptional({ nullable: true, description: 'Valeur tranchée par le superviseur.' })
  arbitratedQty!: number | null;

  @ApiProperty({ enum: ItemStatus, enumName: 'ItemStatus' })
  status!: ItemStatus;

  @ApiPropertyOptional({
    nullable: true,
    description:
      'Écart = quantité finale − quantité théorique. Positif = surplus. ' +
      'Toujours `null` pour un opérateur, qui n’a pas à connaître le théorique.',
  })
  variance!: number | null;

  @ApiPropertyOptional({
    nullable: true,
    description:
      'Valeur de l’écart, au Pmp figé à l’import. Réservé aux rôles ADMIN et ' +
      'SUPERVISOR : absent des réponses faites à un opérateur.',
  })
  varianceValue?: number | null;

  @ApiPropertyOptional({
    description: 'Prix unitaire figé à l’import. Réservé à ADMIN et SUPERVISOR.',
  })
  unitPrice?: number;

  @ApiProperty({ description: 'Nombre de comptages valides, tous opérateurs confondus.' })
  countCount!: number;

  @ApiProperty({ description: 'L’utilisateur connecté a-t-il déjà compté cette ligne ?' })
  countedByMe!: boolean;

  @ApiPropertyOptional({ nullable: true, description: 'Dernière quantité saisie par moi.' })
  myLastQuantity!: number | null;

  @ApiProperty({ example: 1, description: 'Numéro de ligne du fichier source.' })
  lineNo!: number;

  @ApiProperty({
    description:
      'Ligne absente de l’extraction SAP, ajoutée sur le terrain. Sa quantité ' +
      'théorique est nulle : tout ce qui est compté est un surplus à créer dans l’ERP.',
  })
  isManual!: boolean;

  @ApiPropertyOptional({
    nullable: true,
    example: 2,
    description:
      'Rang du prochain comptage attendu (Méthode 3). `null` si la ligne est ' +
      'résolue ou si la méthode n’enchaîne pas les comptages.',
  })
  expectedCountNumber!: number | null;
}

export class AddListItemDto {
  @ApiProperty({
    example: 'ACCEL-0016',
    description:
      'Code de l’article. S’il est inconnu du référentiel, l’article est créé — ' +
      'c’est précisément le cas d’usage : un article trouvé en rayon et absent de ' +
      'l’extraction SAP.',
  })
  @IsString()
  @MaxLength(64)
  articleCode!: string;

  @ApiPropertyOptional({
    maxLength: 255,
    description:
      'Désignation. Obligatoire si l’article n’existe pas encore ; ignorée sinon, ' +
      'pour qu’une saisie terrain ne réécrive pas le référentiel.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  designation?: string;

  @ApiPropertyOptional({
    maxLength: 64,
    description:
      'Code emplacement. Inconnu, il est créé. Absent, la ligne est rattachée à ' +
      'l’emplacement virtuel NON-LOCALISE du magasin.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  locationCode?: string;

  @ApiPropertyOptional({ maxLength: 32, description: 'Unité. Par défaut « Unité ».' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  unit?: string;

  @ApiPropertyOptional({
    maxLength: 500,
    description: 'Précision de l’opérateur sur l’origine de la ligne.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

const toNumber = (value: Prisma.Decimal | null): number | null =>
  value === null ? null : new Prisma.Decimal(value).toNumber();

export const decimalToNumber = toNumber;

export class ListItemsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: ITEM_FILTERS,
    default: 'all',
    description:
      '`remaining` : aucune saisie de ma part et ligne non déclarée introuvable. ' +
      '`counted` : au moins une saisie de ma part. `not_found` : déclarée ' +
      'introuvable. `discrepancy` : tout ce qui bloque la clôture. ' +
      '`investigation` : lignes en enquête (Méthode 3). `manual` : lignes ' +
      'ajoutées sur le terrain, absentes du fichier importé.',
  })
  @IsOptional()
  @IsIn(ITEM_FILTERS)
  filter: ItemFilter = 'all';

  @ApiPropertyOptional({
    description:
      'Recherche sur le code article, la désignation, l’emplacement, la marque et ' +
      'la référence fabricant.',
  })
  declare q?: string;

  @ApiPropertyOptional({ description: 'Restreint à un emplacement (code exact).' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  location?: string;

  @ApiPropertyOptional({
    default: false,
    description:
      'Masque les lignes dont la quantité théorique est nulle. Sur le fichier de ' +
      'référence, elles représentent 47 % des lignes.',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }): unknown => {
    if (typeof value === 'boolean') return value;
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hideZeroTheoretical = false;

  @ApiPropertyOptional({
    enum: ITEM_SORT_FIELDS,
    default: 'location',
    description: 'Par défaut : emplacement (ordre physique de parcours), puis désignation.',
  })
  @IsOptional()
  @IsIn(ITEM_SORT_FIELDS)
  sortBy: ItemSortField = 'location';
}

export class MarkNotFoundDto {
  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class ArbitrateItemDto {
  @ApiProperty({
    minimum: 0,
    description:
      'Quantité retenue par le superviseur. Prime sur tous les comptages et ' + 'dénoue le litige.',
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0, { message: 'La quantité arbitrée ne peut pas être négative.' })
  quantity!: number;

  @ApiProperty({
    maxLength: 500,
    description: 'Motif de l’arbitrage. Obligatoire : il engage le résultat de l’inventaire.',
  })
  @IsString()
  @MaxLength(500)
  note!: string;
}
