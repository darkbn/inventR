import { Injectable } from '@nestjs/common';
import { ItemStatus } from '@prisma/client';
import ExcelJS from 'exceljs';

import { orderedValidCounts } from '../../common/inventory-calculation/count-ordering';

import type { CampaignDashboardDto } from './dto/dashboard.dto';
import type { ReportsService } from './reports.service';

const HEADER_FILL = 'FF1F3A5F';
const SURPLUS_FILL = 'FFE6F4EA';
const SHORTAGE_FILL = 'FFFDE7E9';

/** Libellés français des statuts de ligne, pour un rapport lisible. */
export const ITEM_STATUS_LABELS: Record<ItemStatus, string> = {
  [ItemStatus.PENDING]: 'Non compté',
  [ItemStatus.COUNTED]: 'Compté',
  [ItemStatus.AWAITING_SECOND_COUNT]: 'En attente 2e comptage',
  [ItemStatus.AWAITING_THIRD_COUNT]: 'En attente 3e comptage',
  [ItemStatus.UNDER_INVESTIGATION]: 'Enquête requise',
  [ItemStatus.DISCREPANCY]: 'Litige',
  [ItemStatus.CONFIRMED]: 'Confirmé',
  [ItemStatus.NOT_FOUND]: 'Non trouvé',
};

type CampaignRows = Awaited<ReturnType<ReportsService['campaignRows']>>;
type CampaignCounts = Awaited<ReturnType<ReportsService['campaignCounts']>>;

export interface ExcelReportInput {
  dashboard: CampaignDashboardDto;
  rows: CampaignRows;
  counts: CampaignCounts;
  /** Inclure les colonnes financières. */
  withValuation: boolean;
}

@Injectable()
export class ReportExcelService {
  /**
   * Rapport de campagne au format Excel, en cinq feuilles : synthèse, écarts
   * valorisés, détail des lignes, comptages, et activité par opérateur.
   *
   * Le détail est volontairement exhaustif — jusqu'à 8 000 lignes : c'est la
   * pièce qui sera rapprochée de l'ERP et archivée. La feuille des écarts, elle,
   * ne retient que les lignes à corriger : c'est celle qu'on ouvre en premier.
   */
  async generate(input: ExcelReportInput): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'InventAir';
    workbook.created = new Date();

    this.buildSummarySheet(workbook, input);
    this.buildVarianceSheet(workbook, input);
    this.buildItemsSheet(workbook, input);
    this.buildCountsSheet(workbook, input);
    this.buildCountersSheet(workbook, input);

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  // --------------------------------------------------------------------------

  private buildSummarySheet(workbook: ExcelJS.Workbook, input: ExcelReportInput): void {
    const { dashboard, withValuation } = input;
    const sheet = workbook.addWorksheet('Synthèse');
    sheet.columns = [
      { key: 'label', width: 42 },
      { key: 'value', width: 34 },
    ];

    const title = sheet.addRow([`Rapport d'inventaire — ${dashboard.code}`]);
    title.font = { bold: true, size: 15, color: { argb: HEADER_FILL } };
    sheet.mergeCells(title.number, 1, title.number, 2);
    sheet.addRow([]);

    const section = (label: string): void => {
      const row = sheet.addRow([label]);
      row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
      sheet.mergeCells(row.number, 1, row.number, 2);
    };

    section('Campagne');
    const entries: [string, string | number][] = [
      ['Libellé', dashboard.name],
      ['Type', dashboard.campaignTypeLabel],
      ['Magasin', dashboard.warehouseCode],
      ['Méthode de calcul', dashboard.methodLabel],
      ['Passage', dashboard.round],
      ['Statut', dashboard.status],
      ['Ouverte le', dashboard.startedAt ? dashboard.startedAt.toLocaleString('fr-FR') : '—'],
      ['Clôturée le', dashboard.closedAt ? dashboard.closedAt.toLocaleString('fr-FR') : '—'],
      [
        'Lignes à quantité théorique nulle',
        dashboard.zeroTheoreticalHidden ? 'Exclues des indicateurs' : 'Incluses',
      ],
      ['Édité le', new Date().toLocaleString('fr-FR')],
    ];
    for (const [label, value] of entries) sheet.addRow([label, value]);

    sheet.addRow([]);
    section('Avancement');
    const progress = dashboard.progress;
    for (const [label, value] of [
      ['Lignes au total', progress.totalItems],
      ['Non comptées', progress.pending],
      ['Comptées', progress.counted],
      ['Confirmées', progress.confirmed],
      ['En attente de 2e comptage', progress.awaitingSecondCount],
      ['En attente de 3e comptage', progress.awaitingThirdCount],
      ['Sous enquête', progress.underInvestigation],
      ['Litiges', progress.discrepancies],
      ['Non trouvées', progress.notFound],
      ['Ajoutées sur le terrain', progress.manualItems],
      ['Avancement', `${progress.completionPercent} %`],
    ] as [string, string | number][]) {
      sheet.addRow([label, value]);
    }

    sheet.addRow([]);
    section('Écarts');
    const variance = dashboard.variance;
    const varianceEntries: [string, string | number][] = [
      ['Lignes en surplus', variance.surplusCount],
      ['Lignes en manque', variance.shortageCount],
      ['Lignes conformes', variance.matchingCount],
      ['Quantité en surplus', variance.surplusQuantity],
      ['Quantité manquante', variance.shortageQuantity],
    ];

    if (withValuation) {
      varianceEntries.push(
        ['Valeur des surplus', variance.surplusValue ?? 0],
        ['Valeur des manques', variance.shortageValue ?? 0],
        ['Valeur nette de l’écart', variance.netValue ?? 0],
      );
    }

    for (const [label, value] of varianceEntries) {
      const row = sheet.addRow([label, value]);
      if (typeof value === 'number' && label.startsWith('Valeur')) {
        row.getCell(2).numFmt = '#,##0.00';
      }
    }

    sheet.getColumn(1).font = { ...sheet.getColumn(1).font };
  }

