ALTER TABLE "product_lab_simulations" ADD COLUMN IF NOT EXISTS "creation_key" varchar(128);
ALTER TABLE "product_lab_simulations" ADD COLUMN IF NOT EXISTS "name" text;
CREATE UNIQUE INDEX IF NOT EXISTS "product_lab_simulations_creation_key_idx" ON "product_lab_simulations" ("workspace_id", "creation_key");
