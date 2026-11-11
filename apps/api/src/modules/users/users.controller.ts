import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { ApiPaginatedResponse, type PaginatedDto } from '../../common/dto/paginated-response.dto';
import { Audit } from '../../common/decorators/audit.decorator';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { ChangePasswordDto, ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateUserDto, UpdateUserRoleDto, UpdateUserStatusDto } from './dto/update-user.dto';
import { UserDto } from './dto/user.dto';
import { UsersService } from './users.service';

@ApiTags('Utilisateurs')
@ApiBearerAuth('bearer')
@UseInterceptors(AuditInterceptor)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({
    summary: 'Lister les comptes',
    description:
      'La liste est filtrée selon le rôle de l’appelant : un superviseur ne voit ' +
      'jamais les comptes administrateurs, même en filtrant explicitement dessus.',
  })
  @ApiPaginatedResponse(UserDto, 'Page de comptes')
  findAll(
    @CurrentUser() actor: AuthenticatedUser,
    @Query() query: ListUsersQueryDto,
  ): Promise<PaginatedDto<UserDto>> {
    return this.usersService.findAll(actor, query);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Consulter un compte' })
  @ApiResponse({ status: 200, type: UserDto })
  @ApiNotFoundResponse({ description: 'Compte inexistant ou hors du périmètre de l’appelant' })
  findOne(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<UserDto> {
    return this.usersService.findOne(actor, id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @Audit({
    action: 'USER_CREATE',
    entityType: 'User',
    captureFields: ['email', 'username', 'role'],
  })
  @ApiOperation({
    summary: 'Créer un compte',
    description: 'Un superviseur ne peut créer que des comptes de rôle USER.',
  })
  @ApiResponse({ status: 201, type: UserDto })
  @ApiConflictResponse({ description: 'E-mail ou nom d’utilisateur déjà pris' })
  @ApiForbiddenResponse({ description: 'Rôle demandé hors du périmètre de l’appelant' })
  create(@CurrentUser() actor: AuthenticatedUser, @Body() dto: CreateUserDto): Promise<UserDto> {
    return this.usersService.create(actor, dto);
  }

  @Patch('me/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Audit({ action: 'USER_CHANGE_OWN_PASSWORD', entityType: 'User' })
  @ApiOperation({
    summary: 'Changer son propre mot de passe',
    description:
      'Exige le mot de passe actuel. Toutes les sessions sont révoquées : il faut ' +
      'se reconnecter sur chaque appareil.',
  })
  @ApiResponse({ status: 204, description: 'Mot de passe modifié' })
  changeOwnPassword(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    return this.usersService.changeOwnPassword(actor, dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @Audit({ action: 'USER_UPDATE', entityType: 'User', captureFields: ['email', 'username'] })
  @ApiOperation({ summary: 'Modifier un profil' })
  @ApiResponse({ status: 200, type: UserDto })
  update(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<UserDto> {
    return this.usersService.update(actor, id, dto);
  }

  @Patch(':id/role')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @Audit({ action: 'USER_CHANGE_ROLE', entityType: 'User', captureFields: ['role'] })
  @ApiOperation({
    summary: 'Modifier le rôle d’un compte',
    description:
      'Révoque les sessions du compte pour que le nouveau périmètre prenne effet ' +
      'immédiatement. Le dernier administrateur actif ne peut pas être rétrogradé.',
  })
  @ApiResponse({ status: 200, type: UserDto })
  @ApiConflictResponse({ description: 'Dernier administrateur actif' })
  updateRole(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserRoleDto,
  ): Promise<UserDto> {
    return this.usersService.updateRole(actor, id, dto);
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @Audit({
    action: 'USER_CHANGE_STATUS',
    entityType: 'User',
    captureFields: ['isActive', 'reason'],
  })
  @ApiOperation({
    summary: 'Activer ou désactiver un compte',
    description:
      'Les comptes ne sont jamais supprimés — leurs comptages doivent rester ' +
      'imputables — mais désactivés. La désactivation révoque les sessions ouvertes.',
  })
  @ApiResponse({ status: 200, type: UserDto })
  @ApiConflictResponse({ description: 'Dernier administrateur actif' })
  updateStatus(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserStatusDto,
  ): Promise<UserDto> {
    return this.usersService.updateStatus(actor, id, dto);
  }

  @Patch(':id/password')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Audit({ action: 'USER_RESET_PASSWORD', entityType: 'User' })
  @ApiOperation({
    summary: 'Réinitialiser le mot de passe d’un compte',
    description: 'Révoque toutes les sessions du compte concerné.',
  })
  @ApiResponse({ status: 204, description: 'Mot de passe réinitialisé' })
  resetPassword(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResetPasswordDto,
  ): Promise<void> {
    return this.usersService.resetPassword(actor, id, dto);
  }
}
