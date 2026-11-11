import { existsSync } from 'node:fs';
import path from 'node:path';

import { PrismaClient, Role } from '@prisma/client';
import { config as loadDotenv } from 'dotenv';

import {
  CAMPAIGN_TYPE,
  INVENTORY_METHOD,
  UNLOCATED_LOCATION_CODE,
  UNLOCATED_LOCATION_LABEL,
} from '../src/common/constants/inventory.constants';
import { hashPassword } from '../src/common/security/password';

/** Charge le .env de la racine du monorepo (cf. prisma.config.ts). */
function loadRootEnv(): void {
  let dir = __dirname;
  for (let depth = 0; depth < 5; depth += 1) {
    const candidate = path.join(dir, '.env');
    if (existsSync(candidate)) {
      loadDotenv({ path: candidate });
      return;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
}

loadRootEnv();

const prisma = new PrismaClient();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === '') {
    throw new Error(
      `Variable d'environnement ${name} manquante. Renseignez-la dans le fichier .env avant de lancer le seed.`,
    );
  }
  return value.trim();
}

async function seedCampaignTypes(): Promise<void> {
  const types = [
    { code: CAMPAIGN_TYPE.RAW_MATERIAL, label: 'Matière première' },
    { code: CAMPAIGN_TYPE.SPARE_PARTS, label: 'Pièces de rechange (PDR)' },
    { code: CAMPAIGN_TYPE.FINISHED_GOODS, label: 'Produits finis' },
  ];

  for (const type of types) {
    await prisma.campaignType.upsert({
      where: { code: type.code },
      update: { label: type.label },
      create: type,
    });
  }

  console.log(`  ✓ ${types.length} types de campagne`);
}

async function seedInventoryMethods(): Promise<void> {
  const methods = [
    {
      code: INVENTORY_METHOD.SUM,
      label: 'Méthode 1 — Somme cumulative',
      description:
        'Chaque comptage est une saisie partielle (une zone, un opérateur, un passage). ' +
        'La quantité finale est la somme de tous les comptages valides de la ligne. ' +
        'Une ligne sans aucun comptage est considérée comme non trouvée. ' +
        'Adaptée aux périmètres étendus découpés par zone.',
      config: {
        /** Nombre minimal de comptages pour qu'une ligne soit considérée résolue. */
        minCounts: 1,
        /** La somme additionne les comptages au lieu de les remplacer. */
        aggregation: 'SUM',
      },
    },
    {
      code: INVENTORY_METHOD.DOUBLE_BLIND,
      label: 'Méthode 2 — Double comptage contradictoire',
      description:
        'Au moins deux comptages indépendants, réalisés par des utilisateurs différents. ' +
        "Seul le dernier comptage de chaque utilisateur est retenu. S'ils concordent, la " +
        'valeur est confirmée ; sinon la ligne passe en litige et doit être tranchée par un ' +
        "troisième comptage majoritaire ou par l'arbitrage du superviseur. La clôture est " +
        "bloquée tant qu'un litige subsiste. Adaptée aux articles à forte valeur.",
      config: {
        minCounts: 2,
        aggregation: 'AGREEMENT',
        /** Exige que les comptages proviennent d'utilisateurs distincts. */
        requireDistinctCounters: true,
      },
    },
    {
      code: INVENTORY_METHOD.PROGRESSIVE,
      label: 'Méthode 3 — Comptages successifs et enquête',
      description:
        'Comptages successifs contrôlés sur la quantité théorique issue de l’extraction SAP. ' +
        'Le 1ᵉʳ comptage clôt la ligne s’il confirme le théorique. Sinon un 2ᵉ comptage la clôt ' +
        's’il confirme le théorique ou s’il concorde avec le 1ᵉʳ. Sinon un 3ᵉ comptage la clôt ' +
        'uniquement s’il confirme le théorique. Au-delà, la ligne passe en enquête : le ' +
        'superviseur recherche la cause et saisit la quantité retenue avec un motif obligatoire. ' +
        'Un même opérateur ne peut pas compter deux fois la même ligne.',
      config: {
        minCounts: 1,
        aggregation: 'SEQUENTIAL',
        requireDistinctCounters: true,
        /** Nombre de comptages avant bascule en enquête. */
        maxCounts: 3,
        /** La quantité théorique sert de référence de validation. */
        validateAgainstTheoretical: true,
      },
    },
  ];

  for (const method of methods) {
    await prisma.inventoryMethod.upsert({
      where: { code: method.code },
      update: { label: method.label, description: method.description, config: method.config },
      create: method,
    });
  }

  console.log(`  ✓ ${methods.length} méthodes d'inventaire`);
}

async function seedWarehouse(): Promise<void> {
  const code = process.env.SEED_WAREHOUSE_CODE?.trim() || '19R01';
  const label = process.env.SEED_WAREHOUSE_LABEL?.trim() || 'MAGASIN PDR BOUFARIK';

  const warehouse = await prisma.warehouse.upsert({
    where: { code },
    update: { label },
    create: { code, label },
  });

  // Emplacement virtuel obligatoire : toute ligne sans emplacement y est rattachée.
  await prisma.location.upsert({
    where: {
      warehouseId_code: { warehouseId: warehouse.id, code: UNLOCATED_LOCATION_CODE },
    },
    update: { label: UNLOCATED_LOCATION_LABEL, isVirtual: true },
    create: {
      warehouseId: warehouse.id,
      code: UNLOCATED_LOCATION_CODE,
      normalizedCode: UNLOCATED_LOCATION_CODE,
      label: UNLOCATED_LOCATION_LABEL,
      isVirtual: true,
    },
  });

  console.log(`  ✓ magasin ${code} — ${label} (+ emplacement ${UNLOCATED_LOCATION_CODE})`);
}

async function seedAdmin(): Promise<void> {
  const email = requireEnv('SEED_ADMIN_EMAIL').toLowerCase();
  const username = requireEnv('SEED_ADMIN_USERNAME');
  const fullName = process.env.SEED_ADMIN_FULLNAME?.trim() || 'Administrateur';
  const password = requireEnv('SEED_ADMIN_PASSWORD');

  if (password.length < 12) {
    throw new Error('SEED_ADMIN_PASSWORD doit faire au moins 12 caractères.');
  }
  if (password.startsWith('CHANGEME')) {
    throw new Error('SEED_ADMIN_PASSWORD contient encore la valeur par défaut du .env.example.');
  }

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    // Le mot de passe d'un compte existant n'est jamais réécrit : un seed rejoué
    // ne doit pas réinitialiser silencieusement les identifiants de production.
    await prisma.user.update({
      where: { id: existing.id },
      data: { username, fullName, role: Role.ADMIN, isActive: true },
    });
    console.log(`  ✓ administrateur ${email} (déjà présent, mot de passe inchangé)`);
    return;
  }

  await prisma.user.create({
    data: {
      email,
      username,
      fullName,
      passwordHash: await hashPassword(password),
      role: Role.ADMIN,
      isActive: true,
    },
  });

  console.log(`  ✓ administrateur ${email} créé`);
}

async function main(): Promise<void> {
  console.log('Seed InventAir — démarrage');

  await seedCampaignTypes();
  await seedInventoryMethods();
  await seedWarehouse();
  await seedAdmin();

  console.log('Seed terminé.');
}

main()
  .catch((error: unknown) => {
    console.error('Seed en échec :', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
