import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type Location } from '@prisma/client';

import { paginate, type PaginatedDto } from '../../common/dto/paginated-response.dto';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import {
  isLikelyVariant,
  normalizeLocationCode,
  parseLocationCode,
} from '../../common/utils/location-code';
import { PrismaService } from '../../prisma/prisma.service';

import {
  LocationDto,
  type CreateLocationDto,
  type ListLocationsQueryDto,
  type LocationVariantDto,
  type MergeLocationsDto,
  type UpdateLocationDto,
} from './dto/location.dto';

/**
 * Tri physique : on suit le cheminement du magasinier dans l'entrepôt — allée,
 * travée, niveau, case — en comparant des nombres et non du texte. Les
 * emplacements non structurés (libellés libres) viennent après, triés par code,
 * et l'emplacement virtuel NON-LOCALISE ferme la marche.
 */
const PHYSICAL_ORDER: Prisma.LocationOrderByWithRelationInput[] = [
  { isVirtual: 'asc' },
  { aisle: { sort: 'asc', nulls: 'last' } },
  { bay: { sort: 'asc', nulls: 'last' } },
  { level: { sort: 'asc', nulls: 'last' } },
  { slot: { sort: 'asc', nulls: 'last' } },
  { code: 'asc' },
];

@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ListLocationsQueryDto): Promise<PaginatedDto<LocationDto>> {
    const where: Prisma.LocationWhereInput = {
      ...(query.warehouseId === undefined ? {} : { warehouseId: query.warehouseId }),
      ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
      ...(query.includeVirtual ? {} : { isVirtual: false }),
      ...(query.q
        ? {
            OR: [
              {
                normalizedCode: {
                  contains: normalizeLocationCode(query.q),
                  mode: Prisma.QueryMode.insensitive,
                },
              },
              { label: { contains: query.q, mode: Prisma.QueryMode.insensitive } },
            ],
          }
        : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.location.count({ where }),
      this.prisma.location.findMany({
        where,
        orderBy: PHYSICAL_ORDER,
        skip: query.skip,
        take: query.limit,
        include: { _count: { select: { items: true } } },
      }),
    ]);

    return paginate(
      rows.map((row) => LocationDto.from(row, row._count.items)),
      total,
      query.page,
      query.limit,
    );
  }

  async findOne(id: string): Promise<LocationDto> {
    const location = await this.prisma.location.findUnique({
      where: { id },
      include: { _count: { select: { items: true } } },
    });

    if (!location) throw new NotFoundException('Emplacement introuvable.');
    return LocationDto.from(location, location._count.items);
  }

  async create(actor: AuthenticatedUser, dto: CreateLocationDto): Promise<LocationDto> {
    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id: dto.warehouseId },
      select: { id: true },
    });
    if (!warehouse) throw new NotFoundException('Magasin introuvable.');

    const normalizedCode = normalizeLocationCode(dto.code);
    await this.assertCodeAvailable(dto.warehouseId, dto.code);

    const location = await this.prisma.location.create({
      data: {
        warehouseId: dto.warehouseId,
        code: dto.code,
        normalizedCode,
        label: dto.label ?? null,
        ...parseLocationCode(dto.code),
        isActive: dto.isActive ?? true,
        createdById: actor.id,
        updatedById: actor.id,
      },
    });

    return LocationDto.from(location);
  }

  async update(actor: AuthenticatedUser, id: string, dto: UpdateLocationDto): Promise<LocationDto> {
    const existing = await this.getOrThrow(id);

    if (existing.isVirtual && dto.code !== undefined) {
      throw new BadRequestException(
        "Le code de l'emplacement virtuel NON-LOCALISE ne peut pas être modifié.",
      );
    }

    if (dto.code !== undefined) {
      await this.assertCodeAvailable(existing.warehouseId, dto.code, id);
    }

    const location = await this.prisma.location.update({
      where: { id },
      data: {
        ...(dto.code === undefined
          ? {}
          : {
              code: dto.code,
              normalizedCode: normalizeLocationCode(dto.code),
              ...parseLocationCode(dto.code),
            }),
        ...(dto.label === undefined ? {} : { label: dto.label }),
        ...(dto.isActive === undefined ? {} : { isActive: dto.isActive }),
        updatedById: actor.id,
      },
    });

    return LocationDto.from(location);
  }

  /**
   * Fusionne deux emplacements : les lignes d'inventaire de la source sont
   * réaffectées à la cible, puis la source est désactivée.
   *
   * Sert à corriger les variantes orthographiques du référentiel
   * (`ARMOIR CONSM` → `ARMOIRE CONSM`). L'opération est transactionnelle : une
   * réaffectation partielle laisserait des lignes orphelines dans un comptage
   * en cours.
   */
  async merge(
    actor: AuthenticatedUser,
    sourceId: string,
    dto: MergeLocationsDto,
  ): Promise<LocationDto> {
    if (sourceId === dto.targetLocationId) {
      throw new BadRequestException('Un emplacement ne peut pas être fusionné avec lui-même.');
    }

    const [source, target] = await Promise.all([
      this.getOrThrow(sourceId),
      this.getOrThrow(dto.targetLocationId),
    ]);

    if (source.isVirtual) {
      throw new BadRequestException(
        "L'emplacement virtuel NON-LOCALISE ne peut pas être fusionné.",
      );
    }

    if (source.warehouseId !== target.warehouseId) {
      throw new BadRequestException('Les deux emplacements doivent appartenir au même magasin.');
    }

    await this.prisma.$transaction(async (tx) => {
      // Une ligne (liste, article, emplacement) est unique : si l'article est
      // déjà présent à l'emplacement cible, la réaffectation violerait la
      // contrainte. Ces lignes en doublon sont donc identifiées et refusées —
      // les fusionner reviendrait à décider arbitrairement quel comptage garder.
      const conflicts = await tx.$queryRaw<{ count: bigint }[]>`
        SELECT count(*)::bigint AS count
        FROM "inventory"."inventory_items" source
        JOIN "inventory"."inventory_items" target
          ON target."list_id" = source."list_id"
         AND target."article_id" = source."article_id"
         AND target."location_id" = ${dto.targetLocationId}::uuid
        WHERE source."location_id" = ${sourceId}::uuid
      `;

      const conflictCount = Number(conflicts[0]?.count ?? 0n);
      if (conflictCount > 0) {
        throw new ConflictException(
          `${conflictCount} article(s) sont déjà présents à l'emplacement cible dans la même liste. ` +
            'Traitez ces lignes avant de fusionner.',
        );
      }

      await tx.inventoryItem.updateMany({
        where: { locationId: sourceId },
        data: { locationId: dto.targetLocationId },
      });

      await tx.article.updateMany({
        where: { defaultLocationId: sourceId },
        data: { defaultLocationId: dto.targetLocationId },
      });

      await tx.location.update({
        where: { id: sourceId },
        data: {
          isActive: false,
          label: `${source.label ?? source.code} (fusionné vers ${target.code})`,
          updatedById: actor.id,
        },
      });
    });

    return this.findOne(dto.targetLocationId);
  }

  /**
   * Repère les variantes orthographiques probables au sein d'un magasin.
   *
   * La comparaison est volontairement limitée aux libellés libres : deux codes
   * structurés comme `1-1-A-7` et `1-1-B-7` sont proches au sens de Levenshtein
   * tout en désignant deux niveaux bien réels (cf. `isLikelyVariant`).
   */
  async findVariants(warehouseId: string): Promise<LocationVariantDto[]> {
    const locations = await this.prisma.location.findMany({
      where: { warehouseId, isActive: true, isVirtual: false },
      orderBy: { normalizedCode: 'asc' },
    });

    const groups: LocationVariantDto[] = [];
    const alreadyGrouped = new Set<string>();

    for (const location of locations) {
      if (alreadyGrouped.has(location.id)) continue;

      const candidates = locations.filter(
        (other) =>
          other.id !== location.id &&
          !alreadyGrouped.has(other.id) &&
          isLikelyVariant(location.normalizedCode, other.normalizedCode),
      );

      if (candidates.length === 0) continue;

      alreadyGrouped.add(location.id);
      candidates.forEach((candidate) => alreadyGrouped.add(candidate.id));

      groups.push({
        location: LocationDto.from(location),
        candidates: candidates.map((candidate) => LocationDto.from(candidate)),
      });
    }

    return groups;
  }

  private async getOrThrow(id: string): Promise<Location> {
    const location = await this.prisma.location.findUnique({ where: { id } });
    if (!location) throw new NotFoundException('Emplacement introuvable.');
    return location;
  }

  private async assertCodeAvailable(
    warehouseId: string,
    code: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.prisma.location.findFirst({
      where: {
        warehouseId,
        code,
        ...(excludeId === undefined ? {} : { NOT: { id: excludeId } }),
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(`L'emplacement « ${code} » existe déjà dans ce magasin.`);
    }
  }
}
