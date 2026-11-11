import { Controller, Get, HttpCode, HttpStatus, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

import { Public } from '../auth/decorators/public.decorator';

import { HealthService } from './health.service';
import { HealthCheckDto } from './dto/health-check.dto';

@ApiTags('Santé')
@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "État de santé de l'API",
    description:
      'Vérifie la connectivité à PostgreSQL. Utilisé par le healthcheck Docker et ' +
      'par le reverse proxy. Renvoie 503 si la base est injoignable.',
  })
  @ApiResponse({
    status: 200,
    description: 'API et base de données opérationnelles',
    type: HealthCheckDto,
  })
  @ApiResponse({ status: 503, description: 'Au moins une dépendance est indisponible' })
  async check(@Res({ passthrough: true }) response: Response): Promise<HealthCheckDto> {
    const result = await this.healthService.check();

    if (result.status !== 'ok') {
      response.status(HttpStatus.SERVICE_UNAVAILABLE);
    }

    return result;
  }
}
