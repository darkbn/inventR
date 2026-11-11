import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { InventoryMethod, Prisma } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class InventoryMethodDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({
    example: 'METHOD_2',
    description:
      'Code technique résolu par InventoryCalculationService. Il est immuable : ' +
      'le modifier détacherait la méthode de sa stratégie de calcul.',
  })
  code!: string;

  @ApiProperty({ example: 'Méthode 2 — Double comptage contradictoire' })
  label!: string;

  @ApiPropertyOptional({ nullable: true, description: 'Règle de calcul, en clair.' })
  description!: string | null;

  @ApiProperty({
    description: 'Paramètres propres à la méthode (nombre de comptages requis, etc.).',
    example: { minCounts: 2, aggregation: 'AGREEMENT', requireDistinctCounters: true },
  })
  config!: Prisma.JsonValue;

  @ApiProperty()
  isActive!: boolean;

  @ApiPropertyOptional({ description: 'Nombre de campagnes utilisant cette méthode.' })
  campaignCount?: number;

  static from(method: InventoryMethod, campaignCount?: number): InventoryMethodDto {
    return {
      id: method.id,
      code: method.code,
      label: method.label,
      description: method.description,
      config: method.config,
      isActive: method.isActive,
      ...(campaignCount === undefined ? {} : { campaignCount }),
    };
  }
}

/**
 * Seuls le libellé, la description et l'activation sont modifiables.
 *
 * Ni le code ni la configuration ne le sont : le code relie la méthode à sa
 * stratégie de calcul, et modifier la configuration d'une méthode changerait
 * rétroactivement le résultat de campagnes en cours. Une variante de règle se
 * crée comme une nouvelle méthode.
 */
export class UpdateInventoryMethodDto {
  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Transform(({ value }: { value: unknown }): unknown =>
    typeof value === 'string' ? value.trim() : value,
  )
  label?: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
