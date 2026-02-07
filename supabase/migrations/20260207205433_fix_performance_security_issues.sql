/*
  # Fix Performance and Security Issues

  ## Performance Improvements
  
  1. **Foreign Key Indexes**
    - Add index on `character_details.character_id`
    - Add index on `gallery_items.character_id`
    - Add index on `gallery_items.prompt_id`
    - Add index on `prompt_tags.tag_id`
  
  2. **RLS Policy Optimization**
    - Update all RLS policies to use `(select auth.uid())` pattern
    - This prevents re-evaluation of auth functions for each row
    - Significantly improves query performance at scale
  
  3. **Function Search Path**
    - Fix search_path for `track_style_keywords` function
    - Fix search_path for `rebuild_style_keywords` function

  ## Security Notes
  - All RLS policies remain functionally identical
  - Only the performance optimization is applied
  - No changes to access control logic
*/

-- ============================================================================
-- PART 1: Add Missing Foreign Key Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_character_details_character_id 
  ON character_details(character_id);

CREATE INDEX IF NOT EXISTS idx_gallery_items_character_id 
  ON gallery_items(character_id);

CREATE INDEX IF NOT EXISTS idx_gallery_items_prompt_id 
  ON gallery_items(prompt_id);

CREATE INDEX IF NOT EXISTS idx_prompt_tags_tag_id 
  ON prompt_tags(tag_id);

-- ============================================================================
-- PART 2: Optimize RLS Policies (prompts table)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own prompts" ON prompts;
DROP POLICY IF EXISTS "Users can insert own prompts" ON prompts;
DROP POLICY IF EXISTS "Users can update own prompts" ON prompts;
DROP POLICY IF EXISTS "Users can delete own prompts" ON prompts;

CREATE POLICY "Users can view own prompts"
  ON prompts FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own prompts"
  ON prompts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own prompts"
  ON prompts FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own prompts"
  ON prompts FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ============================================================================
-- PART 3: Optimize RLS Policies (tags table)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own tags" ON tags;
DROP POLICY IF EXISTS "Users can insert own tags" ON tags;
DROP POLICY IF EXISTS "Users can update own tags" ON tags;
DROP POLICY IF EXISTS "Users can delete own tags" ON tags;

CREATE POLICY "Users can view own tags"
  ON tags FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own tags"
  ON tags FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own tags"
  ON tags FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own tags"
  ON tags FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ============================================================================
-- PART 4: Optimize RLS Policies (prompt_tags table)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own prompt tags" ON prompt_tags;
DROP POLICY IF EXISTS "Users can insert own prompt tags" ON prompt_tags;
DROP POLICY IF EXISTS "Users can delete own prompt tags" ON prompt_tags;

CREATE POLICY "Users can view own prompt tags"
  ON prompt_tags FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM prompts 
      WHERE prompts.id = prompt_tags.prompt_id 
      AND prompts.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can insert own prompt tags"
  ON prompt_tags FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM prompts 
      WHERE prompts.id = prompt_tags.prompt_id 
      AND prompts.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can delete own prompt tags"
  ON prompt_tags FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM prompts 
      WHERE prompts.id = prompt_tags.prompt_id 
      AND prompts.user_id = (select auth.uid())
    )
  );

-- ============================================================================
-- PART 5: Optimize RLS Policies (characters table)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own characters" ON characters;
DROP POLICY IF EXISTS "Users can insert own characters" ON characters;
DROP POLICY IF EXISTS "Users can update own characters" ON characters;
DROP POLICY IF EXISTS "Users can delete own characters" ON characters;

CREATE POLICY "Users can view own characters"
  ON characters FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own characters"
  ON characters FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own characters"
  ON characters FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own characters"
  ON characters FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ============================================================================
-- PART 6: Optimize RLS Policies (character_details table)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own character details" ON character_details;
DROP POLICY IF EXISTS "Users can insert own character details" ON character_details;
DROP POLICY IF EXISTS "Users can update own character details" ON character_details;
DROP POLICY IF EXISTS "Users can delete own character details" ON character_details;

CREATE POLICY "Users can view own character details"
  ON character_details FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM characters 
      WHERE characters.id = character_details.character_id 
      AND characters.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can insert own character details"
  ON character_details FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM characters 
      WHERE characters.id = character_details.character_id 
      AND characters.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update own character details"
  ON character_details FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM characters 
      WHERE characters.id = character_details.character_id 
      AND characters.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM characters 
      WHERE characters.id = character_details.character_id 
      AND characters.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can delete own character details"
  ON character_details FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM characters 
      WHERE characters.id = character_details.character_id 
      AND characters.user_id = (select auth.uid())
    )
  );

