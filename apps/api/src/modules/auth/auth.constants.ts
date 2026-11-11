/** Charge utile d'un jeton d'accès. */
export interface AccessTokenPayload {
  /** Identifiant de l'utilisateur. */
  sub: string;
  email: string;
  username: string;
  role: string;
  /** Discrimine les deux familles de jetons (voir TOKEN_TYPE). */
  typ: 'access';
}

/** Charge utile d'un jeton de rafraîchissement. */
export interface RefreshTokenPayload {
  sub: string;
  /** Identifiant unique du jeton, qui le relie à sa ligne en base. */
  jti: string;
  typ: 'refresh';
}

/**
 * Les deux familles de jetons sont signées avec des secrets différents ET portent
 * un marqueur de type : un jeton de rafraîchissement ne peut donc pas être
 * présenté comme un jeton d'accès, même en cas de fuite d'un secret.
 */
export const TOKEN_TYPE = {
  ACCESS: 'access',
  REFRESH: 'refresh',
} as const;
