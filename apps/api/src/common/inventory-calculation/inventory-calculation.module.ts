import { Global, Module } from '@nestjs/common';

import { InventoryCalculationService } from './inventory-calculation.service';

/**
 * Module global : toute règle de calcul d'inventaire passe par ce service
 * unique. Le déclarer global évite qu'un module le réimplémente faute de
 * l'avoir importé.
 */
@Global()
@Module({
  providers: [InventoryCalculationService],
  exports: [InventoryCalculationService],
})
export class InventoryCalculationModule {}
