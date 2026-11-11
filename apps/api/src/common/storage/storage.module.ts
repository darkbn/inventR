import { Global, Module } from '@nestjs/common';

import { FileStorageService } from './file-storage.service';

/** Module global : imports et rapports écrivent tous deux sur disque. */
@Global()
@Module({
  providers: [FileStorageService],
  exports: [FileStorageService],
})
export class StorageModule {}
