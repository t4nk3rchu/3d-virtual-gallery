-- Migration 0005: Artists Table, Exhibition Intro Video & Curation Type

CREATE TABLE IF NOT EXISTS artists (
  id                TEXT PRIMARY KEY,
  exhibition_id     TEXT NOT NULL REFERENCES exhibitions(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  life_dates        TEXT,
  quote             TEXT,
  biography         TEXT,
  contact_info      TEXT,
  portrait_file_id  TEXT,
  order_index       INTEGER NOT NULL DEFAULT 0,
  created_at        INTEGER NOT NULL DEFAULT (unixepoch())
);

ALTER TABLE exhibitions ADD COLUMN intro_video_file_id TEXT;
ALTER TABLE exhibitions ADD COLUMN curation_type TEXT NOT NULL DEFAULT 'solo';
ALTER TABLE artworks ADD COLUMN artist_id TEXT REFERENCES artists(id) ON DELETE SET NULL;
