import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CampaignStatus, ImportStatus, ItemStatus, Prisma } from '@prisma/client';

import {
  BULK_CHUNK_SIZE,
  UNLOCATED_LOCATION_CODE,
  UNLOCATED_LOCATION_LABEL,
} from '../../common/constants/inventory.constants';
import { FileStorageService } from '../../common/storage/file-storage.service';
import type { AuthenticatedUser, ClientContext } from '../../common/types/authenticated-user';
import { isLikelyVariant, parseLocationCode } from '../../common/utils/location-code';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';

import type { ApplyImportResultDto, ImportBatchDto, ImportOptionsDto } from './dto/import.dto';
import {
  ImportValidatorService,
  type ImportError,
  type ImportWarning,
  type ValidatedRow,
} from './parsing/import-validator.service';
import { InventoryFileParserService } from './parsing/inventory-file-parser.service';

/** Statuts de campagne acceptant un import. */
const IMPORTABLE_STATUSES: CampaignStatus[] = [CampaignStatus.DRAFT, CampaignStatus.OPEN];

interface ListContext {
  listId: string;
  campaignId: string;
  campaignStatus: CampaignStatus;
  warehouseId: string;
  warehouseCode: string;
}

@Injectable()
export class ImportsService {
  private readonly logger = new Logger(ImportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly parser: InventoryFileParserService,
    private readonly validator: ImportValidatorService,
    private readonly storage: FileStorageService,
    private readonly activityLogs: ActivityLogsService,
  ) {}

  // ==========================================================================
  // Analyse préalable
  // ==========================================================================

  /**
   * Analyse un fichier déposé **sans rien écrire** dans les données métier.
   *
   * Le superviseur obtient un rapport complet — erreurs ligne par ligne,
   * avertissements — et décide ensuite d'appliquer ou non. Déposer un fichier
   * ne doit jamais modifier un inventaire par inadvertance.
   */
  async analyze(
    actor: AuthenticatedUser,
    listId: string,
    file: { originalname: string; buffer: Buffer },
    options: ImportOptionsDto,
    context: ClientContext,
  ): Promise<ImportBatchDto> {
    const list = await this.loadImportableList(listId);

    const parsed = await this.parser.parse(file.buffer, file.originalname);
    const outcome = this.validator.validate(parsed.rows, {
      excludeZeroQuantity: options.excludeZeroQuantity,
    });

    const warnings: ImportWarning[] = [...outcome.warnings];

    if (parsed.unknownHeaders.length > 0) {
      warnings.push({
        line: parsed.headerLineNo,
        code: 'UNKNOWN_COLUMNS',
        message: `Colonnes ignorées car non reconnues : ${parsed.unknownHeaders.join(', ')}.`,
      });
    }

    const errors: ImportError[] = [...outcome.errors];

    // Le fichier doit porter sur le magasin de la campagne : importer le stock
    // d'un autre magasin dans une campagne fausserait tous les écarts.
    const foreignWarehouses = [...new Set(outcome.rows.map((row) => row.warehouseCode))].filter(
      (code) => code !== list.warehouseCode,
    );

    if (foreignWarehouses.length > 0) {
      errors.push({
        line: parsed.headerLineNo,
        column: 'Magasin',
        code: 'WAREHOUSE_MISMATCH',
        message: `La campagne porte sur le magasin ${list.warehouseCode}, mais le fichier contient aussi : ${foreignWarehouses.join(', ')}.`,
        value: foreignWarehouses.join(', '),
      });
    }

    warnings.push(...(await this.referentialWarnings(list, outcome.rows)));

    const storagePath = await this.storage.save('uploads', file.originalname, file.buffer);

    const hasBlockingError = errors.length > 0 || outcome.rows.length === 0;

    const batch = await this.prisma.importBatch.create({
      data: {
        listId,
        filename: file.originalname,
        storagePath,
        status: hasBlockingError ? ImportStatus.REJECTED : ImportStatus.VALIDATED,
        rowsTotal: parsed.rows.length,
        rowsOk: outcome.rows.length,
        rowsError: ImportsService.distinctErrorLines(errors),
        // Le rapport complet est conservé : il doit rester consultable après
        // coup pour justifier un écart ou une ligne manquante.
        errors: errors as unknown as Prisma.InputJsonValue,
        warnings: warnings as unknown as Prisma.InputJsonValue,
        options: { ...options },
        createdById: actor.id,
      },
    });

    await this.activityLogs.record({
      actorId: actor.id,
      action: 'IMPORT_ANALYZE',
      entityType: 'ImportBatch',
      entityId: batch.id,
      metadata: {
        listId,
        filename: file.originalname,
        rowsTotal: parsed.rows.length,
        rowsOk: outcome.rows.length,
        rowsError: batch.rowsError,
      },
      context,
    });

    return ImportsService.toDto(batch);
  }

