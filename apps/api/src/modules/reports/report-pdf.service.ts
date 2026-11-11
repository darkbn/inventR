import { Injectable } from '@nestjs/common';
import PdfPrinter from 'pdfmake';
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';

import { orderedValidCounts } from '../../common/inventory-calculation/count-ordering';

import { ITEM_STATUS_LABELS } from './report-excel.service';
import type { CampaignDashboardDto } from './dto/dashboard.dto';
import type { ReportsService } from './reports.service';

/**
 * Polices de base du format PDF (« standard 14 »), intégrées à tout lecteur :
 * aucun fichier de police à embarquer ni à déployer, et l'encodage WinAnsi
 * couvre les caractères accentués du français.
 */
const FONTS = {
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique',
  },
};

const NAVY = '#1F3A5F';
const GREY = '#6B7280';
const SURPLUS = '#E6F4EA';
const SHORTAGE = '#FDE7E9';

/** Au-delà, le PDF cesse d'être lisible : le détail exhaustif est dans l'Excel. */
const MAX_DETAIL_ROWS = 400;

/**
 * Lignes d'écart détaillées dans le récapitulatif. Au-delà, le tableau cesse
 * d'être consultable et l'on renvoie vers la feuille « Écarts valorisés » de
 * l'export Excel, qui se filtre et se trie.
 */
const MAX_VARIANCE_ROWS = 150;

type CampaignRows = Awaited<ReturnType<ReportsService['campaignRows']>>;

export interface PdfReportInput {
  dashboard: CampaignDashboardDto;
  rows: CampaignRows;
  withValuation: boolean;
}

@Injectable()
export class ReportPdfService {
  private readonly printer = new PdfPrinter(FONTS);

