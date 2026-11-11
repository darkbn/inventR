import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { ImportTemplateService } from './import-template.service';
import { ImportsController } from './imports.controller';
import { ImportsService } from './imports.service';
import { ImportValidatorService } from './parsing/import-validator.service';
import { InventoryFileParserService } from './parsing/inventory-file-parser.service';

@Module({
  imports: [
    // Stockage en mémoire : le fichier est analysé immédiatement, puis écrit
    // sous un nom généré par FileStorageService. Aucun nom fourni par
    // l'utilisateur n'atteint le système de fichiers.
    MulterModule.register({ storage: memoryStorage() }),
  ],
  controllers: [ImportsController],
  providers: [
    ImportsService,
    ImportTemplateService,
    InventoryFileParserService,
    ImportValidatorService,
  ],
  exports: [ImportsService],
})
export class ImportsModule {}
