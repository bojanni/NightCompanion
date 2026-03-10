ALTER TABLE "prompts" ADD COLUMN IF NOT EXISTS "is_template" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "prompts" ADD COLUMN IF NOT EXISTS "is_favorite" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "prompts" ADD COLUMN IF NOT EXISTS "rating" integer;