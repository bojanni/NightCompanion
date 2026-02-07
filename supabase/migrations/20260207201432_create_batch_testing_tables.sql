/*
  # Create batch testing and results tables

  1. New Tables
    - `batch_tests`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `name` (text) - Name of the batch test
      - `base_prompt` (text) - The original prompt being varied
      - `status` (text) - 'active', 'completed', 'archived'
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `batch_test_prompts`
      - `id` (uuid, primary key)
      - `batch_test_id` (uuid, foreign key to batch_tests)
      - `prompt_text` (text) - The variation text
      - `variation_type` (text) - e.g., 'original', 'lighting', 'style', 'composition'
      - `sort_order` (integer) - Display order
      - `created_at` (timestamptz)
    
    - `batch_test_results`
      - `id` (uuid, primary key)
      - `batch_test_prompt_id` (uuid, foreign key to batch_test_prompts)
      - `model_used` (text) - NightCafe model used
      - `image_url` (text) - URL to the generated image
      - `rating` (integer) - User rating 1-5
      - `notes` (text) - User notes
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own batch tests
  
  3. Indexes
    - Add indexes for efficient querying
*/

CREATE TABLE IF NOT EXISTS batch_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  base_prompt text NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS batch_test_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_test_id uuid REFERENCES batch_tests(id) ON DELETE CASCADE NOT NULL,
  prompt_text text NOT NULL,
  variation_type text NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS batch_test_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_test_prompt_id uuid REFERENCES batch_test_prompts(id) ON DELETE CASCADE NOT NULL,
  model_used text NOT NULL,
  image_url text,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_batch_tests_user_id ON batch_tests(user_id);
CREATE INDEX IF NOT EXISTS idx_batch_tests_status ON batch_tests(user_id, status);
CREATE INDEX IF NOT EXISTS idx_batch_test_prompts_batch_id ON batch_test_prompts(batch_test_id);
CREATE INDEX IF NOT EXISTS idx_batch_test_results_prompt_id ON batch_test_results(batch_test_prompt_id);

ALTER TABLE batch_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_test_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_test_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own batch tests"
  ON batch_tests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own batch tests"
  ON batch_tests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own batch tests"
  ON batch_tests FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own batch tests"
  ON batch_tests FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view prompts in own batch tests"
  ON batch_test_prompts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM batch_tests
      WHERE batch_tests.id = batch_test_prompts.batch_test_id
      AND batch_tests.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert prompts in own batch tests"
  ON batch_test_prompts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM batch_tests
      WHERE batch_tests.id = batch_test_prompts.batch_test_id
      AND batch_tests.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update prompts in own batch tests"
  ON batch_test_prompts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM batch_tests
      WHERE batch_tests.id = batch_test_prompts.batch_test_id
      AND batch_tests.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM batch_tests
      WHERE batch_tests.id = batch_test_prompts.batch_test_id
      AND batch_tests.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete prompts in own batch tests"
  ON batch_test_prompts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM batch_tests
      WHERE batch_tests.id = batch_test_prompts.batch_test_id
      AND batch_tests.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view results in own batch tests"
  ON batch_test_results FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM batch_test_prompts
      JOIN batch_tests ON batch_tests.id = batch_test_prompts.batch_test_id
      WHERE batch_test_prompts.id = batch_test_results.batch_test_prompt_id
      AND batch_tests.user_id = auth.uid()
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
      AND batch_tests.user_id = auth.uid()
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
      AND batch_tests.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM batch_test_prompts
      JOIN batch_tests ON batch_tests.id = batch_test_prompts.batch_test_id
      WHERE batch_test_prompts.id = batch_test_results.batch_test_prompt_id
      AND batch_tests.user_id = auth.uid()
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
      AND batch_tests.user_id = auth.uid()
    )
  );
