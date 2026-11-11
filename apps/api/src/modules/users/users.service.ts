import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role, type User } from '@prisma/client';

import { paginate, type PaginatedDto } from '../../common/dto/paginated-response.dto';
import { hashPassword, verifyPassword } from '../../common/security/password';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { PrismaService } from '../../prisma/prisma.service';
import { TokenService } from '../auth/token.service';

import type { CreateUserDto } from './dto/create-user.dto';
import type { ListUsersQueryDto } from './dto/list-users-query.dto';
import type { ChangePasswordDto, ResetPasswordDto } from './dto/reset-password.dto';
import type { UpdateUserDto, UpdateUserRoleDto, UpdateUserStatusDto } from './dto/update-user.dto';
import { UserDto } from './dto/user.dto';
import { UsersPolicy } from './users.policy';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
  ) {}

  async findAll(
    actor: AuthenticatedUser,
    query: ListUsersQueryDto,
  ): Promise<PaginatedDto<UserDto>> {
    const visibleRoles = UsersPolicy.visibleRoles(actor);

    // Le filtre de rôle demandé est intersecté avec ce que l'acteur a le droit de
    // voir : un superviseur qui demande `?role=ADMIN` obtient une liste vide, et
    // non une erreur qui confirmerait l'existence de tels comptes.
    const roleFilter =
      query.role !== undefined ? visibleRoles.filter((role) => role === query.role) : visibleRoles;

    const where: Prisma.UserWhereInput = {
      role: { in: roleFilter },
      ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
      ...(query.q
        ? {
            OR: [
              { fullName: { contains: query.q, mode: Prisma.QueryMode.insensitive } },
              { username: { contains: query.q, mode: Prisma.QueryMode.insensitive } },
              { email: { contains: query.q, mode: Prisma.QueryMode.insensitive } },
            ],
          }
        : {}),
    };

    const [total, users] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: { [query.sortBy]: query.sortOrder },
        skip: query.skip,
        take: query.limit,
      }),
    ]);

    return paginate(
      users.map((user) => UserDto.from(user)),
      total,
      query.page,
      query.limit,
    );
  }

  async findOne(actor: AuthenticatedUser, id: string): Promise<UserDto> {
    const user = await this.getVisibleOrThrow(actor, id);
    return UserDto.from(user);
  }

  async create(actor: AuthenticatedUser, dto: CreateUserDto): Promise<UserDto> {
    UsersPolicy.assertCanCreateWithRole(actor, dto.role);
    await this.assertIdentifiersAvailable(dto.email, dto.username);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        username: dto.username,
        fullName: dto.fullName,
        passwordHash: await hashPassword(dto.password),
        role: dto.role,
        isActive: dto.isActive ?? true,
        createdById: actor.id,
        updatedById: actor.id,
      },
    });

    return UserDto.from(user);
  }

  async update(actor: AuthenticatedUser, id: string, dto: UpdateUserDto): Promise<UserDto> {
    const target = await this.getVisibleOrThrow(actor, id);
    UsersPolicy.assertCanModify(actor, target);

    await this.assertIdentifiersAvailable(dto.email, dto.username, id);

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.email === undefined ? {} : { email: dto.email }),
        ...(dto.username === undefined ? {} : { username: dto.username }),
        ...(dto.fullName === undefined ? {} : { fullName: dto.fullName }),
        updatedById: actor.id,
      },
    });

    return UserDto.from(user);
  }

  async updateRole(actor: AuthenticatedUser, id: string, dto: UpdateUserRoleDto): Promise<UserDto> {
    const target = await this.getVisibleOrThrow(actor, id);
    UsersPolicy.assertCanChangeRole(actor, target, dto.role);

    if (target.role === Role.ADMIN && dto.role !== Role.ADMIN) {
      await this.assertNotLastActiveAdmin(id);
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: { role: dto.role, updatedById: actor.id },
    });

    // Le rôle est embarqué dans le jeton d'accès : on révoque les sessions pour
    // que le nouveau périmètre s'applique sans délai, dans les deux sens.
    await this.tokenService.revokeAllForUser(id);

    return UserDto.from(user);
  }

  async updateStatus(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateUserStatusDto,
  ): Promise<UserDto> {
    const target = await this.getVisibleOrThrow(actor, id);
    UsersPolicy.assertCanChangeStatus(actor, target);

    if (!dto.isActive && target.role === Role.ADMIN) {
      await this.assertNotLastActiveAdmin(id);
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: { isActive: dto.isActive, updatedById: actor.id },
    });

    if (!dto.isActive) {
      await this.tokenService.revokeAllForUser(id);
    }

    return UserDto.from(user);
  }

  /** Réinitialisation administrative : l'ancien mot de passe n'est pas requis. */
  async resetPassword(actor: AuthenticatedUser, id: string, dto: ResetPasswordDto): Promise<void> {
    const target = await this.getVisibleOrThrow(actor, id);
    UsersPolicy.assertCanModify(actor, target);

    await this.prisma.user.update({
      where: { id },
      data: { passwordHash: await hashPassword(dto.newPassword), updatedById: actor.id },
    });

    // Un mot de passe réinitialisé doit invalider les sessions ouvertes : c'est
    // précisément le cas d'usage « le compte est peut-être compromis ».
    await this.tokenService.revokeAllForUser(id);
  }

  /** Changement par l'utilisateur lui-même, avec vérification du mot de passe actuel. */
  async changeOwnPassword(actor: AuthenticatedUser, dto: ChangePasswordDto): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: actor.id } });

    if (!(await verifyPassword(user.passwordHash, dto.currentPassword))) {
      throw new BadRequestException('Le mot de passe actuel est incorrect.');
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException("Le nouveau mot de passe doit différer de l'ancien.");
    }

    await this.prisma.user.update({
      where: { id: actor.id },
      data: { passwordHash: await hashPassword(dto.newPassword), updatedById: actor.id },
    });

    await this.tokenService.revokeAllForUser(actor.id);
  }

  // --- Internes --------------------------------------------------------------

  /**
   * Charge un compte en appliquant la visibilité de l'acteur. Un compte
   * inaccessible provoque la même erreur 404 qu'un compte inexistant : un
   * superviseur ne doit pas pouvoir déduire l'existence d'un administrateur en
   * comparant les codes de réponse.
   */
  private async getVisibleOrThrow(actor: AuthenticatedUser, id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user || !UsersPolicy.canRead(actor, user)) {
      throw new NotFoundException('Utilisateur introuvable.');
    }

    return user;
  }

  private async assertIdentifiersAvailable(
    email?: string,
    username?: string,
    excludeId?: string,
  ): Promise<void> {
    const candidates: Prisma.UserWhereInput[] = [];
    if (email !== undefined) candidates.push({ email });
    if (username !== undefined) candidates.push({ username });
    if (candidates.length === 0) return;

    const conflict = await this.prisma.user.findFirst({
      where: {
        OR: candidates,
        ...(excludeId === undefined ? {} : { NOT: { id: excludeId } }),
      },
      select: { email: true, username: true },
    });

    if (!conflict) return;

    throw new ConflictException(
      conflict.email === email
        ? 'Cette adresse e-mail est déjà utilisée.'
        : "Ce nom d'utilisateur est déjà utilisé.",
    );
  }

  /**
   * Empêche la disparition du dernier administrateur actif, qui rendrait
   * l'application non administrable sans intervention directe en base.
   */
  private async assertNotLastActiveAdmin(id: string): Promise<void> {
    const remaining = await this.prisma.user.count({
      where: { role: Role.ADMIN, isActive: true, NOT: { id } },
    });

    if (remaining === 0) {
      throw new ConflictException(
        'Opération refusée : ce compte est le dernier administrateur actif. Créez ou activez un autre administrateur au préalable.',
      );
    }
  }
}
