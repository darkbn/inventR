import { BadRequestException, Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';

import {
  isUsableHeaderRow,
  mapHeaderRow,
  REQUIRED_COLUMNS,
  TEMPLATE_HEADERS,
  type ImportColumn,
} from './column-mapping';

/** Ligne brute : valeurs indexées par colonne reconnue, encore non validées. */
export interface RawImportRow {
  /** Numéro de ligne **dans le fichier**, tel que l'utilisateur le voit. */
  lineNo: number;
  values: Partial<Record<ImportColumn, string | number | null>>;
}

export interface ParsedFile {
  rows: RawImportRow[];
  /** Numéro de la ligne d'en-tête retenue. */
  headerLineNo: number;
  mapping: Partial<Record<ImportColumn, number>>;
  /** En-têtes présents dans le fichier mais inconnus de l'import. */
  unknownHeaders: string[];
  format: 'xlsx' | 'csv';
}

/** Nombre de lignes explorées pour trouver l'en-tête. */
const HEADER_SEARCH_DEPTH = 10;

/** Garde-fou : au-delà, le fichier n'est plus un inventaire mais un export de masse. */
export const MAX_IMPORT_ROWS = 100_000;

@Injectable()
export class InventoryFileParserService {
  /** Analyse un fichier déposé, quel que soit son format. */
  async parse(buffer: Buffer, filename: string): Promise<ParsedFile> {
    const extension = filename.toLowerCase().split('.').pop() ?? '';

    if (extension === 'csv' || extension === 'txt') {
      return this.parseCsv(buffer);
    }

    if (extension === 'xlsx' || extension === 'xlsm') {
      return this.parseXlsx(buffer);
    }

    throw new BadRequestException(
      `Format « ${extension || 'inconnu'} » non pris en charge. Déposez un fichier .xlsx ou .csv.`,
    );
  }

  // ==========================================================================
  // Excel
  // ==========================================================================

  private async parseXlsx(buffer: Buffer): Promise<ParsedFile> {
    const workbook = new ExcelJS.Workbook();

    try {
      // ExcelJS embarque sa propre déclaration de `Buffer`, incompatible avec
      // celle de @types/node 22. Les deux désignent la même valeur à
      // l'exécution : seule la signature diverge.
      await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
    } catch {
      throw new BadRequestException(
        'Le fichier Excel est illisible ou corrompu. Réenregistrez-le au format .xlsx.',
      );
    }

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new BadRequestException('Le classeur ne contient aucune feuille.');
    }

    const grid: (string | number | null)[][] = [];
    worksheet.eachRow({ includeEmpty: false }, (row) => {
      const cells: (string | number | null)[] = [];
      // `row.values` est décalé d'un cran : l'index 0 n'est jamais utilisé.
      const values = row.values as unknown[];
      for (let column = 1; column < values.length; column += 1) {
        cells.push(InventoryFileParserService.readCell(values[column]));
      }
      grid[row.number - 1] = cells;
    });

    return InventoryFileParserService.buildParsedFile(grid, 'xlsx');
  }

  /** Ramène une cellule ExcelJS à une valeur simple. */
  private static readCell(value: unknown): string | number | null {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string' || typeof value === 'number') return value;
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (value instanceof Date) return value.toISOString();

    if (typeof value === 'object') {
      const cell = value as Record<string, unknown>;
      // Formules : on retient le résultat calculé, pas l'expression.
      if ('result' in cell) return InventoryFileParserService.readCell(cell['result']);
      // Texte enrichi : on concatène les fragments.
      if ('richText' in cell && Array.isArray(cell['richText'])) {
        return (cell['richText'] as { text?: string }[]).map((part) => part.text ?? '').join('');
      }
      // Lien hypertexte ou cellule riche : seul le texte visible nous intéresse.
      const text = cell['text'];
      if (typeof text === 'string' || typeof text === 'number') return String(text);

      // Objet d'une forme inattendue : on ne le stringifie pas en
      // « [object Object] », qui polluerait silencieusement les données.
      return null;
    }

    return null;
  }

  // ==========================================================================
  // CSV
  // ==========================================================================

  private parseCsv(buffer: Buffer): ParsedFile {
    const text = InventoryFileParserService.decode(buffer);
    const delimiter = InventoryFileParserService.detectDelimiter(text);
    const grid = InventoryFileParserService.splitCsv(text, delimiter);

    return InventoryFileParserService.buildParsedFile(grid, 'csv');
  }

  /**
   * Décode le contenu. Les exports Excel en CSV sous Windows sont encore
   * couramment en CP1252 : un décodage UTF-8 aveugle transformerait « Unité »
   * en « Unit? » dans tout le fichier.
   */
  private static decode(buffer: Buffer): string {
    if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
      return buffer.subarray(3).toString('utf8');
    }

    try {
      const strict = new TextDecoder('utf-8', { fatal: true });
      return strict.decode(buffer);
    } catch {
      return new TextDecoder('windows-1252').decode(buffer);
    }
  }

  private static detectDelimiter(text: string): string {
    const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
    const candidates = [';', ',', '\t', '|'];

    let best = ';';
    let bestCount = 0;

    for (const candidate of candidates) {
      const count = firstLine.split(candidate).length - 1;
      if (count > bestCount) {
        best = candidate;
        bestCount = count;
      }
    }

    return best;
  }

  /** Découpage CSV conforme à RFC 4180 : guillemets, échappements, sauts de ligne. */
  private static splitCsv(text: string, delimiter: string): (string | null)[][] {
    const rows: (string | null)[][] = [];
    let row: (string | null)[] = [];
    let field = '';
    let inQuotes = false;

    for (let index = 0; index < text.length; index += 1) {
      const char = text[index] as string;

      if (inQuotes) {
        if (char === '"') {
          if (text[index + 1] === '"') {
            field += '"';
            index += 1;
          } else {
            inQuotes = false;
          }
        } else {
          field += char;
        }
        continue;
      }

      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        row.push(field === '' ? null : field);
        field = '';
      } else if (char === '\n') {
        row.push(field === '' ? null : field);
        rows.push(row);
        row = [];
        field = '';
      } else if (char !== '\r') {
        field += char;
      }
    }

    if (field !== '' || row.length > 0) {
      row.push(field === '' ? null : field);
      rows.push(row);
    }

    return rows;
  }

  // ==========================================================================
  // Commun
  // ==========================================================================

  private static buildParsedFile(
    grid: (string | number | null)[][],
    format: 'xlsx' | 'csv',
  ): ParsedFile {
    const { headerIndex, mapping, unknownHeaders } = InventoryFileParserService.locateHeader(grid);

    const rows: RawImportRow[] = [];

    for (let index = headerIndex + 1; index < grid.length; index += 1) {
      const cells = grid[index];
      if (!cells) continue;

      const values: Partial<Record<ImportColumn, string | number | null>> = {};
      let hasContent = false;

      for (const [column, position] of Object.entries(mapping) as [ImportColumn, number][]) {
        const cell = cells[position] ?? null;
        values[column] = cell;
        if (cell !== null && String(cell).trim() !== '') hasContent = true;
      }

      // Les lignes entièrement vides (séparateurs, pied de tableau) sont ignorées
      // sans être signalées : elles ne traduisent pas une erreur de l'utilisateur.
      if (!hasContent) continue;

      rows.push({ lineNo: index + 1, values });
    }

    if (rows.length > MAX_IMPORT_ROWS) {
      throw new BadRequestException(
        `Le fichier comporte ${rows.length} lignes, au-delà de la limite de ${MAX_IMPORT_ROWS}.`,
      );
    }

    return { rows, headerLineNo: headerIndex + 1, mapping, unknownHeaders, format };
  }

  /**
   * Repère la ligne d'en-tête dans les premières lignes du fichier : les
   * exports ERP sont fréquemment précédés d'un titre ou d'une ligne de filtre.
   */
  private static locateHeader(grid: (string | number | null)[][]): {
    headerIndex: number;
    mapping: Partial<Record<ImportColumn, number>>;
    unknownHeaders: string[];
  } {
    const depth = Math.min(HEADER_SEARCH_DEPTH, grid.length);

    for (let index = 0; index < depth; index += 1) {
      const cells = grid[index];
      if (!cells) continue;

      const headers = cells.map((cell) => (cell === null ? null : String(cell)));
      const { mapping, unknownHeaders } = mapHeaderRow(headers);

      if (isUsableHeaderRow(mapping)) {
        return { headerIndex: index, mapping, unknownHeaders };
      }
    }

    // Aucun en-tête exploitable : on indique précisément ce qui manque plutôt
    // que de laisser l'utilisateur deviner.
    const expected = TEMPLATE_HEADERS.filter((entry) => REQUIRED_COLUMNS.includes(entry.column))
      .map((entry) => `« ${entry.header} »`)
      .join(', ');

    throw new BadRequestException(
      `Aucune ligne d'en-tête exploitable dans les ${HEADER_SEARCH_DEPTH} premières lignes. ` +
        `Les colonnes suivantes sont obligatoires : ${expected}. ` +
        'Téléchargez le modèle officiel via GET /imports/template.xlsx.',
    );
  }
}
