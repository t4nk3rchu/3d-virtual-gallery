/**
 * Task 2: D1 database helpers
 *
 * All access via parameterized prepared statements (spec §3, Global Constraints).
 * Uses the real D1 binding — no better-sqlite3 shim (bug #4 fix from v1).
 * IDs via crypto.randomUUID() — not Date.now()+Math.random().
 */
import type {
  User, UserInput,
  Room, RoomInput,
  Exhibition, ExhibitionInput, ExhibitionDetail,
  Artwork, ArtworkInput,
  ArtworkHotspot, ArtworkHotspotInput,
} from '../src/types/schema';

// ─── Exhibitions ──────────────────────────────────────────────────────────────

export async function getExhibitionBySlug(
  db: D1Database,
  slug: string,
  callerId?: string
): Promise<ExhibitionDetail | null> {
  const row = await db
    .prepare(
      `SELECT e.*, r.id as r_id, r.owner_user_id as r_owner, r.name as r_name,
              r.description as r_desc, r.thumbnail_url as r_thumb,
              r.glb_file_id, r.glb_source, r.spawn_json, r.is_public, r.created_at as r_created
       FROM exhibitions e
       JOIN rooms r ON r.id = e.room_id
       WHERE e.slug = ?
         AND (e.is_published = 1 OR e.user_id = ?)`
    )
    .bind(slug, callerId ?? '')
    .first<Record<string, unknown>>();

  if (!row) return null;

  const exhibition: Exhibition = {
    id: row.id as string,
    user_id: row.user_id as string,
    room_id: row.room_id as string,
    title: row.title as string,
    slug: row.slug as string,
    description: row.description as string | null,
    curator_name: row.curator_name as string | null,
    start_date: row.start_date as string | null,
    end_date: row.end_date as string | null,
    is_published: row.is_published as 0 | 1,
    cover_image_url: row.cover_image_url as string | null,
    settings_json: row.settings_json as string | null,
    created_at: row.created_at as number,
  };

  const room: Room = {
    id: row.r_id as string,
    owner_user_id: row.r_owner as string | null,
    name: row.r_name as string,
    description: row.r_desc as string | null,
    thumbnail_url: row.r_thumb as string | null,
    glb_file_id: row.glb_file_id as string,
    glb_source: row.glb_source as 'curator_drive' | 'platform_drive',
    spawn_json: row.spawn_json as string | null,
    is_public: row.is_public as 0 | 1,
    created_at: row.r_created as number,
  };

  const artworkRows = await db
    .prepare('SELECT * FROM artworks WHERE exhibition_id = ? ORDER BY order_index ASC')
    .bind(exhibition.id)
    .all<Artwork>();

  const artworks: Array<Artwork & { hotspots: ArtworkHotspot[] }> = await Promise.all(
    (artworkRows.results ?? []).map(async (a) => {
      const hotspotRows = await db
        .prepare('SELECT * FROM artwork_hotspots WHERE artwork_id = ?')
        .bind(a.id)
        .all<ArtworkHotspot>();
      return { ...a, hotspots: hotspotRows.results ?? [] };
    })
  );

  return { ...exhibition, room, artworks };
}

