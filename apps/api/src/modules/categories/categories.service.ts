import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { paginate, type PaginatedDto } from '../../common/dto/paginated-response.dto';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { PrismaService } from '../../prisma/prisma.service';

import {
  CategoryDto,
  type CreateCategoryDto,
  type ListCategoriesQueryDto,
  type UpdateCategoryDto,
} from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ListCategoriesQueryDto): Promise<PaginatedDto<CategoryDto>> {
    const where: Prisma.CategoryWhereInput = {
      ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
      ...(query.q
        ? {
            OR: [
              { code: { contains: query.q, mode: Prisma.QueryMode.insensitive } },
              { label: { contains: query.q, mode: Prisma.QueryMode.insensitive } },
            ],
          }
        : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.category.count({ where }),
      this.prisma.category.findMany({
        where,
        orderBy: { label: query.sortOrder },
        skip: query.skip,
        take: query.limit,
      }),
    ]);

    return paginate(
      rows.map((row) => CategoryDto.from(row)),
      total,
      query.page,
      query.limit,
    );
  }

  async findOne(id: string): Promise<CategoryDto> {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Catégorie introuvable.');
    return CategoryDto.from(category);
  }

  async create(actor: AuthenticatedUser, dto: CreateCategoryDto): Promise<CategoryDto> {
    await this.assertCodeAvailable(dto.code);

    const category = await this.prisma.category.create({
      data: {
        code: dto.code,
        label: dto.label,
        isActive: dto.isActive ?? true,
        createdById: actor.id,
        updatedById: actor.id,
      },
    });

    return CategoryDto.from(category);
  }

  async update(actor: AuthenticatedUser, id: string, dto: UpdateCategoryDto): Promise<CategoryDto> {
    await this.findOne(id);
    if (dto.code !== undefined) await this.assertCodeAvailable(dto.code, id);

    const category = await this.prisma.category.update({
      where: { id },
      data: {
        ...(dto.code === undefined ? {} : { code: dto.code }),
        ...(dto.label === undefined ? {} : { label: dto.label }),
        ...(dto.isActive === undefined ? {} : { isActive: dto.isActive }),
        updatedById: actor.id,
      },
    });

    return CategoryDto.from(category);
  }

  /**
   * Les catégories ne sont jamais supprimées mais désactivées : des articles —
   * et donc des comptages historiques — y font référence.
   */
  async deactivate(actor: AuthenticatedUser, id: string): Promise<CategoryDto> {
    await this.findOne(id);

    const category = await this.prisma.category.update({
      where: { id },
      data: { isActive: false, updatedById: actor.id },
    });

    return CategoryDto.from(category);
  }

  private async assertCodeAvailable(code: string, excludeId?: string): Promise<void> {
    const existing = await this.prisma.category.findFirst({
      where: { code, ...(excludeId === undefined ? {} : { NOT: { id: excludeId } }) },
      select: { id: true },
    });

    if (existing) throw new ConflictException(`La catégorie « ${code} » existe déjà.`);
  }
}
