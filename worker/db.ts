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
  Artist, ArtistInput,
} from '../src/types/schema';

const EXHIBITION_UPDATE_COLS = new Set([
  'room_id', 'title', 'description', 'curator_name',
  'start_date', 'end_date', 'is_published', 'cover_image_url', 'settings_json',
  'intro_video_file_id', 'curation_type',
]); // NOTE: slug and user_id are intentionally NOT updatable
const ARTWORK_UPDATE_COLS = new Set([
  'title', 'artist', 'year', 'medium', 'dimensions', 'description',
  'artwork_type', 'media_file_id', 'youtube_video_id', 'audio_guide_file_id',
  'transform_json', 'frame_config_json', 'order_index', 'artist_id',
]);
const ARTIST_UPDATE_COLS = new Set([
  'name', 'life_dates', 'quote', 'biography', 'contact_info', 'portrait_file_id', 'order_index',
]);

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
    intro_video_file_id: (row.intro_video_file_id as string | null) ?? null,
    curation_type: ((row.curation_type as string | null) ?? 'solo') as 'solo' | 'group',
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

  const artists = await getArtistsForExhibition(db, exhibition.id);
  const artistsMap = new Map<string, Artist>(artists.map((a) => [a.id, a]));

  const artworkRows = await db
    .prepare('SELECT * FROM artworks WHERE exhibition_id = ? ORDER BY order_index ASC')
    .bind(exhibition.id)
    .all<Artwork>();

  const artworkRowsList = artworkRows.results ?? [];
  const ids = artworkRowsList.map((a) => a.id);
  const hotspotsByArtwork = new Map<string, ArtworkHotspot[]>();
  if (ids.length > 0) {
    const placeholders = ids.map(() => '?').join(',');
    const allHotspots = await db
      .prepare(`SELECT * FROM artwork_hotspots WHERE artwork_id IN (${placeholders})`)
      .bind(...ids)
      .all<ArtworkHotspot>();
    for (const h of allHotspots.results ?? []) {
      const list = hotspotsByArtwork.get(h.artwork_id) ?? [];
      list.push(h);
      hotspotsByArtwork.set(h.artwork_id, list);
    }
  }

  const artworks: Array<Artwork & { hotspots: ArtworkHotspot[]; artist_profile?: Artist | null }> =
    artworkRowsList.map((a) => ({
      ...a,
      hotspots: hotspotsByArtwork.get(a.id) ?? [],
      artist_profile: a.artist_id ? artistsMap.get(a.artist_id) ?? null : null,
    }));

  return { ...exhibition, room, artworks, artists };
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
    intro_video_file_id: (row.intro_video_file_id as string | null) ?? null,
    curation_type: ((row.curation_type as string | null) ?? 'solo') as 'solo' | 'group',
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

  const artists = await getArtistsForExhibition(db, exhibition.id);
  const artistsMap = new Map<string, Artist>(artists.map((a) => [a.id, a]));

  const artworkRows = await db
    .prepare('SELECT * FROM artworks WHERE exhibition_id = ? ORDER BY order_index ASC')
    .bind(exhibition.id)
    .all<Artwork>();

  const artworkRowsListById = artworkRows.results ?? [];
  const idsById = artworkRowsListById.map((a) => a.id);
  const hotspotsByArtworkById = new Map<string, ArtworkHotspot[]>();
  if (idsById.length > 0) {
    const placeholders = idsById.map(() => '?').join(',');
    const allHotspots = await db
      .prepare(`SELECT * FROM artwork_hotspots WHERE artwork_id IN (${placeholders})`)
      .bind(...idsById)
      .all<ArtworkHotspot>();
    for (const h of allHotspots.results ?? []) {
      const list = hotspotsByArtworkById.get(h.artwork_id) ?? [];
      list.push(h);
      hotspotsByArtworkById.set(h.artwork_id, list);
    }
  }

  const artworks: Array<Artwork & { hotspots: ArtworkHotspot[]; artist_profile?: Artist | null }> =
    artworkRowsListById.map((a) => {
      const artistProfile = a.artist_id ? artistsMap.get(a.artist_id) ?? null : null;
      const effectiveArtist =
        (!a.artist || a.artist.trim() === '' || a.artist === 'Untitled Artist') && artistProfile?.name
          ? artistProfile.name
          : (a.artist || artistProfile?.name || 'Untitled Artist');
      return {
        ...a,
        artist: effectiveArtist,
        hotspots: hotspotsByArtworkById.get(a.id) ?? [],
        artist_profile: artistProfile,
      };
    });

  return { ...exhibition, room, artworks, artists };
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
          start_date, end_date, is_published, cover_image_url, settings_json,
          intro_video_file_id, curation_type, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id, input.user_id, input.room_id, input.title, input.slug,
      input.description ?? null, input.curator_name ?? null,
      input.start_date ?? null, input.end_date ?? null,
      input.is_published ?? 0, input.cover_image_url ?? null,
      input.settings_json ?? null,
      input.intro_video_file_id ?? null,
      input.curation_type ?? 'solo',
      now
    )
    .run();

  return {
    id,
    ...input,
    intro_video_file_id: input.intro_video_file_id ?? null,
    curation_type: input.curation_type ?? 'solo',
    created_at: now,
  };
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
  const entries = Object.entries(patch).filter(([k]) => EXHIBITION_UPDATE_COLS.has(k));
  if (entries.length === 0) return false;
  const fields = entries.map(([k]) => `${k} = ?`).join(', ');
  const values = entries.map(([, v]) => v);
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
      input.spawn_json ?? null, input.is_public ?? 0, now
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
  const now = Math.floor(Date.now() / 1000);

  await db
    .prepare(
      `INSERT INTO artworks
         (id, exhibition_id, title, artist, year, medium, dimensions, description,
          artwork_type, media_file_id, youtube_video_id, audio_guide_file_id,
          transform_json, frame_config_json, order_index, updated_at, artist_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id, input.exhibition_id, input.title, input.artist,
      input.year ?? null, input.medium ?? null, input.dimensions ?? null,
      input.description ?? null, input.artwork_type,
      input.media_file_id ?? null, input.youtube_video_id ?? null,
      input.audio_guide_file_id ?? null, input.transform_json,
      input.frame_config_json, input.order_index, now,
      input.artist_id ?? null
    )
    .run();

  return { id, ...input, artist_id: input.artist_id ?? null, updated_at: now };
}

export async function updateArtworkRecord(
  db: D1Database,
  id: string,
  exhibitionId: string,
  patch: Record<string, unknown>
): Promise<boolean> {
  const entries = Object.entries(patch).filter(([k]) => ARTWORK_UPDATE_COLS.has(k));
  if (entries.length === 0) return false; // no real field changed → don't bump updated_at / churn cache
  const now = Math.floor(Date.now() / 1000);
  const setParts = entries.map(([k]) => `${k} = ?`);
  const values = entries.map(([, v]) => v);
  setParts.push('updated_at = ?');
  values.push(now);
  const result = await db
    .prepare(`UPDATE artworks SET ${setParts.join(', ')} WHERE id = ? AND exhibition_id = ?`)
    .bind(...values, id, exhibitionId)
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
         (id, artwork_id, x_percent, y_percent, title, description, audio_timestamp_seconds, audio_timestamp_end_seconds, audio_file_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id, input.artwork_id, input.x_percent, input.y_percent,
      input.title, input.description, input.audio_timestamp_seconds ?? null,
      input.audio_timestamp_end_seconds ?? null,
      input.audio_file_id ?? null
    )
    .run();

  return { id, ...input, audio_file_id: input.audio_file_id ?? null };
}

export async function updateHotspot(
  db: D1Database,
  id: string,
  input: Partial<Omit<ArtworkHotspotInput, 'artwork_id'>>
): Promise<ArtworkHotspot | null> {
  const fields = [
    ['title', input.title],
    ['description', input.description],
    ['audio_timestamp_seconds', input.audio_timestamp_seconds ?? null],
    ['audio_timestamp_end_seconds', input.audio_timestamp_end_seconds ?? null],
    ['audio_file_id', input.audio_file_id ?? null],
  ] as const;
  const sets = fields.map(([col]) => `${col} = ?`).join(', ');
  const values = fields.map(([, v]) => v);
  await db.prepare(`UPDATE artwork_hotspots SET ${sets} WHERE id = ?`).bind(...values, id).run();
  return db.prepare('SELECT * FROM artwork_hotspots WHERE id = ?').bind(id).first<ArtworkHotspot>();
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
         (id, email, full_name, auth_provider, google_sub, password_hash, role, is_team_member, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id, input.email, input.full_name, input.auth_provider,
      input.google_sub ?? null, input.password_hash ?? null,
      input.role ?? 'curator', input.is_team_member ?? 0, now
    )
    .run();

  return { id, ...input, is_team_member: input.is_team_member ?? 0, created_at: now };
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

// ─── Artists ──────────────────────────────────────────────────────────────────

export async function createArtistRecord(
  db: D1Database,
  input: ArtistInput
): Promise<Artist> {
  const id = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);

  await db
    .prepare(
      `INSERT INTO artists
         (id, exhibition_id, name, life_dates, quote, biography, contact_info, portrait_file_id, order_index, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id, input.exhibition_id, input.name, input.life_dates ?? null,
      input.quote ?? null, input.biography ?? null, input.contact_info ?? null,
      input.portrait_file_id ?? null, input.order_index ?? 0, now
    )
    .run();

  return { id, ...input, order_index: input.order_index ?? 0, created_at: now };
}

