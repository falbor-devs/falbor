-- Custom SQL migration file, put you code below! --
CREATE TABLE IF NOT EXISTS "agent_task_dependencies" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "task_id" uuid NOT NULL REFERENCES "agent_tasks"("id") ON DELETE CASCADE,
  "depends_on_task_id" uuid NOT NULL REFERENCES "agent_tasks"("id") ON DELETE CASCADE,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_task_dependencies_task_idx" ON "agent_task_dependencies" USING btree ("task_id");
CREATE INDEX IF NOT EXISTS "agent_task_dependencies_dependency_idx" ON "agent_task_dependencies" USING btree ("depends_on_task_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agent_proposals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" varchar(255) NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "task_id" uuid REFERENCES "agent_tasks"("id") ON DELETE SET NULL,
  "proposed_by_agent_id" uuid NOT NULL REFERENCES "agents"("id") ON DELETE CASCADE,
  "status" text DEFAULT 'pending' NOT NULL,
  "configuration" jsonb NOT NULL,
  "reason" text NOT NULL,
  "decided_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "decided_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_proposals_workspace_status_idx" ON "agent_proposals" USING btree ("workspace_id", "status", "created_at");
