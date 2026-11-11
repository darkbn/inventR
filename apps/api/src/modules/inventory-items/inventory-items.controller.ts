import {
  Body,
  Controller,
  Delete,
  Get,
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
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';

import { ApiPaginatedResponse, type PaginatedDto } from '../../common/dto/paginated-response.dto';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { clientContextFrom } from '../../common/utils/client-context';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

import {
  AddListItemDto,
  ArbitrateItemDto,
  InventoryItemDto,
  ListItemsQueryDto,
  MarkNotFoundDto,
} from './dto/inventory-item.dto';
import { InventoryItemsService } from './inventory-items.service';

@ApiTags('Lignes d’inventaire')
@ApiBearerAuth('bearer')
@UseInterceptors(AuditInterceptor)
@Controller()
export class InventoryItemsController {
  constructor(private readonly itemsService: InventoryItemsService) {}

  @Get('lists/:listId/items')
  @ApiOperation({
    summary: 'Lignes d’une liste',
    description:
      'Écran de comptage. Tri par défaut : emplacement dans l’ordre physique de ' +
      'parcours, puis désignation. Les filtres `remaining` et `counted` sont ' +
      'relatifs à l’utilisateur connecté — en double comptage, une ligne traitée ' +
      'par un collègue reste à compter pour moi.',
  })
  @ApiPaginatedResponse(InventoryItemDto)
  findByList(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('listId', ParseUUIDPipe) listId: string,
    @Query() query: ListItemsQueryDto,
  ): Promise<PaginatedDto<InventoryItemDto>> {
    return this.itemsService.findByList(actor, listId, query);
  }

  @Post('lists/:listId/items')
  @ApiOperation({
    summary: 'Ajouter un article absent du fichier importé',
    description:
      'Crée une ligne pour un article trouvé en rayon mais absent de l’extraction ' +
      'SAP. Sa quantité théorique est nulle : tout ce qui sera compté apparaîtra ' +
      'comme surplus, ce qui signale au gestionnaire un article à créer dans l’ERP. ' +
      'L’article et l’emplacement sont créés s’ils sont inconnus. Accessible à ' +
      'l’opérateur sur les listes qui lui sont attribuées : c’est lui qui fait le ' +
      'constat, et l’attendre priverait l’inventaire d’un stock réel. Aucun ' +
      'comptage n’est enregistré ici — la ligne se compte ensuite normalement.',
  })
  @ApiResponse({ status: 201, type: InventoryItemDto })
  @ApiBadRequestResponse({ description: 'Désignation manquante pour un article inconnu' })
  @ApiConflictResponse({ description: 'Ligne déjà présente, ou campagne non ouverte au comptage' })
  addItem(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('listId', ParseUUIDPipe) listId: string,
    @Body() dto: AddListItemDto,
    @Req() request: Request,
  ): Promise<InventoryItemDto> {
    return this.itemsService.addItem(actor, listId, dto, clientContextFrom(request));
  }

  @Get('items/:id')
  @ApiOperation({ summary: 'Consulter une ligne' })
  @ApiResponse({ status: 200, type: InventoryItemDto })
  findOne(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<InventoryItemDto> {
    return this.itemsService.findOne(actor, id);
  }

  @Patch('items/:id/not-found')
  @ApiOperation({
    summary: 'Déclarer un article introuvable',
    description:
      'La quantité n’est pas mise à 0 pour autant : cela n’arrive qu’à la clôture, ' +
      'après confirmation explicite du superviseur. Un comptage ultérieur annule ' +
      'la déclaration, l’observation positive l’emportant.',
  })
  @ApiResponse({ status: 200, type: InventoryItemDto })
  @ApiConflictResponse({ description: 'Campagne clôturée ou non ouverte' })
  markNotFound(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MarkNotFoundDto,
    @Req() request: Request,
  ): Promise<InventoryItemDto> {
    return this.itemsService.markNotFound(actor, id, dto, clientContextFrom(request));
  }

  @Delete('items/:id/not-found')
  @ApiOperation({ summary: 'Annuler une déclaration « introuvable »' })
  @ApiResponse({ status: 200, type: InventoryItemDto })
  clearNotFound(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<InventoryItemDto> {
    return this.itemsService.clearNotFound(actor, id);
  }

  @Patch('items/:id/arbitrate')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({
    summary: 'Arbitrer un litige',
    description:
      'Réservé au superviseur. La quantité saisie prime sur tous les comptages et ' +
      'débloque la clôture. Le motif est obligatoire : la décision engage le ' +
      'résultat de l’inventaire.',
  })
  @ApiResponse({ status: 200, type: InventoryItemDto })
  arbitrate(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ArbitrateItemDto,
    @Req() request: Request,
  ): Promise<InventoryItemDto> {
    return this.itemsService.arbitrate(actor, id, dto, clientContextFrom(request));
  }
}
