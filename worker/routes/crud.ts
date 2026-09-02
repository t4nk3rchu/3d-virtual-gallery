/**
 * Task 5: CRUD API routes — exhibitions, rooms, artworks, hotspots
 * All mutation routes enforce ownership (non-owners → 403).
 * by-slug hides drafts from non-owners.
 */
import type { Env } from '../types';
import type { JwtPayload } from '../jwt';
import {
  getExhibitionBySlug,
  getExhibitionById,
  getExhibitionsByUser,
  createExhibition,
  updateExhibition,
  deleteExhibition,
  createRoom,
  getRoomsForUser,
  createArtworkRecord,
  updateArtworkRecord,
  deleteArtworkRecord,
  createHotspot,
  deleteHotspot,
  updateHotspot,
  createArtistRecord,
  getArtistsForExhibition,
  getArtistById,
  updateArtistRecord,
  deleteArtistRecord,
} from '../db';
import { warmCache } from '../media-proxy';
import { tokensForExhibition } from '../media-sign';

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ─── Exhibitions ──────────────────────────────────────────────────────────────

export async function handleExhibitions(
  req: Request,
  env: Env,
  auth: JwtPayload
): Promise<Response> {
  if (req.method === 'GET') {
    const list = await getExhibitionsByUser(env.DB, auth.sub);
    return json(list);
  }

  if (req.method === 'POST') {
    const body = await req.json<Record<string, unknown>>();
    const required = ['room_id', 'title', 'slug'];
    for (const f of required) {
      if (!body[f]) return json({ error: `Missing field: ${f}` }, 400);
    }

    const exhibition = await createExhibition(env.DB, {
      user_id: auth.sub,
      room_id: body.room_id as string,
      title: body.title as string,
      slug: body.slug as string,
      description: (body.description as string) ?? null,
      curator_name: (body.curator_name as string) ?? null,
      start_date: (body.start_date as string) ?? null,
      end_date: (body.end_date as string) ?? null,
      is_published: 0,
      cover_image_url: (body.cover_image_url as string) ?? null,
      settings_json: (body.settings_json as string) ?? null,
    });

    return json(exhibition, 201);
  }

  return json({ error: 'Method Not Allowed' }, 405);
}

export async function handleExhibitionById(
  req: Request,
  env: Env,
  auth: JwtPayload | null,
  id: string,
  ctx?: ExecutionContext
): Promise<Response> {
  if (req.method === 'GET') {
    const detail = await getExhibitionById(env.DB, id, auth?.sub);
    if (!detail) return json({ error: 'Not found' }, 404);
    if (!detail.is_published && detail.user_id !== auth?.sub) {
      return json({ error: 'Not found' }, 404); // draft hidden from non-owners
    }
    const media_tokens = await tokensForExhibition(detail, env.MEDIA_SIGNING_KEY);
    return json({ ...detail, media_tokens });
  }

  if (!auth) return json({ error: 'Unauthorized' }, 401);

  if (req.method === 'PUT') {
    const body = await req.json<Record<string, unknown>>();
    // Strip user_id from patch — ownership is enforced by WHERE user_id = ?
    const { user_id: _drop, ...patch } = body;

    if (typeof patch.room_id === 'string') {
      const rooms = await getRoomsForUser(env.DB, auth.sub); // returns owned + public rooms
      if (!rooms.some((r) => r.id === patch.room_id)) {
        return json({ error: 'Room not found or not accessible' }, 403);
      }
    }

    const updated = await updateExhibition(env.DB, id, auth.sub, patch as never);
    if (!updated) return json({ error: 'Not found or not authorized' }, 404);

    // Warm cache when publishing (Fix #6: warmCache on publish)
    if (patch.is_published === 1 || patch.is_published === '1' || patch.is_published === true) {
      const detail = await getExhibitionById(env.DB, id, auth.sub);
      if (detail && ctx) {
        if (detail.room?.glb_file_id) {
          ctx.waitUntil(warmCache(detail.room.glb_file_id, env, ctx, String(detail.room.created_at)));
        }
        for (const art of detail.artworks || []) {
          if (art.media_file_id) {
            ctx.waitUntil(warmCache(art.media_file_id, env, ctx, String(art.updated_at)));
          }
          if (art.audio_guide_file_id) {
            ctx.waitUntil(warmCache(art.audio_guide_file_id, env, ctx, String(art.updated_at)));
          }
        }
      }
    }

    return json({ ok: true });
  }

  if (req.method === 'DELETE') {
    const deleted = await deleteExhibition(env.DB, id, auth.sub);
    if (!deleted) return json({ error: 'Not found or not authorized' }, 404);
    return json({ ok: true });
  }

  return json({ error: 'Method Not Allowed' }, 405);
}