-- ============================================================================
-- PART 7: Optimize RLS Policies (gallery_items table)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own gallery items" ON gallery_items;
DROP POLICY IF EXISTS "Users can insert own gallery items" ON gallery_items;
DROP POLICY IF EXISTS "Users can update own gallery items" ON gallery_items;
DROP POLICY IF EXISTS "Users can delete own gallery items" ON gallery_items;

CREATE POLICY "Users can view own gallery items"
  ON gallery_items FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own gallery items"
  ON gallery_items FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own gallery items"
  ON gallery_items FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own gallery items"
  ON gallery_items FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ============================================================================
-- PART 8: Optimize RLS Policies (collections table)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own collections" ON collections;
DROP POLICY IF EXISTS "Users can insert own collections" ON collections;
DROP POLICY IF EXISTS "Users can update own collections" ON collections;
DROP POLICY IF EXISTS "Users can delete own collections" ON collections;

CREATE POLICY "Users can view own collections"
  ON collections FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own collections"
  ON collections FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own collections"
  ON collections FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own collections"
  ON collections FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ============================================================================
-- PART 9: Optimize RLS Policies (model_usage table)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own model usage" ON model_usage;
DROP POLICY IF EXISTS "Users can insert own model usage" ON model_usage;
DROP POLICY IF EXISTS "Users can update own model usage" ON model_usage;
DROP POLICY IF EXISTS "Users can delete own model usage" ON model_usage;

CREATE POLICY "Users can view own model usage"
  ON model_usage FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own model usage"
  ON model_usage FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own model usage"
  ON model_usage FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own model usage"
  ON model_usage FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ============================================================================
-- PART 10: Optimize RLS Policies (user_api_keys table)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own API keys" ON user_api_keys;
DROP POLICY IF EXISTS "Users can insert own API keys" ON user_api_keys;
DROP POLICY IF EXISTS "Users can update own API keys" ON user_api_keys;
DROP POLICY IF EXISTS "Users can delete own API keys" ON user_api_keys;

CREATE POLICY "Users can view own API keys"
  ON user_api_keys FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own API keys"
  ON user_api_keys FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own API keys"
  ON user_api_keys FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own API keys"
  ON user_api_keys FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ============================================================================
-- PART 11: Optimize RLS Policies (style_profiles table)
-- ============================================================================

DROP POLICY IF EXISTS "Users can read own style profiles" ON style_profiles;
DROP POLICY IF EXISTS "Users can insert own style profiles" ON style_profiles;
DROP POLICY IF EXISTS "Users can delete own style profiles" ON style_profiles;

CREATE POLICY "Users can read own style profiles"
  ON style_profiles FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own style profiles"
  ON style_profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own style profiles"
  ON style_profiles FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ============================================================================
-- PART 12: Optimize RLS Policies (style_keywords table)
-- ============================================================================

DROP POLICY IF EXISTS "Users can read own style keywords" ON style_keywords;
DROP POLICY IF EXISTS "Users can insert own style keywords" ON style_keywords;
DROP POLICY IF EXISTS "Users can update own style keywords" ON style_keywords;
DROP POLICY IF EXISTS "Users can delete own style keywords" ON style_keywords;

CREATE POLICY "Users can read own style keywords"
  ON style_keywords FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own style keywords"
  ON style_keywords FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own style keywords"
  ON style_keywords FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own style keywords"
  ON style_keywords FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ============================================================================
-- PART 13: Optimize RLS Policies (user_local_endpoints table)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own local endpoints" ON user_local_endpoints;
DROP POLICY IF EXISTS "Users can insert own local endpoints" ON user_local_endpoints;
DROP POLICY IF EXISTS "Users can update own local endpoints" ON user_local_endpoints;
DROP POLICY IF EXISTS "Users can delete own local endpoints" ON user_local_endpoints;

CREATE POLICY "Users can view own local endpoints"
  ON user_local_endpoints FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own local endpoints"
  ON user_local_endpoints FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own local endpoints"
  ON user_local_endpoints FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own local endpoints"
  ON user_local_endpoints FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ============================================================================
-- PART 14: Optimize RLS Policies (batch_tests table)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own batch tests" ON batch_tests;
DROP POLICY IF EXISTS "Users can insert own batch tests" ON batch_tests;
DROP POLICY IF EXISTS "Users can update own batch tests" ON batch_tests;
DROP POLICY IF EXISTS "Users can delete own batch tests" ON batch_tests;

