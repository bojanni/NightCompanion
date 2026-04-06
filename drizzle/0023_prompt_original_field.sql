ALTER TABLE prompts ADD COLUMN IF NOT EXISTS original_prompt TEXT;
ALTER TABLE prompt_versions ADD COLUMN IF NOT EXISTS original_prompt TEXT;
