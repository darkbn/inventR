import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';

import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  // AuthModule fournit TokenService : changer un rôle, désactiver un compte ou
  // réinitialiser un mot de passe doit révoquer les sessions correspondantes.
  imports: [AuthModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
