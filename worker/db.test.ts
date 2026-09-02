import { describe, it, expect, afterAll } from 'vitest';
import { Miniflare } from 'miniflare';
import fs from 'fs';
import path from 'path';
import {
  createUser,
  createExhibition,
  createRoom,
  createArtworkRecord,
  updateArtworkRecord,
  updateExhibition,
  getExhibitionById,
  createArtistRecord,
  getArtistsForExhibition,
  getArtistById,
  updateArtistRecord,
  deleteArtistRecord,
  createHotspot,
} from './db';

let mf: Miniflare | null = null;
let dbPromise: Promise<D1Database> | null = null;

async function makeTestDb(): Promise<D1Database> {
  if (!dbPromise) {
    dbPromise = (async () => {
      mf = new Miniflare({
        modules: true,
        script: 'export default { fetch() { return new Response("ok"); } }',
        d1Databases: ['DB'],
      });
      const db = (await mf.getD1Database('DB')) as unknown as D1Database;

      const migrationFiles = [
        '0001_init.sql',
        '0002_seed_default_rooms.sql',
        '0003_hotspot_audio_file.sql',
        '0004_artwork_updated_at.sql',
        '0005_artists_and_intro_video.sql',
        '0006_users_team_flag.sql',
        '0007_hotspot_audio_end.sql',
      ];

      for (const file of migrationFiles) {
        const filePath = path.resolve(__dirname, '../migrations', file);
        if (fs.existsSync(filePath)) {
          const rawSql = fs.readFileSync(filePath, 'utf-8');
          const statements = rawSql
            .replace(/--.*$/gm, '')
            .split(';')
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
          for (const statement of statements) {
            await db.prepare(statement).run();
          }
        }
      }
      return db;
    })();
  }
  return dbPromise;
}

afterAll(async () => {
  if (mf) {
    await mf.dispose();
  }
});

