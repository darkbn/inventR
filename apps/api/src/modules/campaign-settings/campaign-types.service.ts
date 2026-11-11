import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

import {
  CampaignTypeDto,
  type CreateCampaignTypeDto,
  type UpdateCampaignTypeDto,
} from './dto/campaign-type.dto';

@Injectable()
export class CampaignTypesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Liste complète, sans pagination : le référentiel compte une poignée
   * d'entrées et alimente des listes déroulantes.
   */
  async findAll(includeInactive: boolean): Promise<CampaignTypeDto[]> {
    const rows = await this.prisma.campaignType.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { label: 'asc' },
      include: { _count: { select: { campaigns: true } } },
    });

    return rows.map((row) => CampaignTypeDto.from(row, row._count.campaigns));
  }

  async findOne(id: string): Promise<CampaignTypeDto> {
    const type = await this.prisma.campaignType.findUnique({
      where: { id },
      include: { _count: { select: { campaigns: true } } },
    });

    if (!type) throw new NotFoundException('Type de campagne introuvable.');
    return CampaignTypeDto.from(type, type._count.campaigns);
  }

  async create(dto: CreateCampaignTypeDto): Promise<CampaignTypeDto> {
    const existing = await this.prisma.campaignType.findUnique({ where: { code: dto.code } });
    if (existing) throw new ConflictException(`Le type « ${dto.code} » existe déjà.`);

    const type = await this.prisma.campaignType.create({
      data: { code: dto.code, label: dto.label, isActive: dto.isActive ?? true },
    });

    return CampaignTypeDto.from(type, 0);
  }

  async update(id: string, dto: UpdateCampaignTypeDto): Promise<CampaignTypeDto> {
    await this.findOne(id);

    if (dto.code !== undefined) {
      const conflict = await this.prisma.campaignType.findFirst({
        where: { code: dto.code, NOT: { id } },
        select: { id: true },
      });
      if (conflict) throw new ConflictException(`Le type « ${dto.code} » existe déjà.`);
    }

    const type = await this.prisma.campaignType.update({
      where: { id },
      data: {
        ...(dto.code === undefined ? {} : { code: dto.code }),
        ...(dto.label === undefined ? {} : { label: dto.label }),
        ...(dto.isActive === undefined ? {} : { isActive: dto.isActive }),
      },
    });

    return CampaignTypeDto.from(type);
  }

  /**
   * Désactivation seule : un type référencé par des campagnes historiques ne
   * peut pas disparaître sans rendre ces campagnes illisibles.
   */
  async deactivate(id: string): Promise<CampaignTypeDto> {
    await this.findOne(id);

    const type = await this.prisma.campaignType.update({
      where: { id },
      data: { isActive: false },
    });

    return CampaignTypeDto.from(type);
  }
}