export async function handleExhibitionBySlug(
  req: Request,
  env: Env,
  auth: JwtPayload | null,
  slug: string
): Promise<Response> {
  const detail = await getExhibitionBySlug(env.DB, slug, auth?.sub);
  if (!detail) return json({ error: 'Not found' }, 404);
  const media_tokens = await tokensForExhibition(detail, env.MEDIA_SIGNING_KEY);
  return json({ ...detail, media_tokens });
}

// ─── Rooms ────────────────────────────────────────────────────────────────────

export async function handleRooms(
  req: Request,
  env: Env,
  auth: JwtPayload
): Promise<Response> {
  if (req.method === 'GET') {
    const rooms = await getRoomsForUser(env.DB, auth.sub);
    return json(rooms);
  }

  if (req.method === 'POST') {
    const body = await req.json<Record<string, unknown>>();
    if (!body.name || !body.glb_file_id) {
      return json({ error: 'Missing fields: name, glb_file_id' }, 400);
    }

    const room = await createRoom(env.DB, {
      owner_user_id: auth.sub,
      name: body.name as string,
      description: (body.description as string) ?? null,
      thumbnail_url: (body.thumbnail_url as string) ?? null,
      glb_file_id: body.glb_file_id as string,
      glb_source: 'curator_drive',
      spawn_json: (body.spawn_json as string) ?? null,
      is_public: 0,
    });

    return json(room, 201);
  }

  return json({ error: 'Method Not Allowed' }, 405);
}

// ─── Artworks ─────────────────────────────────────────────────────────────────

async function getExhibitionOwner(env: Env, exhibitionId: string): Promise<string | null> {
  const row = await env.DB
    .prepare('SELECT user_id FROM exhibitions WHERE id = ?')
    .bind(exhibitionId)
    .first<{ user_id: string }>();
  return row?.user_id ?? null;
}

export async function handleArtworks(
  req: Request,
  env: Env,
  auth: JwtPayload
): Promise<Response> {
  if (req.method === 'POST') {
    const body = await req.json<Record<string, unknown>>();
    const { exhibition_id } = body;

    if (!exhibition_id) return json({ error: 'Missing exhibition_id' }, 400);

    const owner = await getExhibitionOwner(env, exhibition_id as string);
    if (owner !== auth.sub) return json({ error: 'Forbidden' }, 403);

    const artwork = await createArtworkRecord(env.DB, {
      exhibition_id: exhibition_id as string,
      title: (body.title as string) ?? 'Untitled',
      artist: (body.artist as string) ?? '',
      year: (body.year as string) ?? null,
      medium: (body.medium as string) ?? null,
      dimensions: (body.dimensions as string) ?? null,
      description: (body.description as string) ?? null,
      artwork_type: (body.artwork_type as 'IMAGE_2D' | 'VIDEO') ?? 'IMAGE_2D',
      media_file_id: (body.media_file_id as string) ?? null,
      youtube_video_id: (body.youtube_video_id as string) ?? null,
      audio_guide_file_id: (body.audio_guide_file_id as string) ?? null,
      transform_json: (body.transform_json as string) ?? '{"position":[0,1,0],"rotation":[0,0,0],"scale":[1,1,1]}',
      frame_config_json: (body.frame_config_json as string) ?? '{"frameType":"wood","frameWidth":0.05,"matWidth":0.03,"matColor":"#FFFFFF","showPlacard":true}',
      order_index: (body.order_index as number) ?? 0,
      artist_id: (body.artist_id as string) ?? null,
    });

    return json(artwork, 201);
  }

  return json({ error: 'Method Not Allowed' }, 405);
}

