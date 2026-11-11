import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';

import type { AuthenticatedUser } from '../../common/types/authenticated-user';

import { UsersPolicy, type TargetAccount } from './users.policy';

const actor = (role: Role, id = `${role}-1`): AuthenticatedUser => ({
  id,
  email: `${id}@inventair.test`,
  username: id,
  fullName: id,
  role,
});

const target = (role: Role, id = `${role}-2`): TargetAccount => ({ id, role });

describe('UsersPolicy', () => {
  const admin = actor(Role.ADMIN);
  const supervisor = actor(Role.SUPERVISOR);
  const user = actor(Role.USER);

  describe('lecture', () => {
    it("l'administrateur voit tous les comptes", () => {
      expect(UsersPolicy.canRead(admin, target(Role.ADMIN))).toBe(true);
      expect(UsersPolicy.canRead(admin, target(Role.SUPERVISOR))).toBe(true);
      expect(UsersPolicy.canRead(admin, target(Role.USER))).toBe(true);
    });

    it('le superviseur ne voit pas les administrateurs', () => {
      expect(UsersPolicy.canRead(supervisor, target(Role.ADMIN))).toBe(false);
      expect(UsersPolicy.canRead(supervisor, target(Role.SUPERVISOR))).toBe(true);
      expect(UsersPolicy.canRead(supervisor, target(Role.USER))).toBe(true);
    });

    it("l'opérateur ne voit que son propre compte", () => {
      expect(UsersPolicy.canRead(user, target(Role.USER))).toBe(false);
      expect(UsersPolicy.canRead(user, { id: user.id, role: Role.USER })).toBe(true);
    });
  });

  describe('modification', () => {
    it('le superviseur ne peut pas modifier un administrateur — règle métier centrale', () => {
      expect(UsersPolicy.canModify(supervisor, target(Role.ADMIN))).toBe(false);
      expect(() => UsersPolicy.assertCanModify(supervisor, target(Role.ADMIN))).toThrow(
        ForbiddenException,
      );
    });

    it('le superviseur ne peut pas modifier un autre superviseur', () => {
      expect(UsersPolicy.canModify(supervisor, target(Role.SUPERVISOR))).toBe(false);
    });

    it('le superviseur peut modifier un opérateur', () => {
      expect(UsersPolicy.canModify(supervisor, target(Role.USER))).toBe(true);
    });

    it("l'opérateur ne peut modifier aucun compte", () => {
      expect(UsersPolicy.canModify(user, target(Role.USER))).toBe(false);
    });
  });

  describe('attribution de rôle', () => {
    it('le superviseur ne peut attribuer que le rôle opérateur', () => {
      expect(UsersPolicy.assignableRoles(supervisor)).toEqual([Role.USER]);
      expect(UsersPolicy.canCreateWithRole(supervisor, Role.ADMIN)).toBe(false);
      expect(UsersPolicy.canCreateWithRole(supervisor, Role.SUPERVISOR)).toBe(false);
      expect(UsersPolicy.canCreateWithRole(supervisor, Role.USER)).toBe(true);
    });

    it('le superviseur ne peut pas promouvoir un opérateur en administrateur', () => {
      expect(UsersPolicy.canChangeRole(supervisor, target(Role.USER), Role.ADMIN)).toBe(false);
      expect(() =>
        UsersPolicy.assertCanChangeRole(supervisor, target(Role.USER), Role.ADMIN),
      ).toThrow(ForbiddenException);
    });

    it("l'administrateur peut attribuer n'importe quel rôle", () => {
      expect(UsersPolicy.canChangeRole(admin, target(Role.USER), Role.ADMIN)).toBe(true);
    });
  });

  describe('garde-fous sur son propre compte', () => {
    it('nul ne peut se désactiver lui-même', () => {
      // Sans cette règle, le dernier administrateur peut se verrouiller hors de
      // l'application sans aucun recours applicatif.
      const self: TargetAccount = { id: admin.id, role: Role.ADMIN };
      expect(UsersPolicy.canChangeStatus(admin, self)).toBe(false);
      expect(() => UsersPolicy.assertCanChangeStatus(admin, self)).toThrow(ForbiddenException);
    });

    it('nul ne peut modifier son propre rôle', () => {
      const self: TargetAccount = { id: admin.id, role: Role.ADMIN };
      expect(UsersPolicy.canChangeRole(admin, self, Role.USER)).toBe(false);
    });
  });
});
