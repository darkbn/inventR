import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type Warehouse } from '@prisma/client';

import {
  UNLOCATED_LOCATION_CODE,
  UNLOCATED_LOCATION_LABEL,
} from '../../common/constants/inventory.constants';
import { paginate, type PaginatedDto } from '../../common/dto/paginated-response.dto';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { PrismaService } from '../../prisma/prisma.service';

import {
  WarehouseDto,
  type CreateWarehouseDto,
  type ListWarehousesQueryDto,
  type UpdateWarehouseDto,
} from './dto/warehouse.dto';

@Injectable()
export class WarehousesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ListWarehousesQueryDto): Promise<PaginatedDto<WarehouseDto>> {
    const where: Prisma.WarehouseWhereInput = {
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
      this.prisma.warehouse.count({ where }),
      this.prisma.warehouse.findMany({
        where,
        orderBy: { code: query.sortOrder },
        skip: query.skip,
        take: query.limit,
        include: { _count: { select: { locations: true } } },
      }),
    ]);

    return paginate(
      rows.map((row) => WarehouseDto.from(row, row._count.locations)),
      total,
      query.page,
      query.limit,
    );
  }

  async findOne(id: string): Promise<WarehouseDto> {
    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id },
      include: { _count: { select: { locations: true } } },
    });

    if (!warehouse) throw new NotFoundException('Magasin introuvable.');
    return WarehouseDto.from(warehouse, warehouse._count.locations);
  }

  /**
   * Crée le magasin **et** son emplacement virtuel `NON-LOCALISE`, dans une même
   * transaction.
   *
   * Cet emplacement n'est pas un confort : `inventory_items.location_id` est
   * NOT NULL, et 29 % des lignes du fichier source n'ont aucun emplacement. Sans
   * lui, le premier import sur ce magasin échouerait.
   */
  async create(actor: AuthenticatedUser, dto: CreateWarehouseDto): Promise<WarehouseDto> {
    await this.assertCodeAvailable(dto.code);

    const warehouse = await this.prisma.$transaction(async (tx) => {
      const created = await tx.warehouse.create({
        data: {
          code: dto.code,
          label: dto.label,
          isActive: dto.isActive ?? true,
          createdById: actor.id,
          updatedById: actor.id,
        },
      });

      await tx.location.create({
        data: {
          warehouseId: created.id,
          code: UNLOCATED_LOCATION_CODE,
          normalizedCode: UNLOCATED_LOCATION_CODE,
          label: UNLOCATED_LOCATION_LABEL,
          isVirtual: true,
          createdById: actor.id,
          updatedById: actor.id,
        },
      });

      return created;
    });

    return WarehouseDto.from(warehouse, 1);
  }

  async update(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateWarehouseDto,
  ): Promise<WarehouseDto> {
    await this.getOrThrow(id);
    if (dto.code !== undefined) await this.assertCodeAvailable(dto.code, id);

    const warehouse = await this.prisma.warehouse.update({
      where: { id },
      data: {
        ...(dto.code === undefined ? {} : { code: dto.code }),
        ...(dto.label === undefined ? {} : { label: dto.label }),
        ...(dto.isActive === undefined ? {} : { isActive: dto.isActive }),
        updatedById: actor.id,
      },
    });

    return WarehouseDto.from(warehouse);
  }

  async deactivate(actor: AuthenticatedUser, id: string): Promise<WarehouseDto> {
    await this.getOrThrow(id);

    const openCampaigns = await this.prisma.campaign.count({
      where: { warehouseId: id, status: { notIn: ['CLOSED'] } },
    });

    if (openCampaigns > 0) {
      throw new ConflictException(
        `Ce magasin porte ${openCampaigns} campagne(s) non clôturée(s) : clôturez-les avant de le désactiver.`,
      );
    }

    const warehouse = await this.prisma.warehouse.update({
      where: { id },
      data: { isActive: false, updatedById: actor.id },
    });

    return WarehouseDto.from(warehouse);
  }

  /** Identifiant de l'emplacement virtuel du magasin, créé à la volée si besoin. */
  async getUnlocatedLocationId(warehouseId: string): Promise<string> {
    const location = await this.prisma.location.upsert({
      where: { warehouseId_code: { warehouseId, code: UNLOCATED_LOCATION_CODE } },
      update: {},
      create: {
        warehouseId,
        code: UNLOCATED_LOCATION_CODE,
        normalizedCode: UNLOCATED_LOCATION_CODE,
        label: UNLOCATED_LOCATION_LABEL,
        isVirtual: true,
      },
      select: { id: true },
    });

    return location.id;
  }

  private async getOrThrow(id: string): Promise<Warehouse> {
    const warehouse = await this.prisma.warehouse.findUnique({ where: { id } });
    if (!warehouse) throw new NotFoundException('Magasin introuvable.');
    return warehouse;
  }

  private async assertCodeAvailable(code: string, excludeId?: string): Promise<void> {
    const existing = await this.prisma.warehouse.findFirst({
      where: { code, ...(excludeId === undefined ? {} : { NOT: { id: excludeId } }) },
      select: { id: true },
    });

    if (existing) throw new ConflictException(`Le magasin « ${code} » existe déjà.`);
  }
}
