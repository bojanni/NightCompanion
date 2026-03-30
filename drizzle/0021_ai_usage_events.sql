CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS "ai_usage_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "endpoint" varchar(255) NOT NULL,
  "provider_id" varchar(64) NOT NULL,
  "model_id" varchar(255) NOT NULL,
  "prompt_tokens" integer NOT NULL DEFAULT 0,
  "completion_tokens" integer NOT NULL DEFAULT 0,
  "total_tokens" integer NOT NULL DEFAULT 0,
  "cost_usd" real NOT NULL DEFAULT 0,
  "prompt_text" text,
  "response_text" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "ai_usage_events_created_at_idx" ON "ai_usage_events" ("created_at");
CREATE INDEX IF NOT EXISTS "ai_usage_events_provider_id_idx" ON "ai_usage_events" ("provider_id");
CREATE INDEX IF NOT EXISTS "ai_usage_events_model_id_idx" ON "ai_usage_events" ("model_id");
