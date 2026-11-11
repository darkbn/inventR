import { plainToInstance, Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

export enum NodeEnv {
  Development = 'development',
  Test = 'test',
  Production = 'production',
}

/**
 * Les variables d'environnement arrivent toujours sous forme de chaîne (ou
 * d'undefined). Toute autre forme est une erreur de configuration : on la laisse
 * échouer à la validation plutôt que de la convertir silencieusement.
 */
function asString(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return undefined;
}

/** Accepte "true"/"1"/"yes" (insensible à la casse) comme valeur vraie. */
const toBoolean = ({ value }: { value: unknown }): boolean => {
  if (typeof value === 'boolean') return value;
  const raw = asString(value);
  return raw !== undefined && ['true', '1', 'yes'].includes(raw.toLowerCase());
};

const toInt = ({ value }: { value: unknown }): number | undefined => {
  if (typeof value === 'number') return value;
  const raw = asString(value);
  if (raw === undefined || raw.trim() === '') return undefined;
  const parsed = Number.parseInt(raw, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
};

/**
 * Contrat des variables d'environnement. Toute variable absente ou invalide fait
 * échouer le démarrage de l'API : on préfère un crash explicite au démarrage plutôt
 * qu'une erreur de configuration découverte en production.
 */
export class EnvironmentVariables {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  @Transform(toInt)
  API_PORT = 3000;

  @IsString()
  @IsNotEmpty()
  API_PREFIX = 'api/v1';

  @IsString()
  @IsNotEmpty()
  CORS_ORIGINS!: string;

  // --- JWT : secrets distincts, longueur minimale imposée ---------------------
  @IsString()
  @MinLength(32, { message: 'JWT_ACCESS_SECRET doit faire au moins 32 caractères' })
  JWT_ACCESS_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  JWT_ACCESS_TTL = '15m';

  @IsString()
  @MinLength(32, { message: 'JWT_REFRESH_SECRET doit faire au moins 32 caractères' })
  JWT_REFRESH_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_TTL = '7d';

  // --- Rate limiting ----------------------------------------------------------
  @IsInt()
  @Min(1000)
  @Transform(toInt)
  THROTTLE_TTL = 60_000;

  @IsInt()
  @Min(1)
  @Transform(toInt)
  THROTTLE_LIMIT = 120;

  @IsInt()
  @Min(1000)
  @Transform(toInt)
  THROTTLE_AUTH_TTL = 60_000;

  @IsInt()
  @Min(1)
  @Transform(toInt)
  THROTTLE_AUTH_LIMIT = 10;

  // --- Stockage ---------------------------------------------------------------
  @IsString()
  @IsNotEmpty()
  STORAGE_UPLOAD_DIR = './storage/uploads';

  @IsString()
  @IsNotEmpty()
  STORAGE_REPORT_DIR = './storage/reports';

  @IsInt()
  @Min(1)
  @Max(200)
  @Transform(toInt)
  UPLOAD_MAX_FILE_SIZE_MB = 25;

  // --- Logs -------------------------------------------------------------------
  @IsString()
  @IsNotEmpty()
  LOG_LEVEL = 'info';

  @IsBoolean()
  @Transform(toBoolean)
  LOG_PRETTY = false;

  // --- Seed (optionnel : seules les commandes de seed les utilisent) ----------
  @IsOptional()
  @IsString()
  SEED_ADMIN_EMAIL?: string;

  @IsOptional()
  @IsString()
  SEED_ADMIN_USERNAME?: string;

  @IsOptional()
  @IsString()
  SEED_ADMIN_FULLNAME?: string;

  @IsOptional()
  @IsString()
  SEED_ADMIN_PASSWORD?: string;

  @IsOptional()
  @IsString()
  SEED_WAREHOUSE_CODE?: string;

  @IsOptional()
  @IsString()
  SEED_WAREHOUSE_LABEL?: string;
}

export function validateEnvironment(raw: Record<string, unknown>): EnvironmentVariables {
  const config = plainToInstance(EnvironmentVariables, raw, {
    enableImplicitConversion: false,
    exposeDefaultValues: true,
  });

  const errors = validateSync(config, { skipMissingProperties: false });

  if (errors.length > 0) {
    const details = errors
      .map((error) => `  - ${error.property}: ${Object.values(error.constraints ?? {}).join(', ')}`)
      .join('\n');
    throw new Error(`Configuration d'environnement invalide :\n${details}`);
  }

  return config;
}
