ALTER TABLE "openrouter_models"
  ADD COLUMN IF NOT EXISTS "prompt_price" varchar(32),
  ADD COLUMN IF NOT EXISTS "completion_price" varchar(32),
  ADD COLUMN IF NOT EXISTS "request_price" varchar(32),
  ADD COLUMN IF NOT EXISTS "image_price" varchar(32);