  // ==========================================================================
  // Application
  // ==========================================================================

  /**
   * Applique un import validé, en une seule transaction.
   *
   * Le fichier est **réanalysé** depuis le disque plutôt que de relire des
   * lignes stockées en base : on garantit ainsi que ce qui est écrit correspond
   * exactement au fichier que le superviseur a examiné, et on évite de stocker
   * 8 000 lignes en JSON.
   */
  async apply(
    actor: AuthenticatedUser,
    batchId: string,
    context: ClientContext,
  ): Promise<ApplyImportResultDto> {
    const startedAt = Date.now();

    const batch = await this.prisma.importBatch.findUnique({ where: { id: batchId } });
    if (!batch) throw new NotFoundException('Import introuvable.');

    if (batch.status === ImportStatus.APPLIED) {
      throw new ConflictException('Cet import a déjà été appliqué.');
    }
    if (batch.status !== ImportStatus.VALIDATED) {
      throw new ConflictException(
        `Cet import est au statut ${batch.status} : seul un import validé peut être appliqué.`,
      );
    }

    const list = await this.loadImportableList(batch.listId);

    const options = batch.options as unknown as ImportOptionsDto;
    const buffer = await this.storage.read('uploads', batch.storagePath);
    const parsed = await this.parser.parse(buffer, batch.filename);
    const outcome = this.validator.validate(parsed.rows, {
      excludeZeroQuantity: options.excludeZeroQuantity ?? false,
    });

    if (outcome.rows.length === 0) {
      throw new ConflictException('Le fichier ne comporte aucune ligne exploitable.');
    }

    const result = await this.prisma.$transaction(
      async (tx) => {
        const locationIds = await this.upsertLocations(tx, list.warehouseId, outcome.rows);
        const articleIds = await this.upsertArticles(tx, actor, outcome.rows);

        return this.writeItems(tx, list.listId, outcome.rows, {
          locationIds: locationIds.map,
          articleIds: articleIds.map,
          updateExisting: options.updateExisting ?? true,
          locationsCreated: locationIds.created,
          articlesCreated: articleIds.created,
        });
      },
      { timeout: 180_000, maxWait: 15_000 },
    );

    await this.prisma.importBatch.update({
      where: { id: batchId },
      data: { status: ImportStatus.APPLIED, appliedAt: new Date() },
    });

    const durationMs = Date.now() - startedAt;

    await this.activityLogs.record({
      actorId: actor.id,
      action: 'IMPORT_APPLY',
      entityType: 'ImportBatch',
      entityId: batchId,
      metadata: { ...result, durationMs },
      context,
    });

    this.logger.log(
      `Import ${batchId} appliqué : ${result.itemsCreated} créées, ${result.itemsUpdated} mises à jour en ${durationMs} ms`,
    );

    return { batchId, ...result, durationMs };
  }

  // ==========================================================================
  // Consultation
  // ==========================================================================

  async findOne(batchId: string): Promise<ImportBatchDto> {
    const batch = await this.prisma.importBatch.findUnique({ where: { id: batchId } });
    if (!batch) throw new NotFoundException('Import introuvable.');
    return ImportsService.toDto(batch);
  }

  async findByList(listId: string): Promise<ImportBatchDto[]> {
    const batches = await this.prisma.importBatch.findMany({
      where: { listId },
      orderBy: { createdAt: 'desc' },
    });
    return batches.map((batch) => ImportsService.toDto(batch));
  }

  /** Abandonne un import analysé mais non appliqué, et supprime le fichier. */
  async reject(batchId: string): Promise<ImportBatchDto> {
    const batch = await this.prisma.importBatch.findUnique({ where: { id: batchId } });
    if (!batch) throw new NotFoundException('Import introuvable.');

    if (batch.status === ImportStatus.APPLIED) {
      throw new ConflictException(
        'Cet import a été appliqué : il ne peut plus être abandonné. Corrigez les lignes concernées depuis la campagne.',
      );
    }

    await this.storage.remove('uploads', batch.storagePath);

    const updated = await this.prisma.importBatch.update({
      where: { id: batchId },
      data: { status: ImportStatus.REJECTED },
    });

    return ImportsService.toDto(updated);
  }

