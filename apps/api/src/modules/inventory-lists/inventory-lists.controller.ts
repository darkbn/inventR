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
  ApiBearerAuth,
  ApiConflictResponse,
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

import {
  AssignListUserDto,
  AssignmentHistoryEntryDto,
  CreateInventoryListDto,
  InventoryListDto,
  ListInventoryListsQueryDto,
  MyListDto,
  UpdateInventoryListDto,
} from './dto/inventory-list.dto';
import { InventoryListsService } from './inventory-lists.service';

@ApiTags('Listes d’inventaire')
@ApiBearerAuth('bearer')
@UseInterceptors(AuditInterceptor)
@Controller()
export class InventoryListsController {
  constructor(private readonly listsService: InventoryListsService) {}

  @Get('my/lists')
  @ApiOperation({
    summary: 'Mes listes attribuées',
    description:
      'Écran d’accueil de l’application mobile. Ne renvoie que les listes ' +
      'attribuées à l’utilisateur connecté, sur des campagnes effectivement ' +
      'ouvertes au comptage, avec leur avancement.',
  })
  @ApiResponse({ status: 200, type: [MyListDto] })
  findMine(@CurrentUser() actor: AuthenticatedUser): Promise<MyListDto[]> {
    return this.listsService.findMine(actor);
  }

  @Get('lists')
  @ApiOperation({
    summary: 'Lister les listes d’inventaire',
    description: 'Un opérateur ne voit que les listes qui lui sont attribuées.',
  })
  @ApiPaginatedResponse(InventoryListDto)
  findAll(
    @CurrentUser() actor: AuthenticatedUser,
    @Query() query: ListInventoryListsQueryDto,
  ): Promise<PaginatedDto<InventoryListDto>> {
    return this.listsService.findAll(actor, query);
  }

  @Get('lists/:id')
  @ApiOperation({ summary: 'Consulter une liste' })
  @ApiResponse({ status: 200, type: InventoryListDto })
  findOne(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<InventoryListDto> {
    return this.listsService.findOne(actor, id);
  }

  @Get('lists/:id/assignment-history')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({
    summary: 'Historique des affectations d’une liste',
    description:
      'Retrace les affectations et les retraits, avec leur auteur et leur date — ' +
      'toute modification d’affectation est historisée.',
  })
  @ApiResponse({ status: 200, type: [AssignmentHistoryEntryDto] })
  assignmentHistory(@Param('id', ParseUUIDPipe) id: string): Promise<AssignmentHistoryEntryDto[]> {
    return this.listsService.assignmentHistory(id);
  }

  @Post('campaigns/:campaignId/lists')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @Audit({ action: 'LIST_CREATE', entityType: 'InventoryList', captureFields: ['code', 'name'] })
  @ApiOperation({ summary: 'Créer une liste dans une campagne' })
  @ApiResponse({ status: 201, type: InventoryListDto })
  @ApiConflictResponse({ description: 'Code déjà utilisé dans la campagne, ou campagne clôturée' })
  create(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @Body() dto: CreateInventoryListDto,
  ): Promise<InventoryListDto> {
    return this.listsService.create(actor, campaignId, dto);
  }

  @Patch('lists/:id')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @Audit({ action: 'LIST_UPDATE', entityType: 'InventoryList', captureFields: ['name', 'status'] })
  @ApiOperation({ summary: 'Modifier une liste' })
  @ApiResponse({ status: 200, type: InventoryListDto })
  update(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInventoryListDto,
  ): Promise<InventoryListDto> {
    return this.listsService.update(actor, id, dto);
  }

  @Delete('lists/:id')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Audit({ action: 'LIST_DELETE', entityType: 'InventoryList' })
  @ApiOperation({
    summary: 'Supprimer une liste',
    description:
      'Possible uniquement tant qu’aucun comptage n’a été enregistré : supprimer ' +
      'des comptages effacerait le travail réalisé sur le terrain.',
  })
  @ApiResponse({ status: 204, description: 'Liste supprimée' })
  @ApiConflictResponse({ description: 'Des comptages existent sur cette liste' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.listsService.remove(id);
  }

  @Post('lists/:id/assignments')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Attribuer la liste à un opérateur',
    description:
      'L’opérateur est également rattaché à la campagne, sans quoi il ne la ' +
      'verrait pas. L’opération est historisée.',
  })
  @ApiResponse({ status: 204, description: 'Liste attribuée' })
  assignUser(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignListUserDto,
    @Req() request: Request,
  ): Promise<void> {
    return this.listsService.assignUser(actor, id, dto, clientContextFrom(request));
  }

  @Delete('lists/:id/assignments/:userId')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Retirer un opérateur de la liste' })
  @ApiResponse({ status: 204, description: 'Opérateur retiré' })
  unassignUser(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Req() request: Request,
  ): Promise<void> {
    return this.listsService.unassignUser(actor, id, userId, clientContextFrom(request));
  }
}
