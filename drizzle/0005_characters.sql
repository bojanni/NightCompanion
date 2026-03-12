CREATE TABLE IF NOT EXISTS "characters" (
  "id" varchar(64) PRIMARY KEY NOT NULL,
  "name" varchar(255) NOT NULL,
  "description" text DEFAULT '' NOT NULL,
  "images_json" text DEFAULT '[]' NOT NULL,
  "details_json" text DEFAULT '[]' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "characters_name_idx" ON "characters" ("name");
CREATE INDEX IF NOT EXISTS "characters_created_at_idx" ON "characters" ("created_at");
