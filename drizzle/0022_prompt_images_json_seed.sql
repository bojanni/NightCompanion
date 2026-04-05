ALTER TABLE "prompts" ADD COLUMN IF NOT EXISTS "images_json" jsonb DEFAULT '[]'::jsonb NOT NULL;
ALTER TABLE "prompt_versions" ADD COLUMN IF NOT EXISTS "images_json" jsonb DEFAULT '[]'::jsonb NOT NULL;

ALTER TABLE "prompts" ADD COLUMN IF NOT EXISTS "seed" varchar(64) DEFAULT '' NOT NULL;
ALTER TABLE "prompt_versions" ADD COLUMN IF NOT EXISTS "seed" varchar(64) DEFAULT '' NOT NULL;
