import { Injectable, NotFoundException } from '@nestjs/common';
import PdfPrinter from 'pdfmake';
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import QRCode from 'qrcode';

import { PrismaService } from '../../prisma/prisma.service';

/** Nature de l'objet encodé dans le QR code. */
export const QR_KIND = {
  ARTICLE: 'ART',
  LOCATION: 'LOC',
} as const;

export type QrKind = (typeof QR_KIND)[keyof typeof QR_KIND];

export interface QrPayload {
  t: QrKind;
  c: string;
}

const FONTS = {
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique',
  },
};

/** Planche d'étiquettes : 3 colonnes × 8 lignes sur une page A4 portrait. */
const LABELS_PER_ROW = 3;
const LABEL_QR_SIZE = 110;

@Injectable()
export class QrService {
  private readonly printer = new PdfPrinter(FONTS);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Charge utile encodée dans le QR code.
   *
   * Un objet structuré plutôt que le code brut : le scanner sait ainsi s'il a
   * affaire à un article ou à un emplacement, sans deviner. Le lecteur mobile
   * accepte malgré tout un QR ne contenant que le code nu, afin de rester
   * compatible avec les étiquettes fournisseur déjà en place.
   */
  static buildPayload(kind: QrKind, code: string): string {
    const payload: QrPayload = { t: kind, c: code.trim().toUpperCase() };
    return JSON.stringify(payload);
  }

  /**
   * Décode une valeur lue. Accepte le format structuré comme le code brut.
   * Exposé ici pour que serveur et mobile partagent exactement la même règle.
   */
  static parsePayload(raw: string): QrPayload | null {
    const text = raw.trim();
    if (text === '') return null;

    if (text.startsWith('{')) {
      try {
        const parsed = JSON.parse(text) as Partial<QrPayload>;
        if (
          (parsed.t === QR_KIND.ARTICLE || parsed.t === QR_KIND.LOCATION) &&
          typeof parsed.c === 'string' &&
          parsed.c.trim() !== ''
        ) {
          return { t: parsed.t, c: parsed.c.trim().toUpperCase() };
        }
      } catch {
        // Chaîne non JSON : on retombe sur l'interprétation « code brut ».
      }
      return null;
    }

    // Étiquette existante ne contenant que le code : on suppose un article.
    return { t: QR_KIND.ARTICLE, c: text.toUpperCase() };
  }

  /** QR code d'un article, au format PNG. */
  async articlePng(code: string, size: number): Promise<Buffer> {
    const article = await this.prisma.article.findUnique({
      where: { code: code.trim().toUpperCase() },
      select: { code: true },
    });

    if (!article) throw new NotFoundException(`Aucun article ne porte le code « ${code} ».`);

    return this.toPng(QrService.buildPayload(QR_KIND.ARTICLE, article.code), size);
  }

  /** QR code d'un emplacement, au format PNG. */
  async locationPng(locationId: string, size: number): Promise<Buffer> {
    const location = await this.prisma.location.findUnique({
      where: { id: locationId },
      select: { code: true },
    });

    if (!location) throw new NotFoundException('Emplacement introuvable.');

    return this.toPng(QrService.buildPayload(QR_KIND.LOCATION, location.code), size);
  }

