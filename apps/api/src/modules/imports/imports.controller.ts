import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiOperation,
  ApiProduces,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';

import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { clientContextFrom } from '../../common/utils/client-context';
import type { EnvironmentVariables } from '../../config/env.validation';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

import { ApplyImportResultDto, ImportBatchDto, ImportOptionsDto } from './dto/import.dto';
import { ImportTemplateService } from './import-template.service';
import { ImportsService } from './imports.service';

/** Types MIME acceptés pour un dépôt. */
const ACCEPTED_MIME = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/vnd.ms-excel.sheet.macroEnabled.12',
  'text/csv',
  'text/plain',
  'application/csv',
  'application/octet-stream',
]);

@ApiTags('Imports')
@ApiBearerAuth('bearer')
@Controller()
export class ImportsController {
  constructor(
    private readonly importsService: ImportsService,
    private readonly templateService: ImportTemplateService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  @Public()
  @Get('imports/template.xlsx')
  @ApiProduces('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @ApiOperation({
    summary: 'Télécharger le modèle d’import',
    description:
      'Modèle officiel au format Excel : feuille de données avec exemples, notice ' +
      'détaillant chaque colonne, et liste des unités. Les en-têtes reprennent ' +
      'exactement ceux de l’export ERP, afin qu’un fichier extrait du système ' +
      'puisse être déposé sans retouche. Librement accessible pour pouvoir être ' +
      'récupéré depuis un poste non connecté.',
  })
  @ApiResponse({ status: 200, description: 'Classeur Excel' })
  async downloadTemplate(@Res() response: Response): Promise<void> {
    const buffer = await this.templateService.generate();

    response.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    response.setHeader(
      'Content-Disposition',
      'attachment; filename="InventAir-modele-import.xlsx"',
    );
    response.setHeader('Content-Length', buffer.length);
    response.end(buffer);
  }

  @Post('lists/:listId/imports')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary', description: 'Fichier .xlsx ou .csv' },
        excludeZeroQuantity: { type: 'boolean', default: false },
        updateExisting: { type: 'boolean', default: true },
      },
    },
  })
  @ApiOperation({
    summary: 'Déposer et analyser un fichier d’inventaire',
    description:
      'Analyse seule : **aucune donnée métier n’est modifiée**. Produit un ' +
      'rapport ligne par ligne — erreurs bloquantes et avertissements — que le ' +
      'superviseur examine avant d’appliquer l’import.',
  })
  @ApiResponse({ status: 201, type: ImportBatchDto })
  @ApiBadRequestResponse({ description: 'Format non pris en charge, ou en-têtes introuvables' })
  @ApiConflictResponse({ description: 'Campagne au statut incompatible avec un import' })
  analyze(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('listId', ParseUUIDPipe) listId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Query() options: ImportOptionsDto,
    @Req() request: Request,
  ): Promise<ImportBatchDto> {
    this.assertUploadIsAcceptable(file);

    return this.importsService.analyze(
      actor,
      listId,
      { originalname: file!.originalname, buffer: file!.buffer },
      options,
      clientContextFrom(request),
    );
  }

  @Post('imports/:id/apply')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Appliquer un import validé',
    description:
      'Écrit les lignes d’inventaire en une seule transaction : articles et ' +
      'emplacements inconnus sont créés au passage, les lignes déjà présentes ' +
      'voient leur quantité théorique actualisée. Le fichier est réanalysé depuis ' +
      'le disque pour garantir que ce qui est écrit correspond bien à ce qui a ' +
      'été examiné.',
  })
  @ApiResponse({ status: 200, type: ApplyImportResultDto })
  @ApiConflictResponse({ description: 'Import déjà appliqué, rejeté, ou campagne incompatible' })
  apply(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: Request,
  ): Promise<ApplyImportResultDto> {
    return this.importsService.apply(actor, id, clientContextFrom(request));
  }

  @Get('imports/:id')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({
    summary: 'Consulter un import',
    description: 'Rapport complet, erreurs et avertissements compris.',
  })
  @ApiResponse({ status: 200, type: ImportBatchDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ImportBatchDto> {
    return this.importsService.findOne(id);
  }

  @Get('lists/:listId/imports')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Historique des imports d’une liste' })
  @ApiResponse({ status: 200, type: [ImportBatchDto] })
  findByList(@Param('listId', ParseUUIDPipe) listId: string): Promise<ImportBatchDto[]> {
    return this.importsService.findByList(listId);
  }

  @Post('imports/:id/reject')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Abandonner un import non appliqué',
    description: 'Supprime le fichier déposé. Impossible une fois l’import appliqué.',
  })
  @ApiResponse({ status: 200, type: ImportBatchDto })
  reject(@Param('id', ParseUUIDPipe) id: string): Promise<ImportBatchDto> {
    return this.importsService.reject(id);
  }

  /**
   * Contrôles de dépôt. Le type MIME annoncé par le navigateur n'est qu'un
   * indice — l'extension et le contenu font foi — mais il écarte à moindre
   * coût les dépôts manifestement hors sujet.
   */
  private assertUploadIsAcceptable(file: Express.Multer.File | undefined): void {
    if (!file) {
      throw new BadRequestException('Aucun fichier reçu. Le champ « file » est obligatoire.');
    }

    const maxBytes = this.config.get('UPLOAD_MAX_FILE_SIZE_MB', { infer: true }) * 1024 * 1024;
    if (file.size > maxBytes) {
      throw new BadRequestException(
        `Le fichier dépasse la taille maximale autorisée (${this.config.get('UPLOAD_MAX_FILE_SIZE_MB', { infer: true })} Mo).`,
      );
    }

    if (!ACCEPTED_MIME.has(file.mimetype)) {
      throw new BadRequestException(
        `Type de fichier « ${file.mimetype} » non pris en charge. Déposez un fichier .xlsx ou .csv.`,
      );
    }
  }
}
