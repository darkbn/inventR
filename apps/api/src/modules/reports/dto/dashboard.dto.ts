import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CampaignStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

const toBoolean = ({ value }: { value: unknown }): unknown => {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
};

export class DashboardQueryDto {
  @ApiPropertyOptional({
    default: true,
    description:
      'Exclure les lignes dont la quantité théorique est nulle. Activé par ' +
      'défaut : sur le fichier de référence elles représentent 47 % des lignes ' +
      'et noieraient les indicateurs.',
  })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  hideZeroTheoretical = true;
}

export class CampaignProgressDto {
  @ApiProperty({ description: 'Lignes de la campagne, après application du filtre.' })
  totalItems!: number;

  @ApiProperty({ description: 'Lignes jamais comptées.' })
  pending!: number;

  @ApiProperty({ description: 'Lignes comptées (Méthode 1).' })
  counted!: number;

  @ApiProperty({ description: 'Lignes confirmées (Méthode 2).' })
  confirmed!: number;

  @ApiProperty({ description: 'Lignes en attente d’un second comptage.' })
  awaitingSecondCount!: number;

  @ApiProperty({ description: 'Lignes en attente d’un troisième comptage (Méthode 3).' })
  awaitingThirdCount!: number;

  @ApiProperty({
    description:
      'Lignes sous enquête (Méthode 3) : trois comptages n’ont pas confirmé le ' +
      'théorique, seul le superviseur peut les trancher.',
  })
  underInvestigation!: number;

  @ApiProperty({ description: 'Litiges non tranchés.' })
  discrepancies!: number;

  @ApiProperty({ description: 'Lignes déclarées introuvables.' })
  notFound!: number;

  @ApiProperty({
    description:
      'Lignes ajoutées sur le terrain, absentes du fichier importé. Autant ' +
      'd’articles à créer dans l’ERP.',
  })
  manualItems!: number;

  @ApiProperty({ description: 'Avancement, de 0 à 100.', example: 62.4 })
  completionPercent!: number;
}

export class VarianceSummaryDto {
  @ApiProperty({ description: 'Lignes en surplus (écart positif).' })
  surplusCount!: number;

  @ApiProperty({ description: 'Lignes en manque (écart négatif).' })
  shortageCount!: number;

  @ApiProperty({ description: 'Lignes conformes.' })
  matchingCount!: number;

  @ApiProperty({ description: 'Total des quantités en surplus.' })
  surplusQuantity!: number;

  @ApiProperty({ description: 'Total des quantités manquantes, en valeur absolue.' })
  shortageQuantity!: number;

  @ApiPropertyOptional({
    description: 'Valeur des surplus. Réservé aux rôles ADMIN et SUPERVISOR.',
  })
  surplusValue?: number;

  @ApiPropertyOptional({ description: 'Valeur des manques, en valeur absolue.' })
  shortageValue?: number;

  @ApiPropertyOptional({
    description: 'Valeur nette de l’écart : surplus moins manques.',
  })
  netValue?: number;
}

export class TopVarianceDto {
  @ApiProperty({ format: 'uuid' })
  itemId!: string;

  @ApiProperty({ example: 'ACCEL-0016' })
  articleCode!: string;

  @ApiProperty()
  designation!: string;

  @ApiProperty({ example: '9-2-C-6' })
  locationCode!: string;

  @ApiProperty()
  theoreticalQty!: number;

  @ApiProperty()
  finalQty!: number;

  @ApiProperty({ description: 'Écart = quantité finale − quantité théorique.' })
  variance!: number;

  @ApiPropertyOptional({ description: 'Valeur de l’écart.' })
  varianceValue?: number;
}

export class ListProgressDto {
  @ApiProperty({ format: 'uuid' })
  listId!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  totalItems!: number;

  @ApiProperty()
  handledItems!: number;

  @ApiProperty({ example: 48.3 })
  completionPercent!: number;

  @ApiProperty({ type: [String], description: 'Opérateurs affectés.' })
  assignees!: string[];
}

export class CounterActivityDto {
  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty()
  username!: string;

  @ApiProperty()
  fullName!: string;

  @ApiProperty({ description: 'Nombre de comptages valides enregistrés.' })
  countEntries!: number;

  @ApiProperty({ description: 'Nombre de lignes distinctes couvertes.' })
  itemsCovered!: number;

  @ApiProperty({ description: 'Somme des quantités saisies.' })
  totalQuantity!: number;

  @ApiPropertyOptional({ nullable: true, type: Date, description: 'Premier comptage.' })
  firstCountAt!: Date | null;

  @ApiPropertyOptional({ nullable: true, type: Date, description: 'Dernier comptage.' })
  lastCountAt!: Date | null;
}

export class CampaignDashboardDto {
  @ApiProperty({ format: 'uuid' })
  campaignId!: string;

  @ApiProperty({ example: 'INV-2026-PDR-01' })
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: CampaignStatus, enumName: 'CampaignStatus' })
  status!: CampaignStatus;

  @ApiProperty({ example: 1 })
  round!: number;

  @ApiProperty({ example: 'METHOD_2' })
  methodCode!: string;

  @ApiProperty()
  methodLabel!: string;

  @ApiProperty({ example: 'Pièces de rechange (PDR)' })
  campaignTypeLabel!: string;

  @ApiProperty({ example: '19R01' })
  warehouseCode!: string;

  @ApiProperty({
    description: 'Les lignes à quantité théorique nulle sont-elles exclues des indicateurs ?',
  })
  zeroTheoreticalHidden!: boolean;

  @ApiProperty({ type: CampaignProgressDto })
  progress!: CampaignProgressDto;

  @ApiProperty({ type: VarianceSummaryDto })
  variance!: VarianceSummaryDto;

  @ApiProperty({ type: [TopVarianceDto], description: 'Écarts les plus importants.' })
  topVariances!: TopVarianceDto[];

  @ApiProperty({ type: [ListProgressDto], description: 'Avancement par liste.' })
  lists!: ListProgressDto[];

  @ApiProperty({ type: [CounterActivityDto], description: 'Activité par opérateur.' })
  counters!: CounterActivityDto[];

  @ApiPropertyOptional({ nullable: true, type: Date })
  startedAt!: Date | null;

  @ApiPropertyOptional({ nullable: true, type: Date })
  closedAt!: Date | null;
}
