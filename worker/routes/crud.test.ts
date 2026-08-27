import { describe, it, expect, afterAll } from 'vitest';
import { Miniflare } from 'miniflare';
import fs from 'fs';
import path from 'path';
import type { Env } from '../types';
import type { JwtPayload } from '../jwt';
import { createUser, createRoom, createExhibition } from '../db';
import {
  handleExhibitionById,
  handleArtists,
  handleArtistById,
  handleExhibitionArtists,
} from './crud';

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
      ];

      for (const file of migrationFiles) {
        const filePath = path.resolve(__dirname, '../../migrations', file);
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

function fakeCtx(): ExecutionContext {
  return {
    waitUntil: () => {},
    passThroughOnException: () => {},
  } as unknown as ExecutionContext;
}

function putReq(body: Record<string, unknown>): Request {
  return new Request('https://gallery.example.com/api/exhibitions/123', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function setupOwnedExhibition() {
  const db = await makeTestDb();
  const user = await createUser(db, {
    email: `curator-${Date.now()}@test.com`,
    full_name: 'Test Curator',
    auth_provider: 'password',
    password_hash: 'hash',
    role: 'curator',
  });
  const room = await createRoom(db, {
    owner_user_id: user.id,
    name: 'My Room',
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
    title: 'Initial Title',
    slug: `initial-slug-${Date.now()}`,
    description: 'Initial Description',
    curator_name: 'Initial Curator',
    start_date: null,
    end_date: null,
    is_published: 0,
    cover_image_url: null,
    settings_json: null,
  });

  const env: Env = { DB: db } as Env;
  const auth: JwtPayload = { sub: user.id, email: user.email, role: 'curator' };

  return { env, auth, ex, user, room };
}

describe('handleExhibitionById PUT & room swap guards', () => {
  it('edits exhibition metadata but never the slug', async () => {
    const { env, auth, ex } = await setupOwnedExhibition();
    const res = await handleExhibitionById(
      putReq({ title: 'New Title', slug: 'hacked-slug', description: 'D' }),
      env,
      auth,
      ex.id,
      fakeCtx()
    );
    expect(res.status).toBe(200);
    const row = await env.DB
      .prepare('SELECT title, slug FROM exhibitions WHERE id = ?')
      .bind(ex.id)
      .first<{ title: string; slug: string }>();
    expect(row?.title).toBe('New Title');
    expect(row?.slug).toBe(ex.slug); // unchanged
  });

  it('rejects swapping to a room the caller cannot use', async () => {
    const { env, auth, ex } = await setupOwnedExhibition();
    const otherUser = await createUser(env.DB, {
      email: `other-${Date.now()}@test.com`,
      full_name: 'Other User',
      auth_provider: 'password',
      password_hash: 'hash',
      role: 'curator',
    });
    const otherRoom = await createRoom(env.DB, {
      owner_user_id: otherUser.id,
      name: 'Other Room',
      glb_file_id: 'g',
      glb_source: 'curator_drive',
      description: null,
      thumbnail_url: null,
      spawn_json: null,
      is_public: 0,
    });
    const res = await handleExhibitionById(
      putReq({ room_id: otherRoom.id }),
      env,
      auth,
      ex.id,
      fakeCtx()
    );
    expect(res.status).toBe(403);
  });

  it('allows curators to create, update, list, and delete artists for their exhibition', async () => {
    const { env, auth, ex } = await setupOwnedExhibition();

    // 1. Create Artist
    const createReq = new Request('https://gallery.example.com/api/artists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        exhibition_id: ex.id,
        name: 'Trần Văn Cẩn',
        life_dates: '1910 - 1994',
        quote: 'Art is eternal',
        biography: 'Vietnamese master painter',
      }),
    });
    const createRes = await handleArtists(createReq, env, auth);
    expect(createRes.status).toBe(201);
    const artist = (await createRes.json()) as { id: string; name: string };
    expect(artist.name).toBe('Trần Văn Cẩn');

    // 2. List Artists
    const listReq = new Request(`https://gallery.example.com/api/exhibitions/${ex.id}/artists`, {
      method: 'GET',
    });
    const listRes = await handleExhibitionArtists(listReq, env, auth, ex.id);
    expect(listRes.status).toBe(200);
    const list = (await listRes.json()) as Array<{ id: string; name: string }>;
    expect(list.length).toBe(1);
    expect(list[0].id).toBe(artist.id);

    // 3. Update Artist
    const updateReq = new Request(`https://gallery.example.com/api/artists/${artist.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quote: 'Updated Quote' }),
    });
    const updateRes = await handleArtistById(updateReq, env, auth, artist.id);
    expect(updateRes.status).toBe(200);

    // 4. Delete Artist
    const deleteReq = new Request(`https://gallery.example.com/api/artists/${artist.id}`, {
      method: 'DELETE',
    });
    const deleteRes = await handleArtistById(deleteReq, env, auth, artist.id);
    expect(deleteRes.status).toBe(200);

    // 5. Verify Empty
    const listRes2 = await handleExhibitionArtists(listReq, env, auth, ex.id);
    const list2 = (await listRes2.json()) as Array<unknown>;
    expect(list2.length).toBe(0);
  });

  it('forbids a non-owner from listing another exhibition\'s artists', async () => {
    const { env, auth, ex } = await setupOwnedExhibition();

    // Owner adds an artist.
    await handleArtists(
      new Request('https://gallery.example.com/api/artists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exhibition_id: ex.id, name: 'Secret Artist' }),
      }),
      env,
      auth
    );

    // A different authenticated curator must not read them.
    const intruder = { sub: 'intruder-user', email: 'intruder@test.com', role: 'curator' } as typeof auth;
    const listReq = new Request(`https://gallery.example.com/api/exhibitions/${ex.id}/artists`, {
      method: 'GET',
    });
    const res = await handleExhibitionArtists(listReq, env, intruder, ex.id);
    expect(res.status).toBe(403);
  });
});
