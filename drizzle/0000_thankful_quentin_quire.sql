CREATE TABLE "generation_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"nightcafe_url" text DEFAULT '' NOT NULL,
	"thumbnail_url" text DEFAULT '' NOT NULL,
	"prompt_id" integer,
	"prompt_snapshot" text DEFAULT '' NOT NULL,
	"rating" integer,
	"notes" text DEFAULT '',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prompts" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" VARCHAR2(255) NOT NULL,
	"prompt_text" text NOT NULL,
	"negative_prompt" text DEFAULT '',
	"tags" text[] DEFAULT '{}' NOT NULL,
	"model" VARCHAR2(100) DEFAULT '' NOT NULL,
	"notes" text DEFAULT '',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "style_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" VARCHAR2(255) NOT NULL,
	"base_prompt_snippet" text DEFAULT '' NOT NULL,
	"preferred_model" VARCHAR2(100) DEFAULT '' NOT NULL,
	"common_negative_prompts" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "style_profiles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "generation_log" ADD CONSTRAINT "generation_log_prompt_id_prompts_id_fk" FOREIGN KEY ("prompt_id") REFERENCES "public"."prompts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "generation_log_rating_idx" ON "generation_log" USING btree ("rating");--> statement-breakpoint
CREATE INDEX "generation_log_created_at_idx" ON "generation_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "generation_log_prompt_id_idx" ON "generation_log" USING btree ("prompt_id");--> statement-breakpoint
CREATE INDEX "prompts_model_idx" ON "prompts" USING btree ("model");--> statement-breakpoint
CREATE INDEX "prompts_created_at_idx" ON "prompts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "prompts_tags_idx" ON "prompts" USING btree ("tags");--> statement-breakpoint
CREATE INDEX "style_profiles_created_at_idx" ON "style_profiles" USING btree ("created_at");