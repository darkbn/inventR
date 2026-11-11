import { Module } from '@nestjs/common';

import { InventoryItemsModule } from '../inventory-items/inventory-items.module';

import { CountsController } from './counts.controller';
import { CountsService } from './counts.service';

@Module({
  // Chaque comptage déclenche le recalcul de sa ligne : le service des lignes
  // est le seul à savoir le faire.
  imports: [InventoryItemsModule],
  controllers: [CountsController],
  providers: [CountsService],
  exports: [CountsService],
})
export class CountsModule {}
