import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';

import { TEMPLATE_HEADERS } from './parsing/column-mapping';

/** Couleurs du template : sobres, lisibles à l'impression en noir et blanc. */
const HEADER_FILL = 'FF1F3A5F';
const REQUIRED_FILL = 'FFFDE7E9';

/** Exemples repris du fichier de référence : l'utilisateur reconnaît ses données. */
const SAMPLE_ROWS: (string | number)[][] = [
  [
    'ACCEL-0016',
    'PALIER REF: 0901323439',
    '19R01',
    'MAGASIN PDR BOUFARIK',
    '9-2-C-6',
    2,
    'Unité',
    5689.2846,
    'KRONES',
    '0901323439',
  ],
  [
    'ACCEL-0020',
    'TUBULURE REF: 7933778052',
    '19R01',
    'MAGASIN PDR BOUFARIK',
    '3-5-C-18',
    1,
    'Unité',
    1586.31,
    'KRONES',
    '7933778052',
  ],
  ['ACCEG-0001', 'CHARGEUR 24V50A/H', '19R01', 'MAGASIN PDR BOUFARIK', '', 0, 'Unité', 0, '', ''],
  [
    'CONVO-0689',
    'COURROIE DE TRANSPORT',
    '19R01',
    'MAGASIN PDR BOUFARIK',
    'ARMOIRE CONSM',
    192.024,
    'Metre',
    1250,
    'KRONES',
    '',
  ],
];

@Injectable()
export class ImportTemplateService {
  /**
   * Produit le modèle d'import officiel.
   *
   * Trois feuilles : les données (avec quelques exemples), la notice, et la
   * liste des unités. Le modèle reprend **les en-têtes exacts de l'export ERP
   * du client**, afin qu'un fichier extrait du système puisse être déposé tel
   * quel, sans retouche.
   */
  async generate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'InventAir';
    workbook.created = new Date();

    this.buildDataSheet(workbook);
    this.buildInstructionsSheet(workbook);
    this.buildUnitsSheet(workbook);

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private buildDataSheet(workbook: ExcelJS.Workbook): void {
    const sheet = workbook.addWorksheet('Stocks', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    sheet.columns = TEMPLATE_HEADERS.map((entry) => ({
      header: entry.header,
      key: entry.column,
      width: ImportTemplateService.columnWidth(entry.header),
    }));

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    headerRow.height = 32;

    TEMPLATE_HEADERS.forEach((entry, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.note = entry.required
        ? 'Colonne obligatoire.'
        : 'Colonne facultative : la colonne peut être laissée vide ou supprimée.';
    });

    SAMPLE_ROWS.forEach((values) => {
      const row = sheet.addRow(values);
      row.font = { italic: true, color: { argb: 'FF7A7A7A' } };
    });

    // Les lignes d'exemple sont là pour montrer le format attendu ; elles
    // doivent être supprimées avant l'import, d'où le rappel visuel.
    const notice = sheet.addRow([
      '↑ Les quatre lignes ci-dessus sont des exemples : supprimez-les avant de déposer le fichier.',
    ]);
    notice.font = { bold: true, color: { argb: 'FFB00020' } };
    sheet.mergeCells(notice.number, 1, notice.number, TEMPLATE_HEADERS.length);

    // Validation Excel sur la colonne des quantités : empêche la saisie d'une
    // valeur négative directement dans le tableur.
    const quantityColumn = TEMPLATE_HEADERS.findIndex((e) => e.column === 'quantity') + 1;
    for (let rowNumber = 2; rowNumber <= 2000; rowNumber += 1) {
      sheet.getCell(rowNumber, quantityColumn).dataValidation = {
        type: 'decimal',
        operator: 'greaterThanOrEqual',
        formulae: [0],
        allowBlank: false,
        showErrorMessage: true,
        errorStyle: 'error',
        errorTitle: 'Quantité invalide',
        error: 'La quantité théorique doit être un nombre positif ou nul.',
      };
    }

    // Surlignage discret des colonnes obligatoires.
    TEMPLATE_HEADERS.forEach((entry, index) => {
      if (!entry.required) return;
      for (let rowNumber = 2; rowNumber <= 100; rowNumber += 1) {
        sheet.getCell(rowNumber, index + 1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: REQUIRED_FILL },
        };
      }
    });
  }

