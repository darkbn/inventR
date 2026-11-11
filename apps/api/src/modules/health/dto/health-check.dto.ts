import { ApiProperty } from '@nestjs/swagger';

export class DependencyHealthDto {
  @ApiProperty({ enum: ['up', 'down'], description: 'État de la dépendance' })
  status!: 'up' | 'down';

  @ApiProperty({ description: 'Temps de réponse en millisecondes', example: 3 })
  latencyMs!: number;

  @ApiProperty({ required: false, description: "Motif de l'indisponibilité" })
  error?: string;
}

export class HealthChecksDto {
  @ApiProperty({ type: DependencyHealthDto })
  database!: DependencyHealthDto;
}

export class HealthCheckDto {
  @ApiProperty({ enum: ['ok', 'error'] })
  status!: 'ok' | 'error';

  @ApiProperty({ description: 'Horodatage ISO 8601 de la vérification' })
  timestamp!: string;

  @ApiProperty({ description: 'Durée de fonctionnement du processus, en secondes' })
  uptimeSeconds!: number;

  @ApiProperty({ description: "Version de l'API" })
  version!: string;

  @ApiProperty({ type: HealthChecksDto })
  checks!: HealthChecksDto;
}
