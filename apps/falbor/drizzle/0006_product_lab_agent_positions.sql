ALTER TABLE "product_lab_agents"
ADD COLUMN IF NOT EXISTS "canvas_position" jsonb NOT NULL DEFAULT '{}'::jsonb;
