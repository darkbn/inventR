import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';

import { DEFAULT_UNIT } from '../../common/constants/inventory.constants';
import { paginate, type PaginatedDto } from '../../common/dto/paginated-response.dto';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { PrismaService } from '../../prisma/prisma.service';

import {
  ArticleDto,
  type CreateArticleDto,
  type ListArticlesQueryDto,
  type UpdateArticleDto,
} from './dto/article.dto';

@Injectable()
export class ArticlesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Les montants ne sortent jamais vers un opérateur. */
  private static canSeeValuation(actor: AuthenticatedUser): boolean {
    return actor.role === Role.ADMIN || actor.role === Role.SUPERVISOR;
  }

  async findAll(
    actor: AuthenticatedUser,
    query: ListArticlesQueryDto,
  ): Promise<PaginatedDto<ArticleDto>> {
    const where: Prisma.ArticleWhereInput = {
      ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
      ...(query.categoryId === undefined ? {} : { categoryId: query.categoryId }),
      ...(query.brand === undefined ? {} : { brand: query.brand }),
      ...(query.q
        ? {
            OR: [
              { code: { contains: query.q, mode: Prisma.QueryMode.insensitive } },
              { designation: { contains: query.q, mode: Prisma.QueryMode.insensitive } },
              { brand: { contains: query.q, mode: Prisma.QueryMode.insensitive } },
              { manufacturerRef: { contains: query.q, mode: Prisma.QueryMode.insensitive } },
            ],
          }
        : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.article.count({ where }),
      this.prisma.article.findMany({
        where,
        orderBy: { [query.sortBy]: query.sortOrder },
        skip: query.skip,
        take: query.limit,
      }),
    ]);

    const withValuation = ArticlesService.canSeeValuation(actor);

    return paginate(
      rows.map((row) => ArticleDto.from(row, withValuation)),
      total,
      query.page,
      query.limit,
    );
  }

  async findOne(actor: AuthenticatedUser, id: string): Promise<ArticleDto> {
    const article = await this.prisma.article.findUnique({ where: { id } });
    if (!article) throw new NotFoundException('Article introuvable.');
    return ArticleDto.from(article, ArticlesService.canSeeValuation(actor));
  }

  /** Recherche par code exact : c'est le chemin emprunté après un scan de QR code. */
  async findByCode(actor: AuthenticatedUser, code: string): Promise<ArticleDto> {
    const article = await this.prisma.article.findUnique({
      where: { code: code.trim().toUpperCase() },
    });
    if (!article) throw new NotFoundException(`Aucun article ne porte le code « ${code} ».`);
    return ArticleDto.from(article, ArticlesService.canSeeValuation(actor));
  }

  async create(actor: AuthenticatedUser, dto: CreateArticleDto): Promise<ArticleDto> {
    await this.assertCodeAvailable(dto.code);
    await this.assertReferencesExist(dto.categoryId, dto.defaultLocationId);

    const article = await this.prisma.article.create({
      data: {
        code: dto.code,
        designation: dto.designation,
        unit: dto.unit ?? DEFAULT_UNIT,
        brand: dto.brand ?? null,
        manufacturerRef: dto.manufacturerRef ?? null,
        categoryId: dto.categoryId ?? null,
        defaultLocationId: dto.defaultLocationId ?? null,
        lastPmp: new Prisma.Decimal(dto.lastPmp ?? 0),
        isActive: dto.isActive ?? true,
        createdById: actor.id,
        updatedById: actor.id,
      },
    });

    return ArticleDto.from(article, true);
  }

  async update(actor: AuthenticatedUser, id: string, dto: UpdateArticleDto): Promise<ArticleDto> {
    await this.findOne(actor, id);
    await this.assertReferencesExist(dto.categoryId, dto.defaultLocationId);

    const article = await this.prisma.article.update({
      where: { id },
      data: {
        ...(dto.designation === undefined ? {} : { designation: dto.designation }),
        ...(dto.unit === undefined ? {} : { unit: dto.unit }),
        ...(dto.brand === undefined ? {} : { brand: dto.brand }),
        ...(dto.manufacturerRef === undefined ? {} : { manufacturerRef: dto.manufacturerRef }),
        ...(dto.categoryId === undefined ? {} : { categoryId: dto.categoryId }),
        ...(dto.defaultLocationId === undefined
          ? {}
          : { defaultLocationId: dto.defaultLocationId }),
        ...(dto.lastPmp === undefined ? {} : { lastPmp: new Prisma.Decimal(dto.lastPmp) }),
        ...(dto.isActive === undefined ? {} : { isActive: dto.isActive }),
        updatedById: actor.id,
      },
    });

    return ArticleDto.from(article, ArticlesService.canSeeValuation(actor));
  }

  /**
   * Désactivation, jamais suppression : un article peut être référencé par des
   * lignes de campagnes clôturées, qui doivent rester lisibles indéfiniment.
   */
  async deactivate(actor: AuthenticatedUser, id: string): Promise<ArticleDto> {
    await this.findOne(actor, id);

    const article = await this.prisma.article.update({
      where: { id },
      data: { isActive: false, updatedById: actor.id },
    });

    return ArticleDto.from(article, ArticlesService.canSeeValuation(actor));
  }

  private async assertCodeAvailable(code: string, excludeId?: string): Promise<void> {
    const existing = await this.prisma.article.findFirst({
      where: { code, ...(excludeId === undefined ? {} : { NOT: { id: excludeId } }) },
      select: { id: true },
    });

    if (existing) throw new ConflictException(`L'article « ${code} » existe déjà.`);
  }

  private async assertReferencesExist(
    categoryId?: string,
    defaultLocationId?: string,
  ): Promise<void> {
    if (categoryId !== undefined) {
      const category = await this.prisma.category.findUnique({
        where: { id: categoryId },
        select: { id: true },
      });
      if (!category) throw new NotFoundException('Catégorie introuvable.');
    }

    if (defaultLocationId !== undefined) {
      const location = await this.prisma.location.findUnique({
        where: { id: defaultLocationId },
        select: { id: true },
      });
      if (!location) throw new NotFoundException('Emplacement introuvable.');
    }
  }
}
