CREATE TABLE IF NOT EXISTS "collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"color" text DEFAULT '#6366f1',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "gallery_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text,
	"image_url" text,
	"video_url" text,
	"thumbnail_url" text,
	"media_type" text DEFAULT 'image',
	"prompt_used" text,
	"prompt_id" uuid,
	"model" text,
	"aspect_ratio" text,
	"rating" integer DEFAULT 0,
	"notes" text,
	"collection_id" uuid,
	"storage_mode" text DEFAULT 'url',
	"duration_seconds" integer,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "gallery_items" ADD CONSTRAINT "gallery_items_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "collections_created_at_idx" ON "collections" USING btree ("created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "gallery_items_collection_id_idx" ON "gallery_items" USING btree ("collection_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "gallery_items_rating_idx" ON "gallery_items" USING btree ("rating");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "gallery_items_media_type_idx" ON "gallery_items" USING btree ("media_type");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "gallery_items_created_at_idx" ON "gallery_items" USING btree ("created_at");