export async function handleArtworkById(
  req: Request,
  env: Env,
  auth: JwtPayload,
  id: string
): Promise<Response> {
  // Get the artwork to find its exhibition_id
  const artwork = await env.DB
    .prepare('SELECT * FROM artworks WHERE id = ?')
    .bind(id)
    .first<{ exhibition_id: string }>();

  if (!artwork) return json({ error: 'Not found' }, 404);

  const owner = await getExhibitionOwner(env, artwork.exhibition_id);
  if (owner !== auth.sub) return json({ error: 'Forbidden' }, 403);

  if (req.method === 'PUT') {
    const body = await req.json<Record<string, unknown>>();
    await updateArtworkRecord(env.DB, id, artwork.exhibition_id, body as never);
    return json({ ok: true });
  }

  if (req.method === 'DELETE') {
    await deleteArtworkRecord(env.DB, id, artwork.exhibition_id);
    return json({ ok: true });
  }

  return json({ error: 'Method Not Allowed' }, 405);
}

// ─── Hotspots ─────────────────────────────────────────────────────────────────

async function getArtworkExhibitionOwner(
  env: Env,
  artworkId: string
): Promise<string | null> {
  const row = await env.DB
    .prepare(
      `SELECT e.user_id FROM artworks a
       JOIN exhibitions e ON e.id = a.exhibition_id
       WHERE a.id = ?`
    )
    .bind(artworkId)
    .first<{ user_id: string }>();
  return row?.user_id ?? null;
}

export async function handleHotspots(
  req: Request,
  env: Env,
  auth: JwtPayload
): Promise<Response> {
  if (req.method === 'POST') {
    const body = await req.json<Record<string, unknown>>();
    const { artwork_id } = body;

    if (!artwork_id) return json({ error: 'Missing artwork_id' }, 400);

    const owner = await getArtworkExhibitionOwner(env, artwork_id as string);
    if (owner !== auth.sub) return json({ error: 'Forbidden' }, 403);

    const hotspot = await createHotspot(env.DB, {
      artwork_id: artwork_id as string,
      x_percent: (body.x_percent as number) ?? 50,
      y_percent: (body.y_percent as number) ?? 50,
      title: (body.title as string) ?? '',
      description: (body.description as string) ?? '',
      audio_timestamp_seconds: (body.audio_timestamp_seconds as number) ?? null,
      audio_timestamp_end_seconds: (body.audio_timestamp_end_seconds as number) ?? null,
      audio_file_id: (body.audio_file_id as string) || null,
    });

    return json(hotspot, 201);
  }

  return json({ error: 'Method Not Allowed' }, 405);
}

export async function handleHotspotById(
  req: Request,
  env: Env,
  auth: JwtPayload,
  id: string
): Promise<Response> {
  const row = await env.DB
    .prepare('SELECT artwork_id FROM artwork_hotspots WHERE id = ?')
    .bind(id)
    .first<{ artwork_id: string }>();

  if (!row) return json({ error: 'Not found' }, 404);

  const owner = await getArtworkExhibitionOwner(env, row.artwork_id);
  if (owner !== auth.sub) return json({ error: 'Forbidden' }, 403);

  if (req.method === 'PUT') {
    const body = await req.json() as Record<string, unknown>;
    const cleanAudioId = (body.audio_file_id as string) || null;
    const updated = await updateHotspot(env.DB, id, {
      title: (body.title as string) || 'Detail Hotspot',
      description: (body.description as string) || '',
      audio_timestamp_seconds: (body.audio_timestamp_seconds as number) ?? null,
      audio_timestamp_end_seconds: (body.audio_timestamp_end_seconds as number) ?? null,
      audio_file_id: cleanAudioId,
    });
    return updated ? json(updated) : json({ error: 'Not found' }, 404);
  }

  if (req.method === 'DELETE') {
    await deleteHotspot(env.DB, id, row.artwork_id);
    return json({ ok: true });
  }

  return json({ error: 'Method Not Allowed' }, 405);
}

