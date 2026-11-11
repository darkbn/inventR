import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

import { InventoryMethodDto, type UpdateInventoryMethodDto } from './dto/inventory-method.dto';

@Injectable()
export class InventoryMethodsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(includeInactive: boolean): Promise<InventoryMethodDto[]> {
    const rows = await this.prisma.inventoryMethod.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { code: 'asc' },
      include: { _count: { select: { campaigns: true } } },
    });

    return rows.map((row) => InventoryMethodDto.from(row, row._count.campaigns));
  }

  async findOne(id: string): Promise<InventoryMethodDto> {
    const method = await this.prisma.inventoryMethod.findUnique({
      where: { id },
      include: { _count: { select: { campaigns: true } } },
    });

    if (!method) throw new NotFoundException("Méthode d'inventaire introuvable.");
    return InventoryMethodDto.from(method, method._count.campaigns);
  }

  async findByCode(code: string): Promise<InventoryMethodDto> {
    const method = await this.prisma.inventoryMethod.findUnique({ where: { code } });
    if (!method) throw new NotFoundException(`Méthode d'inventaire « ${code} » introuvable.`);
    return InventoryMethodDto.from(method);
  }

  /**
   * Seuls le libellé, la description et l'activation sont modifiables — voir
   * UpdateInventoryMethodDto : toucher au code ou à la configuration changerait
   * le résultat de campagnes déjà en cours.
   */
  async update(id: string, dto: UpdateInventoryMethodDto): Promise<InventoryMethodDto> {
    await this.findOne(id);

    const method = await this.prisma.inventoryMethod.update({
      where: { id },
      data: {
        ...(dto.label === undefined ? {} : { label: dto.label }),
        ...(dto.description === undefined ? {} : { description: dto.description }),
        ...(dto.isActive === undefined ? {} : { isActive: dto.isActive }),
      },
    });

    return InventoryMethodDto.from(method);
  }
}
