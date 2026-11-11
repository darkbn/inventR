import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ImportStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

const toBoolean = ({ value }: { value: unknown }): unknown => {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
};

export class ImportOptionsDto {
  @ApiPropertyOptional({
    default: false,
    description:
      'Exclure les lignes dont la quantité théorique est nulle. Sur le fichier ' +
      'de référence, elles représentent 47 % des lignes. Les conserver permet de ' +
      'détecter un surplus sur un article théoriquement absent — c’est l’intérêt ' +
      'même d’un inventaire.',
  })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  excludeZeroQuantity = false;

  @ApiPropertyOptional({
    default: true,
    description:
      'Mettre à jour la quantité théorique des lignes déjà présentes dans la ' +
      'liste. Sinon, seules les lignes nouvelles sont ajoutées.',
  })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  updateExisting = true;
}

export class ImportErrorDto {
  @ApiProperty({ description: 'Numéro de ligne dans le fichier déposé.', example: 42 })
  line!: number;

  @ApiProperty({ example: 'Quantite' })
  column!: string;

  @ApiProperty({ example: 'QUANTITY_NEGATIVE' })
  code!: string;

  @ApiProperty({ example: 'La quantité théorique ne peut pas être négative.' })
  message!: string;

  @ApiPropertyOptional({ nullable: true, description: 'Valeur fautive, telle que lue.' })
  value!: string | null;
}

export class ImportWarningDto {
  @ApiPropertyOptional({
    nullable: true,
    description: 'Nul si l’avertissement porte sur le fichier entier.',
  })
  line!: number | null;

  @ApiProperty({ example: 'UNLOCATED_ROWS' })
  code!: string;

  @ApiProperty()
  message!: string;
}

export class ImportBatchDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  listId!: string;

  @ApiProperty({ example: 'Stocks_14-06-2026.xlsx' })
  filename!: string;

  @ApiProperty({ enum: ImportStatus, enumName: 'ImportStatus' })
  status!: ImportStatus;

  @ApiProperty({ example: 7961, description: 'Lignes de données lues dans le fichier.' })
  rowsTotal!: number;

  @ApiProperty({ example: 7961, description: 'Lignes valides, prêtes à être importées.' })
  rowsOk!: number;

  @ApiProperty({ example: 0, description: 'Lignes rejetées.' })
  rowsError!: number;

  @ApiProperty({ type: [ImportErrorDto], description: 'Erreurs bloquantes, ligne par ligne.' })
  errors!: ImportErrorDto[];

  @ApiProperty({ type: [ImportWarningDto], description: 'Avertissements non bloquants.' })
  warnings!: ImportWarningDto[];

  @ApiPropertyOptional({ nullable: true, type: Date })
  appliedAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;
}

export class ApplyImportResultDto {
  @ApiProperty({ format: 'uuid' })
  batchId!: string;

  @ApiProperty({ description: 'Lignes d’inventaire créées.' })
  itemsCreated!: number;

  @ApiProperty({ description: 'Lignes d’inventaire mises à jour.' })
  itemsUpdated!: number;

  @ApiProperty({ description: 'Articles créés au passage dans le référentiel.' })
  articlesCreated!: number;

  @ApiProperty({ description: 'Emplacements créés au passage dans le référentiel.' })
  locationsCreated!: number;

  @ApiProperty({ description: 'Durée de l’opération, en millisecondes.' })
  durationMs!: number;
}
