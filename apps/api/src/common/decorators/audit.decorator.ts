import { SetMetadata } from '@nestjs/common';

export const AUDIT_KEY = 'audit';

export interface AuditMetadata {
  /** Code d'action stable, par exemple `USER_CREATE`. */
  action: string;
  /** Type de ressource concernée, par exemple `User`. */
  entityType: string;
  /**
   * Champs du corps de la requête à conserver dans le journal. Par défaut,
   * **aucun** : on n'enregistre jamais une charge utile entière, qui pourrait
   * contenir un mot de passe. Les champs doivent être désignés explicitement.
   */
  captureFields?: string[];
}

/**
 * Déclare qu'une route doit être tracée dans le journal d'activité.
 *
 * Le journal est produit par AuditInterceptor après le succès de l'action :
 * les services restent concentrés sur le métier, et on ne peut pas oublier
 * d'écrire la trace dans une branche d'exécution particulière.
 */
export const Audit = (metadata: AuditMetadata): MethodDecorator & ClassDecorator =>
  SetMetadata(AUDIT_KEY, metadata);
