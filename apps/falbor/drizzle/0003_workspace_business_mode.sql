ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "business_mode" varchar(32) DEFAULT 'existing' NOT NULL;
ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "business_goal" text;
ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "business_concept" jsonb;
ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "business_concept_status" varchar(32) DEFAULT 'not_started' NOT NULL;