  // ==========================================================================
  // Écritures de masse
  // ==========================================================================

  /** Crée les emplacements inconnus et renvoie la table code → identifiant. */
  private async upsertLocations(
    tx: Prisma.TransactionClient,
    warehouseId: string,
    rows: ValidatedRow[],
  ): Promise<{ map: Map<string, string>; created: number }> {
    const codes = new Set<string>([UNLOCATED_LOCATION_CODE]);
    for (const row of rows) {
      if (row.locationCode !== null) codes.add(row.locationCode);
    }

    const existing = await tx.location.findMany({
      where: { warehouseId, code: { in: [...codes] } },
      select: { id: true, code: true },
    });

    const map = new Map(existing.map((location) => [location.code, location.id]));
    const missing = [...codes].filter((code) => !map.has(code));

    for (let offset = 0; offset < missing.length; offset += BULK_CHUNK_SIZE) {
      const chunk = missing.slice(offset, offset + BULK_CHUNK_SIZE);
      await tx.location.createMany({
        data: chunk.map((code) => ({
          warehouseId,
          code,
          normalizedCode: code,
          ...(code === UNLOCATED_LOCATION_CODE
            ? { isVirtual: true, label: UNLOCATED_LOCATION_LABEL }
            : parseLocationCode(code)),
        })),
        skipDuplicates: true,
      });
    }

    if (missing.length > 0) {
      const refreshed = await tx.location.findMany({
        where: { warehouseId, code: { in: missing } },
        select: { id: true, code: true },
      });
      for (const location of refreshed) map.set(location.code, location.id);
    }

    return { map, created: missing.length };
  }

  /** Crée les articles inconnus et met à jour ceux dont les données ont changé. */
  private async upsertArticles(
    tx: Prisma.TransactionClient,
    actor: AuthenticatedUser,
    rows: ValidatedRow[],
  ): Promise<{ map: Map<string, string>; created: number }> {
    // Dernière occurrence de chaque code : si le fichier décrit deux fois le
    // même article à des emplacements différents, la dernière description fait foi.
    const byCode = new Map<string, ValidatedRow>();
    for (const row of rows) byCode.set(row.articleCode, row);

    const codes = [...byCode.keys()];
    const existing: { id: string; code: string }[] = [];

    for (let offset = 0; offset < codes.length; offset += 1000) {
      const chunk = codes.slice(offset, offset + 1000);
      const found = await tx.article.findMany({
        where: { code: { in: chunk } },
        select: { id: true, code: true },
      });
      existing.push(...found);
    }

    const map = new Map(existing.map((article) => [article.code, article.id]));
    const missing = codes.filter((code) => !map.has(code));

    for (let offset = 0; offset < missing.length; offset += BULK_CHUNK_SIZE) {
      const chunk = missing.slice(offset, offset + BULK_CHUNK_SIZE);
      await tx.article.createMany({
        data: chunk.map((code) => {
          const row = byCode.get(code) as ValidatedRow;
          return {
            code,
            designation: row.designation,
            unit: row.unit,
            brand: row.brand,
            manufacturerRef: row.manufacturerRef,
            lastPmp: row.unitPrice,
            createdById: actor.id,
            updatedById: actor.id,
          };
        }),
        skipDuplicates: true,
      });
    }

    if (missing.length > 0) {
      for (let offset = 0; offset < missing.length; offset += 1000) {
        const chunk = missing.slice(offset, offset + 1000);
        const refreshed = await tx.article.findMany({
          where: { code: { in: chunk } },
          select: { id: true, code: true },
        });
        for (const article of refreshed) map.set(article.code, article.id);
      }
    }

    // Rafraîchit le dernier Pmp connu des articles déjà présents : c'est la
    // donnée la plus volatile du référentiel.
    const updatable = existing
      .map((article) => ({ id: article.id, row: byCode.get(article.code) }))
      .filter((entry): entry is { id: string; row: ValidatedRow } => entry.row !== undefined);

    for (let offset = 0; offset < updatable.length; offset += BULK_CHUNK_SIZE) {
      const chunk = updatable.slice(offset, offset + BULK_CHUNK_SIZE);
      const values = chunk.map(
        (entry) =>
          Prisma.sql`(${entry.id}::uuid, ${entry.row.designation}, ${entry.row.unit}, ${entry.row.brand}, ${entry.row.manufacturerRef}, ${entry.row.unitPrice.toString()}::numeric)`,
      );

      await tx.$executeRaw`
        UPDATE "inventory"."articles" AS target
        SET "designation" = source.designation,
            "unit" = source.unit,
            "brand" = source.brand,
            "manufacturer_ref" = source.manufacturer_ref,
            "last_pmp" = source.last_pmp,
            "updated_at" = now()
        FROM (VALUES ${Prisma.join(values)})
          AS source(id, designation, unit, brand, manufacturer_ref, last_pmp)
        WHERE target."id" = source.id
      `;
    }

    return { map, created: missing.length };
  }

