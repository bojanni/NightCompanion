/*
  # Create Prompt Version Control System

  ## New Tables
  
  1. **prompt_versions**
    - `id` (uuid, primary key) - Unique version identifier
    - `prompt_id` (uuid, foreign key) - Reference to original prompt
    - `user_id` (uuid, foreign key) - User who created this version
    - `content` (text) - The prompt content at this version
    - `version_number` (integer) - Sequential version number
    - `change_description` (text, nullable) - Optional description of changes
    - `created_at` (timestamptz) - When this version was created
    
  ## Security
  
  - Enable RLS on `prompt_versions` table
  - Users can only view versions of their own prompts
  - Users can only create versions for their own prompts
  - Versions cannot be updated (immutable history)
  - Users can delete versions of their own prompts
  
  ## Indexes
  
  - Index on `prompt_id` for fast version lookups
  - Index on `prompt_id, version_number` for efficient version queries
  - Index on `created_at` for timeline sorting
  
  ## Triggers
  
  - Automatically create version when prompt is updated
*/

-- Create prompt_versions table
CREATE TABLE IF NOT EXISTS prompt_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id uuid NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  version_number integer NOT NULL,
  change_description text,
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(prompt_id, version_number)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_prompt_versions_prompt_id 
  ON prompt_versions(prompt_id);

CREATE INDEX IF NOT EXISTS idx_prompt_versions_prompt_version 
  ON prompt_versions(prompt_id, version_number DESC);

CREATE INDEX IF NOT EXISTS idx_prompt_versions_created_at 
  ON prompt_versions(created_at DESC);

-- Enable RLS
ALTER TABLE prompt_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view versions of own prompts"
  ON prompt_versions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM prompts 
      WHERE prompts.id = prompt_versions.prompt_id 
      AND prompts.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can create versions for own prompts"
  ON prompt_versions FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (select auth.uid()) AND
    EXISTS (
      SELECT 1 FROM prompts 
      WHERE prompts.id = prompt_versions.prompt_id 
      AND prompts.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can delete versions of own prompts"
  ON prompt_versions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM prompts 
      WHERE prompts.id = prompt_versions.prompt_id 
      AND prompts.user_id = (select auth.uid())
    )
  );

-- Function to get next version number
CREATE OR REPLACE FUNCTION get_next_version_number(p_prompt_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  next_version integer;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO next_version
  FROM prompt_versions
  WHERE prompt_id = p_prompt_id;
  
  RETURN next_version;
END;
$$;

-- Function to create initial version for existing prompts
CREATE OR REPLACE FUNCTION create_initial_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Create version 1 when a new prompt is created
  INSERT INTO prompt_versions (
    prompt_id,
    user_id,
    content,
    version_number,
    change_description
  ) VALUES (
    NEW.id,
    NEW.user_id,
    NEW.content,
    1,
    'Initial version'
  );
  
  RETURN NEW;
END;
$$;

-- Function to create version on update
CREATE OR REPLACE FUNCTION create_version_on_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  next_version integer;
BEGIN
  -- Only create version if content changed
  IF OLD.content IS DISTINCT FROM NEW.content THEN
    next_version := get_next_version_number(NEW.id);
    
    INSERT INTO prompt_versions (
      prompt_id,
      user_id,
      content,
      version_number,
      change_description
    ) VALUES (
      NEW.id,
      NEW.user_id,
      NEW.content,
      next_version,
      'Updated prompt'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS create_initial_version_trigger ON prompts;
CREATE TRIGGER create_initial_version_trigger
  AFTER INSERT ON prompts
  FOR EACH ROW
  EXECUTE FUNCTION create_initial_version();

DROP TRIGGER IF EXISTS create_version_on_update_trigger ON prompts;
CREATE TRIGGER create_version_on_update_trigger
  AFTER UPDATE ON prompts
  FOR EACH ROW
  EXECUTE FUNCTION create_version_on_update();

-- Backfill versions for existing prompts
DO $$
DECLARE
  prompt_record RECORD;
BEGIN
  FOR prompt_record IN 
    SELECT id, user_id, content 
    FROM prompts 
    WHERE NOT EXISTS (
      SELECT 1 FROM prompt_versions 
      WHERE prompt_versions.prompt_id = prompts.id
    )
  LOOP
    INSERT INTO prompt_versions (
      prompt_id,
      user_id,
      content,
      version_number,
      change_description
    ) VALUES (
      prompt_record.id,
      prompt_record.user_id,
      prompt_record.content,
      1,
      'Initial version (backfilled)'
    );
  END LOOP;
END $$;