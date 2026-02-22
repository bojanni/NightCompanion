-- ============================================================
-- Migration: Extension Integration
-- Version:   20260222
-- Adds columns needed for browser extension imports
-- Safe to run multiple times (uses IF NOT EXISTS / IF EXISTS)
-- ============================================================

BEGIN;

-- ============================================================
-- 1. GALLERY ITEMS — voeg ontbrekende kolommen toe
-- ============================================================

ALTER TABLE gallery_items
    ADD COLUMN IF NOT EXISTS model          TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS aspect_ratio   TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS start_image    TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS metadata       JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS media_type     TEXT DEFAULT 'image',
    ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Zet media_type constraint (alleen na kolom toevoegen)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'gallery_items_media_type_check'
    ) THEN
        ALTER TABLE gallery_items
            ADD CONSTRAINT gallery_items_media_type_check
            CHECK (media_type IN ('image', 'video', 'unknown'));
    END IF;
END$$;

-- ============================================================
-- 2. PROMPTS — voeg ontbrekende kolommen toe
-- ============================================================

ALTER TABLE prompts
    ADD COLUMN IF NOT EXISTS model          TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS aspect_ratio   TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS gallery_item_id UUID REFERENCES gallery_items(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS seed           INTEGER,
    ADD COLUMN IF NOT EXISTS revised_prompt TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS use_count      INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_used_at   TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS suggested_model TEXT DEFAULT '';

-- ============================================================
-- 3. TRIGGERS — updated_at voor gallery_items
-- ============================================================

DROP TRIGGER IF EXISTS set_updated_at_gallery_items ON gallery_items;
CREATE TRIGGER set_updated_at_gallery_items
    BEFORE UPDATE ON gallery_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 4. INDEXES — snelle extensie duplicate-check & sortering
-- ============================================================

-- Duplicate check door extensie (metadata->>'nightcafe_creation_id')
CREATE INDEX IF NOT EXISTS idx_gallery_items_nightcafe_id
    ON gallery_items ((metadata->>'nightcafe_creation_id'));

-- Sortering op datum in Import Hub
CREATE INDEX IF NOT EXISTS idx_gallery_items_created_at
    ON gallery_items (created_at DESC);

-- Filter op source (NightCafe vs handmatig)
CREATE INDEX IF NOT EXISTS idx_gallery_items_source
    ON gallery_items ((metadata->>'source'));

-- Sortering prompts op model
CREATE INDEX IF NOT EXISTS idx_prompts_model
    ON prompts (model);

-- gallery_item_id lookup vanuit prompts
CREATE INDEX IF NOT EXISTS idx_prompts_gallery_item_id
    ON prompts (gallery_item_id);

-- ============================================================
-- 5. VERIFICATIE — toon resultaat
-- ============================================================

DO $$
DECLARE
    gallery_cols  TEXT;
    prompt_cols   TEXT;
BEGIN
    SELECT string_agg(column_name, ', ' ORDER BY ordinal_position)
    INTO gallery_cols
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'gallery_items';

    SELECT string_agg(column_name, ', ' ORDER BY ordinal_position)
    INTO prompt_cols
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'prompts';

    RAISE NOTICE '===========================================';
    RAISE NOTICE 'MIGRATIE 20260222 VOLTOOID';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'gallery_items kolommen: %', gallery_cols;
    RAISE NOTICE '-------------------------------------------';
    RAISE NOTICE 'prompts kolommen: %', prompt_cols;
    RAISE NOTICE '===========================================';
END$$;

COMMIT;

-- ============================================================
-- GEBRUIK:
--   psql -U postgres -d nightcafe_companion -f 20260222_extension_integration.sql
--
-- Of via Node.js:
--   node -e "
--     require('dotenv').config({path:'server/.env'});
--     const {pool} = require('./server/db');
--     const fs = require('fs');
--     pool.query(fs.readFileSync('20260222_extension_integration.sql','utf8'))
--       .then(()=>{ console.log('Migratie voltooid'); process.exit(0); })
--       .catch(e=>{ console.error(e.message); process.exit(1); });
--   "
-- =================