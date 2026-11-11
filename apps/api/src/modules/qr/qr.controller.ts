import {
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Query,
  Res,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';

import { Roles } from '../auth/decorators/roles.decorator';

import { QrService } from './qr.service';

@ApiTags('QR codes')
@ApiBearerAuth('bearer')
@Controller('qr')
export class QrController {
  constructor(private readonly qrService: QrService) {}

  @Get('articles/:code.png')
  @ApiProduces('image/png')
  @ApiOperation({
    summary: 'QR code d’un article',
    description:
      'Encode `{"t":"ART","c":"<code>"}`. Le scanner mobile accepte aussi un QR ' +
      'ne contenant que le code nu, afin de rester compatible avec les ' +
      'étiquettes fournisseur déjà posées.',
  })
  @ApiParam({ name: 'code', example: 'ACCEL-0016' })
  @ApiQuery({
    name: 'size',
    required: false,
    description: 'Côté de l’image en pixels (64 à 1024).',
  })
  @ApiResponse({ status: 200, description: 'Image PNG' })
  async articleQr(
    @Param('code') code: string,
    @Query('size', new DefaultValuePipe(256), ParseIntPipe) size: number,
    @Res() response: Response,
  ): Promise<void> {
    const buffer = await this.qrService.articlePng(code, size);

    response.setHeader('Content-Type', 'image/png');
    // Le QR d'un article ne change jamais : il peut être mis en cache longuement.
    response.setHeader('Cache-Control', 'private, max-age=86400');
    response.setHeader('Content-Length', buffer.length);
    response.end(buffer);
  }

  @Get('locations/:id.png')
  @ApiProduces('image/png')
  @ApiOperation({
    summary: 'QR code d’un emplacement',
    description: 'Encode `{"t":"LOC","c":"<code>"}`.',
  })
  @ApiResponse({ status: 200, description: 'Image PNG' })
  async locationQr(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('size', new DefaultValuePipe(256), ParseIntPipe) size: number,
    @Res() response: Response,
  ): Promise<void> {
    const buffer = await this.qrService.locationPng(id, size);

    response.setHeader('Content-Type', 'image/png');
    response.setHeader('Cache-Control', 'private, max-age=86400');
    response.setHeader('Content-Length', buffer.length);
    response.end(buffer);
  }

  @Get('lists/:listId/labels.pdf')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @ApiProduces('application/pdf')
  @ApiOperation({
    summary: 'Planche d’étiquettes QR d’une liste',
    description:
      'Grille de 3 étiquettes par rangée, dans l’ordre physique de parcours de ' +
      'l’entrepôt. Chaque étiquette porte le QR code, le code article, la ' +
      'désignation abrégée et l’emplacement : elle reste exploitable à l’œil si ' +
      'le scanner échoue.',
  })
  @ApiResponse({ status: 200, description: 'Document PDF' })
  async listLabels(
    @Param('listId', ParseUUIDPipe) listId: string,
    @Res() response: Response,
  ): Promise<void> {
    const { buffer, listCode } = await this.qrService.listLabels(listId);

    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="InventAir-etiquettes-${listCode}.pdf"`,
    );
    response.setHeader('Content-Length', buffer.length);
    response.end(buffer);
  }
}
