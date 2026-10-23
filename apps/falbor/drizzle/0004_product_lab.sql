CREATE TABLE IF NOT EXISTS "product_lab_projects" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" varchar(255) NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "created_by_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "website_url" text,
  "product_description" text,
  "target_audience" text,
  "features" jsonb DEFAULT '[]' NOT NULL,
  "pricing" text,
  "competitor_context" text,
  "knowledge_base" jsonb DEFAULT '{}' NOT NULL,
  "status" varchar(32) DEFAULT 'draft' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "product_lab_projects_workspace_idx" ON "product_lab_projects" ("workspace_id", "updated_at");
CREATE TABLE IF NOT EXISTS "product_lab_simulations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" uuid NOT NULL REFERENCES "product_lab_projects"("id") ON DELETE CASCADE,
  "workspace_id" varchar(255) NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "creation_key" varchar(128),
  "status" varchar(32) DEFAULT 'draft' NOT NULL,
  "agent_count" integer NOT NULL,
  "total_rounds" integer DEFAULT 3 NOT NULL,
  "current_round" integer DEFAULT 0 NOT NULL,
  "max_concurrency" integer DEFAULT 4 NOT NULL,
  "max_cost_usd" real DEFAULT 2 NOT NULL,
  "usage" jsonb DEFAULT '{}' NOT NULL,
  "error" text,
  "started_at" timestamp,
  "completed_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "product_lab_simulations_workspace_status_idx" ON "product_lab_simulations" ("workspace_id", "status", "created_at");
CREATE INDEX IF NOT EXISTS "product_lab_simulations_project_idx" ON "product_lab_simulations" ("project_id", "created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "product_lab_simulations_creation_key_idx" ON "product_lab_simulations" ("workspace_id", "creation_key");
CREATE TABLE IF NOT EXISTS "product_lab_agents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "simulation_id" uuid NOT NULL REFERENCES "product_lab_simulations"("id") ON DELETE CASCADE,
  "workspace_id" varchar(255) NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "persona" jsonb NOT NULL,
  "memory" jsonb DEFAULT '{}' NOT NULL,
  "status" varchar(32) DEFAULT 'created' NOT NULL,
  "initial_evaluation" jsonb,
  "final_evaluation" jsonb,
  "vote" varchar(16),
  "vote_reason" text,
  "vote_history" jsonb DEFAULT '[]' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "product_lab_agents_simulation_idx" ON "product_lab_agents" ("simulation_id", "status");
CREATE TABLE IF NOT EXISTS "product_lab_interactions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "simulation_id" uuid NOT NULL REFERENCES "product_lab_simulations"("id") ON DELETE CASCADE,
  "workspace_id" varchar(255) NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "from_agent_id" uuid NOT NULL REFERENCES "product_lab_agents"("id") ON DELETE CASCADE,
  "to_agent_id" uuid NOT NULL REFERENCES "product_lab_agents"("id") ON DELETE CASCADE,
  "round" integer NOT NULL,
  "topic" text NOT NULL,
  "output" text,
  "evidence" jsonb DEFAULT '[]' NOT NULL,
  "status" varchar(32) DEFAULT 'scheduled' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "product_lab_interactions_simulation_round_idx" ON "product_lab_interactions" ("simulation_id", "round", "created_at");
CREATE TABLE IF NOT EXISTS "product_lab_relationships" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "simulation_id" uuid NOT NULL REFERENCES "product_lab_simulations"("id") ON DELETE CASCADE,
  "workspace_id" varchar(255) NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "source_agent_id" uuid NOT NULL REFERENCES "product_lab_agents"("id") ON DELETE CASCADE,
  "target_agent_id" uuid NOT NULL REFERENCES "product_lab_agents"("id") ON DELETE CASCADE,
  "relationship_type" varchar(32) NOT NULL,
  "weight" real DEFAULT 1 NOT NULL,
  "evidence" jsonb DEFAULT '[]' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "product_lab_relationships_pair_idx" UNIQUE ("simulation_id", "source_agent_id", "target_agent_id")
);
CREATE TABLE IF NOT EXISTS "product_lab_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "simulation_id" uuid NOT NULL REFERENCES "product_lab_simulations"("id") ON DELETE CASCADE,
  "workspace_id" varchar(255) NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "agent_id" uuid REFERENCES "product_lab_agents"("id") ON DELETE SET NULL,
  "round" integer,
  "event_type" varchar(64) NOT NULL,
  "payload" jsonb DEFAULT '{}' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "product_lab_events_simulation_created_idx" ON "product_lab_events" ("simulation_id", "created_at");
CREATE TABLE IF NOT EXISTS "product_lab_reports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "simulation_id" uuid NOT NULL REFERENCES "product_lab_simulations"("id") ON DELETE CASCADE,
  "workspace_id" varchar(255) NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "status" varchar(32) DEFAULT 'pending' NOT NULL,
  "report" jsonb,
  "model" varchar(160),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "product_lab_reports_simulation_idx" UNIQUE ("simulation_id")
);
CREATE TABLE IF NOT EXISTS "product_lab_usage" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "simulation_id" uuid NOT NULL REFERENCES "product_lab_simulations"("id") ON DELETE CASCADE,
  "workspace_id" varchar(255) NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "model" varchar(160) NOT NULL,
  "operation" varchar(64) NOT NULL,
  "request_count" integer DEFAULT 1 NOT NULL,
  "input_tokens" integer DEFAULT 0 NOT NULL,
  "output_tokens" integer DEFAULT 0 NOT NULL,
  "estimated_cost_usd" real DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "product_lab_chats" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "simulation_id" uuid NOT NULL REFERENCES "product_lab_simulations"("id") ON DELETE CASCADE,
  "workspace_id" varchar(255) NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "product_lab_chats_simulation_user_idx" UNIQUE ("simulation_id", "user_id")
);
CREATE TABLE IF NOT EXISTS "product_lab_chat_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "chat_id" uuid NOT NULL REFERENCES "product_lab_chats"("id") ON DELETE CASCADE,
  "simulation_id" uuid NOT NULL REFERENCES "product_lab_simulations"("id") ON DELETE CASCADE,
  "workspace_id" varchar(255) NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "agent_id" uuid REFERENCES "product_lab_agents"("id") ON DELETE SET NULL,
  "role" varchar(16) NOT NULL,
  "content" text NOT NULL,
  "mentions" jsonb DEFAULT '[]' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "product_lab_chat_messages_chat_created_idx" ON "product_lab_chat_messages" ("chat_id", "created_at");
