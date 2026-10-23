CREATE TABLE IF NOT EXISTS "search_console_connections" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" varchar(255) NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "site_url" text NOT NULL,
  "property_type" text,
  "status" varchar(32) DEFAULT 'connected' NOT NULL,
  "last_synced_at" timestamp,
  "last_error" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "search_console_connections_workspace_site_idx" ON "search_console_connections" ("workspace_id", "site_url");
CREATE TABLE IF NOT EXISTS "demand_capture_opportunities" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" varchar(255) NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "query" text NOT NULL,
  "intent" varchar(64) DEFAULT 'unknown' NOT NULL,
  "category" varchar(64) DEFAULT 'emerging_demand' NOT NULL,
  "impressions" integer,
  "clicks" integer,
  "ctr" real,
  "average_position" real,
  "opportunity_score" real,
  "landing_page" text,
  "source" varchar(32) NOT NULL,
  "evidence" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "status" varchar(32) DEFAULT 'new' NOT NULL,
  "last_updated_at" timestamp DEFAULT now() NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "demand_capture_opportunities_workspace_idx" ON "demand_capture_opportunities" ("workspace_id", "last_updated_at");
CREATE TABLE IF NOT EXISTS "feature_intelligence_opportunities" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" varchar(255) NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "problem" text NOT NULL,
  "audience" text,
  "evidence" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "impact" varchar(32) DEFAULT 'unknown' NOT NULL,
  "effort" varchar(32) DEFAULT 'unknown' NOT NULL,
  "score" real,
  "status" varchar(32) DEFAULT 'new' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "feature_intelligence_opportunities_workspace_idx" ON "feature_intelligence_opportunities" ("workspace_id", "updated_at");
