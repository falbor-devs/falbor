-- Custom SQL migration file, put you code below! --
CREATE TABLE IF NOT EXISTS "agent_tasks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" varchar(255) NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "created_by_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "assigned_agent_id" uuid REFERENCES "agents"("id") ON DELETE SET NULL,
  "parent_task_id" uuid,
  "title" text NOT NULL,
  "input" jsonb DEFAULT '{}' NOT NULL,
  "status" text DEFAULT 'queued' NOT NULL,
  "priority" integer DEFAULT 0 NOT NULL,
  "max_attempts" integer DEFAULT 3 NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "max_steps" integer DEFAULT 20 NOT NULL,
  "max_cost_usd" real DEFAULT 1 NOT NULL,
  "run_after" timestamp DEFAULT now() NOT NULL,
  "lease_expires_at" timestamp,
  "started_at" timestamp,
  "completed_at" timestamp,
  "result" jsonb,
  "error" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_tasks_workspace_status_idx" ON "agent_tasks" USING btree ("workspace_id", "status", "run_after");
CREATE INDEX IF NOT EXISTS "agent_tasks_parent_idx" ON "agent_tasks" USING btree ("parent_task_id");
CREATE INDEX IF NOT EXISTS "agent_tasks_assigned_agent_idx" ON "agent_tasks" USING btree ("assigned_agent_id", "status");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agent_task_runs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "task_id" uuid NOT NULL REFERENCES "agent_tasks"("id") ON DELETE CASCADE,
  "agent_id" uuid NOT NULL REFERENCES "agents"("id") ON DELETE CASCADE,
  "attempt" integer NOT NULL,
  "status" text DEFAULT 'running' NOT NULL,
  "step_count" integer DEFAULT 0 NOT NULL,
  "prompt_tokens" integer DEFAULT 0 NOT NULL,
  "completion_tokens" integer DEFAULT 0 NOT NULL,
  "estimated_cost_usd" real DEFAULT 0 NOT NULL,
  "started_at" timestamp DEFAULT now() NOT NULL,
  "completed_at" timestamp,
  "error" text
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_task_runs_task_idx" ON "agent_task_runs" USING btree ("task_id", "started_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agent_task_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" varchar(255) NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "task_id" uuid NOT NULL REFERENCES "agent_tasks"("id") ON DELETE CASCADE,
  "run_id" uuid REFERENCES "agent_task_runs"("id") ON DELETE CASCADE,
  "agent_id" uuid REFERENCES "agents"("id") ON DELETE SET NULL,
  "type" text NOT NULL,
  "payload" jsonb DEFAULT '{}' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_task_events_task_created_idx" ON "agent_task_events" USING btree ("task_id", "created_at");
CREATE INDEX IF NOT EXISTS "agent_task_events_workspace_created_idx" ON "agent_task_events" USING btree ("workspace_id", "created_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agent_task_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" varchar(255) NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "task_id" uuid NOT NULL REFERENCES "agent_tasks"("id") ON DELETE CASCADE,
  "from_agent_id" uuid REFERENCES "agents"("id") ON DELETE SET NULL,
  "to_agent_id" uuid REFERENCES "agents"("id") ON DELETE SET NULL,
  "kind" text NOT NULL,
  "payload" jsonb DEFAULT '{}' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_task_messages_task_created_idx" ON "agent_task_messages" USING btree ("task_id", "created_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agent_approvals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" varchar(255) NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "task_id" uuid NOT NULL REFERENCES "agent_tasks"("id") ON DELETE CASCADE,
  "run_id" uuid REFERENCES "agent_task_runs"("id") ON DELETE SET NULL,
  "agent_id" uuid NOT NULL REFERENCES "agents"("id") ON DELETE CASCADE,
  "action_type" text NOT NULL,
  "payload" jsonb DEFAULT '{}' NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "decided_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "decided_at" timestamp,
  "expires_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_approvals_workspace_status_idx" ON "agent_approvals" USING btree ("workspace_id", "status", "created_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agent_business_outcomes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" varchar(255) NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "task_id" uuid REFERENCES "agent_tasks"("id") ON DELETE SET NULL,
  "agent_id" uuid REFERENCES "agents"("id") ON DELETE SET NULL,
  "type" text NOT NULL,
  "status" text DEFAULT 'observed' NOT NULL,
  "value" jsonb DEFAULT '{}' NOT NULL,
  "evidence" jsonb DEFAULT '[]' NOT NULL,
  "verified_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_business_outcomes_workspace_type_idx" ON "agent_business_outcomes" USING btree ("workspace_id", "type", "created_at");