  /**
   * Rapport de synthèse au format PDF, destiné à être signé et archivé.
   *
   * Il ne reprend pas les 8 000 lignes — ce serait illisible et inutilisable :
   * il présente la synthèse, les écarts les plus significatifs, l'activité des
   * opérateurs et les litiges. Le détail exhaustif reste l'affaire de l'export
   * Excel.
   */
  async generate(input: PdfReportInput): Promise<Buffer> {
    const definition = this.buildDefinition(input);
    const document = this.printer.createPdfKitDocument(definition);

    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      document.on('data', (chunk: Buffer) => chunks.push(chunk));
      document.on('end', () => resolve(Buffer.concat(chunks)));
      document.on('error', reject);
      document.end();
    });
  }

  private buildDefinition(input: PdfReportInput): TDocumentDefinitions {
    const { dashboard } = input;
    const generatedAt = new Date().toLocaleString('fr-FR');

    return {
      pageSize: 'A4',
      pageOrientation: 'landscape',
      pageMargins: [28, 64, 28, 44],
      defaultStyle: { font: 'Helvetica', fontSize: 9 },

      header: () => ({
        margin: [28, 20, 28, 0],
        columns: [
          { text: 'InventAir — Rapport de campagne', style: 'brand' },
          { text: dashboard.code, alignment: 'right', style: 'brand' },
        ],
      }),

      footer: (currentPage: number, pageCount: number) => ({
        margin: [28, 10, 28, 0],
        columns: [
          { text: `Édité le ${generatedAt}`, style: 'footer' },
          { text: `Page ${currentPage} / ${pageCount}`, alignment: 'right', style: 'footer' },
        ],
      }),

      content: [
        this.identityBlock(input),
        this.progressBlock(input),
        this.varianceBlock(input),
        ...this.varianceDetailBlock(input),
        ...this.topVariancesBlock(input),
        ...this.discrepanciesBlock(input),
        ...this.countersBlock(input),
        ...this.detailBlock(input),
      ],

      styles: {
        brand: { fontSize: 10, bold: true, color: NAVY },
        footer: { fontSize: 7, color: GREY },
        title: { fontSize: 16, bold: true, color: NAVY, margin: [0, 0, 0, 2] },
        subtitle: { fontSize: 10, color: GREY, margin: [0, 0, 0, 12] },
        section: { fontSize: 12, bold: true, color: NAVY, margin: [0, 14, 0, 6] },
        tableHeader: { bold: true, color: 'white', fillColor: NAVY, fontSize: 9 },
        note: { fontSize: 8, color: GREY, italics: true, margin: [0, 4, 0, 0] },
      },
    };
  }

  // --------------------------------------------------------------------------

  private identityBlock(input: PdfReportInput): Content {
    const { dashboard } = input;

    return {
      stack: [
        { text: dashboard.name, style: 'title' },
        {
          text:
            `${dashboard.campaignTypeLabel} · Magasin ${dashboard.warehouseCode} · ` +
            `Passage ${dashboard.round} · ${dashboard.methodLabel} · Statut ${dashboard.status}`,
          style: 'subtitle',
        },
        {
          columns: [
            {
              text: [
                { text: 'Ouverte le : ', bold: true },
                dashboard.startedAt ? dashboard.startedAt.toLocaleString('fr-FR') : '—',
              ],
            },
            {
              text: [
                { text: 'Clôturée le : ', bold: true },
                dashboard.closedAt ? dashboard.closedAt.toLocaleString('fr-FR') : '—',
              ],
            },
            {
              text: [
                { text: 'Lignes à quantité théorique nulle : ', bold: true },
                dashboard.zeroTheoreticalHidden ? 'exclues' : 'incluses',
              ],
            },
          ],
        },
      ],
    };
  }

  private progressBlock(input: PdfReportInput): Content {
    const p = input.dashboard.progress;

    return {
      stack: [
        { text: 'Avancement', style: 'section' },
        {
          table: {
            widths: ['*', '*', '*', '*', '*', '*', '*', '*', '*'],
            body: [
              [
                { text: 'Total', style: 'tableHeader' },
                { text: 'Non comptées', style: 'tableHeader' },
                { text: 'Comptées', style: 'tableHeader' },
                { text: 'Confirmées', style: 'tableHeader' },
                { text: '2e comptage attendu', style: 'tableHeader' },
                { text: '3e comptage attendu', style: 'tableHeader' },
                { text: 'Sous enquête', style: 'tableHeader' },
                { text: 'Litiges', style: 'tableHeader' },
                { text: 'Non trouvées', style: 'tableHeader' },
              ],
              [
                String(p.totalItems),
                String(p.pending),
                String(p.counted),
                String(p.confirmed),
                String(p.awaitingSecondCount),
                String(p.awaitingThirdCount),
                String(p.underInvestigation),
                String(p.discrepancies),
                String(p.notFound),
              ],
            ],
          },
          layout: 'lightHorizontalLines',
        },
        {
          text:
            `Avancement global : ${p.completionPercent} %` +
            (p.manualItems > 0
              ? ` — dont ${p.manualItems} ligne(s) ajoutée(s) sur le terrain, absentes du fichier importé.`
              : ''),
          style: 'note',
        },
      ],
    };
  }

  private varianceBlock(input: PdfReportInput): Content {
    const v = input.dashboard.variance;

    const header = [
      { text: 'Surplus (lignes)', style: 'tableHeader' },
      { text: 'Manques (lignes)', style: 'tableHeader' },
      { text: 'Conformes', style: 'tableHeader' },
      { text: 'Qté surplus', style: 'tableHeader' },
      { text: 'Qté manquante', style: 'tableHeader' },
    ];
    const values = [
      String(v.surplusCount),
      String(v.shortageCount),
      String(v.matchingCount),
      ReportPdfService.number(v.surplusQuantity),
      ReportPdfService.number(v.shortageQuantity),
    ];

    if (input.withValuation) {
      header.push(
        { text: 'Valeur surplus', style: 'tableHeader' },
        { text: 'Valeur manques', style: 'tableHeader' },
        { text: 'Écart net', style: 'tableHeader' },
      );
      values.push(
        ReportPdfService.number(v.surplusValue ?? 0),
        ReportPdfService.number(v.shortageValue ?? 0),
        ReportPdfService.number(v.netValue ?? 0),
      );
    }

    return {
      stack: [
        { text: 'Écarts', style: 'section' },
        {
          table: { widths: header.map(() => '*'), body: [header, values] },
          layout: 'lightHorizontalLines',
        },
        {
          text: 'Écart = quantité comptée − quantité théorique. Positif : surplus. Négatif : manque.',
          style: 'note',
        },
      ],
    };
  }

  /**
   * Récapitulatif des écarts, passage par passage.
   *
   * Demandé en recette : voir côte à côte la quantité théorique issue de SAP et
   * chacun des comptages successifs. C'est ce qui permet de juger un écart
   * plutôt que de le subir — deux comptages concordants à 28 contre un
   * théorique à 30 ne se traite pas comme trois comptages qui divergent.
   *
   * Seules les lignes tranchées et réellement en écart figurent ici : une ligne
   * en attente de comptage n'a pas d'écart, et l'afficher à zéro laisserait
   * croire qu'elle est conforme.
   */
  private varianceDetailBlock(input: PdfReportInput): Content[] {
    const { withValuation } = input;

    const rows = input.rows.filter(
      (item) => item.finalQty !== null && Number(item.finalQty) !== Number(item.theoreticalQty),
    );

    if (rows.length === 0) {
      return [
        { text: 'Récapitulatif des écarts de comptage', style: 'section' },
        {
          text: 'Aucun écart : toutes les lignes tranchées correspondent à la quantité théorique.',
          style: 'note',
        },
      ];
    }

    const header = [
      { text: 'Emplacement', style: 'tableHeader' },
      { text: 'Code', style: 'tableHeader' },
      { text: 'Désignation', style: 'tableHeader' },
      { text: 'Théorique', style: 'tableHeader' },
      { text: 'Comptage 1', style: 'tableHeader' },
      { text: 'Comptage 2', style: 'tableHeader' },
      { text: 'Comptage 3', style: 'tableHeader' },
      { text: 'Enquête', style: 'tableHeader' },
      { text: 'Retenu', style: 'tableHeader' },
      { text: 'Écart', style: 'tableHeader' },
    ];
    if (withValuation) header.push({ text: 'Valeur', style: 'tableHeader' });

    const shown = rows.slice(0, MAX_VARIANCE_ROWS);

    const body = shown.map((item) => {
      const theoretical = Number(item.theoreticalQty);
      const final = Number(item.finalQty);
      const gap = final - theoretical;
      const fill = gap > 0 ? SURPLUS : SHORTAGE;
      const passes = orderedValidCounts(item.counts);

      const right = (text: string) => ({ text, fillColor: fill, alignment: 'right' as const });

      const cells = [
        { text: item.location.code, fillColor: fill },
        { text: item.article.code, fillColor: fill },
        { text: item.article.designation, fillColor: fill },
        right(ReportPdfService.number(theoretical)),
        right(ReportPdfService.pass(passes, 0)),
        right(ReportPdfService.pass(passes, 1)),
        right(ReportPdfService.pass(passes, 2)),
        right(item.arbitratedQty === null ? '—' : ReportPdfService.number(Number(item.arbitratedQty))),
        right(ReportPdfService.number(final)),
        right(ReportPdfService.number(gap)),
      ];

      if (withValuation) {
        cells.push(right(ReportPdfService.number(gap * Number(item.unitPrice))));
      }

      return cells;
    });

    const note =
      rows.length > shown.length
        ? `${shown.length} écarts sur ${rows.length} affichés. La liste complète, filtrable, est dans la feuille « Écarts valorisés » de l’export Excel.`
        : 'Un tiret indique un passage qui n’a pas eu lieu — à distinguer d’un comptage à zéro.';

    return [
      { text: 'Récapitulatif des écarts de comptage', style: 'section', pageBreak: 'before' },
      {
        table: {
          headerRows: 1,
          widths: withValuation
            ? [62, 56, '*', 46, 46, 46, 46, 46, 46, 46, 52]
            : [66, 60, '*', 50, 50, 50, 50, 50, 50, 50],
          body: [header, ...body],
        },
        layout: 'lightHorizontalLines',
      },
      { text: note, style: 'note' },
    ];
  }

  /** Quantité du n-ième passage, ou tiret si ce passage n'a pas eu lieu. */
  private static pass(passes: { quantity: unknown }[], index: number): string {
    const entry = passes[index];
    return entry === undefined ? '—' : ReportPdfService.number(Number(entry.quantity));
  }

  private topVariancesBlock(input: PdfReportInput): Content[] {
    if (input.dashboard.topVariances.length === 0) return [];

    const withValuation = input.withValuation;
    const header = [
      { text: 'Emplacement', style: 'tableHeader' },
      { text: 'Code', style: 'tableHeader' },
      { text: 'Désignation', style: 'tableHeader' },
      { text: 'Théorique', style: 'tableHeader' },
      { text: 'Compté', style: 'tableHeader' },
      { text: 'Écart', style: 'tableHeader' },
    ];
    if (withValuation) header.push({ text: 'Valeur', style: 'tableHeader' });

    const body = input.dashboard.topVariances.map((entry) => {
      const fill = entry.variance > 0 ? SURPLUS : SHORTAGE;
      const cells = [
        { text: entry.locationCode, fillColor: fill },
        { text: entry.articleCode, fillColor: fill },
        { text: entry.designation, fillColor: fill },
        {
          text: ReportPdfService.number(entry.theoreticalQty),
          fillColor: fill,
          alignment: 'right' as const,
        },
        {
          text: ReportPdfService.number(entry.finalQty),
          fillColor: fill,
          alignment: 'right' as const,
        },
        {
          text: ReportPdfService.number(entry.variance),
          fillColor: fill,
          alignment: 'right' as const,
        },
      ];
      if (withValuation) {
        cells.push({
          text: ReportPdfService.number(entry.varianceValue ?? 0),
          fillColor: fill,
          alignment: 'right' as const,
        });
      }
      return cells;
    });

    return [
      { text: 'Écarts les plus significatifs', style: 'section' },
      {
        table: {
          headerRows: 1,
          widths: withValuation ? [70, 60, '*', 50, 50, 50, 65] : [70, 60, '*', 55, 55, 55],
          body: [header, ...body],
        },
        layout: 'lightHorizontalLines',
      },
      {
        text: withValuation
          ? 'Classement par impact financier : sur un magasin de pièces de rechange, dix vis manquantes pèsent moins qu’un roulement.'
          : 'Classement par ampleur de l’écart.',
        style: 'note',
      },
    ];
  }

  private discrepanciesBlock(input: PdfReportInput): Content[] {
    const disputed = input.rows.filter(
      (row) => row.status === 'DISCREPANCY' || row.status === 'AWAITING_SECOND_COUNT',
    );

    if (disputed.length === 0) return [];

    const body = disputed
      .slice(0, 100)
      .map((row) => [
        row.location.code,
        row.article.code,
        row.article.designation,
        ITEM_STATUS_LABELS[row.status],
        [
          ...new Set(
            row.counts
              .filter((c) => c.status === 'VALID')
              .map((c) => `${c.user.fullName} : ${Number(c.quantity)}`),
          ),
        ].join(' · '),
      ]);

    return [
      { text: 'Lignes en litige ou en attente', style: 'section', pageBreak: 'before' },
      {
        table: {
          headerRows: 1,
          widths: [70, 60, '*', 90, 200],
          body: [
            [
              { text: 'Emplacement', style: 'tableHeader' },
              { text: 'Code', style: 'tableHeader' },
              { text: 'Désignation', style: 'tableHeader' },
              { text: 'Statut', style: 'tableHeader' },
              { text: 'Comptages retenus', style: 'tableHeader' },
            ],
            ...body,
          ],
        },
        layout: 'lightHorizontalLines',
      },
      ...(disputed.length > 100
        ? [{ text: `… et ${disputed.length - 100} autre(s) ligne(s).`, style: 'note' } as Content]
        : []),
    ];
  }

  private countersBlock(input: PdfReportInput): Content[] {
    if (input.dashboard.counters.length === 0) return [];

    const body = input.dashboard.counters.map((counter) => [
      counter.fullName,
      String(counter.countEntries),
      String(counter.itemsCovered),
      ReportPdfService.number(counter.totalQuantity),
      counter.firstCountAt?.toLocaleString('fr-FR') ?? '—',
      counter.lastCountAt?.toLocaleString('fr-FR') ?? '—',
    ]);

    return [
      { text: 'Activité par opérateur', style: 'section' },
      {
        table: {
          headerRows: 1,
          widths: ['*', 60, 70, 70, 110, 110],
          body: [
            [
              { text: 'Opérateur', style: 'tableHeader' },
              { text: 'Comptages', style: 'tableHeader' },
              { text: 'Lignes', style: 'tableHeader' },
              { text: 'Quantité', style: 'tableHeader' },
              { text: 'Premier comptage', style: 'tableHeader' },
              { text: 'Dernier comptage', style: 'tableHeader' },
            ],
            ...body,
          ],
        },
        layout: 'lightHorizontalLines',
      },
    ];
  }

  private detailBlock(input: PdfReportInput): Content[] {
    const withVariance = input.rows.filter(
      (row) => row.finalQty !== null && !row.finalQty.equals(row.theoreticalQty),
    );

    if (withVariance.length === 0) return [];

    const shown = withVariance.slice(0, MAX_DETAIL_ROWS);

    const body = shown.map((row) => {
      const variance = Number(row.finalQty) - Number(row.theoreticalQty);
      const fill = variance > 0 ? SURPLUS : SHORTAGE;

      return [
        { text: row.list.code, fillColor: fill },
        { text: row.location.code, fillColor: fill },
        { text: row.article.code, fillColor: fill },
        { text: row.article.designation, fillColor: fill },
        {
          text: ReportPdfService.number(Number(row.theoreticalQty)),
          fillColor: fill,
          alignment: 'right' as const,
        },
        {
          text: ReportPdfService.number(Number(row.finalQty)),
          fillColor: fill,
          alignment: 'right' as const,
        },
        { text: ReportPdfService.number(variance), fillColor: fill, alignment: 'right' as const },
        { text: ITEM_STATUS_LABELS[row.status], fillColor: fill },
      ];
    });

    return [
      { text: 'Détail des lignes en écart', style: 'section', pageBreak: 'before' },
      {
        table: {
          headerRows: 1,
          widths: [55, 70, 60, '*', 50, 50, 50, 80],
          body: [
            [
              { text: 'Liste', style: 'tableHeader' },
              { text: 'Emplacement', style: 'tableHeader' },
              { text: 'Code', style: 'tableHeader' },
              { text: 'Désignation', style: 'tableHeader' },
              { text: 'Théorique', style: 'tableHeader' },
              { text: 'Compté', style: 'tableHeader' },
              { text: 'Écart', style: 'tableHeader' },
              { text: 'Statut', style: 'tableHeader' },
            ],
            ...body,
          ],
        },
        layout: 'lightHorizontalLines',
      },
      ...(withVariance.length > MAX_DETAIL_ROWS
        ? [
            {
              text:
                `${withVariance.length - MAX_DETAIL_ROWS} ligne(s) en écart ne figurent pas ici. ` +
                'Le détail exhaustif est dans l’export Excel.',
              style: 'note',
            } as Content,
          ]
        : []),
    ];
  }

  private static number(value: number): string {
    return value.toLocaleString('fr-FR', { maximumFractionDigits: 3 });
  }
}
