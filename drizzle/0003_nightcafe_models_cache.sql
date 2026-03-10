CREATE TABLE IF NOT EXISTS "nightcafe_models" (
  "id" serial PRIMARY KEY NOT NULL,
  "model_key" varchar(300) NOT NULL,
  "model_name" varchar(255) NOT NULL,
  "description" text DEFAULT '' NOT NULL,
  "model_type" varchar(20) NOT NULL,
  "media_type" varchar(20) NOT NULL,
  "art_score" varchar(16) DEFAULT '' NOT NULL,
  "prompting_score" varchar(16) DEFAULT '' NOT NULL,
  "realism_score" varchar(16) DEFAULT '' NOT NULL,
  "typography_score" varchar(16) DEFAULT '' NOT NULL,
  "cost_tier" varchar(16) DEFAULT '' NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "nightcafe_models_model_key_unique" UNIQUE("model_key")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "nightcafe_models_model_type_idx" ON "nightcafe_models" USING btree ("model_type");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "nightcafe_models_media_type_idx" ON "nightcafe_models" USING btree ("media_type");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "nightcafe_models_model_name_idx" ON "nightcafe_models" USING btree ("model_name");