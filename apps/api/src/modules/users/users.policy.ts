import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';

import type { AuthenticatedUser } from '../../common/types/authenticated-user';

/** Vue minimale d'un compte, suffisante pour trancher une autorisation. */
export interface TargetAccount {
  id: string;
  role: Role;
}

/**
 * Règles d'accès aux comptes utilisateurs.
 *
 * Exigence métier explicite : **un superviseur ne peut pas modifier les comptes
 * administrateurs**. Cette règle n'aurait aucune portée si le superviseur n'avait
 * aucun droit sur les comptes ; la politique retenue lui donne donc la gestion des
 * seuls comptes opérateurs, dont il a besoin au quotidien pour constituer ses
 * équipes de comptage :
 *
 * | Rôle de l'acteur | Lecture                         | Création / modification        |
 * |------------------|---------------------------------|--------------------------------|
 * | ADMIN            | tous les comptes                | tous les comptes               |
 * | SUPERVISOR       | comptes USER et SUPERVISOR      | comptes USER uniquement        |
 * | USER             | son propre compte seulement     | aucune                         |
 *
 * Un superviseur ne peut donc ni voir, ni modifier, ni désactiver un
 * administrateur, ni s'octroyer ou octroyer le rôle ADMIN ou SUPERVISOR.
 */
export class UsersPolicy {
  /** Rôles qu'un acteur a le droit d'apercevoir dans les listes et les fiches. */
  static visibleRoles(actor: AuthenticatedUser): Role[] {
    if (actor.role === Role.ADMIN) return [Role.ADMIN, Role.SUPERVISOR, Role.USER];
    if (actor.role === Role.SUPERVISOR) return [Role.SUPERVISOR, Role.USER];
    return [];
  }

  static canRead(actor: AuthenticatedUser, target: TargetAccount): boolean {
    if (actor.id === target.id) return true;
    return UsersPolicy.visibleRoles(actor).includes(target.role);
  }

  /** Rôles qu'un acteur peut attribuer à un compte. */
  static assignableRoles(actor: AuthenticatedUser): Role[] {
    if (actor.role === Role.ADMIN) return [Role.ADMIN, Role.SUPERVISOR, Role.USER];
    if (actor.role === Role.SUPERVISOR) return [Role.USER];
    return [];
  }

  static canCreateWithRole(actor: AuthenticatedUser, role: Role): boolean {
    return UsersPolicy.assignableRoles(actor).includes(role);
  }

  static canModify(actor: AuthenticatedUser, target: TargetAccount): boolean {
    if (actor.role === Role.ADMIN) return true;
    if (actor.role === Role.SUPERVISOR) return target.role === Role.USER;
    return false;
  }

  /**
   * Un compte ne peut pas se désactiver lui-même : c'est le scénario classique du
   * dernier administrateur qui se verrouille hors de l'application.
   */
  static canChangeStatus(actor: AuthenticatedUser, target: TargetAccount): boolean {
    if (actor.id === target.id) return false;
    return UsersPolicy.canModify(actor, target);
  }

  /** Un compte ne peut pas non plus modifier son propre rôle. */
  static canChangeRole(actor: AuthenticatedUser, target: TargetAccount, nextRole: Role): boolean {
    if (actor.id === target.id) return false;
    if (!UsersPolicy.canModify(actor, target)) return false;
    return UsersPolicy.assignableRoles(actor).includes(nextRole);
  }

  // --- Variantes levant une exception, utilisées par le service ---------------

  static assertCanRead(actor: AuthenticatedUser, target: TargetAccount): void {
    if (!UsersPolicy.canRead(actor, target)) {
      // Message volontairement identique à « introuvable » côté service : un
      // superviseur ne doit pas pouvoir déduire l'existence d'un administrateur.
      throw new ForbiddenException("Vous n'avez pas accès à ce compte.");
    }
  }

  static assertCanModify(actor: AuthenticatedUser, target: TargetAccount): void {
    if (!UsersPolicy.canModify(actor, target)) {
      throw new ForbiddenException(
        actor.role === Role.SUPERVISOR
          ? 'Un superviseur ne peut modifier que les comptes opérateurs.'
          : "Vous n'êtes pas autorisé à modifier ce compte.",
      );
    }
  }

  static assertCanCreateWithRole(actor: AuthenticatedUser, role: Role): void {
    if (!UsersPolicy.canCreateWithRole(actor, role)) {
      throw new ForbiddenException(`Vous ne pouvez pas créer de compte avec le rôle ${role}.`);
    }
  }

  static assertCanChangeStatus(actor: AuthenticatedUser, target: TargetAccount): void {
    if (actor.id === target.id) {
      throw new ForbiddenException('Vous ne pouvez pas modifier le statut de votre propre compte.');
    }
    UsersPolicy.assertCanModify(actor, target);
  }

  static assertCanChangeRole(
    actor: AuthenticatedUser,
    target: TargetAccount,
    nextRole: Role,
  ): void {
    if (actor.id === target.id) {
      throw new ForbiddenException('Vous ne pouvez pas modifier votre propre rôle.');
    }
    UsersPolicy.assertCanModify(actor, target);
    if (!UsersPolicy.assignableRoles(actor).includes(nextRole)) {
      throw new ForbiddenException(`Vous ne pouvez pas attribuer le rôle ${nextRole}.`);
    }
  }
}
