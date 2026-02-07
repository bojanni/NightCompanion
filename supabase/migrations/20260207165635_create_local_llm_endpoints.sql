/*
  # Create local LLM endpoints configuration table

  1. New Tables
    - `user_local_endpoints`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `provider` (text) - 'ollama' or 'lmstudio'
      - `endpoint_url` (text) - The local endpoint URL
      - `model_name` (text) - The model name to use
      - `is_active` (boolean) - Whether this endpoint is currently active
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on `user_local_endpoints` table
    - Add policy for authenticated users to read their own endpoints
    - Add policy for authenticated users to insert their own endpoints
    - Add policy for authenticated users to update their own endpoints
    - Add policy for authenticated users to delete their own endpoints
*/

CREATE TABLE IF NOT EXISTS user_local_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider text NOT NULL CHECK (provider IN ('ollama', 'lmstudio')),
  endpoint_url text NOT NULL,
  model_name text NOT NULL,
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_local_endpoints_user_id ON user_local_endpoints(user_id);
CREATE INDEX IF NOT EXISTS idx_user_local_endpoints_active ON user_local_endpoints(user_id, is_active);

-- Enable RLS
ALTER TABLE user_local_endpoints ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own local endpoints"
  ON user_local_endpoints FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own local endpoints"
  ON user_local_endpoints FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own local endpoints"
  ON user_local_endpoints FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own local endpoints"
  ON user_local_endpoints FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