  private buildItemsSheet(workbook: ExcelJS.Workbook, input: ExcelReportInput): void {
    const sheet = workbook.addWorksheet('Détail des lignes', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    const columns: Partial<ExcelJS.Column>[] = [
      { header: 'Liste', key: 'list', width: 14 },
      { header: 'Emplacement', key: 'location', width: 18 },
      { header: 'Code article', key: 'code', width: 16 },
      { header: 'Désignation', key: 'designation', width: 52 },
      { header: 'Unité', key: 'unit', width: 12 },
      { header: 'Marque', key: 'brand', width: 16 },
      { header: 'Réf. fabricant', key: 'manufacturerRef', width: 18 },
      { header: 'Qté théorique', key: 'theoretical', width: 14 },
      { header: 'Comptage 1', key: 'count1', width: 12 },
      { header: 'Comptage 2', key: 'count2', width: 12 },
      { header: 'Comptage 3', key: 'count3', width: 12 },
      { header: 'Enquête', key: 'investigation', width: 12 },
      { header: 'Qté retenue', key: 'final', width: 14 },
      { header: 'Écart', key: 'variance', width: 12 },
      { header: 'Sens', key: 'direction', width: 12 },
      { header: 'Statut', key: 'status', width: 22 },
      { header: 'Nb comptages', key: 'countCount', width: 14 },
      { header: 'Compté par', key: 'counters', width: 32 },
    ];

    if (input.withValuation) {
      columns.push(
        { header: 'Prix unitaire', key: 'unitPrice', width: 15 },
        { header: 'Valeur écart', key: 'varianceValue', width: 16 },
      );
    }

    sheet.columns = columns;
    ReportExcelService.styleHeader(sheet);

    for (const item of input.rows) {
      const theoretical = Number(item.theoreticalQty);
      const final = item.finalQty === null ? null : Number(item.finalQty);
      const variance = final === null ? null : final - theoretical;
      const passes = orderedValidCounts(item.counts);
      const validCounts = passes;

      const row = sheet.addRow({
        list: item.list.code,
        location: item.location.code,
        code: item.article.code,
        designation: item.article.designation,
        unit: item.article.unit,
        brand: item.article.brand ?? '',
        manufacturerRef: item.article.manufacturerRef ?? '',
        theoretical,
        count1: ReportExcelService.pass(passes, 0),
        count2: ReportExcelService.pass(passes, 1),
        count3: ReportExcelService.pass(passes, 2),
        investigation: item.arbitratedQty === null ? '' : Number(item.arbitratedQty),
        final: final ?? '',
        variance: variance ?? '',
        direction: variance === null || variance === 0 ? '' : variance > 0 ? 'Surplus' : 'Manque',
        status: ITEM_STATUS_LABELS[item.status],
        countCount: validCounts.length,
        counters: [...new Set(validCounts.map((count) => count.user.fullName))].join(', '),
        ...(input.withValuation
          ? {
              unitPrice: Number(item.unitPrice),
              varianceValue: variance === null ? '' : variance * Number(item.unitPrice),
            }
          : {}),
      });

      // Surlignage des écarts : le lecteur doit les repérer sans filtrer.
      if (variance !== null && variance !== 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: variance > 0 ? SURPLUS_FILL : SHORTAGE_FILL },
        };
      }
    }

    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
  }

  private buildCountsSheet(workbook: ExcelJS.Workbook, input: ExcelReportInput): void {
    const sheet = workbook.addWorksheet('Comptages', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    sheet.columns = [
      { header: 'Date et heure', key: 'countedAt', width: 20 },
      { header: 'Opérateur', key: 'operator', width: 28 },
      { header: 'Emplacement', key: 'location', width: 18 },
      { header: 'Code article', key: 'code', width: 16 },
      { header: 'Désignation', key: 'designation', width: 52 },
      { header: 'Quantité', key: 'quantity', width: 12 },
      { header: 'Origine', key: 'source', width: 12 },
      { header: 'Statut', key: 'status', width: 14 },
    ];
    ReportExcelService.styleHeader(sheet);

    for (const count of input.counts) {
      const row = sheet.addRow({
        countedAt: count.countedAt.toLocaleString('fr-FR'),
        operator: count.fullName,
        location: count.locationCode,
        code: count.articleCode,
        designation: count.designation,
        quantity: count.quantity,
        source: count.source === 'MOBILE' ? 'Mobile' : 'Web',
        status: count.status === 'VALID' ? 'Valide' : 'Annulé',
      });

      // Un comptage annulé reste au dossier, mais ne doit pas être lu comme actif.
      if (count.status !== 'VALID') {
        row.font = { strike: true, color: { argb: 'FF9A9A9A' } };
      }
    }

    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 8 } };
  }

  private buildCountersSheet(workbook: ExcelJS.Workbook, input: ExcelReportInput): void {
    const sheet = workbook.addWorksheet('Par opérateur');

    sheet.columns = [
      { header: 'Opérateur', key: 'fullName', width: 30 },
      { header: 'Identifiant', key: 'username', width: 20 },
      { header: 'Comptages', key: 'countEntries', width: 14 },
      { header: 'Lignes couvertes', key: 'itemsCovered', width: 18 },
      { header: 'Quantité totale', key: 'totalQuantity', width: 16 },
      { header: 'Premier comptage', key: 'firstCountAt', width: 20 },
      { header: 'Dernier comptage', key: 'lastCountAt', width: 20 },
    ];
    ReportExcelService.styleHeader(sheet);

    for (const counter of input.dashboard.counters) {
      sheet.addRow({
        fullName: counter.fullName,
        username: counter.username,
        countEntries: counter.countEntries,
        itemsCovered: counter.itemsCovered,
        totalQuantity: counter.totalQuantity,
        firstCountAt: counter.firstCountAt?.toLocaleString('fr-FR') ?? '—',
        lastCountAt: counter.lastCountAt?.toLocaleString('fr-FR') ?? '—',
      });
    }
  }

  /**
   * Quantité du n-ième passage, ou chaîne vide si ce passage n'a pas eu lieu.
   *
   * Une cellule vide, et non un zéro : « pas encore compté » et « compté à
   * zéro » sont deux constats radicalement différents pour qui relit l'export.
   */
  private static pass(passes: { quantity: unknown }[], index: number): number | string {
    const entry = passes[index];
    return entry === undefined ? '' : Number(entry.quantity);
  }

  /**
   * Feuille « Écarts valorisés » — la pièce de travail du gestionnaire.
   *
   * Elle ne retient que les lignes dont l'écart est non nul, et montre le
   * cheminement complet : quantité théorique issue de SAP, les trois passages
   * de comptage, l'éventuelle enquête, la quantité retenue, l'écart et sa
   * valeur au Pmp.
   *
   * Les indicateurs sont en tête, pas en pied : on veut savoir en ouvrant le
   * fichier combien d'articles sont en surplus, combien en manque, et ce que
   * cela représente — le détail ne sert qu'ensuite, pour instruire.
   *
   * Sans droit de valorisation (rôle opérateur), les colonnes financières sont
   * absentes du fichier, et non masquées : une colonne masquée se démasque.
   */
  private buildVarianceSheet(workbook: ExcelJS.Workbook, input: ExcelReportInput): void {
    const { withValuation, dashboard } = input;
    const sheet = workbook.addWorksheet('Écarts valorisés');

    const title = sheet.addRow(['Récapitulatif des écarts de comptage']);
    title.font = { bold: true, size: 14, color: { argb: HEADER_FILL } };
    sheet.addRow([`Campagne ${dashboard.code} — ${dashboard.name}`]);
    sheet.addRow([`Méthode : ${dashboard.methodLabel}`]);
    sheet.addRow([]);

    // ---- Indicateurs clés ------------------------------------------------
    const variance = dashboard.variance;
    const kpiHeader = ['Indicateur', 'Nombre d’articles', 'Quantité'];
    if (withValuation) kpiHeader.push('Valeur (Pmp)');

    const kpiHeaderRow = sheet.addRow(kpiHeader);
    kpiHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    kpiHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: HEADER_FILL },
    };

    const kpis: (string | number)[][] = [
      ['Écart positif (surplus)', variance.surplusCount, variance.surplusQuantity],
      ['Écart négatif (manque)', variance.shortageCount, variance.shortageQuantity],
      ['Conformes (écart nul)', variance.matchingCount, ''],
    ];

    if (withValuation) {
      kpis[0]?.push(variance.surplusValue ?? 0);
      kpis[1]?.push(variance.shortageValue ?? 0);
      kpis[2]?.push('');
      kpis.push([
        'Solde net',
        variance.surplusCount + variance.shortageCount,
        '',
        variance.netValue ?? 0,
      ]);
    }

    for (const [index, kpi] of kpis.entries()) {
      const row = sheet.addRow(kpi);
      const fill = index === 0 ? SURPLUS_FILL : index === 1 ? SHORTAGE_FILL : null;
      if (fill) {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
      }
      if (withValuation) row.getCell(4).numFmt = '#,##0.00';
    }

    sheet.addRow([]);
    sheet.addRow([
      'Ne figurent ci-dessous que les lignes dont l’écart est non nul. Une ligne ' +
        'non encore tranchée (comptage supplémentaire attendu, enquête en cours) ' +
        'n’a pas d’écart et reste absente de ce tableau.',
    ]);
    sheet.addRow([]);

    // ---- Détail des écarts ------------------------------------------------
    const headerRowIndex = sheet.rowCount + 1;
    const header = [
      'Liste',
      'Emplacement',
      'Code article',
      'Désignation',
      'Unité',
      'Qté théorique',
      'Comptage 1',
      'Comptage 2',
      'Comptage 3',
      'Enquête',
      'Qté retenue',
      'Écart',
      'Sens',
      'Origine',
    ];
    if (withValuation) header.push('Pmp', 'Valeur écart');

    const detailHeader = sheet.addRow(header);
    detailHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    detailHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
    detailHeader.alignment = { vertical: 'middle', wrapText: true };
    detailHeader.height = 26;

    let rowCount = 0;

    for (const item of input.rows) {
      if (item.finalQty === null) continue;

      const theoretical = Number(item.theoreticalQty);
      const final = Number(item.finalQty);
      const gap = final - theoretical;

      if (gap === 0) continue;

      const passes = orderedValidCounts(item.counts);
      const cells: (string | number)[] = [
        item.list.code,
        item.location.code,
        item.article.code,
        item.article.designation,
        item.article.unit,
        theoretical,
        ReportExcelService.pass(passes, 0),
        ReportExcelService.pass(passes, 1),
        ReportExcelService.pass(passes, 2),
        item.arbitratedQty === null ? '' : Number(item.arbitratedQty),
        final,
        gap,
        gap > 0 ? 'Surplus' : 'Manque',
        item.isManual ? 'Ajouté terrain' : 'Fichier SAP',
      ];

      if (withValuation) {
        cells.push(Number(item.unitPrice), gap * Number(item.unitPrice));
      }

      const row = sheet.addRow(cells);
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: gap > 0 ? SURPLUS_FILL : SHORTAGE_FILL },
      };
      if (withValuation) {
        row.getCell(header.length).numFmt = '#,##0.00';
        row.getCell(header.length - 1).numFmt = '#,##0.0000';
      }
      rowCount += 1;
    }

    if (rowCount === 0) {
      sheet.addRow(['Aucun écart : toutes les lignes résolues correspondent au théorique.']);
    } else {
      sheet.autoFilter = {
        from: { row: headerRowIndex, column: 1 },
        to: { row: headerRowIndex, column: header.length },
      };
      sheet.views = [{ state: 'frozen', ySplit: headerRowIndex }];
    }

    const widths = [14, 18, 16, 52, 10, 14, 12, 12, 12, 12, 14, 12, 10, 14, 12, 16];
    widths.forEach((width, index) => {
      const column = sheet.getColumn(index + 1);
      if (column.width === undefined || column.width < width) column.width = width;
    });
  }

  private static styleHeader(sheet: ExcelJS.Worksheet): void {
    const header = sheet.getRow(1);
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
    header.alignment = { vertical: 'middle', wrapText: true };
    header.height = 26;
  }
}
