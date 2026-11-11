import { Controller, Get, Query } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import {
  ApiPaginatedResponse,
  paginate,
  type PaginatedDto,
} from '../../common/dto/paginated-response.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { PrismaService } from '../../prisma/prisma.service';

import { ActivityLogDto, ListActivityLogsQueryDto } from './dto/activity-log.dto';

@ApiTags('Journal d’activité')
@ApiBearerAuth('bearer')
@Roles(Role.ADMIN)
@Controller('activity-logs')
export class ActivityLogsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({
    summary: 'Consulter le journal d’activité',
    description:
      'Réservé aux administrateurs. Trace les actions sensibles : création et ' +
      'modification de comptes, imports, comptages, clôtures, fusions ' +
      'd’emplacements. Trié du plus récent au plus ancien.',
  })
  @ApiPaginatedResponse(ActivityLogDto)
  async findAll(@Query() query: ListActivityLogsQueryDto): Promise<PaginatedDto<ActivityLogDto>> {
    const where: Prisma.ActivityLogWhereInput = {
      ...(query.actorId === undefined ? {} : { actorId: query.actorId }),
      ...(query.action === undefined ? {} : { action: query.action }),
      ...(query.entityType === undefined ? {} : { entityType: query.entityType }),
      ...(query.entityId === undefined ? {} : { entityId: query.entityId }),
      ...(query.from === undefined && query.to === undefined
        ? {}
        : {
            createdAt: {
              ...(query.from === undefined ? {} : { gte: new Date(query.from) }),
              ...(query.to === undefined ? {} : { lte: new Date(query.to) }),
            },
          }),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.activityLog.count({ where }),
      this.prisma.activityLog.findMany({
        where,
        // Le journal se lit à l'envers : l'incident le plus récent d'abord.
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.limit,
        include: { actor: { select: { id: true, username: true, fullName: true } } },
      }),
    ]);

    return paginate(
      rows.map((row) => ActivityLogDto.from(row)),
      total,
      query.page,
      query.limit,
    );
  }
}
