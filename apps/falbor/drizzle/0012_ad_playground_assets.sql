CREATE TABLE IF NOT EXISTS "ad_playground_assets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "playground_id" uuid NOT NULL REFERENCES "ad_playgrounds"("id") ON DELETE CASCADE,
  "workspace_id" varchar(255) NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "kind" varchar(32) NOT NULL,
  "source" varchar(32) NOT NULL,
  "asset_url" text NOT NULL,
  "selected" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
