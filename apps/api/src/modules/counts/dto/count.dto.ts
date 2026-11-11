import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CountSource, CountStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/** Nombre maximal de comptages acceptés en une seule synchronisation. */
export const MAX_SYNC_BATCH = 500;

export class CountDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  itemId!: string;

  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ example: 'k.benali' })
  username!: string;

  @ApiProperty({ example: 12.5 })
  quantity!: number;

  @ApiProperty({ description: 'Date et heure du comptage, telles que saisies sur le terrain.' })
  countedAt!: Date;

  @ApiProperty({ enum: CountSource, enumName: 'CountSource' })
  source!: CountSource;

  @ApiProperty({
    format: 'uuid',
    description: 'Identifiant généré par le client, garant de l’idempotence.',
  })
  clientUuid!: string;

  @ApiPropertyOptional({ nullable: true })
  deviceId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  note!: string | null;

  @ApiProperty({ enum: CountStatus, enumName: 'CountStatus' })
  status!: CountStatus;

  @ApiPropertyOptional({ nullable: true, type: Date })
  cancelledAt!: Date | null;
}

export class CreateCountDto {
  @ApiProperty({ minimum: 0, example: 12.5, description: 'Quantité comptée. Trois décimales.' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 }, { message: 'La quantité admet au plus 3 décimales.' })
  @Min(0, { message: 'Une quantité comptée ne peut pas être négative.' })
  quantity!: number;

  @ApiProperty({
    format: 'uuid',
    description:
      'UUID v4 généré par le client **avant** l’envoi. C’est la clé ' +
      'd’idempotence : un comptage rejoué après une coupure réseau n’est jamais ' +
      'enregistré deux fois.',
  })
  @IsUUID('4', { message: 'clientUuid doit être un UUID v4.' })
  clientUuid!: string;

  @ApiPropertyOptional({
    description:
      'Horodatage de la saisie sur le terrain, au format ISO 8601. En mode hors ' +
      'ligne, il peut précéder de plusieurs heures la réception par le serveur.',
  })
  @IsOptional()
  @IsISO8601()
  countedAt?: string;

  @ApiPropertyOptional({ enum: CountSource, enumName: 'CountSource', default: CountSource.MOBILE })
  @IsOptional()
  @IsEnum(CountSource)
  source?: CountSource;

  @ApiPropertyOptional({ maxLength: 120, description: 'Identifiant du terminal.' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  deviceId?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }: { value: unknown }): unknown =>
    typeof value === 'string' ? value.trim() : value,
  )
  note?: string;
}

export class SyncCountItemDto extends CreateCountDto {
  @ApiProperty({ format: 'uuid', description: 'Ligne d’inventaire concernée.' })
  @IsUUID()
  itemId!: string;
}

export class SyncCountsDto {
  @ApiProperty({
    type: [SyncCountItemDto],
    maxItems: MAX_SYNC_BATCH,
    description: 'File d’attente locale du terminal, envoyée dès le retour du réseau.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_SYNC_BATCH, {
    message: `Au plus ${MAX_SYNC_BATCH} comptages par envoi.`,
  })
  @ValidateNested({ each: true })
  @Type(() => SyncCountItemDto)
  counts!: SyncCountItemDto[];
}

export class SyncResultEntryDto {
  @ApiProperty({ format: 'uuid' })
  clientUuid!: string;

  @ApiProperty({
    enum: ['created', 'duplicate', 'rejected'],
    description:
      '`duplicate` : comptage déjà enregistré, rejoué sans effet. Le terminal ' +
      'peut purger la ligne de sa file d’attente dans les deux premiers cas.',
  })
  outcome!: 'created' | 'duplicate' | 'rejected';

  @ApiPropertyOptional({ nullable: true, description: 'Motif du rejet.' })
  reason!: string | null;
}

export class SyncCountsResultDto {
  @ApiProperty()
  received!: number;

  @ApiProperty()
  created!: number;

  @ApiProperty({ description: 'Comptages déjà connus du serveur.' })
  duplicates!: number;

  @ApiProperty()
  rejected!: number;

  @ApiProperty({
    type: [SyncResultEntryDto],
    description: 'Résultat par comptage, dans l’ordre d’envoi.',
  })
  results!: SyncResultEntryDto[];
}

export class CancelCountDto {
  @ApiProperty({ maxLength: 500, description: 'Motif de l’annulation.' })
  @IsString()
  @MaxLength(500)
  reason!: string;
}