// ─── Artists ──────────────────────────────────────────────────────────────────

export async function handleExhibitionArtists(
  req: Request,
  env: Env,
  auth: JwtPayload,
  exhibitionId: string
): Promise<Response> {
  if (req.method === 'GET') {
    // Owner-only: the public viewer gets artists via the publish-checked by-slug
    // endpoint. This studio route must not leak other curators' (or draft) artists.
    const owner = await getExhibitionOwner(env, exhibitionId);
    if (owner !== auth.sub) return json({ error: 'Forbidden' }, 403);

    const artists = await getArtistsForExhibition(env.DB, exhibitionId);
    return json(artists);
  }
  if (req.method === 'POST') {
    const owner = await getExhibitionOwner(env, exhibitionId);
    if (owner !== auth.sub) return json({ error: 'Forbidden' }, 403);

    const body = await req.json<Record<string, unknown>>();
    if (!body.name) return json({ error: 'Missing name' }, 400);

    const artist = await createArtistRecord(env.DB, {
      exhibition_id: exhibitionId,
      name: body.name as string,
      life_dates: (body.life_dates as string) ?? null,
      quote: (body.quote as string) ?? null,
      biography: (body.biography as string) ?? null,
      contact_info: (body.contact_info as string) ?? null,
      portrait_file_id: (body.portrait_file_id as string) ?? null,
      order_index: (body.order_index as number) ?? 0,
    });
    return json(artist, 201);
  }
  return json({ error: 'Method Not Allowed' }, 405);
}

export async function handleArtists(
  req: Request,
  env: Env,
  auth: JwtPayload
): Promise<Response> {
  if (req.method === 'POST') {
    const body = await req.json<Record<string, unknown>>();
    const { exhibition_id, name } = body;
    if (!exhibition_id || !name) {
      return json({ error: 'Missing exhibition_id or name' }, 400);
    }
    const owner = await getExhibitionOwner(env, exhibition_id as string);
    if (owner !== auth.sub) return json({ error: 'Forbidden' }, 403);

    const artist = await createArtistRecord(env.DB, {
      exhibition_id: exhibition_id as string,
      name: name as string,
      life_dates: (body.life_dates as string) ?? null,
      quote: (body.quote as string) ?? null,
      biography: (body.biography as string) ?? null,
      contact_info: (body.contact_info as string) ?? null,
      portrait_file_id: (body.portrait_file_id as string) ?? null,
      order_index: (body.order_index as number) ?? 0,
    });
    return json(artist, 201);
  }
  return json({ error: 'Method Not Allowed' }, 405);
}

export async function handleArtistById(
  req: Request,
  env: Env,
  auth: JwtPayload,
  id: string
): Promise<Response> {
  const artist = await getArtistById(env.DB, id);
  if (!artist) return json({ error: 'Not found' }, 404);

  const owner = await getExhibitionOwner(env, artist.exhibition_id);
  if (owner !== auth.sub) return json({ error: 'Forbidden' }, 403);

  if (req.method === 'PUT') {
    const body = await req.json<Record<string, unknown>>();
    await updateArtistRecord(env.DB, id, body as never);
    return json({ ok: true });
  }

  if (req.method === 'DELETE') {
    await deleteArtistRecord(env.DB, id);
    return json({ ok: true });
  }

  return json({ error: 'Method Not Allowed' }, 405);
}
