/*
  # Remove Row Level Security
  
  Disables RLS on all tables and drops all RLS policies.
  This is for local single-user mode where RLS is not needed.
*/

-- Drop all policies first
-- prompts table
DROP POLICY IF EXISTS "Users can view own prompts" ON prompts;
DROP POLICY IF EXISTS "Users can insert own prompts" ON prompts;
DROP POLICY IF EXISTS "Users can update own prompts" ON prompts;
DROP POLICY IF EXISTS "Users can delete own prompts" ON prompts;

-- tags table
DROP POLICY IF EXISTS "Users can view own tags" ON tags;
DROP POLICY IF EXISTS "Users can insert own tags" ON tags;
DROP POLICY IF EXISTS "Users can update own tags" ON tags;
DROP POLICY IF EXISTS "Users can delete own tags" ON tags;

-- prompt_tags junction table
DROP POLICY IF EXISTS "Users can view own prompt tags" ON prompt_tags;
DROP POLICY IF EXISTS "Users can insert own prompt tags" ON prompt_tags;
DROP POLICY IF EXISTS "Users can delete own prompt tags" ON prompt_tags;

-- characters table
DROP POLICY IF EXISTS "Users can view own characters" ON characters;
DROP POLICY IF EXISTS "Users can insert own characters" ON characters;
DROP POLICY IF EXISTS "Users can update own characters" ON characters;
DROP POLICY IF EXISTS "Users can delete own characters" ON characters;

-- character_details table
DROP POLICY IF EXISTS "Users can view own character details" ON character_details;
DROP POLICY IF EXISTS "Users can insert own character details" ON character_details;
DROP POLICY IF EXISTS "Users can update own character details" ON character_details;
DROP POLICY IF EXISTS "Users can delete own character details" ON character_details;

-- gallery_items table
DROP POLICY IF EXISTS "Users can view own gallery items" ON gallery_items;
DROP POLICY IF EXISTS "Users can insert own gallery items" ON gallery_items;
DROP POLICY IF EXISTS "Users can update own gallery items" ON gallery_items;
DROP POLICY IF EXISTS "Users can delete own gallery items" ON gallery_items;

-- collections table
DROP POLICY IF EXISTS "Users can view own collections" ON collections;
DROP POLICY IF EXISTS "Users can insert own collections" ON collections;
DROP POLICY IF EXISTS "Users can update own collections" ON collections;
DROP POLICY IF EXISTS "Users can delete own collections" ON collections;

-- model_usage table
DROP POLICY IF EXISTS "Users can view own model usage" ON model_usage;
DROP POLICY IF EXISTS "Users can insert own model usage" ON model_usage;
DROP POLICY IF EXISTS "Users can update own model usage" ON model_usage;
DROP POLICY IF EXISTS "Users can delete own model usage" ON model_usage;

-- user_api_keys table
DROP POLICY IF EXISTS "Users can view own API keys" ON user_api_keys;
DROP POLICY IF EXISTS "Users can insert own API keys" ON user_api_keys;
DROP POLICY IF EXISTS "Users can update own API keys" ON user_api_keys;
DROP POLICY IF EXISTS "Users can delete own API keys" ON user_api_keys;

-- style_profiles table
DROP POLICY IF EXISTS "Users can read own style profiles" ON style_profiles;
DROP POLICY IF EXISTS "Users can insert own style profiles" ON style_profiles;
DROP POLICY IF EXISTS "Users can delete own style profiles" ON style_profiles;

-- style_keywords table
DROP POLICY IF EXISTS "Users can read own style keywords" ON style_keywords;
DROP POLICY IF EXISTS "Users can insert own style keywords" ON style_keywords;
DROP POLICY IF EXISTS "Users can update own style keywords" ON style_keywords;
DROP POLICY IF EXISTS "Users can delete own style keywords" ON style_keywords;

-- user_local_endpoints table
DROP POLICY IF EXISTS "Users can view own endpoints" ON user_local_endpoints;
DROP POLICY IF EXISTS "Users can insert own endpoints" ON user_local_endpoints;
DROP POLICY IF EXISTS "Users can update own endpoints" ON user_local_endpoints;
DROP POLICY IF EXISTS "Users can delete own endpoints" ON user_local_endpoints;

-- batch_tests table
DROP POLICY IF EXISTS "Users can view own batch tests" ON batch_tests;
DROP POLICY IF EXISTS "Users can insert own batch tests" ON batch_tests;
DROP POLICY IF EXISTS "Users can update own batch tests" ON batch_tests;
DROP POLICY IF EXISTS "Users can delete own batch tests" ON batch_tests;

-- batch_test_prompts table
DROP POLICY IF EXISTS "Users can view own batch test prompts" ON batch_test_prompts;
DROP POLICY IF EXISTS "Users can insert own batch test prompts" ON batch_test_prompts;
DROP POLICY IF EXISTS "Users can delete own batch test prompts" ON batch_test_prompts;

-- batch_test_results table
DROP POLICY IF EXISTS "Users can view own batch test results" ON batch_test_results;
DROP POLICY IF EXISTS "Users can insert own batch test results" ON batch_test_results;
DROP POLICY IF EXISTS "Users can update own batch test results" ON batch_test_results;

-- prompt_versions table
DROP POLICY IF EXISTS "Users can view versions of own prompts" ON prompt_versions;
DROP POLICY IF EXISTS "Users can create versions for own prompts" ON prompt_versions;
DROP POLICY IF EXISTS "Users can delete versions of own prompts" ON prompt_versions;

-- user_profiles table
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

-- credit_transactions table
DROP POLICY IF EXISTS "Users can view own transactions" ON credit_transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON credit_transactions;

-- Now disable RLS on all tables
ALTER TABLE prompts DISABLE ROW LEVEL SECURITY;
ALTER TABLE tags DISABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_tags DISABLE ROW LEVEL SECURITY;
ALTER TABLE characters DISABLE ROW LEVEL SECURITY;
ALTER TABLE character_details DISABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE collections DISABLE ROW LEVEL SECURITY;
ALTER TABLE model_usage DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_api_keys DISABLE ROW LEVEL SECURITY;
ALTER TABLE style_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE style_keywords DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_local_endpoints DISABLE ROW LEVEL SECURITY;
ALTER TABLE batch_tests DISABLE ROW LEVEL SECURITY;
ALTER TABLE batch_test_prompts DISABLE ROW LEVEL SECURITY;
ALTER TABLE batch_test_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_versions DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions DISABLE ROW LEVEL SECURITY;
