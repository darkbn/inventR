import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { DEFAULT_UNIT } from '../../../common/constants/inventory.constants';
import { normalizeLocationCode } from '../../../common/utils/location-code';
import { ARTICLE_CODE_PATTERN } from '../../articles/dto/article.dto';

import { IMPORT_COLUMN } from './column-mapping';
import { parseDecimal } from './number-parsing';
import type { RawImportRow } from './inventory-file-parser.service';

/** Erreur bloquante : la ligne est rejetée. */
export interface ImportError {
  line: number;
  column: string;
  code: string;
  message: string;
  value: string | null;
}

/** Avertissement : la ligne est acceptée, mais mérite l'attention. */
export interface ImportWarning {
  line: number | null;
  code: string;
  message: string;
}

/** Ligne validée, prête à être écrite en base. */
export interface ValidatedRow {
  lineNo: number;
  articleCode: string;
  designation: string;
  warehouseCode: string;
  warehouseLabel: string | null;
  /** `null` signifie « sans emplacement » : la ligne ira sur NON-LOCALISE. */
  locationCode: string | null;
  theoreticalQty: Prisma.Decimal;
  unit: string;
  unitPrice: Prisma.Decimal;
  brand: string | null;
  manufacturerRef: string | null;
}

export interface ValidationOutcome {
  rows: ValidatedRow[];
  errors: ImportError[];
  warnings: ImportWarning[];
}

export interface ValidationOptions {
  /** Exclure les lignes dont la quantité théorique est nulle. */
  excludeZeroQuantity: boolean;
}

/** Quantités : 3 décimales, comme la colonne `numeric(14,3)`. */
const QUANTITY_DECIMALS = 3;
/** Prix : 4 décimales, comme `numeric(16,4)`. */
const PRICE_DECIMALS = 4;

const MAX_DESIGNATION_LENGTH = 255;
const MAX_LOCATION_LENGTH = 64;

@Injectable()
export class ImportValidatorService {
  /**
   * Valide les lignes brutes.
   *
   * Chaque ligne est traitée indépendamment : une ligne fautive n'interrompt
   * pas l'analyse, afin que le superviseur obtienne **toutes** les erreurs en
   * une passe plutôt que de les découvrir une par une.
   */
  validate(rawRows: RawImportRow[], options: ValidationOptions): ValidationOutcome {
    const rows: ValidatedRow[] = [];
    const errors: ImportError[] = [];
    const warnings: ImportWarning[] = [];

    /** Première apparition de chaque couple (article, emplacement). */
    const seen = new Map<string, number>();
    let excludedZeroQuantity = 0;

    for (const raw of rawRows) {
      const lineErrors: ImportError[] = [];
      const read = (column: string): string | null =>
        ImportValidatorService.text(raw.values[column as keyof typeof raw.values]);

      // --- Code article -----------------------------------------------------
      const articleCodeRaw = read(IMPORT_COLUMN.ARTICLE_CODE);
      const articleCode = articleCodeRaw === null ? null : articleCodeRaw.toUpperCase();

      if (articleCode === null) {
        lineErrors.push(
          ImportValidatorService.error(
            raw.lineNo,
            'Article',
            'ARTICLE_CODE_REQUIRED',
            'Le code article est obligatoire.',
            null,
          ),
        );
      } else if (!ARTICLE_CODE_PATTERN.test(articleCode)) {
        lineErrors.push(
          ImportValidatorService.error(
            raw.lineNo,
            'Article',
            'ARTICLE_CODE_FORMAT',
            'Format de code article invalide. Attendu : 3 à 6 lettres ou chiffres, un tiret, 3 à 6 chiffres, éventuellement suivis d’une lettre (ex. ACCEL-0016, ACCOU-0060L, INOX-0001).',
            articleCode,
          ),
        );
      }

      // --- Désignation ------------------------------------------------------
      const designation = read(IMPORT_COLUMN.DESIGNATION);
      if (designation === null) {
        lineErrors.push(
          ImportValidatorService.error(
            raw.lineNo,
            '(Article (Désignation))',
            'DESIGNATION_REQUIRED',
            'La désignation est obligatoire.',
            null,
          ),
        );
      } else if (designation.length > MAX_DESIGNATION_LENGTH) {
        lineErrors.push(
          ImportValidatorService.error(
            raw.lineNo,
            '(Article (Désignation))',
            'DESIGNATION_TOO_LONG',
            `La désignation dépasse ${MAX_DESIGNATION_LENGTH} caractères.`,
            designation.slice(0, 60),
          ),
        );
      }

      // --- Magasin ----------------------------------------------------------
      const warehouseCodeRaw = read(IMPORT_COLUMN.WAREHOUSE_CODE);
      const warehouseCode = warehouseCodeRaw === null ? null : warehouseCodeRaw.toUpperCase();
      if (warehouseCode === null) {
        lineErrors.push(
          ImportValidatorService.error(
            raw.lineNo,
            'Magasin',
            'WAREHOUSE_REQUIRED',
            'Le code magasin est obligatoire.',
            null,
          ),
        );
      }

      // --- Quantité théorique ----------------------------------------------
      const quantityRaw = raw.values[IMPORT_COLUMN.QUANTITY] ?? null;
      const quantity = parseDecimal(quantityRaw, {
        maxDecimals: QUANTITY_DECIMALS,
        allowEmpty: false,
      });

      if (quantity.error !== null) {
        lineErrors.push(
          ImportValidatorService.error(
            raw.lineNo,
            'Quantite',
            `QUANTITY_${quantity.error}`,
            ImportValidatorService.quantityMessage(quantity.error),
            quantityRaw === null ? null : String(quantityRaw),
          ),
        );
      }

      // --- Prix moyen pondéré (facultatif) ----------------------------------
      const priceRaw = raw.values[IMPORT_COLUMN.UNIT_PRICE] ?? null;
      const price = parseDecimal(priceRaw, {
        maxDecimals: PRICE_DECIMALS,
        allowEmpty: true,
        emptyValue: new Prisma.Decimal(0),
      });

      if (price.error !== null) {
        lineErrors.push(
          ImportValidatorService.error(
            raw.lineNo,
            'Pmp',
            `PRICE_${price.error}`,
            price.error === 'NEGATIVE'
              ? 'Le prix moyen pondéré ne peut pas être négatif.'
              : 'Le prix moyen pondéré n’est pas un nombre valide.',
            priceRaw === null ? null : String(priceRaw),
          ),
        );
      }

      // --- Emplacement (facultatif) -----------------------------------------
      const locationRaw = read(IMPORT_COLUMN.LOCATION);
      const locationCode = locationRaw === null ? null : normalizeLocationCode(locationRaw);

      if (locationCode !== null && locationCode.length > MAX_LOCATION_LENGTH) {
        lineErrors.push(
          ImportValidatorService.error(
            raw.lineNo,
            'Emplacement',
            'LOCATION_TOO_LONG',
            `Le code emplacement dépasse ${MAX_LOCATION_LENGTH} caractères.`,
            locationCode.slice(0, 60),
          ),
        );
      }

      if (locationCode !== null && locationCode.includes('/')) {
        warnings.push({
          line: raw.lineNo,
          code: 'LOCATION_MULTIPLE',
          message: `Emplacement multiple « ${locationCode} » conservé tel quel : l’article occupe plusieurs positions.`,
        });
      }

      // --- Doublon dans le fichier ------------------------------------------
      if (articleCode !== null && lineErrors.length === 0) {
        const key = `${articleCode}@@${locationCode ?? ''}`;
        const firstSeenAt = seen.get(key);

        if (firstSeenAt !== undefined) {
          lineErrors.push(
            ImportValidatorService.error(
              raw.lineNo,
              'Article',
              'DUPLICATE_ROW',
              `Doublon : l’article ${articleCode} apparaît déjà à l’emplacement ${locationCode ?? 'non renseigné'} ligne ${firstSeenAt}.`,
              articleCode,
            ),
          );
        } else {
          seen.set(key, raw.lineNo);
        }
      }

      if (lineErrors.length > 0) {
        errors.push(...lineErrors);
        continue;
      }

      const theoreticalQty = quantity.value as Prisma.Decimal;

      if (options.excludeZeroQuantity && theoreticalQty.isZero()) {
        excludedZeroQuantity += 1;
        continue;
      }

      rows.push({
        lineNo: raw.lineNo,
        articleCode: articleCode as string,
        designation: designation as string,
        warehouseCode: warehouseCode as string,
        warehouseLabel: read(IMPORT_COLUMN.WAREHOUSE_LABEL),
        locationCode,
        theoreticalQty,
        unit: read(IMPORT_COLUMN.UNIT) ?? DEFAULT_UNIT,
        unitPrice: price.value as Prisma.Decimal,
        brand: read(IMPORT_COLUMN.BRAND),
        manufacturerRef: read(IMPORT_COLUMN.MANUFACTURER_REF),
      });
    }

    if (excludedZeroQuantity > 0) {
      warnings.push({
        line: null,
        code: 'ZERO_QUANTITY_EXCLUDED',
        message: `${excludedZeroQuantity} ligne(s) à quantité théorique nulle ont été exclues à votre demande.`,
      });
    }

    const warehouses = new Set(rows.map((row) => row.warehouseCode));
    if (warehouses.size > 1) {
      warnings.push({
        line: null,
        code: 'MULTIPLE_WAREHOUSES',
        message: `Le fichier couvre ${warehouses.size} magasins (${[...warehouses].join(', ')}). Une campagne ne porte que sur un magasin : les lignes des autres magasins seront refusées à l’application.`,
      });
    }

    const unlocated = rows.filter((row) => row.locationCode === null).length;
    if (unlocated > 0) {
      warnings.push({
        line: null,
        code: 'UNLOCATED_ROWS',
        message: `${unlocated} ligne(s) sans emplacement seront rattachées à l’emplacement « NON-LOCALISE » et regroupées en fin de liste sur le mobile.`,
      });
    }

    return { rows, errors, warnings };
  }

  // --- Utilitaires -----------------------------------------------------------

  private static text(value: string | number | null | undefined): string | null {
    if (value === null || value === undefined) return null;
    const trimmed = String(value).trim();
    return trimmed === '' ? null : trimmed;
  }

  private static error(
    line: number,
    column: string,
    code: string,
    message: string,
    value: string | null,
  ): ImportError {
    return { line, column, code, message, value };
  }

  private static quantityMessage(error: string): string {
    switch (error) {
      case 'EMPTY':
        return 'La quantité théorique est obligatoire.';
      case 'NEGATIVE':
        return 'La quantité théorique ne peut pas être négative.';
      default:
        return 'La quantité théorique n’est pas un nombre valide.';
    }
  }
}