  /** Crée les lignes nouvelles et actualise les lignes déjà présentes. */
  private async writeItems(
    tx: Prisma.TransactionClient,
    listId: string,
    rows: ValidatedRow[],
    context: {
      locationIds: Map<string, string>;
      articleIds: Map<string, string>;
      updateExisting: boolean;
      locationsCreated: number;
      articlesCreated: number;
    },
  ): Promise<Omit<ApplyImportResultDto, 'batchId' | 'durationMs'>> {
    const unlocatedId = context.locationIds.get(UNLOCATED_LOCATION_CODE) as string;

    const resolved = rows.map((row, index) => ({
      articleId: context.articleIds.get(row.articleCode) as string,
      locationId:
        row.locationCode === null
          ? unlocatedId
          : (context.locationIds.get(row.locationCode) as string),
      lineNo: index + 1,
      theoreticalQty: row.theoreticalQty,
      unitPrice: row.unitPrice,
    }));

    const existing = await tx.inventoryItem.findMany({
      where: { listId },
      select: { id: true, articleId: true, locationId: true },
    });

    const existingByKey = new Map(
      existing.map((item) => [`${item.articleId}@@${item.locationId}`, item.id]),
    );

    const toCreate = resolved.filter(
      (item) => !existingByKey.has(`${item.articleId}@@${item.locationId}`),
    );
    const toUpdate = context.updateExisting
      ? resolved
          .map((item) => ({
            id: existingByKey.get(`${item.articleId}@@${item.locationId}`),
            theoreticalQty: item.theoreticalQty,
            unitPrice: item.unitPrice,
          }))
          .filter(
            (
              item,
            ): item is { id: string; theoreticalQty: Prisma.Decimal; unitPrice: Prisma.Decimal } =>
              item.id !== undefined,
          )
      : [];

    for (let offset = 0; offset < toCreate.length; offset += BULK_CHUNK_SIZE) {
      const chunk = toCreate.slice(offset, offset + BULK_CHUNK_SIZE);
      await tx.inventoryItem.createMany({
        data: chunk.map((item) => ({ ...item, listId, status: ItemStatus.PENDING })),
        skipDuplicates: true,
      });
    }

    for (let offset = 0; offset < toUpdate.length; offset += BULK_CHUNK_SIZE) {
      const chunk = toUpdate.slice(offset, offset + BULK_CHUNK_SIZE);
      const values = chunk.map(
        (item) =>
          Prisma.sql`(${item.id}::uuid, ${item.theoreticalQty.toString()}::numeric, ${item.unitPrice.toString()}::numeric)`,
      );

      await tx.$executeRaw`
        UPDATE "inventory"."inventory_items" AS target
        SET "theoretical_qty" = source.theoretical_qty,
            "unit_price" = source.unit_price,
            "updated_at" = now()
        FROM (VALUES ${Prisma.join(values)}) AS source(id, theoretical_qty, unit_price)
        WHERE target."id" = source.id
      `;
    }

    return {
      itemsCreated: toCreate.length,
      itemsUpdated: toUpdate.length,
      articlesCreated: context.articlesCreated,
      locationsCreated: context.locationsCreated,
    };
  }

  // ==========================================================================
  // Internes
  // ==========================================================================

