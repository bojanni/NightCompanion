/*
  # Simplify Database Schema for Single-User Local App
  
  This migration converts the database from a multi-user Supabase setup to a 
  single-user local desktop application by:
  
  1. Removing user_id columns and foreign keys from all tables
  2. Removing auth schema references
  3. Dropping auth-related indexes
  4. Dropping auth-related functions and triggers
  5. Cleaning up any auth.users dependencies
  
  Tables affected:
  - prompts
  - tags
  - characters
  - gallery_items
  - collections
  - model_usage
  - user_api_keys
  - style_profiles
  - style_keywords
  - user_local_endpoints
  - batch_tests
  - prompt_versions
  - user_profiles
  - credit_transactions
*/

-- First, drop all triggers that reference auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS create_initial_version_trigger ON prompts;
DROP TRIGGER IF EXISTS create_version_on_update_trigger ON prompts;

-- Drop functions that use auth.uid()
DROP FUNCTION IF EXISTS create_user_profile();
DROP FUNCTION IF EXISTS track_style_keywords(jsonb);
DROP FUNCTION IF EXISTS rebuild_style_keywords(jsonb);

-- Drop foreign key constraints to auth.users before dropping columns
-- This needs to be done first to avoid constraint violations

ALTER TABLE prompts DROP CONSTRAINT IF EXISTS prompts_user_id_fkey;
ALTER TABLE tags DROP CONSTRAINT IF EXISTS tags_user_id_fkey;
ALTER TABLE characters DROP CONSTRAINT IF EXISTS characters_user_id_fkey;
ALTER TABLE gallery_items DROP CONSTRAINT IF EXISTS gallery_items_user_id_fkey;
ALTER TABLE collections DROP CONSTRAINT IF EXISTS collections_user_id_fkey;
ALTER TABLE model_usage DROP CONSTRAINT IF EXISTS model_usage_user_id_fkey;
ALTER TABLE user_api_keys DROP CONSTRAINT IF EXISTS user_api_keys_user_id_fkey;
ALTER TABLE style_profiles DROP CONSTRAINT IF EXISTS style_profiles_user_id_fkey;
ALTER TABLE style_keywords DROP CONSTRAINT IF EXISTS style_keywords_user_id_fkey;
ALTER TABLE user_local_endpoints DROP CONSTRAINT IF EXISTS user_local_endpoints_user_id_fkey;
ALTER TABLE batch_tests DROP CONSTRAINT IF EXISTS batch_tests_user_id_fkey;
ALTER TABLE prompt_versions DROP CONSTRAINT IF EXISTS prompt_versions_user_id_fkey;
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_user_id_fkey;
ALTER TABLE credit_transactions DROP CONSTRAINT IF EXISTS credit_transactions_user_id_fkey;

-- Drop indexes related to user_id
DROP INDEX IF EXISTS idx_prompts_user_id;
DROP INDEX IF EXISTS idx_tags_user_id;
DROP INDEX IF EXISTS idx_characters_user_id;
DROP INDEX IF EXISTS idx_gallery_items_user_id;
DROP INDEX IF EXISTS idx_collections_user_id;
DROP INDEX IF EXISTS idx_model_usage_user_id;
DROP INDEX IF EXISTS idx_user_api_keys_user_id;
DROP INDEX IF EXISTS idx_user_api_keys_active;
DROP INDEX IF EXISTS idx_style_profiles_user_created;
DROP INDEX IF EXISTS idx_style_keywords_user_count;
DROP INDEX IF EXISTS idx_user_local_endpoints_user_id;
DROP INDEX IF EXISTS idx_user_local_endpoints_active;
DROP INDEX IF EXISTS idx_batch_tests_user_id;
DROP INDEX IF EXISTS idx_batch_tests_status;
DROP INDEX IF EXISTS idx_user_profiles_user_id;
DROP INDEX IF EXISTS idx_credit_transactions_user_id;

-- Drop unique constraints that include user_id
ALTER TABLE user_api_keys DROP CONSTRAINT IF EXISTS user_api_keys_user_id_provider_key;
ALTER TABLE style_keywords DROP CONSTRAINT IF EXISTS style_keywords_user_id_keyword_category_key;
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_user_id_key;

