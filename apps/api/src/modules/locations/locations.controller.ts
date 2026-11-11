import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
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

import { Audit } from '../../common/decorators/audit.decorator';
import { ApiPaginatedResponse, type PaginatedDto } from '../../common/dto/paginated-response.dto';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

import {
  CreateLocationDto,
  ListLocationsQueryDto,
  LocationDto,
  LocationVariantDto,
  MergeLocationsDto,
  UpdateLocationDto,
} from './dto/location.dto';
import { LocationsService } from './locations.service';

@ApiTags('Référentiels — Emplacements')
@ApiBearerAuth('bearer')
@UseInterceptors(AuditInterceptor)
@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get()
  @ApiOperation({
    summary: 'Lister les emplacements',
    description:
      'Triés dans l’ordre physique du parcours en entrepôt : allée, travée, ' +
      'niveau, case — en ordre numérique, donc « 2- » avant « 10- ».',
  })
  @ApiPaginatedResponse(LocationDto)
  findAll(@Query() query: ListLocationsQueryDto): Promise<PaginatedDto<LocationDto>> {
    return this.locationsService.findAll(query);
  }

  @Get('variants/:warehouseId')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({
    summary: 'Détecter les variantes orthographiques',
    description:
      'Repère les emplacements dont le libellé est probablement une variante d’un ' +
      'autre (par exemple « ARMOIR CONSM » et « ARMOIRE CONSM »), afin de les ' +
      'fusionner. Les codes structurés sont exclus : « 1-1-A-7 » et « 1-1-B-7 » ' +
      'sont proches mais bien distincts.',
  })
  @ApiResponse({ status: 200, type: [LocationVariantDto] })
  findVariants(
    @Param('warehouseId', ParseUUIDPipe) warehouseId: string,
  ): Promise<LocationVariantDto[]> {
    return this.locationsService.findVariants(warehouseId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consulter un emplacement' })
  @ApiResponse({ status: 200, type: LocationDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<LocationDto> {
    return this.locationsService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @Audit({ action: 'LOCATION_CREATE', entityType: 'Location', captureFields: ['code', 'label'] })
  @ApiOperation({ summary: 'Créer un emplacement' })
  @ApiResponse({ status: 201, type: LocationDto })
  create(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CreateLocationDto,
  ): Promise<LocationDto> {
    return this.locationsService.create(actor, dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @Audit({ action: 'LOCATION_UPDATE', entityType: 'Location', captureFields: ['code', 'label'] })
  @ApiOperation({ summary: 'Modifier un emplacement' })
  @ApiResponse({ status: 200, type: LocationDto })
  update(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLocationDto,
  ): Promise<LocationDto> {
    return this.locationsService.update(actor, id, dto);
  }

  @Post(':id/merge')
  @Roles(Role.ADMIN)
  // La fusion ne crée rien : elle réaffecte puis désactive. 200, pas 201.
  @HttpCode(HttpStatus.OK)
  @Audit({ action: 'LOCATION_MERGE', entityType: 'Location', captureFields: ['targetLocationId'] })
  @ApiOperation({
    summary: 'Fusionner un emplacement dans un autre',
    description:
      'Réaffecte toutes les lignes d’inventaire de l’emplacement courant vers ' +
      'l’emplacement cible, puis désactive le premier. Opération transactionnelle, ' +
      'refusée si un article se retrouverait en double dans une même liste.',
  })
  @ApiResponse({ status: 200, type: LocationDto, description: 'Emplacement cible après fusion' })
  @ApiBadRequestResponse({
    description: 'Emplacements de magasins différents, ou emplacement virtuel',
  })
  @ApiConflictResponse({ description: 'Articles en doublon à l’emplacement cible' })
  merge(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MergeLocationsDto,
  ): Promise<LocationDto> {
    return this.locationsService.merge(actor, id, dto);
  }
}
