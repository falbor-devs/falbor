CREATE TABLE IF NOT EXISTS "ad_playgrounds" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" varchar(255) NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" text DEFAULT 'Untitled Playground' NOT NULL,
  "model" text DEFAULT 'gpt-image-1' NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "ad_playground_images" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "playground_id" uuid NOT NULL REFERENCES "ad_playgrounds"("id") ON DELETE CASCADE,
  "workspace_id" varchar(255) NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "prompt" text NOT NULL,
  "reference_image" text,
  "image_url" text NOT NULL,
  "aspect_ratio" varchar(16) DEFAULT '1:1' NOT NULL,
  "resolution" varchar(8) DEFAULT '1K' NOT NULL,
  "is_favorite" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
