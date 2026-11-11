import { Module } from '@nestjs/common';

import {
  CampaignTypesController,
  InventoryMethodsController,
} from './campaign-settings.controller';
import { CampaignTypesService } from './campaign-types.service';
import { InventoryMethodsService } from './inventory-methods.service';

/**
 * Paramétrage des campagnes : types et méthodes de calcul. Ces deux référentiels
 * sont regroupés car ils partagent la même nature — de petites tables de
 * configuration, conçues pour être étendues sans migration de schéma.
 */
@Module({
  controllers: [CampaignTypesController, InventoryMethodsController],
  providers: [CampaignTypesService, InventoryMethodsService],
  exports: [CampaignTypesService, InventoryMethodsService],
})
export class CampaignSettingsModule {}