  private buildInstructionsSheet(workbook: ExcelJS.Workbook): void {
    const sheet = workbook.addWorksheet('Notice');
    sheet.columns = [
      { header: 'Colonne', key: 'column', width: 34 },
      { header: 'Obligatoire', key: 'required', width: 13 },
      { header: 'Règle', key: 'rule', width: 96 },
    ];

    const header = sheet.getRow(1);
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };

    const rules: Record<string, string> = {
      Article:
        'Code article. 3 à 6 lettres ou chiffres, un tiret, 3 à 6 chiffres, éventuellement suivis d’une lettre. Exemples : ACCEL-0016, ACCOU-0060L, INOX-0001. Mis en majuscules automatiquement.',
      '(Article (Désignation))': 'Libellé de l’article, 255 caractères au maximum.',
      Magasin: 'Code du magasin. Créé automatiquement s’il est inconnu.',
      '(Magasin (Désignation))': 'Libellé du magasin. Sert uniquement à sa création.',
      Emplacement:
        'Facultatif. Les lignes sans emplacement sont rattachées à « NON-LOCALISE » et regroupées en fin de liste sur le mobile. Les formats « allée-travée-niveau-case » (1-1-C-7) sont décomposés pour permettre un tri physique.',
      Quantite:
        'Quantité théorique. Nombre positif ou nul, 3 décimales au maximum. La virgule et le point sont acceptés comme séparateur décimal.',
      '(Unité (Désignation))':
        'Facultatif. Valeur par défaut : « Unité ». Voir la feuille « Unités ».',
      Pmp: 'Facultatif. Prix moyen pondéré, 4 décimales. Figé sur la ligne d’inventaire : la valorisation d’une campagne clôturée ne bouge plus ensuite.',
      '(Marque article (Désignation))': 'Facultatif. Critère de recherche sur le terrain.',
      '(Ref. fabricant)': 'Facultatif. Second critère de recherche sur le terrain.',
    };

    for (const entry of TEMPLATE_HEADERS) {
      const row = sheet.addRow({
        column: entry.header,
        required: entry.required ? 'Oui' : 'Non',
        rule: rules[entry.header] ?? '',
      });
      row.alignment = { vertical: 'top', wrapText: true };
      if (entry.required) row.font = { bold: true };
    }

    sheet.addRow([]);
    const generalRows = [
      [
        'Format du fichier',
        '',
        'Excel (.xlsx) ou CSV. En CSV, les séparateurs « ; » et « , » sont reconnus, ainsi que les encodages UTF-8 et Windows-1252.',
      ],
      [
        'Ligne d’en-tête',
        '',
        'Recherchée dans les 10 premières lignes : un titre ou une ligne de filtre au-dessus du tableau ne gêne pas.',
      ],
      [
        'Colonnes en trop',
        '',
        'Les colonnes non reconnues sont ignorées sans erreur : un export ERP peut être déposé tel quel.',
      ],
      [
        'Doublons',
        '',
        'Un même article ne peut apparaître qu’une fois par emplacement. Le doublon est signalé avec le numéro de la première occurrence.',
      ],
      [
        'Analyse préalable',
        '',
        'Le dépôt ne modifie rien : il produit un rapport ligne par ligne. Rien n’est écrit tant que l’import n’est pas appliqué.',
      ],
    ];

    for (const values of generalRows) {
      const row = sheet.addRow(values);
      row.alignment = { vertical: 'top', wrapText: true };
      row.getCell(1).font = { bold: true };
    }
  }

  private buildUnitsSheet(workbook: ExcelJS.Workbook): void {
    const sheet = workbook.addWorksheet('Unités');
    sheet.columns = [
      { header: 'Unité', key: 'unit', width: 20 },
      { header: 'Usage', key: 'usage', width: 60 },
    ];

    const header = sheet.getRow(1);
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };

    // Les sept unités relevées dans le fichier de référence du client.
    const units: [string, string][] = [
      ['Unité', 'Valeur par défaut — pièces dénombrables'],
      ['JEUX', 'Ensembles vendus groupés'],
      ['KITS', 'Kits de maintenance'],
      ['Metre', 'Câbles, courroies, profilés'],
      ['Centimetre', 'Découpes courtes'],
      ['Litre', 'Fluides'],
      ['Kilogramme', 'Matières pesées'],
    ];

    for (const [unit, usage] of units) {
      sheet.addRow({ unit, usage });
    }
  }

  private static columnWidth(header: string): number {
    if (header.includes('Désignation') && header.includes('Article')) return 52;
    if (header.includes('Désignation')) return 26;
    if (header === 'Emplacement') return 18;
    return Math.max(14, Math.min(header.length + 4, 30));
  }
}