CREATE POLICY "Users can view own batch tests"
  ON batch_tests FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own batch tests"
  ON batch_tests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own batch tests"
  ON batch_tests FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own batch tests"
  ON batch_tests FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ============================================================================
-- PART 15: Optimize RLS Policies (batch_test_prompts table)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view prompts in own batch tests" ON batch_test_prompts;
DROP POLICY IF EXISTS "Users can insert prompts in own batch tests" ON batch_test_prompts;
DROP POLICY IF EXISTS "Users can update prompts in own batch tests" ON batch_test_prompts;
DROP POLICY IF EXISTS "Users can delete prompts in own batch tests" ON batch_test_prompts;

CREATE POLICY "Users can view prompts in own batch tests"
  ON batch_test_prompts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM batch_tests 
      WHERE batch_tests.id = batch_test_prompts.batch_test_id 
      AND batch_tests.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can insert prompts in own batch tests"
  ON batch_test_prompts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM batch_tests 
      WHERE batch_tests.id = batch_test_prompts.batch_test_id 
      AND batch_tests.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update prompts in own batch tests"
  ON batch_test_prompts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM batch_tests 
      WHERE batch_tests.id = batch_test_prompts.batch_test_id 
      AND batch_tests.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM batch_tests 
      WHERE batch_tests.id = batch_test_prompts.batch_test_id 
      AND batch_tests.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can delete prompts in own batch tests"
  ON batch_test_prompts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM batch_tests 
      WHERE batch_tests.id = batch_test_prompts.batch_test_id 
      AND batch_tests.user_id = (select auth.uid())
    )
  );

-- ============================================================================
-- PART 16: Optimize RLS Policies (batch_test_results table)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view results in own batch tests" ON batch_test_results;
DROP POLICY IF EXISTS "Users can insert results in own batch tests" ON batch_test_results;
DROP POLICY IF EXISTS "Users can update results in own batch tests" ON batch_test_results;
DROP POLICY IF EXISTS "Users can delete results in own batch tests" ON batch_test_results;

CREATE POLICY "Users can view results in own batch tests"
  ON batch_test_results FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM batch_test_prompts
      JOIN batch_tests ON batch_tests.id = batch_test_prompts.batch_test_id
      WHERE batch_test_prompts.id = batch_test_results.batch_test_prompt_id 
      AND batch_tests.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can insert results in own batch tests"
  ON batch_test_results FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM batch_test_prompts
      JOIN batch_tests ON batch_tests.id = batch_test_prompts.batch_test_id
      WHERE batch_test_prompts.id = batch_test_results.batch_test_prompt_id 
      AND batch_tests.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update results in own batch tests"
  ON batch_test_results FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM batch_test_prompts
      JOIN batch_tests ON batch_tests.id = batch_test_prompts.batch_test_id
      WHERE batch_test_prompts.id = batch_test_results.batch_test_prompt_id 
      AND batch_tests.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM batch_test_prompts
      JOIN batch_tests ON batch_tests.id = batch_test_prompts.batch_test_id
      WHERE batch_test_prompts.id = batch_test_results.batch_test_prompt_id 
      AND batch_tests.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can delete results in own batch tests"
  ON batch_test_results FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM batch_test_prompts
      JOIN batch_tests ON batch_tests.id = batch_test_prompts.batch_test_id
      WHERE batch_test_prompts.id = batch_test_results.batch_test_prompt_id 
      AND batch_tests.user_id = (select auth.uid())
    )
  );

-- ============================================================================
-- PART 17: Fix Function Search Paths
-- ============================================================================

CREATE OR REPLACE FUNCTION track_style_keywords(p_keywords jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  kw jsonb;
BEGIN
  FOR kw IN SELECT * FROM jsonb_array_elements(p_keywords)
  LOOP
    INSERT INTO style_keywords (user_id, keyword, category, count, last_seen_at)
    VALUES (auth.uid(), kw->>'keyword', kw->>'category', 1, now())
    ON CONFLICT (user_id, keyword, category)
    DO UPDATE SET count = style_keywords.count + 1, last_seen_at = now();
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION rebuild_style_keywords(p_keywords jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM style_keywords WHERE user_id = auth.uid();

  INSERT INTO style_keywords (user_id, keyword, category, count, last_seen_at)
  SELECT
    auth.uid(),
    (kw->>'keyword')::text,
    (kw->>'category')::text,
    (kw->>'count')::integer,
    now()
  FROM jsonb_array_elements(p_keywords) AS kw;
END;
$$;