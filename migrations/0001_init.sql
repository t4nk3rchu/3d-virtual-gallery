-- Migration 0001: Initial schema for 3D Virtual Gallery
-- No tour_waypoints (guided tour cut — phase 2)
-- No password_hash on exhibitions (access control is draft/published only — phase 2)
-- All IDs are crypto.randomUUID() TEXT primary keys

-- ─── Users ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  full_name     TEXT NOT NULL,
  auth_provider TEXT NOT NULL CHECK (auth_provider IN ('google', 'password')),
  google_sub    TEXT UNIQUE,       -- null for password accounts
  password_hash TEXT,              -- PBKDF2 (WebCrypto); null for google accounts
  role          TEXT NOT NULL DEFAULT 'curator'
                     CHECK (role IN ('admin', 'curator')),
  created_at    INTEGER NOT NULL
);

-- ─── Rooms ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rooms (
  id              TEXT PRIMARY KEY,
  owner_user_id   TEXT REFERENCES users(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  thumbnail_url   TEXT,
  glb_file_id     TEXT NOT NULL,
  glb_source      TEXT NOT NULL CHECK (glb_source IN ('curator_drive', 'platform_drive')),
  spawn_json      TEXT,            -- JSON: { position:[x,y,z], target:[x,y,z] }
  is_public       INTEGER NOT NULL DEFAULT 0 CHECK (is_public IN (0, 1)),
  created_at      INTEGER NOT NULL
);

-- ─── Exhibitions ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exhibitions (
  id               TEXT PRIMARY KEY,
  user_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  room_id          TEXT NOT NULL REFERENCES rooms(id),
  title            TEXT NOT NULL,
  slug             TEXT UNIQUE NOT NULL,
  description      TEXT,
  curator_name     TEXT,
  start_date       TEXT,
  end_date         TEXT,
  is_published     INTEGER NOT NULL DEFAULT 0 CHECK (is_published IN (0, 1)),
  cover_image_url  TEXT,
  settings_json    TEXT,           -- JSON: { backgroundAudioFileId?, ambientLightIntensity?, defaultEyeHeight? }
  created_at       INTEGER NOT NULL
  -- No password_hash: phase 2 access control
);

-- ─── Artworks ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS artworks (
  id                   TEXT PRIMARY KEY,
  exhibition_id        TEXT NOT NULL REFERENCES exhibitions(id) ON DELETE CASCADE,
  title                TEXT NOT NULL,
  artist               TEXT NOT NULL,
  year                 TEXT,
  medium               TEXT,
  dimensions           TEXT,
  description          TEXT,
  artwork_type         TEXT NOT NULL
                            CHECK (artwork_type IN ('IMAGE_2D', 'VIDEO', 'AUDIO')),
  media_file_id        TEXT,       -- Drive file ID (IMAGE_2D / AUDIO)
  youtube_video_id     TEXT,       -- VIDEO only
  audio_guide_file_id  TEXT,       -- optional narration for any type
  transform_json       TEXT NOT NULL,  -- { position:[x,y,z], rotation:[x,y,z], scale:[x,y,z] }
  frame_config_json    TEXT NOT NULL,  -- FrameConfig JSON
  order_index          INTEGER NOT NULL
  -- SCULPTURE_3D: phase 2
);

-- ─── Hotspots ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS artwork_hotspots (
  id                      TEXT PRIMARY KEY,
  artwork_id              TEXT NOT NULL REFERENCES artworks(id) ON DELETE CASCADE,
  x_percent               REAL NOT NULL CHECK (x_percent >= 0 AND x_percent <= 100),
  y_percent               REAL NOT NULL CHECK (y_percent >= 0 AND y_percent <= 100),
  title                   TEXT NOT NULL,
  description             TEXT NOT NULL,
  audio_timestamp_seconds REAL
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_exhibitions_slug    ON exhibitions(slug);
CREATE INDEX IF NOT EXISTS idx_exhibitions_user    ON exhibitions(user_id);
CREATE INDEX IF NOT EXISTS idx_artworks_exhibition ON artworks(exhibition_id);
CREATE INDEX IF NOT EXISTS idx_hotspots_artwork    ON artwork_hotspots(artwork_id);
CREATE INDEX IF NOT EXISTS idx_rooms_owner         ON rooms(owner_user_id);
