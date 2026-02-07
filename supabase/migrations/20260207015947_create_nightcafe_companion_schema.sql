/*
  # NightCafe Companion App - Initial Schema

  1. New Tables
    - `prompts` - Stores AI art prompts with metadata
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `title` (text) - short descriptive title
      - `content` (text) - the actual prompt text
      - `notes` (text) - personal notes about the prompt
      - `rating` (integer, 0-5) - user's quality rating
      - `is_template` (boolean) - whether this is a reusable template
      - `is_favorite` (boolean) - quick favorite toggle
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `tags` - Reusable tags for organizing prompts
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `name` (text) - tag display name
      - `color` (text) - hex color for the tag badge
      - `category` (text) - grouping category (landscape, character, mood, style)
      - `created_at` (timestamptz)

    - `prompt_tags` - Junction table linking prompts to tags
      - `prompt_id` (uuid, references prompts)
      - `tag_id` (uuid, references tags)

    - `characters` - Character profiles for consistency tracking
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `name` (text) - character name
      - `description` (text) - general description
      - `reference_image_url` (text) - URL to reference image
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `character_details` - Specific notes about what works for each character
      - `id` (uuid, primary key)
      - `character_id` (uuid, references characters)
      - `category` (text) - e.g., clothing, lighting, pose, style
      - `detail` (text) - the actual note/detail
      - `works_well` (boolean) - whether this detail works well or not
      - `created_at` (timestamptz)

    - `gallery_items` - Gallery of generated images
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `title` (text) - image title
      - `image_url` (text) - URL to the image
      - `prompt_used` (text) - the prompt that generated this
      - `prompt_id` (uuid, nullable, references prompts)
      - `character_id` (uuid, nullable, references characters)
      - `rating` (integer, 0-5) - quality rating
      - `collection` (text) - collection/folder name
      - `notes` (text) - personal notes
      - `created_at` (timestamptz)

    - `collections` - Named collections for organizing gallery items
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `name` (text) - collection name
      - `description` (text) - collection description
      - `color` (text) - display color
      - `created_at` (timestamptz)

  2. Security
    - RLS enabled on all tables
    - Policies restrict all operations to authenticated users accessing only their own data
*/

-- Prompts table
CREATE TABLE IF NOT EXISTS prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  notes text DEFAULT '',
  rating integer DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  is_template boolean DEFAULT false,
  is_favorite boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own prompts"
  ON prompts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own prompts"
  ON prompts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own prompts"
  ON prompts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own prompts"
  ON prompts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  name text NOT NULL DEFAULT '',
  color text DEFAULT '#d97706',
  category text DEFAULT 'general',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tags"
  ON tags FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tags"
  ON tags FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tags"
  ON tags FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tags"
  ON tags FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Prompt-Tags junction table
CREATE TABLE IF NOT EXISTS prompt_tags (
  prompt_id uuid REFERENCES prompts(id) ON DELETE CASCADE NOT NULL,
  tag_id uuid REFERENCES tags(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (prompt_id, tag_id)
);

ALTER TABLE prompt_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own prompt tags"
  ON prompt_tags FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM prompts WHERE prompts.id = prompt_tags.prompt_id AND prompts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own prompt tags"
  ON prompt_tags FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM prompts WHERE prompts.id = prompt_tags.prompt_id AND prompts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own prompt tags"
  ON prompt_tags FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM prompts WHERE prompts.id = prompt_tags.prompt_id AND prompts.user_id = auth.uid()
    )
  );

-- Characters table
CREATE TABLE IF NOT EXISTS characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  name text NOT NULL DEFAULT '',
  description text DEFAULT '',
  reference_image_url text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE characters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own characters"
  ON characters FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own characters"
  ON characters FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own characters"
  ON characters FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own characters"
  ON characters FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Character details table
CREATE TABLE IF NOT EXISTS character_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid REFERENCES characters(id) ON DELETE CASCADE NOT NULL,
  category text DEFAULT 'general',
  detail text NOT NULL DEFAULT '',
  works_well boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE character_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own character details"
  ON character_details FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM characters WHERE characters.id = character_details.character_id AND characters.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own character details"
  ON character_details FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM characters WHERE characters.id = character_details.character_id AND characters.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own character details"
  ON character_details FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM characters WHERE characters.id = character_details.character_id AND characters.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM characters WHERE characters.id = character_details.character_id AND characters.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own character details"
  ON character_details FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM characters WHERE characters.id = character_details.character_id AND characters.user_id = auth.uid()
    )
  );

-- Gallery items table
CREATE TABLE IF NOT EXISTS gallery_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  title text NOT NULL DEFAULT '',
  image_url text DEFAULT '',
  prompt_used text DEFAULT '',
  prompt_id uuid REFERENCES prompts(id) ON DELETE SET NULL,
  character_id uuid REFERENCES characters(id) ON DELETE SET NULL,
  rating integer DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  collection_id uuid,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE gallery_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own gallery items"
  ON gallery_items FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own gallery items"
  ON gallery_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own gallery items"
  ON gallery_items FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own gallery items"
  ON gallery_items FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Collections table
CREATE TABLE IF NOT EXISTS collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  name text NOT NULL DEFAULT '',
  description text DEFAULT '',
  color text DEFAULT '#d97706',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own collections"
  ON collections FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own collections"
  ON collections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own collections"
  ON collections FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own collections"
  ON collections FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add foreign key from gallery_items to collections
ALTER TABLE gallery_items
  ADD CONSTRAINT fk_gallery_collection
  FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE SET NULL;

-- Indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_prompts_user_id ON prompts(user_id);
CREATE INDEX IF NOT EXISTS idx_prompts_is_template ON prompts(is_template);
CREATE INDEX IF NOT EXISTS idx_prompts_is_favorite ON prompts(is_favorite);
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_category ON tags(category);
CREATE INDEX IF NOT EXISTS idx_characters_user_id ON characters(user_id);
CREATE INDEX IF NOT EXISTS idx_gallery_items_user_id ON gallery_items(user_id);
CREATE INDEX IF NOT EXISTS idx_gallery_items_collection_id ON gallery_items(collection_id);
CREATE INDEX IF NOT EXISTS idx_gallery_items_rating ON gallery_items(rating);
CREATE INDEX IF NOT EXISTS idx_collections_user_id ON collections(user_id);
