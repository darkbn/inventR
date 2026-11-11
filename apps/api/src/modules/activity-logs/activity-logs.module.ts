import { Global, Module } from '@nestjs/common';

import { ActivityLogsController } from './activity-logs.controller';
import { ActivityLogsService } from './activity-logs.service';

/**
 * Module global : la quasi-totalité des modules métier journalise des actions
 * sensibles. Le contrôleur de consultation du journal est ajouté à l'étape des
 * référentiels (réservé au rôle ADMIN).
 */
@Global()
@Module({
  controllers: [ActivityLogsController],
  providers: [ActivityLogsService],
  exports: [ActivityLogsService],
})
export class ActivityLogsModule {}
