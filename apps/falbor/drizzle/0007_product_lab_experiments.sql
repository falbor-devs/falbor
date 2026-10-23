CREATE TABLE IF NOT EXISTS "product_lab_debates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "simulation_id" uuid NOT NULL REFERENCES "product_lab_simulations"("id") ON DELETE CASCADE,
  "workspace_id" varchar(255) NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "topic" text NOT NULL,
  "agent_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "status" varchar(32) DEFAULT 'completed' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "product_lab_debates_simulation_idx" ON "product_lab_debates" ("simulation_id", "created_at");
CREATE TABLE IF NOT EXISTS "product_lab_debate_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "debate_id" uuid NOT NULL REFERENCES "product_lab_debates"("id") ON DELETE CASCADE,
  "simulation_id" uuid NOT NULL REFERENCES "product_lab_simulations"("id") ON DELETE CASCADE,
  "workspace_id" varchar(255) NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "agent_id" uuid NOT NULL REFERENCES "product_lab_agents"("id") ON DELETE CASCADE,
  "round" integer NOT NULL,
  "content" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "product_lab_debate_messages_debate_idx" ON "product_lab_debate_messages" ("debate_id", "round", "created_at");
CREATE TABLE IF NOT EXISTS "product_lab_reevaluations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "simulation_id" uuid NOT NULL REFERENCES "product_lab_simulations"("id") ON DELETE CASCADE,
  "workspace_id" varchar(255) NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "proposed_change" text NOT NULL,
  "status" varchar(32) DEFAULT 'completed' NOT NULL,
  "results" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "product_lab_reevaluations_simulation_idx" ON "product_lab_reevaluations" ("simulation_id", "created_at");
