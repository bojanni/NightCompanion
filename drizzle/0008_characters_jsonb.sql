ALTER TABLE "characters"
  ALTER COLUMN "images_json" DROP DEFAULT,
  ALTER COLUMN "details_json" DROP DEFAULT;

ALTER TABLE "characters"
  ALTER COLUMN "images_json" TYPE jsonb
  USING CASE
    WHEN "images_json" IS NULL OR btrim("images_json") = '' THEN '[]'::jsonb
    ELSE "images_json"::jsonb
  END;

ALTER TABLE "characters"
  ALTER COLUMN "details_json" TYPE jsonb
  USING CASE
    WHEN "details_json" IS NULL OR btrim("details_json") = '' THEN '[]'::jsonb
    ELSE "details_json"::jsonb
  END;

ALTER TABLE "characters"
  ALTER COLUMN "images_json" SET DEFAULT '[]'::jsonb,
  ALTER COLUMN "details_json" SET DEFAULT '[]'::jsonb;