describe('db.ts helpers & column whitelisting', () => {
  it('bumps artwork updated_at on update and ignores non-whitelisted columns', async () => {
    const db = await makeTestDb();
    const user = await createUser(db, {
      email: 'curator@test.com',
      full_name: 'Test Curator',
      auth_provider: 'password',
      password_hash: 'hash',
      role: 'curator',
    });
    const room = await createRoom(db, {
      owner_user_id: user.id,
      name: 'Room 1',
      description: null,
      thumbnail_url: null,
      glb_file_id: 'glb1',
      glb_source: 'curator_drive',
      spawn_json: null,
      is_public: 0,
    });
    const ex = await createExhibition(db, {
      user_id: user.id,
      room_id: room.id,
      title: 'Ex 1',
      slug: `ex-1-${Date.now()}`,
      description: null,
      curator_name: null,
      start_date: null,
      end_date: null,
      is_published: 0,
      cover_image_url: null,
      settings_json: null,
    });

    const art = await createArtworkRecord(db, {
      exhibition_id: ex.id,
      title: 'A',
      artist: 'B',
      artwork_type: 'IMAGE_2D',
      media_file_id: 'fid',
      transform_json: '{}',
      frame_config_json: '{}',
      order_index: 0,
    } as never);
    const before = art.updated_at;

    // Malicious/unknown key must be ignored, not interpolated into SQL:
    await updateArtworkRecord(db, art.id, ex.id, {
      title: 'A2',
      ['id = id; DROP TABLE artworks; --']: 1,
    } as never);

    const rows = await db
      .prepare('SELECT title, updated_at FROM artworks WHERE id = ?')
      .bind(art.id)
      .all<{ title: string; updated_at: number }>();
    expect(rows.results[0].title).toBe('A2');
    expect(rows.results[0].updated_at).toBeGreaterThanOrEqual(before);

    // table still exists (injection ignored):
    const count = await db
      .prepare('SELECT COUNT(*) as n FROM artworks')
      .first<{ n: number }>();
    expect(count?.n).toBe(1);
  });

  it('returns false and does NOT bump updated_at when no whitelisted field changes', async () => {
    const db = await makeTestDb();
    const user = await createUser(db, {
      email: 'c2@test.com', full_name: 'C2', auth_provider: 'password', password_hash: 'h', role: 'curator',
    });
    const room = await createRoom(db, {
      owner_user_id: user.id, name: 'R', description: null, thumbnail_url: null,
      glb_file_id: 'g', glb_source: 'curator_drive', spawn_json: null, is_public: 0,
    });
    const ex = await createExhibition(db, {
      user_id: user.id, room_id: room.id, title: 'E', slug: `e-${Date.now()}`,
      description: null, curator_name: null, start_date: null, end_date: null,
      is_published: 0, cover_image_url: null, settings_json: null,
    });
    const art = await createArtworkRecord(db, {
      exhibition_id: ex.id, title: 'A', artist: 'B', artwork_type: 'IMAGE_2D',
      media_file_id: 'fid', transform_json: '{}', frame_config_json: '{}', order_index: 0,
    } as never);
    const before = art.updated_at;

    // Patch with only non-whitelisted keys → no real change.
    const changed = await updateArtworkRecord(db, art.id, ex.id, { id: 'x', exhibition_id: 'y' } as never);
    expect(changed).toBe(false);

    const row = await db
      .prepare('SELECT updated_at FROM artworks WHERE id = ?')
      .bind(art.id)
      .first<{ updated_at: number }>();
    expect(row?.updated_at).toBe(before); // unchanged — no needless cache-version churn
  });

  it('creates, retrieves, updates and deletes artist records and hydrates artist_profile', async () => {
    const db = await makeTestDb();
    const user = await createUser(db, {
      email: 'c3@test.com', full_name: 'C3', auth_provider: 'password', password_hash: 'h', role: 'curator',
    });
    const room = await createRoom(db, {
      owner_user_id: user.id, name: 'R', description: null, thumbnail_url: null,
      glb_file_id: 'g', glb_source: 'curator_drive', spawn_json: null, is_public: 0,
    });
    const ex = await createExhibition(db, {
      user_id: user.id, room_id: room.id, title: 'Ex Art', slug: `ex-art-${Date.now()}`,
      description: null, curator_name: null, start_date: null, end_date: null,
      is_published: 1, cover_image_url: null, settings_json: null,
      intro_video_file_id: 'vid_123', curation_type: 'group',
    });

    expect(ex.intro_video_file_id).toBe('vid_123');
    expect(ex.curation_type).toBe('group');

    // Create Artist
    const artist = await createArtistRecord(db, {
      exhibition_id: ex.id,
      name: 'Trần Văn Cẩn',
      life_dates: '1910 - 1994',
      quote: 'Art is the essence of life',
      biography: 'Master of Vietnamese fine arts.',
      contact_info: 'Hanoi',
      portrait_file_id: 'portrait_drive_id',
      order_index: 0,
    });
    expect(artist.id).toBeDefined();
    expect(artist.name).toBe('Trần Văn Cẩn');

    // Fetch artists
    const artists = await getArtistsForExhibition(db, ex.id);
    expect(artists.length).toBe(1);
    expect(artists[0].quote).toBe('Art is the essence of life');

    // Create Artwork linked to artist
    const art = await createArtworkRecord(db, {
      exhibition_id: ex.id,
      artist_id: artist.id,
      title: 'Em Thúy',
      artist: 'Trần Văn Cẩn',
      artwork_type: 'IMAGE_2D',
      media_file_id: 'img_drive_id',
      transform_json: '{}',
      frame_config_json: '{}',
      order_index: 0,
    } as never);
    expect(art.artist_id).toBe(artist.id);

    // Verify getExhibitionById hydration
    const detail = await getExhibitionById(db, ex.id);
    expect(detail?.artists?.length).toBe(1);
    expect(detail?.artworks[0].artist_profile?.name).toBe('Trần Văn Cẩn');
    expect(detail?.artworks[0].artist_profile?.life_dates).toBe('1910 - 1994');

    // Update Artist
    const updated = await updateArtistRecord(db, artist.id, { quote: 'Updated Quote' });
    expect(updated).toBe(true);
    const byId = await getArtistById(db, artist.id);
    expect(byId?.quote).toBe('Updated Quote');

    // Delete Artist
    const deleted = await deleteArtistRecord(db, artist.id);
    expect(deleted).toBe(true);
    const emptyArtists = await getArtistsForExhibition(db, ex.id);
    expect(emptyArtists.length).toBe(0);
  });

  it('hydrates hotspots for multiple artworks correctly (batched)', async () => {
    const db = await makeTestDb();
    const user = await createUser(db, {
      email: `batch-user-${Date.now()}@example.com`,
      full_name: 'Batch User',
      auth_provider: 'password',
    });
    const room = await createRoom(db, {
      name: 'R1',
      glb_file_id: 'g1',
      glb_source: 'platform_drive',
    });
    const ex = await createExhibition(db, {
      user_id: user.id,
      room_id: room.id,
      title: 'Batch Ex',
      slug: `batch-ex-${Date.now()}`,
    });
    const a1 = await createArtworkRecord(db, {
      exhibition_id: ex.id,
      title: 'A1',
      artist: 'X',
      artwork_type: 'IMAGE_2D',
      media_file_id: 'm1',
      transform_json: '{}',
      frame_config_json: '{}',
      order_index: 0,
    } as never);
    const a2 = await createArtworkRecord(db, {
      exhibition_id: ex.id,
      title: 'A2',
      artist: 'X',
      artwork_type: 'IMAGE_2D',
      media_file_id: 'm2',
      transform_json: '{}',
      frame_config_json: '{}',
      order_index: 1,
    } as never);
    await createHotspot(db, {
      artwork_id: a1.id,
      x_percent: 10,
      y_percent: 10,
      title: 'h1',
      description: 'd1',
    });
    await createHotspot(db, {
      artwork_id: a2.id,
      x_percent: 20,
      y_percent: 20,
      title: 'h2',
      description: 'd2',
    });

    const detail = await getExhibitionById(db, ex.id, user.id);
    const byId = Object.fromEntries(detail!.artworks.map((a) => [a.id, a]));
    expect(byId[a1.id].hotspots.map((h) => h.title)).toEqual(['h1']);
    expect(byId[a2.id].hotspots.map((h) => h.title)).toEqual(['h2']);
  });
});