-- Now drop user_id columns from all tables
ALTER TABLE prompts DROP COLUMN IF EXISTS user_id;
ALTER TABLE tags DROP COLUMN IF EXISTS user_id;
ALTER TABLE characters DROP COLUMN IF EXISTS user_id;
ALTER TABLE gallery_items DROP COLUMN IF EXISTS user_id;
ALTER TABLE collections DROP COLUMN IF EXISTS user_id;
ALTER TABLE model_usage DROP COLUMN IF EXISTS user_id;
ALTER TABLE user_api_keys DROP COLUMN IF EXISTS user_id;
ALTER TABLE style_profiles DROP COLUMN IF EXISTS user_id;
ALTER TABLE style_keywords DROP COLUMN IF EXISTS user_id;
ALTER TABLE user_local_endpoints DROP COLUMN IF EXISTS user_id;
ALTER TABLE batch_tests DROP COLUMN IF EXISTS user_id;
ALTER TABLE prompt_versions DROP COLUMN IF EXISTS user_id;
ALTER TABLE user_profiles DROP COLUMN IF EXISTS user_id;
ALTER TABLE credit_transactions DROP COLUMN IF EXISTS user_id;

-- Recreate unique constraints without user_id where needed
-- For user_api_keys: now provider should be unique (only one API key per provider)
ALTER TABLE user_api_keys ADD CONSTRAINT user_api_keys_provider_unique UNIQUE (provider);

-- For style_keywords: now keyword+category should be unique
ALTER TABLE style_keywords ADD CONSTRAINT style_keywords_keyword_category_unique UNIQUE (keyword, category);

-- Recreate useful indexes without user_id
CREATE INDEX IF NOT EXISTS idx_user_api_keys_active ON user_api_keys(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_style_profiles_created ON style_profiles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_style_keywords_count ON style_keywords(count DESC);
CREATE INDEX IF NOT EXISTS idx_user_local_endpoints_active ON user_local_endpoints(is_active);
CREATE INDEX IF NOT EXISTS idx_batch_tests_status ON batch_tests(status);

-- Recreate functions without auth.uid() dependencies
CREATE OR REPLACE FUNCTION track_style_keywords(p_keywords jsonb)
RETURNS void AS $$
DECLARE
  kw jsonb;
BEGIN
  FOR kw IN SELECT * FROM jsonb_array_elements(p_keywords)
  LOOP
    INSERT INTO style_keywords (keyword, category, count, last_seen_at)
    VALUES (kw->>'keyword', kw->>'category', 1, now())
    ON CONFLICT (keyword, category)
    DO UPDATE SET count = style_keywords.count + 1, last_seen_at = now();
  END LOOP;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION rebuild_style_keywords(p_keywords jsonb)
RETURNS void AS $$
BEGIN
  DELETE FROM style_keywords;

  INSERT INTO style_keywords (keyword, category, count, last_seen_at)
  SELECT
    (kw->>'keyword')::text,
    (kw->>'category')::text,
    (kw->>'count')::integer,
    now()
  FROM jsonb_array_elements(p_keywords) AS kw;
END;
$$ LANGUAGE plpgsql;

-- Recreate triggers for prompt versioning without user_id
CREATE OR REPLACE FUNCTION create_initial_version()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Create version 1 when a new prompt is created
  INSERT INTO prompt_versions (
    prompt_id,
    content,
    version_number,
    change_description
  ) VALUES (
    NEW.id,
    NEW.content,
    1,
    'Initial version'
  );
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION create_version_on_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  next_version integer;
BEGIN
  -- Only create version if content changed
  IF OLD.content IS DISTINCT FROM NEW.content THEN
    next_version := get_next_version_number(NEW.id);
    
    INSERT INTO prompt_versions (
      prompt_id,
      content,
      version_number,
      change_description
    ) VALUES (
      NEW.id,
      NEW.content,
      next_version,
      'Updated prompt'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate triggers
CREATE TRIGGER create_initial_version_trigger
  AFTER INSERT ON prompts
  FOR EACH ROW
  EXECUTE FUNCTION create_initial_version();

CREATE TRIGGER create_version_on_update_trigger
  AFTER UPDATE ON prompts
  FOR EACH ROW
  EXECUTE FUNCTION create_version_on_update();

-- Note: The auth schema and roles are managed by Supabase and should not be 
-- dropped in a local PostgreSQL setup unless you're certain they exist.
-- If you need to drop them, uncomment these lines:

-- DROP SCHEMA IF EXISTS auth CASCADE;
-- DROP ROLE IF EXISTS anon;
-- DROP ROLE IF EXISTS authenticated;
-- DROP ROLE IF EXISTS service_role;
