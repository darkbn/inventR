import { Global, Module } from '@nestjs/common';

import { PrismaService } from './prisma.service';

/**
 * Module global : PrismaService est injectable partout sans réimport, ce qui
 * évite de déclarer PrismaModule dans chacun des modules métier.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
