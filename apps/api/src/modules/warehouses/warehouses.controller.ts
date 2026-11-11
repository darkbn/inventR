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

import { Audit } from '../../common/decorators/audit.decorator';
import { ApiPaginatedResponse, type PaginatedDto } from '../../common/dto/paginated-response.dto';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

import {
  CreateWarehouseDto,
  ListWarehousesQueryDto,
  UpdateWarehouseDto,
  WarehouseDto,
} from './dto/warehouse.dto';
import { WarehousesService } from './warehouses.service';

@ApiTags('Référentiels — Magasins')
@ApiBearerAuth('bearer')
@UseInterceptors(AuditInterceptor)
@Controller('warehouses')
export class WarehousesController {
  constructor(private readonly warehousesService: WarehousesService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les magasins' })
  @ApiPaginatedResponse(WarehouseDto)
  findAll(@Query() query: ListWarehousesQueryDto): Promise<PaginatedDto<WarehouseDto>> {
    return this.warehousesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consulter un magasin' })
  @ApiResponse({ status: 200, type: WarehouseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<WarehouseDto> {
    return this.warehousesService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  @Audit({ action: 'WAREHOUSE_CREATE', entityType: 'Warehouse', captureFields: ['code', 'label'] })
  @ApiOperation({
    summary: 'Créer un magasin',
    description:
      'Crée également l’emplacement virtuel NON-LOCALISE du magasin, indispensable ' +
      'pour rattacher les lignes importées sans emplacement.',
  })
  @ApiResponse({ status: 201, type: WarehouseDto })
  create(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CreateWarehouseDto,
  ): Promise<WarehouseDto> {
    return this.warehousesService.create(actor, dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @Audit({ action: 'WAREHOUSE_UPDATE', entityType: 'Warehouse', captureFields: ['code', 'label'] })
  @ApiOperation({ summary: 'Modifier un magasin' })
  @ApiResponse({ status: 200, type: WarehouseDto })
  update(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWarehouseDto,
  ): Promise<WarehouseDto> {
    return this.warehousesService.update(actor, id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @Audit({ action: 'WAREHOUSE_DEACTIVATE', entityType: 'Warehouse' })
  @ApiOperation({
    summary: 'Désactiver un magasin',
    description: 'Refusé tant que le magasin porte des campagnes non clôturées.',
  })
  @ApiResponse({ status: 200, type: WarehouseDto })
  @ApiConflictResponse({ description: 'Campagnes non clôturées rattachées au magasin' })
  deactivate(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WarehouseDto> {
    return this.warehousesService.deactivate(actor, id);
  }
}
