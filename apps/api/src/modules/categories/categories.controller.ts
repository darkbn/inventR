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
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { Audit } from '../../common/decorators/audit.decorator';
import { ApiPaginatedResponse, type PaginatedDto } from '../../common/dto/paginated-response.dto';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

import { CategoriesService } from './categories.service';
import {
  CategoryDto,
  CreateCategoryDto,
  ListCategoriesQueryDto,
  UpdateCategoryDto,
} from './dto/category.dto';

@ApiTags('Référentiels — Catégories')
@ApiBearerAuth('bearer')
@UseInterceptors(AuditInterceptor)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({
    summary: 'Lister les catégories',
    description: 'Accessible à tout compte authentifié : le mobile en a besoin pour filtrer.',
  })
  @ApiPaginatedResponse(CategoryDto)
  findAll(@Query() query: ListCategoriesQueryDto): Promise<PaginatedDto<CategoryDto>> {
    return this.categoriesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consulter une catégorie' })
  @ApiResponse({ status: 200, type: CategoryDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<CategoryDto> {
    return this.categoriesService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @Audit({ action: 'CATEGORY_CREATE', entityType: 'Category', captureFields: ['code', 'label'] })
  @ApiOperation({ summary: 'Créer une catégorie' })
  @ApiResponse({ status: 201, type: CategoryDto })
  create(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CreateCategoryDto,
  ): Promise<CategoryDto> {
    return this.categoriesService.create(actor, dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @Audit({ action: 'CATEGORY_UPDATE', entityType: 'Category', captureFields: ['code', 'label'] })
  @ApiOperation({ summary: 'Modifier une catégorie' })
  @ApiResponse({ status: 200, type: CategoryDto })
  update(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<CategoryDto> {
    return this.categoriesService.update(actor, id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @Audit({ action: 'CATEGORY_DEACTIVATE', entityType: 'Category' })
  @ApiOperation({
    summary: 'Désactiver une catégorie',
    description:
      'Aucune suppression physique : des articles et des comptages historiques ' +
      'référencent la catégorie. Elle est simplement rendue inactive.',
  })
  @ApiResponse({ status: 200, type: CategoryDto })
  deactivate(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CategoryDto> {
    return this.categoriesService.deactivate(actor, id);
  }
}
