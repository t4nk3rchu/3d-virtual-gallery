-- Migration 0008: 3D model artwork support (proxy file + 3D hotspot anchor)
-- artwork_type has a CHECK constraint that SQLite cannot ALTER in place, so the
-- artworks table is rebuilt with 'MODEL_3D' added to the allowed values and the
-- new model_proxy_file_id column included from the start.
CREATE TABLE artworks_new (
  id                   TEXT PRIMARY KEY,
  exhibition_id        TEXT NOT NULL REFERENCES exhibitions(id) ON DELETE CASCADE,
  title                TEXT NOT NULL,
  artist               TEXT NOT NULL,
  year                 TEXT,
  medium               TEXT,
  dimensions           TEXT,
  description          TEXT,
  artwork_type         TEXT NOT NULL
                            CHECK (artwork_type IN ('IMAGE_2D', 'VIDEO', 'AUDIO', 'MODEL_3D')),
  media_file_id        TEXT,       -- Drive file ID (IMAGE_2D / AUDIO / full-res MODEL_3D)
  youtube_video_id     TEXT,       -- VIDEO only
  audio_guide_file_id  TEXT,       -- optional narration for any type
  transform_json       TEXT NOT NULL,  -- { position:[x,y,z], rotation:[x,y,z], scale:[x,y,z] }
  frame_config_json    TEXT NOT NULL,  -- FrameConfig JSON
  order_index          INTEGER NOT NULL,
  updated_at           INTEGER NOT NULL DEFAULT 0,
  artist_id            TEXT REFERENCES artists(id) ON DELETE SET NULL,
  model_proxy_file_id  TEXT        -- decimated low-poly .glb for roam (MODEL_3D)
);

INSERT INTO artworks_new
  (id, exhibition_id, title, artist, year, medium, dimensions, description,
   artwork_type, media_file_id, youtube_video_id, audio_guide_file_id,
   transform_json, frame_config_json, order_index, updated_at, artist_id, model_proxy_file_id)
SELECT
  id, exhibition_id, title, artist, year, medium, dimensions, description,
  artwork_type, media_file_id, youtube_video_id, audio_guide_file_id,
  transform_json, frame_config_json, order_index, updated_at, artist_id, NULL
FROM artworks;

DROP TABLE artworks;
ALTER TABLE artworks_new RENAME TO artworks;
CREATE INDEX IF NOT EXISTS idx_artworks_exhibition ON artworks(exhibition_id);

ALTER TABLE artwork_hotspots ADD COLUMN anchor_3d_json TEXT;