export async function getExhibitionById(
  db: D1Database,
  id: string,
  callerId?: string
): Promise<ExhibitionDetail | null> {
  const row = await db
    .prepare(
      `SELECT e.*, r.id as r_id, r.owner_user_id as r_owner, r.name as r_name,
              r.description as r_desc, r.thumbnail_url as r_thumb,
              r.glb_file_id, r.glb_source, r.spawn_json, r.is_public, r.created_at as r_created
       FROM exhibitions e
       JOIN rooms r ON r.id = e.room_id
       WHERE e.id = ?
         AND (e.is_published = 1 OR e.user_id = ?)`
    )
    .bind(id, callerId ?? '')
    .first<Record<string, unknown>>();

  if (!row) return null;

  const exhibition: Exhibition = {
    id: row.id as string,
    user_id: row.user_id as string,
    room_id: row.room_id as string,
    title: row.title as string,
    slug: row.slug as string,
    description: row.description as string | null,
    curator_name: row.curator_name as string | null,
    start_date: row.start_date as string | null,
    end_date: row.end_date as string | null,
    is_published: row.is_published as 0 | 1,
    cover_image_url: row.cover_image_url as string | null,
    settings_json: row.settings_json as string | null,
    created_at: row.created_at as number,
  };

  const room: Room = {
    id: row.r_id as string,
    owner_user_id: row.r_owner as string | null,
    name: row.r_name as string,
    description: row.r_desc as string | null,
    thumbnail_url: row.r_thumb as string | null,
    glb_file_id: row.glb_file_id as string,
    glb_source: row.glb_source as 'curator_drive' | 'platform_drive',
    spawn_json: row.spawn_json as string | null,
    is_public: row.is_public as 0 | 1,
    created_at: row.r_created as number,
  };

  const artworkRows = await db
    .prepare('SELECT * FROM artworks WHERE exhibition_id = ? ORDER BY order_index ASC')
    .bind(exhibition.id)
    .all<Artwork>();

  const artworks: Array<Artwork & { hotspots: ArtworkHotspot[] }> = await Promise.all(
    (artworkRows.results ?? []).map(async (a) => {
      const hotspotRows = await db
        .prepare('SELECT * FROM artwork_hotspots WHERE artwork_id = ?')
        .bind(a.id)
        .all<ArtworkHotspot>();
      return { ...a, hotspots: hotspotRows.results ?? [] };
    })
  );

  return { ...exhibition, room, artworks };
}

export async function createExhibition(
  db: D1Database,
  input: ExhibitionInput
): Promise<Exhibition> {
  const id = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);

  await db
    .prepare(
      `INSERT INTO exhibitions
         (id, user_id, room_id, title, slug, description, curator_name,
          start_date, end_date, is_published, cover_image_url, settings_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id, input.user_id, input.room_id, input.title, input.slug,
      input.description ?? null, input.curator_name ?? null,
      input.start_date ?? null, input.end_date ?? null,
      input.is_published, input.cover_image_url ?? null,
      input.settings_json ?? null, now
    )
    .run();

  return { id, ...input, created_at: now };
}

export async function getExhibitionsByUser(
  db: D1Database,
  userId: string
): Promise<Exhibition[]> {
  const result = await db
    .prepare('SELECT * FROM exhibitions WHERE user_id = ? ORDER BY created_at DESC')
    .bind(userId)
    .all<Exhibition>();
  return result.results ?? [];
}

export async function updateExhibition(
  db: D1Database,
  id: string,
  userId: string,
  patch: Partial<ExhibitionInput>
): Promise<boolean> {
  const fields = Object.keys(patch)
    .filter((k) => k !== 'user_id')
    .map((k) => `${k} = ?`)
    .join(', ');
  if (!fields) return false;

  const values = Object.entries(patch)
    .filter(([k]) => k !== 'user_id')
    .map(([, v]) => v);

  const result = await db
    .prepare(`UPDATE exhibitions SET ${fields} WHERE id = ? AND user_id = ?`)
    .bind(...values, id, userId)
    .run();

  return (result.meta?.changes ?? 0) > 0;
}

export async function deleteExhibition(
  db: D1Database,
  id: string,
  userId: string
): Promise<boolean> {
  const result = await db
    .prepare('DELETE FROM exhibitions WHERE id = ? AND user_id = ?')
    .bind(id, userId)
    .run();
  return (result.meta?.changes ?? 0) > 0;
}

// ─── Rooms ────────────────────────────────────────────────────────────────────

export async function createRoom(db: D1Database, input: RoomInput): Promise<Room> {
  const id = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);

  await db
    .prepare(
      `INSERT INTO rooms
         (id, owner_user_id, name, description, thumbnail_url, glb_file_id,
          glb_source, spawn_json, is_public, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id, input.owner_user_id ?? null, input.name, input.description ?? null,
      input.thumbnail_url ?? null, input.glb_file_id, input.glb_source,
      input.spawn_json ?? null, input.is_public, now
    )
    .run();

  return { id, ...input, created_at: now };
}

export async function getRoomsForUser(db: D1Database, userId: string): Promise<Room[]> {
  const result = await db
    .prepare(
      'SELECT * FROM rooms WHERE owner_user_id = ? OR is_public = 1 ORDER BY created_at DESC'
    )
    .bind(userId)
    .all<Room>();
  return result.results ?? [];
}

// ─── Artworks ─────────────────────────────────────────────────────────────────

