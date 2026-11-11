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
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

import { Audit } from '../../common/decorators/audit.decorator';
import { ApiPaginatedResponse, type PaginatedDto } from '../../common/dto/paginated-response.dto';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

import { ArticlesService } from './articles.service';
import {
  ArticleDto,
  CreateArticleDto,
  ListArticlesQueryDto,
  UpdateArticleDto,
} from './dto/article.dto';

@ApiTags('Référentiels — Articles')
@ApiBearerAuth('bearer')
@UseInterceptors(AuditInterceptor)
@Controller('articles')
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Get()
  @ApiOperation({
    summary: 'Lister et rechercher des articles',
    description:
      'La recherche porte sur le code, la désignation, la marque et la référence ' +
      'fabricant. Le prix moyen pondéré n’est renvoyé qu’aux rôles ADMIN et SUPERVISOR.',
  })
  @ApiPaginatedResponse(ArticleDto)
  findAll(
    @CurrentUser() actor: AuthenticatedUser,
    @Query() query: ListArticlesQueryDto,
  ): Promise<PaginatedDto<ArticleDto>> {
    return this.articlesService.findAll(actor, query);
  }

  @Get('by-code/:code')
  @ApiOperation({
    summary: 'Retrouver un article par son code exact',
    description: 'Chemin emprunté par l’application mobile après la lecture d’un QR code.',
  })
  @ApiParam({ name: 'code', example: 'ACCEL-0016' })
  @ApiResponse({ status: 200, type: ArticleDto })
  findByCode(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('code') code: string,
  ): Promise<ArticleDto> {
    return this.articlesService.findByCode(actor, code);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consulter un article' })
  @ApiResponse({ status: 200, type: ArticleDto })
  findOne(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ArticleDto> {
    return this.articlesService.findOne(actor, id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @Audit({
    action: 'ARTICLE_CREATE',
    entityType: 'Article',
    captureFields: ['code', 'designation'],
  })
  @ApiOperation({ summary: 'Créer un article' })
  @ApiResponse({ status: 201, type: ArticleDto })
  create(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CreateArticleDto,
  ): Promise<ArticleDto> {
    return this.articlesService.create(actor, dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @Audit({ action: 'ARTICLE_UPDATE', entityType: 'Article', captureFields: ['designation'] })
  @ApiOperation({
    summary: 'Modifier un article',
    description: 'Le code article est immuable : il identifie la pièce dans le système source.',
  })
  @ApiResponse({ status: 200, type: ArticleDto })
  update(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateArticleDto,
  ): Promise<ArticleDto> {
    return this.articlesService.update(actor, id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @Audit({ action: 'ARTICLE_DEACTIVATE', entityType: 'Article' })
  @ApiOperation({
    summary: 'Désactiver un article',
    description:
      'Aucune suppression physique : des campagnes clôturées référencent l’article ' +
      'et doivent rester consultables.',
  })
  @ApiResponse({ status: 200, type: ArticleDto })
  deactivate(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ArticleDto> {
    return this.articlesService.deactivate(actor, id);
  }
}
