/*
  # Add user API keys table for AI provider credentials

  1. New Tables
    - `user_api_keys`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `provider` (text) - provider identifier (openai, gemini, anthropic, openrouter)
      - `encrypted_key` (text) - AES-GCM encrypted API key stored as base64
      - `key_hint` (text) - masked version for display (e.g., "sk-...abc1")
      - `is_active` (boolean) - whether this is the currently active provider
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    - Unique constraint on (user_id, provider) prevents duplicate entries

  2. Security
    - RLS enabled on `user_api_keys` table
    - Users can only view their own key records
    - Insert, update, and delete restricted to own records
    - Note: encrypted_key column is encrypted at the application layer;
      decryption only happens server-side in edge functions

  3. Important Notes
    - Keys are encrypted using AES-256-GCM with a server-side passphrase
    - The frontend never receives decrypted keys
    - Only masked hints are shown in the UI
*/

CREATE TABLE IF NOT EXISTS user_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  provider text NOT NULL CHECK (provider IN ('openai', 'gemini', 'anthropic', 'openrouter')),
  encrypted_key text NOT NULL,
  key_hint text NOT NULL DEFAULT '',
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, provider)
);

ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own API keys"
  ON user_api_keys FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own API keys"
  ON user_api_keys FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own API keys"
  ON user_api_keys FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own API keys"
  ON user_api_keys FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id ON user_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_active ON user_api_keys(user_id, is_active) WHERE is_active = true;
