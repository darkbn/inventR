import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';

import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { clientContextFrom } from '../../common/utils/client-context';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

import { CountsService } from './counts.service';
import {
  CancelCountDto,
  CountDto,
  CreateCountDto,
  SyncCountsDto,
  SyncCountsResultDto,
} from './dto/count.dto';

@ApiTags('Comptages')
@ApiBearerAuth('bearer')
@UseInterceptors(AuditInterceptor)
@Controller()
export class CountsController {
  constructor(private readonly countsService: CountsService) {}

  @Post('items/:itemId/counts')
  @ApiOperation({
    summary: 'Enregistrer un comptage',
    description:
      'Idempotent sur `clientUuid` : si la réponse se perd et que le terminal ' +
      'réémet, le comptage existant est renvoyé plutôt que dupliqué. C’est ce qui ' +
      'rend la saisie sûre en réseau instable.',
  })
  @ApiResponse({ status: 201, type: CountDto })
  @ApiConflictResponse({ description: 'Campagne clôturée, ou identifiant déjà utilisé ailleurs' })
  create(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: CreateCountDto,
    @Req() request: Request,
  ): Promise<CountDto> {
    return this.countsService.create(actor, itemId, dto, clientContextFrom(request));
  }

  @Post('counts/sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Synchroniser la file d’attente hors ligne',
    description:
      'Envoi groupé des comptages accumulés hors réseau. Chaque entrée est traitée ' +
      'indépendamment : une ligne rejetée ne fait pas échouer le lot, sinon le ' +
      'terminal resterait bloqué avec une file inexploitable. Le résultat est ' +
      'détaillé comptage par comptage pour que le client purge sa file en ' +
      'connaissance de cause.',
  })
  @ApiResponse({ status: 200, type: SyncCountsResultDto })
  sync(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: SyncCountsDto,
    @Req() request: Request,
  ): Promise<SyncCountsResultDto> {
    return this.countsService.sync(actor, dto, clientContextFrom(request));
  }

  @Get('items/:itemId/counts')
  @ApiOperation({
    summary: 'Historique des comptages d’une ligne',
    description: 'Qui a compté quoi, et quand — comptages annulés compris.',
  })
  @ApiResponse({ status: 200, type: [CountDto] })
  findByItem(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ): Promise<CountDto[]> {
    return this.countsService.findByItem(actor, itemId);
  }

  @Get('my/counts')
  @ApiOperation({
    summary: 'Mes derniers comptages',
    description: 'Écran « historique » de l’application mobile.',
  })
  @ApiResponse({ status: 200, type: [CountDto] })
  findMine(
    @CurrentUser() actor: AuthenticatedUser,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ): Promise<CountDto[]> {
    return this.countsService.findMine(actor, Math.min(Math.max(limit, 1), 200));
  }

  @Patch('counts/:id/cancel')
  @ApiOperation({
    summary: 'Annuler un comptage',
    description:
      'Le comptage n’est jamais supprimé : il reste au dossier avec son auteur, sa ' +
      'date et le motif d’annulation. Seule son exclusion du calcul change. Un ' +
      'opérateur ne peut annuler que ses propres saisies.',
  })
  @ApiResponse({ status: 200, type: CountDto })
  cancel(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelCountDto,
    @Req() request: Request,
  ): Promise<CountDto> {
    return this.countsService.cancel(actor, id, dto, clientContextFrom(request));
  }
}
