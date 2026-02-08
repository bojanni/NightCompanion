/*
  # Create User Profiles with Credit System

  1. New Tables
    - `user_profiles`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users) - user account reference
      - `credit_balance` (integer) - available credits for image generation
      - `total_credits_earned` (integer) - lifetime credits earned
      - `total_credits_spent` (integer) - lifetime credits spent
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `credit_transactions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `amount` (integer) - positive for earned, negative for spent
      - `transaction_type` (text) - 'earned', 'spent', 'purchase', 'bonus'
      - `description` (text) - description of transaction
      - `metadata` (jsonb) - additional data (model, resolution, etc.)
      - `created_at` (timestamptz)

  2. Security
    - RLS enabled on all tables
    - Users can only view and update their own profile
    - Users can only view their own transactions
    - Initial credit balance set to 1000 credits for new users
*/

-- User profiles table with credit balance
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  credit_balance integer NOT NULL DEFAULT 1000,
  total_credits_earned integer NOT NULL DEFAULT 1000,
  total_credits_spent integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Credit transactions table
CREATE TABLE IF NOT EXISTS credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount integer NOT NULL,
  transaction_type text NOT NULL DEFAULT 'spent',
  description text NOT NULL DEFAULT '',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON credit_transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON credit_transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at);

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (user_id, credit_balance, total_credits_earned, total_credits_spent)
  VALUES (NEW.id, 1000, 1000, 0);
  
  INSERT INTO credit_transactions (user_id, amount, transaction_type, description)
  VALUES (NEW.id, 1000, 'bonus', 'Welcome bonus: 1000 free credits');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile();