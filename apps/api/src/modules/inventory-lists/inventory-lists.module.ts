import { Module } from '@nestjs/common';

import { InventoryListsController } from './inventory-lists.controller';
import { InventoryListsService } from './inventory-lists.service';

@Module({
  controllers: [InventoryListsController],
  providers: [InventoryListsService],
  exports: [InventoryListsService],
})
export class InventoryListsModule {}
