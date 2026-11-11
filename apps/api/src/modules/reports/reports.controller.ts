import { Controller, Get, Param, ParseUUIDPipe, Query, Res } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiProduces, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

import { CampaignDashboardDto, CounterActivityDto, DashboardQueryDto } from './dto/dashboard.dto';
import { ReportExcelService } from './report-excel.service';
import { ReportPdfService } from './report-pdf.service';
import { ReportsService } from './reports.service';

@ApiTags('Rapports')
@ApiBearerAuth('bearer')
@Roles(Role.ADMIN, Role.SUPERVISOR)
@Controller()
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly excelService: ReportExcelService,
    private readonly pdfService: ReportPdfService,
  ) {}

  @Get('campaigns/:id/dashboard')
  @ApiOperation({
    summary: 'Tableau de bord d’une campagne',
    description:
      'Avancement, écarts, répartition par liste et activité par opérateur. Les ' +
      'lignes à quantité théorique nulle sont exclues par défaut : elles ' +
      'représentent 47 % du fichier de référence et noieraient les indicateurs.',
  })
  @ApiResponse({ status: 200, type: CampaignDashboardDto })
  dashboard(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: DashboardQueryDto,
  ): Promise<CampaignDashboardDto> {
    return this.reportsService.dashboard(actor, id, query);
  }

  @Get('reports/campaigns/:id/by-user')
  @ApiOperation({
    summary: 'Activité de comptage par opérateur',
    description: 'Qui a compté quoi, combien de lignes, et sur quelle plage horaire.',
  })
  @ApiResponse({ status: 200, type: [CounterActivityDto] })
  byUser(@Param('id', ParseUUIDPipe) id: string): Promise<CounterActivityDto[]> {
    return this.reportsService.counterActivity(id);
  }

  @Get('reports/campaigns/:id.xlsx')
  @ApiProduces('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @ApiOperation({
    summary: 'Rapport de campagne au format Excel',
    description:
      'Quatre feuilles : synthèse, détail exhaustif des lignes (écarts ' +
      'surlignés), journal des comptages, et activité par opérateur. C’est la ' +
      'pièce destinée au rapprochement avec l’ERP et à l’archivage.',
  })
  @ApiResponse({ status: 200, description: 'Classeur Excel' })
  async excel(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: DashboardQueryDto,
    @Res() response: Response,
  ): Promise<void> {
    const [dashboard, rows, counts] = await Promise.all([
      this.reportsService.dashboard(actor, id, query),
      this.reportsService.campaignRows(id),
      this.reportsService.campaignCounts(id),
    ]);

    const buffer = await this.excelService.generate({
      dashboard,
      rows,
      counts,
      withValuation: actor.role === Role.ADMIN || actor.role === Role.SUPERVISOR,
    });

    ReportsController.sendFile(
      response,
      buffer,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      `InventAir-${dashboard.code}.xlsx`,
    );
  }

  @Get('reports/campaigns/:id.pdf')
  @ApiProduces('application/pdf')
  @ApiOperation({
    summary: 'Rapport de campagne au format PDF',
    description:
      'Synthèse destinée à être signée et archivée : avancement, écarts, litiges ' +
      'et activité des opérateurs. Le détail des lignes en écart est limité pour ' +
      'rester lisible — l’exhaustivité relève de l’export Excel.',
  })
  @ApiResponse({ status: 200, description: 'Document PDF' })
  async pdf(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: DashboardQueryDto,
    @Res() response: Response,
  ): Promise<void> {
    const [dashboard, rows] = await Promise.all([
      this.reportsService.dashboard(actor, id, query),
      this.reportsService.campaignRows(id),
    ]);

    const buffer = await this.pdfService.generate({
      dashboard,
      rows,
      withValuation: actor.role === Role.ADMIN || actor.role === Role.SUPERVISOR,
    });

    ReportsController.sendFile(
      response,
      buffer,
      'application/pdf',
      `InventAir-${dashboard.code}.pdf`,
    );
  }

  private static sendFile(
    response: Response,
    buffer: Buffer,
    contentType: string,
    filename: string,
  ): void {
    response.setHeader('Content-Type', contentType);
    response.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    response.setHeader('Content-Length', buffer.length);
    response.end(buffer);
  }
}