export async function getArtistsForExhibition(
  db: D1Database,
  exhibitionId: string
): Promise<Artist[]> {
  const result = await db
    .prepare('SELECT * FROM artists WHERE exhibition_id = ? ORDER BY order_index ASC, created_at ASC')
    .bind(exhibitionId)
    .all<Artist>();
  return result.results ?? [];
}

export async function getArtistById(
  db: D1Database,
  id: string
): Promise<Artist | null> {
  return db.prepare('SELECT * FROM artists WHERE id = ?').bind(id).first<Artist>();
}

export async function updateArtistRecord(
  db: D1Database,
  id: string,
  patch: Record<string, unknown>
): Promise<boolean> {
  const entries = Object.entries(patch).filter(([k]) => ARTIST_UPDATE_COLS.has(k));
  if (entries.length === 0) return false;
  const setParts = entries.map(([k]) => `${k} = ?`);
  const values = entries.map(([, v]) => v);
  const result = await db
    .prepare(`UPDATE artists SET ${setParts.join(', ')} WHERE id = ?`)
    .bind(...values, id)
    .run();
  return (result.meta?.changes ?? 0) > 0;
}

export async function deleteArtistRecord(
  db: D1Database,
  id: string
): Promise<boolean> {
  const result = await db
    .prepare('DELETE FROM artists WHERE id = ?')
    .bind(id)
    .run();
  return (result.meta?.changes ?? 0) > 0;
}