export async function createArtworkRecord(
  db: D1Database,
  input: ArtworkInput
): Promise<Artwork> {
  const id = crypto.randomUUID();

  await db
    .prepare(
      `INSERT INTO artworks
         (id, exhibition_id, title, artist, year, medium, dimensions, description,
          artwork_type, media_file_id, youtube_video_id, audio_guide_file_id,
          transform_json, frame_config_json, order_index)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id, input.exhibition_id, input.title, input.artist,
      input.year ?? null, input.medium ?? null, input.dimensions ?? null,
      input.description ?? null, input.artwork_type,
      input.media_file_id ?? null, input.youtube_video_id ?? null,
      input.audio_guide_file_id ?? null, input.transform_json,
      input.frame_config_json, input.order_index
    )
    .run();

  return { id, ...input };
}

export async function updateArtworkRecord(
  db: D1Database,
  id: string,
  exhibitionId: string,
  patch: Partial<ArtworkInput>
): Promise<boolean> {
  const fields = Object.keys(patch).map((k) => `${k} = ?`).join(', ');
  if (!fields) return false;

  const result = await db
    .prepare(
      `UPDATE artworks SET ${fields} WHERE id = ? AND exhibition_id = ?`
    )
    .bind(...Object.values(patch), id, exhibitionId)
    .run();

  return (result.meta?.changes ?? 0) > 0;
}

export async function deleteArtworkRecord(
  db: D1Database,
  id: string,
  exhibitionId: string
): Promise<boolean> {
  const result = await db
    .prepare('DELETE FROM artworks WHERE id = ? AND exhibition_id = ?')
    .bind(id, exhibitionId)
    .run();
  return (result.meta?.changes ?? 0) > 0;
}

// ─── Hotspots ─────────────────────────────────────────────────────────────────

export async function createHotspot(
  db: D1Database,
  input: ArtworkHotspotInput
): Promise<ArtworkHotspot> {
  const id = crypto.randomUUID();

  await db
    .prepare(
      `INSERT INTO artwork_hotspots
         (id, artwork_id, x_percent, y_percent, title, description, audio_timestamp_seconds, audio_file_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id, input.artwork_id, input.x_percent, input.y_percent,
      input.title, input.description, input.audio_timestamp_seconds ?? null,
      input.audio_file_id ?? null
    )
    .run();

  return { id, ...input, audio_file_id: input.audio_file_id ?? null };
}

export async function deleteHotspot(
  db: D1Database,
  id: string,
  artworkId: string
): Promise<boolean> {
  const result = await db
    .prepare('DELETE FROM artwork_hotspots WHERE id = ? AND artwork_id = ?')
    .bind(id, artworkId)
    .run();
  return (result.meta?.changes ?? 0) > 0;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function getUserByGoogleSub(
  db: D1Database,
  googleSub: string
): Promise<User | null> {
  return db
    .prepare('SELECT * FROM users WHERE google_sub = ?')
    .bind(googleSub)
    .first<User>();
}

export async function getUserByEmail(
  db: D1Database,
  email: string
): Promise<User | null> {
  return db
    .prepare('SELECT * FROM users WHERE email = ?')
    .bind(email)
    .first<User>();
}

export async function getUserById(
  db: D1Database,
  id: string
): Promise<User | null> {
  return db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<User>();
}

export async function createUser(db: D1Database, input: UserInput): Promise<User> {
  const id = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);

  await db
    .prepare(
      `INSERT INTO users
         (id, email, full_name, auth_provider, google_sub, password_hash, role, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id, input.email, input.full_name, input.auth_provider,
      input.google_sub ?? null, input.password_hash ?? null,
      input.role ?? 'curator', now
    )
    .run();

  return { id, ...input, created_at: now };
}

export async function upsertGoogleUser(
  db: D1Database,
  googleSub: string,
  email: string,
  fullName: string
): Promise<User> {
  const existing = await getUserByGoogleSub(db, googleSub);
  if (existing) return existing;

  const byEmail = await getUserByEmail(db, email);
  if (byEmail) {
    // Link Google account to existing password account
    await db
      .prepare('UPDATE users SET google_sub = ?, auth_provider = ? WHERE id = ?')
      .bind(googleSub, 'google', byEmail.id)
      .run();
    return { ...byEmail, google_sub: googleSub, auth_provider: 'google' };
  }

  return createUser(db, {
    email,
    full_name: fullName,
    auth_provider: 'google',
    google_sub: googleSub,
    password_hash: null,
    role: 'curator',
  });
}
