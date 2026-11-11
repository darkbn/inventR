import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseInterceptors,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';

import { Audit } from '../../common/decorators/audit.decorator';
import { ApiPaginatedResponse, type PaginatedDto } from '../../common/dto/paginated-response.dto';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { clientContextFrom } from '../../common/utils/client-context';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

import { CampaignsService } from './campaigns.service';
import {
  AssignCampaignUserDto,
  CampaignDto,
  CloseCampaignDto,
  DeleteCampaignDto,
  ClosureReadinessDto,
  CreateCampaignDto,
  ListCampaignsQueryDto,
  NextRoundDto,
  ReopenCampaignDto,
  UpdateCampaignDto,
} from './dto/campaign.dto';

@ApiTags('Campagnes')
@ApiBearerAuth('bearer')
@UseInterceptors(AuditInterceptor)
@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get()
  @ApiOperation({
    summary: 'Lister les campagnes',
    description:
      'Un opérateur ne voit que les campagnes dans lesquelles une liste lui est ' + 'attribuée.',
  })
  @ApiPaginatedResponse(CampaignDto)
  findAll(
    @CurrentUser() actor: AuthenticatedUser,
    @Query() query: ListCampaignsQueryDto,
  ): Promise<PaginatedDto<CampaignDto>> {
    return this.campaignsService.findAll(actor, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consulter une campagne' })
  @ApiResponse({ status: 200, type: CampaignDto })
  findOne(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CampaignDto> {
    return this.campaignsService.findOne(actor, id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @Audit({ action: 'CAMPAIGN_CREATE', entityType: 'Campaign', captureFields: ['code', 'name'] })
  @ApiOperation({
    summary: 'Créer une campagne',
    description: 'La campagne est créée en préparation (DRAFT) : aucun comptage n’est possible.',
  })
  @ApiResponse({ status: 201, type: CampaignDto })
  create(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CreateCampaignDto,
  ): Promise<CampaignDto> {
    return this.campaignsService.create(actor, dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @Audit({ action: 'CAMPAIGN_UPDATE', entityType: 'Campaign', captureFields: ['name'] })
  @ApiOperation({
    summary: 'Modifier une campagne',
    description:
      'Possible tant que la campagne est en préparation ou ouverte. La méthode de ' +
      'calcul ne peut plus changer dès le premier comptage enregistré : elle ' +
      'réinterpréterait des saisies déjà faites.',
  })
  @ApiResponse({ status: 200, type: CampaignDto })
  @ApiConflictResponse({ description: 'Campagne non modifiable, ou comptages déjà enregistrés' })
  update(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCampaignDto,
  ): Promise<CampaignDto> {
    return this.campaignsService.update(actor, id, dto);
  }

  @Post(':id/open')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @HttpCode(HttpStatus.OK)
  @Audit({ action: 'CAMPAIGN_OPEN', entityType: 'Campaign' })
  @ApiOperation({
    summary: 'Ouvrir la campagne au comptage',
    description:
      'Active les listes, qui deviennent visibles des opérateurs affectés. Refusé ' +
      'si la campagne ne comporte aucune ligne.',
  })
  @ApiResponse({ status: 200, type: CampaignDto })
  @ApiConflictResponse({ description: 'Statut incompatible, ou campagne vide' })
  open(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CampaignDto> {
    return this.campaignsService.open(actor, id);
  }

  @Get(':id/closure-readiness')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({
    summary: 'Bilan avant clôture',
    description:
      'Indique combien de lignes passeront à 0 et ce qui bloque encore la ' +
      'clôture. Fournit aussi le texte d’avertissement à afficher, afin que le ' +
      'web et le mobile présentent exactement le même message.',
  })
  @ApiResponse({ status: 200, type: ClosureReadinessDto })
  closureReadiness(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ClosureReadinessDto> {
    return this.campaignsService.closureReadiness(actor, id);
  }

  @Post(':id/close')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Clôturer la campagne',
    description:
      'Opération irréversible. Exige `confirmZeroMissing: true` : les articles non ' +
      'trouvés sont alors mis à quantité 0. Refusée tant qu’une ligne attend un ' +
      'second comptage ou qu’un litige n’est pas tranché. Tout se fait dans une ' +
      'seule transaction.',
  })
  @ApiResponse({ status: 200, type: CampaignDto })
  @ApiBadRequestResponse({ description: 'Confirmation de mise à zéro absente' })
  @ApiConflictResponse({ description: 'Campagne déjà clôturée, ou lignes bloquantes' })
  close(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CloseCampaignDto,
    @Req() request: Request,
  ): Promise<CampaignDto> {
    return this.campaignsService.close(actor, id, dto, clientContextFrom(request));
  }

  @Post(':id/reopen')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Rouvrir une campagne clôturée',
    description:
      'Action administrative exceptionnelle, réservée au rôle ADMIN et exigeant un ' +
      'motif écrit. Refusée si un passage suivant a déjà été créé.',
  })
  @ApiResponse({ status: 200, type: CampaignDto })
  @ApiForbiddenResponse({ description: 'Réservé aux administrateurs' })
  @ApiConflictResponse({ description: 'Campagne non clôturée, ou passage suivant existant' })
  reopen(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReopenCampaignDto,
    @Req() request: Request,
  ): Promise<CampaignDto> {
    return this.campaignsService.reopen(actor, id, dto, clientContextFrom(request));
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Supprimer définitivement une campagne',
    description:
      'Supprime la campagne et, en cascade, ses listes, lignes, comptages, ' +
      'affectations et rapports. Irréversible. Réservée au rôle ADMIN, elle exige ' +
      'la saisie du code exact de la campagne et un motif écrit, tous deux ' +
      'journalisés avec le décompte de ce qui a été détruit. Refusée sur une ' +
      'campagne clôturée — dossier d’inventaire — ou ayant engendré un passage suivant.',
  })
  @ApiResponse({ status: 204, description: 'Campagne supprimée' })
  @ApiBadRequestResponse({ description: 'Code de confirmation incorrect' })
  @ApiForbiddenResponse({ description: 'Réservé aux administrateurs' })
  @ApiConflictResponse({ description: 'Campagne clôturée, ou passage suivant existant' })
  async remove(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DeleteCampaignDto,
    @Req() request: Request,
  ): Promise<void> {
    await this.campaignsService.remove(actor, id, dto, clientContextFrom(request));
  }

  @Post(':id/next-round')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({
    summary: 'Créer le passage suivant',
    description:
      'Crée une nouvelle campagne à partir des résultats de celle-ci, en ne ' +
      'reprenant que les lignes en écart, non trouvées ou litigieuses. La quantité ' +
      'théorique du nouveau passage est, par défaut, la quantité finale du ' +
      'précédent. Les affectations sont reconduites.',
  })
  @ApiResponse({ status: 201, type: CampaignDto })
  @ApiConflictResponse({
    description: 'Campagne non clôturée, passage suivant déjà créé, ou aucun écart à recompter',
  })
  nextRound(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: NextRoundDto,
    @Req() request: Request,
  ): Promise<CampaignDto> {
    return this.campaignsService.nextRound(actor, id, dto, clientContextFrom(request));
  }

  @Post(':id/assignments')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Affecter une personne à la campagne',
    description: 'Toute modification d’affectation est historisée.',
  })
  @ApiResponse({ status: 204, description: 'Personne affectée' })
  assignUser(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignCampaignUserDto,
    @Req() request: Request,
  ): Promise<void> {
    return this.campaignsService.assignUser(actor, id, dto, clientContextFrom(request));
  }

  @Delete(':id/assignments/:userId')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Retirer une personne de la campagne',
    description: 'Le retrait est historisé au même titre que l’affectation.',
  })
  @ApiResponse({ status: 204, description: 'Personne retirée' })
  unassignUser(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Req() request: Request,
  ): Promise<void> {
    return this.campaignsService.unassignUser(actor, id, userId, clientContextFrom(request));
  }
}
