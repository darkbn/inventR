-- Méthode 3 (comptages successifs puis enquête) et lignes ajoutées sur le terrain.
--
-- Les valeurs d'enum PostgreSQL ne peuvent être ajoutées qu'une par une, et
-- `ALTER TYPE ... ADD VALUE` ne s'exécute pas dans un bloc transactionnel sur
-- les versions antérieures à PG 12 ; `IF NOT EXISTS` rend la migration rejouable.
ALTER TYPE "inventory"."ItemStatus" ADD VALUE IF NOT EXISTS 'AWAITING_THIRD_COUNT' AFTER 'AWAITING_SECOND_COUNT';
ALTER TYPE "inventory"."ItemStatus" ADD VALUE IF NOT EXISTS 'UNDER_INVESTIGATION' AFTER 'AWAITING_THIRD_COUNT';

-- Lignes absentes de l'extraction SAP, créées par un opérateur ayant trouvé
-- l'article en rayon. Quantité théorique nulle : tout ce qui est compté est un
-- surplus, et le gestionnaire sait quoi créer dans l'ERP.
ALTER TABLE "inventory"."inventory_items"
  ADD COLUMN IF NOT EXISTS "is_manual" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "added_by" UUID,
  ADD COLUMN IF NOT EXISTS "added_at" TIMESTAMPTZ(3);

ALTER TABLE "inventory"."inventory_items"
  DROP CONSTRAINT IF EXISTS "inventory_items_added_by_fkey";

ALTER TABLE "inventory"."inventory_items"
  ADD CONSTRAINT "inventory_items_added_by_fkey"
  FOREIGN KEY ("added_by") REFERENCES "inventory"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "inventory_items_list_id_is_manual_idx"
  ON "inventory"."inventory_items"("list_id", "is_manual");