  /**
   * Planche d'étiquettes à imprimer pour toutes les lignes d'une liste.
   *
   * Chaque étiquette porte le QR code, le code article, la désignation
   * abrégée et l'emplacement — de quoi la coller en rayon et la retrouver à
   * l'œil autant qu'au scanner.
   */
  async listLabels(listId: string): Promise<{ buffer: Buffer; listCode: string; count: number }> {
    const list = await this.prisma.inventoryList.findUnique({
      where: { id: listId },
      select: { code: true, name: true },
    });

    if (!list) throw new NotFoundException('Liste introuvable.');

    const items = await this.prisma.inventoryItem.findMany({
      where: { listId },
      select: {
        article: { select: { code: true, designation: true } },
        location: { select: { code: true, isVirtual: true } },
      },
      orderBy: [
        { location: { isVirtual: 'asc' } },
        { location: { aisle: { sort: 'asc', nulls: 'last' } } },
        { location: { bay: { sort: 'asc', nulls: 'last' } } },
        { location: { level: { sort: 'asc', nulls: 'last' } } },
        { location: { slot: { sort: 'asc', nulls: 'last' } } },
        { article: { code: 'asc' } },
      ],
    });

    if (items.length === 0) {
      throw new NotFoundException('Cette liste ne comporte aucune ligne à étiqueter.');
    }

    // Les QR codes sont générés en parallèle : sur plusieurs milliers
    // d'étiquettes, les produire un par un allongerait nettement l'attente.
    const labels = await Promise.all(
      items.map(async (item) => ({
        articleCode: item.article.code,
        designation: item.article.designation,
        locationCode: item.location.isVirtual ? 'Sans emplacement' : item.location.code,
        dataUrl: await QRCode.toDataURL(
          QrService.buildPayload(QR_KIND.ARTICLE, item.article.code),
          { errorCorrectionLevel: 'M', margin: 1, width: LABEL_QR_SIZE * 2 },
        ),
      })),
    );

    const buffer = await this.renderLabels(list.code, list.name, labels);
    return { buffer, listCode: list.code, count: labels.length };
  }

  // --------------------------------------------------------------------------

  private async toPng(payload: string, size: number): Promise<Buffer> {
    return QRCode.toBuffer(payload, {
      type: 'png',
      // Niveau M : 15 % de redondance, suffisant pour une étiquette qui vieillit
      // en entrepôt sans alourdir le motif au point de le rendre illisible de loin.
      errorCorrectionLevel: 'M',
      margin: 2,
      width: Math.min(Math.max(size, 64), 1024),
    });
  }

  private async renderLabels(
    listCode: string,
    listName: string,
    labels: { articleCode: string; designation: string; locationCode: string; dataUrl: string }[],
  ): Promise<Buffer> {
    const rows: Content[][] = [];

    for (let index = 0; index < labels.length; index += LABELS_PER_ROW) {
      const slice = labels.slice(index, index + LABELS_PER_ROW);

      const cells: Content[] = slice.map((label) => ({
        stack: [
          { image: label.dataUrl, width: LABEL_QR_SIZE, alignment: 'center' },
          { text: label.articleCode, bold: true, fontSize: 11, alignment: 'center' },
          {
            // Tronquée : une étiquette illisible parce que surchargée ne sert à rien.
            text:
              label.designation.length > 42
                ? `${label.designation.slice(0, 42)}…`
                : label.designation,
            fontSize: 7,
            alignment: 'center',
            color: '#4B5563',
          },
          { text: label.locationCode, fontSize: 9, alignment: 'center', bold: true },
        ],
        margin: [4, 8, 4, 8],
      }));

      // Complète la dernière rangée pour conserver une grille régulière.
      while (cells.length < LABELS_PER_ROW) cells.push({ text: '' });

      rows.push(cells);
    }

    const definition: TDocumentDefinitions = {
      pageSize: 'A4',
      pageMargins: [24, 42, 24, 28],
      defaultStyle: { font: 'Helvetica', fontSize: 9 },
      header: () => ({
        margin: [24, 16, 24, 0],
        columns: [
          {
            text: `Étiquettes QR — ${listCode} · ${listName}`,
            fontSize: 9,
            bold: true,
            color: '#1F3A5F',
          },
          {
            text: `${labels.length} étiquette(s)`,
            fontSize: 8,
            alignment: 'right',
            color: '#6B7280',
          },
        ],
      }),
      footer: (currentPage: number, pageCount: number) => ({
        margin: [24, 6, 24, 0],
        text: `Page ${currentPage} / ${pageCount}`,
        alignment: 'right',
        fontSize: 7,
        color: '#6B7280',
      }),
      content: [
        {
          table: {
            widths: Array.from({ length: LABELS_PER_ROW }, () => '*'),
            body: rows,
          },
          layout: {
            hLineColor: () => '#D1D5DB',
            vLineColor: () => '#D1D5DB',
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
          },
        },
      ],
    };

    const document = this.printer.createPdfKitDocument(definition);

    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      document.on('data', (chunk: Buffer) => chunks.push(chunk));
      document.on('end', () => resolve(Buffer.concat(chunks)));
      document.on('error', reject);
      document.end();
    });
  }
}
