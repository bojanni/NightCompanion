/*
  # Add encryption fields to user_api_keys
  
  Adds iv (initialization vector) and auth_tag (authentication tag) columns
  for AES-256-GCM encryption of API keys.
*/

-- Add encryption fields
ALTER TABLE user_api_keys ADD COLUMN IF NOT EXISTS iv text;
ALTER TABLE user_api_keys ADD COLUMN IF NOT EXISTS auth_tag text;

-- Update existing records with placeholder (will need re-encryption)
UPDATE user_api_keys SET iv = '', auth_tag = '' WHERE iv IS NULL;
