import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseBoolPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { Audit } from '../../common/decorators/audit.decorator';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { Roles } from '../auth/decorators/roles.decorator';

import { CampaignTypesService } from './campaign-types.service';
import {
  CampaignTypeDto,
  CreateCampaignTypeDto,
  UpdateCampaignTypeDto,
} from './dto/campaign-type.dto';
import { InventoryMethodDto, UpdateInventoryMethodDto } from './dto/inventory-method.dto';
import { InventoryMethodsService } from './inventory-methods.service';

@ApiTags('Référentiels — Types de campagne')
@ApiBearerAuth('bearer')
@UseInterceptors(AuditInterceptor)
@Controller('campaign-types')
export class CampaignTypesController {
  constructor(private readonly campaignTypesService: CampaignTypesService) {}

  @Get()
  @ApiOperation({
    summary: 'Lister les types de campagne',
    description:
      'Matière première, pièces de rechange, produits finis — et tout type ajouté ' +
      'ensuite : il s’agit d’une table, pas d’une énumération figée.',
  })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @ApiResponse({ status: 200, type: [CampaignTypeDto] })
  findAll(
    @Query('includeInactive', new ParseBoolPipe({ optional: true })) includeInactive?: boolean,
  ): Promise<CampaignTypeDto[]> {
    return this.campaignTypesService.findAll(includeInactive ?? false);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consulter un type de campagne' })
  @ApiResponse({ status: 200, type: CampaignTypeDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<CampaignTypeDto> {
    return this.campaignTypesService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  @Audit({
    action: 'CAMPAIGN_TYPE_CREATE',
    entityType: 'CampaignType',
    captureFields: ['code', 'label'],
  })
  @ApiOperation({ summary: 'Créer un type de campagne' })
  @ApiResponse({ status: 201, type: CampaignTypeDto })
  create(@Body() dto: CreateCampaignTypeDto): Promise<CampaignTypeDto> {
    return this.campaignTypesService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @Audit({
    action: 'CAMPAIGN_TYPE_UPDATE',
    entityType: 'CampaignType',
    captureFields: ['code', 'label'],
  })
  @ApiOperation({ summary: 'Modifier un type de campagne' })
  @ApiResponse({ status: 200, type: CampaignTypeDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCampaignTypeDto,
  ): Promise<CampaignTypeDto> {
    return this.campaignTypesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @Audit({ action: 'CAMPAIGN_TYPE_DEACTIVATE', entityType: 'CampaignType' })
  @ApiOperation({ summary: 'Désactiver un type de campagne' })
  @ApiResponse({ status: 200, type: CampaignTypeDto })
  deactivate(@Param('id', ParseUUIDPipe) id: string): Promise<CampaignTypeDto> {
    return this.campaignTypesService.deactivate(id);
  }
}

@ApiTags('Référentiels — Méthodes d’inventaire')
@ApiBearerAuth('bearer')
@UseInterceptors(AuditInterceptor)
@Controller('inventory-methods')
export class InventoryMethodsController {
  constructor(private readonly inventoryMethodsService: InventoryMethodsService) {}

  @Get()
  @ApiOperation({
    summary: 'Lister les méthodes de calcul',
    description:
      'Méthode 1 (somme cumulative) et Méthode 2 (double comptage contradictoire). ' +
      'La structure est extensible : ajouter une méthode consiste à insérer une ' +
      'ligne ici et à enregistrer la stratégie correspondante côté service.',
  })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @ApiResponse({ status: 200, type: [InventoryMethodDto] })
  findAll(
    @Query('includeInactive', new ParseBoolPipe({ optional: true })) includeInactive?: boolean,
  ): Promise<InventoryMethodDto[]> {
    return this.inventoryMethodsService.findAll(includeInactive ?? false);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consulter une méthode' })
  @ApiResponse({ status: 200, type: InventoryMethodDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<InventoryMethodDto> {
    return this.inventoryMethodsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @Audit({
    action: 'INVENTORY_METHOD_UPDATE',
    entityType: 'InventoryMethod',
    captureFields: ['label'],
  })
  @ApiOperation({
    summary: 'Modifier le libellé ou la description d’une méthode',
    description:
      'Ni le code ni la configuration de calcul ne sont modifiables : ils ' +
      'détermineraient rétroactivement le résultat de campagnes en cours.',
  })
  @ApiResponse({ status: 200, type: InventoryMethodDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInventoryMethodDto,
  ): Promise<InventoryMethodDto> {
    return this.inventoryMethodsService.update(id, dto);
  }
}
