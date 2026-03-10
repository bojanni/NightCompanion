CREATE TABLE IF NOT EXISTS "nightcafe_presets" (
  "id" serial PRIMARY KEY NOT NULL,
  "preset_key" varchar(300) NOT NULL,
  "preset_name" varchar(255) NOT NULL,
  "category" varchar(120) DEFAULT '' NOT NULL,
  "grid_row" integer,
  "grid_column" integer,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "nightcafe_presets_preset_key_unique" UNIQUE("preset_key")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "nightcafe_presets_name_idx" ON "nightcafe_presets" USING btree ("preset_name");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "nightcafe_presets_category_idx" ON "nightcafe_presets" USING btree ("category");