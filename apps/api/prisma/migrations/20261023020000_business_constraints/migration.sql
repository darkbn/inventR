-- ------------------------------------------------------------------------------
-- Contraintes métier non exprimables dans le schéma Prisma.
--
-- Elles constituent le dernier rempart : même en cas de bug applicatif ou d'écriture
-- SQL directe, la base refuse les états incohérents (quantités négatives, campagne
-- close sans date de clôture, passage de campagne nul, etc.).
-- ------------------------------------------------------------------------------

-- --- Lignes d'inventaire -------------------------------------------------------
ALTER TABLE "inventory"."inventory_items"
  ADD CONSTRAINT "inventory_items_theoretical_qty_non_negative"
    CHECK ("theoretical_qty" >= 0),
  ADD CONSTRAINT "inventory_items_final_qty_non_negative"
    CHECK ("final_qty" IS NULL OR "final_qty" >= 0),
  ADD CONSTRAINT "inventory_items_arbitrated_qty_non_negative"
    CHECK ("arbitrated_qty" IS NULL OR "arbitrated_qty" >= 0),
  ADD CONSTRAINT "inventory_items_unit_price_non_negative"
    CHECK ("unit_price" >= 0),
  ADD CONSTRAINT "inventory_items_line_no_positive"
    CHECK ("line_no" >= 1);

-- Un arbitrage doit être tracé : valeur, auteur et date vont ensemble.
ALTER TABLE "inventory"."inventory_items"
  ADD CONSTRAINT "inventory_items_arbitration_complete"
    CHECK (
      ("arbitrated_qty" IS NULL AND "arbitrated_by" IS NULL AND "arbitrated_at" IS NULL)
      OR ("arbitrated_qty" IS NOT NULL AND "arbitrated_at" IS NOT NULL)
    );

-- --- Comptages -----------------------------------------------------------------
ALTER TABLE "inventory"."counts"
  ADD CONSTRAINT "counts_quantity_non_negative"
    CHECK ("quantity" >= 0),
  ADD CONSTRAINT "counts_cancellation_complete"
    CHECK (
      ("status" <> 'CANCELLED' AND "cancelled_at" IS NULL)
      OR ("status" = 'CANCELLED' AND "cancelled_at" IS NOT NULL)
    );

-- --- Campagnes -----------------------------------------------------------------
ALTER TABLE "inventory"."campaigns"
  ADD CONSTRAINT "campaigns_round_positive"
    CHECK ("round" >= 1),
  -- Une campagne ne peut pas être son propre passage précédent.
  ADD CONSTRAINT "campaigns_parent_not_self"
    CHECK ("parent_campaign_id" IS NULL OR "parent_campaign_id" <> "id"),
  -- Clôture : le statut CLOSED implique une date de clôture.
  ADD CONSTRAINT "campaigns_closed_requires_date"
    CHECK ("status" <> 'CLOSED' OR "closed_at" IS NOT NULL),
  -- Réouverture : action administrative explicite, motif obligatoire.
  ADD CONSTRAINT "campaigns_reopen_requires_reason"
    CHECK (
      "reopened_at" IS NULL
      OR ("reopen_reason" IS NOT NULL AND btrim("reopen_reason") <> '')
    );

-- --- Référentiels --------------------------------------------------------------
ALTER TABLE "inventory"."articles"
  ADD CONSTRAINT "articles_last_pmp_non_negative" CHECK ("last_pmp" >= 0),
  ADD CONSTRAINT "articles_code_not_blank" CHECK (btrim("code") <> ''),
  ADD CONSTRAINT "articles_designation_not_blank" CHECK (btrim("designation") <> '');

ALTER TABLE "inventory"."locations"
  ADD CONSTRAINT "locations_code_not_blank" CHECK (btrim("code") <> ''),
  -- La décomposition de tri est soit absente, soit positive.
  ADD CONSTRAINT "locations_sort_parts_positive"
    CHECK (
      ("aisle" IS NULL OR "aisle" >= 0)
      AND ("bay" IS NULL OR "bay" >= 0)
      AND ("slot" IS NULL OR "slot" >= 0)
    );

ALTER TABLE "inventory"."warehouses"
  ADD CONSTRAINT "warehouses_code_not_blank" CHECK (btrim("code") <> '');

-- --- Utilisateurs --------------------------------------------------------------
-- L'email est systématiquement normalisé en minuscules par l'application :
-- la contrainte garantit que l'unicité ne peut pas être contournée par la casse.
ALTER TABLE "inventory"."users"
  ADD CONSTRAINT "users_email_lowercase" CHECK ("email" = lower("email")),
  ADD CONSTRAINT "users_email_format" CHECK ("email" ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$');

-- --- Imports -------------------------------------------------------------------
ALTER TABLE "inventory"."import_batches"
  ADD CONSTRAINT "import_batches_counters_non_negative"
    CHECK ("rows_total" >= 0 AND "rows_ok" >= 0 AND "rows_error" >= 0);

-- --- Tokens --------------------------------------------------------------------
ALTER TABLE "inventory"."refresh_tokens"
  ADD CONSTRAINT "refresh_tokens_expiry_after_creation"
    CHECK ("expires_at" > "created_at");
