ALTER TABLE "prompts" ALTER COLUMN "rating" TYPE real USING "rating"::real;
--> statement-breakpoint
ALTER TABLE "prompt_versions" ALTER COLUMN "rating" TYPE real USING "rating"::real;
