import { Module } from '@nestjs/common';

import { ReportExcelService } from './report-excel.service';
import { ReportPdfService } from './report-pdf.service';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  controllers: [ReportsController],
  providers: [ReportsService, ReportExcelService, ReportPdfService],
  exports: [ReportsService],
})
export class ReportsModule {}
