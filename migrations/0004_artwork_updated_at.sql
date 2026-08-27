-- Migration 0004: add updated_at to artworks (media cache versioning for audio)
ALTER TABLE artworks ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0;
UPDATE artworks SET updated_at = strftime('%s','now') WHERE updated_at = 0;