  private async loadImportableList(listId: string): Promise<ListContext> {
    const list = await this.prisma.inventoryList.findUnique({
      where: { id: listId },
      select: {
        id: true,
        campaignId: true,
        campaign: {
          select: {
            status: true,
            warehouseId: true,
            warehouse: { select: { code: true } },
          },
        },
      },
    });

    if (!list) throw new NotFoundException('Liste introuvable.');

    if (!IMPORTABLE_STATUSES.includes(list.campaign.status)) {
      throw new ConflictException(
        `Un import n'est possible que sur une campagne en préparation ou ouverte (statut actuel : ${list.campaign.status}). ` +
          'Importer après le début des comptages déplacerait le périmètre sous les pieds des opérateurs.',
      );
    }

    return {
      listId: list.id,
      campaignId: list.campaignId,
      campaignStatus: list.campaign.status,
      warehouseId: list.campaign.warehouseId,
      warehouseCode: list.campaign.warehouse.code,
    };
  }

  /**
   * Avertissements portant sur le référentiel : créations à venir et variantes
   * orthographiques probables d'emplacements existants.
   */
  private async referentialWarnings(
    list: ListContext,
    rows: ValidatedRow[],
  ): Promise<ImportWarning[]> {
    if (rows.length === 0) return [];

    const warnings: ImportWarning[] = [];

    const articleCodes = [...new Set(rows.map((row) => row.articleCode))];
    const knownArticles = new Set<string>();
    for (let offset = 0; offset < articleCodes.length; offset += 1000) {
      const found = await this.prisma.article.findMany({
        where: { code: { in: articleCodes.slice(offset, offset + 1000) } },
        select: { code: true },
      });
      for (const article of found) knownArticles.add(article.code);
    }

    const newArticles = articleCodes.length - knownArticles.size;
    if (newArticles > 0) {
      warnings.push({
        line: null,
        code: 'ARTICLES_CREATED',
        message: `${newArticles} article(s) inconnus seront créés dans le référentiel.`,
      });
    }

    const locationCodes = [
      ...new Set(
        rows.map((row) => row.locationCode).filter((code): code is string => code !== null),
      ),
    ];

    const existingLocations = await this.prisma.location.findMany({
      where: { warehouseId: list.warehouseId },
      select: { code: true },
    });
    const knownLocations = new Set(existingLocations.map((location) => location.code));

    const newLocations = locationCodes.filter((code) => !knownLocations.has(code));
    if (newLocations.length > 0) {
      warnings.push({
        line: null,
        code: 'LOCATIONS_CREATED',
        message: `${newLocations.length} emplacement(s) inconnus seront créés dans le référentiel.`,
      });
    }

    // Variantes orthographiques : « ARMOIR CONSM » face à « ARMOIRE CONSM »
    // déjà en base. Simple signalement — la fusion reste une décision humaine.
    const candidates = [...knownLocations, ...locationCodes];
    const variants: string[] = [];

    for (const fresh of newLocations) {
      const close = candidates.find((candidate) => isLikelyVariant(fresh, candidate));
      if (close !== undefined) variants.push(`« ${fresh} » ≈ « ${close} »`);
      if (variants.length >= 20) break;
    }

    if (variants.length > 0) {
      warnings.push({
        line: null,
        code: 'LOCATION_VARIANTS',
        message: `Emplacements proches d'un emplacement existant, à vérifier puis éventuellement fusionner : ${variants.join(', ')}.`,
      });
    }

    return warnings;
  }

  /** Une ligne peut cumuler plusieurs erreurs : on compte les lignes, pas les erreurs. */
  private static distinctErrorLines(errors: ImportError[]): number {
    return new Set(errors.map((error) => error.line)).size;
  }

  private static toDto(batch: {
    id: string;
    listId: string;
    filename: string;
    status: ImportStatus;
    rowsTotal: number;
    rowsOk: number;
    rowsError: number;
    errors: Prisma.JsonValue;
    warnings: Prisma.JsonValue;
    appliedAt: Date | null;
    createdAt: Date;
  }): ImportBatchDto {
    return {
      id: batch.id,
      listId: batch.listId,
      filename: batch.filename,
      status: batch.status,
      rowsTotal: batch.rowsTotal,
      rowsOk: batch.rowsOk,
      rowsError: batch.rowsError,
      errors: (batch.errors ?? []) as unknown as ImportBatchDto['errors'],
      warnings: (batch.warnings ?? []) as unknown as ImportBatchDto['warnings'],
      appliedAt: batch.appliedAt,
      createdAt: batch.createdAt,
    };
  }
}
