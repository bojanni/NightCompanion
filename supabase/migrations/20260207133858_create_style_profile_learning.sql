/*
  # Create style profile learning system

  1. New Tables
    - `style_profiles` - Stores AI-generated style analysis snapshots
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `profile` (text) - Description of user's artistic style
      - `signature` (text) - Short phrase capturing unique style
      - `themes` (jsonb) - Array of recurring themes
      - `techniques` (jsonb) - Array of preferred techniques
      - `suggestions` (jsonb) - Array of suggested new directions
      - `prompt_count` (integer) - How many prompts were analyzed
      - `created_at` (timestamptz)
    - `style_keywords` - Tracks keyword frequency from prompts
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `keyword` (text) - The extracted keyword/phrase
      - `category` (text) - Classification: subject, style, mood, lighting, technique, setting, color
      - `count` (integer) - How many times keyword appears
      - `last_seen_at` (timestamptz)
      - Unique constraint on (user_id, keyword, category)

  2. Security
    - RLS enabled on both tables
    - Authenticated users can only manage their own data

  3. Functions
    - `track_style_keywords(jsonb)` - Atomic upsert for keyword tracking from a single prompt
    - `rebuild_style_keywords(jsonb)` - Full keyword rebuild from aggregated data across all prompts

  4. Notes
    - style_profiles stores periodic AI analysis snapshots for evolution tracking
    - style_keywords stores aggregated keyword frequencies extracted from prompts
    - Functions use auth.uid() to enforce ownership
*/

CREATE TABLE IF NOT EXISTS style_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  profile text NOT NULL DEFAULT '',
  signature text NOT NULL DEFAULT '',
  themes jsonb NOT NULL DEFAULT '[]',
  techniques jsonb NOT NULL DEFAULT '[]',
  suggestions jsonb NOT NULL DEFAULT '[]',
  prompt_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE style_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own style profiles"
  ON style_profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own style profiles"
  ON style_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own style profiles"
  ON style_profiles FOR DELETE TO authenticated
  USING (auth.uid() = user_id);


CREATE TABLE IF NOT EXISTS style_keywords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  keyword text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  count integer NOT NULL DEFAULT 1,
  last_seen_at timestamptz DEFAULT now(),
  UNIQUE(user_id, keyword, category)
);

ALTER TABLE style_keywords ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own style keywords"
  ON style_keywords FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own style keywords"
  ON style_keywords FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own style keywords"
  ON style_keywords FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own style keywords"
  ON style_keywords FOR DELETE TO authenticated
  USING (auth.uid() = user_id);


CREATE OR REPLACE FUNCTION track_style_keywords(p_keywords jsonb)
RETURNS void AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION rebuild_style_keywords(p_keywords jsonb)
RETURNS void AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE INDEX IF NOT EXISTS idx_style_profiles_user_created
  ON style_profiles(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_style_keywords_user_count
  ON style_keywords(user_id, count DESC);
