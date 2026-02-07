/*
  # Model Usage Tracking

  1. New Tables
    - `model_usage` - Tracks user's personal experience with each AI model
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `model_id` (text) - identifier matching app's hardcoded model reference
      - `prompt_used` (text) - the prompt that was used
      - `category` (text) - subject category (landscape, character, abstract, etc.)
      - `rating` (integer, 0-5) - quality rating of the result
      - `is_keeper` (boolean) - whether the result was a "keeper"
      - `notes` (text) - any notes about the generation
      - `created_at` (timestamptz)

  2. Security
    - RLS enabled, users can only access their own usage data
*/

CREATE TABLE IF NOT EXISTS model_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  model_id text NOT NULL DEFAULT '',
  prompt_used text DEFAULT '',
  category text DEFAULT 'general',
  rating integer DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  is_keeper boolean DEFAULT false,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE model_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own model usage"
  ON model_usage FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own model usage"
  ON model_usage FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own model usage"
  ON model_usage FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own model usage"
  ON model_usage FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_model_usage_user_id ON model_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_model_usage_model_id ON model_usage(model_id);
CREATE INDEX IF NOT EXISTS idx_model_usage_category ON model_usage(category);
CREATE INDEX IF NOT EXISTS idx_model_usage_is_keeper ON model_usage(is_keeper);
