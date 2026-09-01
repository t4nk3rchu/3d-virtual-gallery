/**
 * Worker entry point — routes all /api/* requests
 * Spec §7 API surface
 */
import type { Env } from './types';
import { requireAuth } from './jwt';
import { handleMediaProxy } from './media-proxy';
import { signMediaToken } from './media-sign';
import {
  handleGoogleAuthStart,
  handleGoogleAuthCallback,
  handlePasswordRegister,
  handlePasswordLogin,
  handleLogout,
} from './auth';
import {
  handleExhibitions,
  handleExhibitionById,
  handleExhibitionBySlug,
  handleRooms,
  handleArtworks,
  handleArtworkById,
  handleHotspots,
  handleHotspotById,
  handleArtists,
  handleArtistById,
  handleExhibitionArtists,
} from './routes/crud';
import { handleEvents } from './routes/events';

function corsHeaders(origin = '*'): HeadersInit {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Range',
    'Access-Control-Allow-Credentials': 'true',
  };
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;

    // CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    // ── Media proxy (public, auth not needed at serve time) ──────────────────
    if (path.startsWith('/api/media/')) {
      return handleMediaProxy(req, env, ctx);
    }

    // ── Auth routes ──────────────────────────────────────────────────────────
    if (path === '/api/auth/google') {
      return handleGoogleAuthStart(req, env);
    }
    if (path === '/api/auth/google/callback') {
      return handleGoogleAuthCallback(req, env);
    }
    if (path === '/api/auth/register' && req.method === 'POST') {
      return handlePasswordRegister(req, env);
    }
    if (path === '/api/auth/login' && req.method === 'POST') {
      return handlePasswordLogin(req, env);
    }
    if (path === '/api/auth/logout' && req.method === 'POST') {
      return handleLogout();
    }

    const jwtSecret = env.JWT_SECRET_KEY || 'reda-gallery-default-jwt-secret-key-32b';

    // ── Auth me route ───────────────────────────────────────────────────────
    if (path === '/api/auth/me' && req.method === 'GET') {
      const auth = await requireAuth(req, jwtSecret);
      if (!auth) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(
        JSON.stringify({
          id: auth.sub,
          email: auth.email,
          full_name: auth.email,
          role: auth.role,
          is_team: auth.is_team ?? false,
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ── Public config (SA email so curators can share picked files with it) ──
    if (path === '/api/config' && req.method === 'GET') {
      return new Response(
        JSON.stringify({ serviceAccountEmail: env.GDRIVE_SA_CLIENT_EMAIL ?? '' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ── Events (public write — no auth required, no PII) ────────────────────
    if (path === '/api/events') {
      return handleEvents(req, env);
    }

    // ── Exhibitions by slug (public read) ────────────────────────────────────
    const slugMatch = path.match(/^\/api\/exhibitions\/by-slug\/(.+)$/);
    if (slugMatch && req.method === 'GET') {
      const auth = await requireAuth(req, jwtSecret);
      return handleExhibitionBySlug(req, env, auth, decodeURIComponent(slugMatch[1]));
    }

    // ── From here: auth required ─────────────────────────────────────────────
    const auth = await requireAuth(req, jwtSecret);
    if (!auth) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Mint a media token for one file (studio preview of just-picked media,
    // before the exhibition fetch supplies tokens). Any authed curator may.
    const mediaTokenMatch = path.match(/^\/api\/media-token\/([a-zA-Z0-9_-]+)$/);
    if (mediaTokenMatch && req.method === 'GET') {
      const exp = Math.floor(Date.now() / 1000) + 21600; // 6h, matches buildMediaTokens
      const token = await signMediaToken(mediaTokenMatch[1], exp, env.MEDIA_SIGNING_KEY);
      return new Response(JSON.stringify({ token }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Exhibitions list + create
    if (path === '/api/exhibitions') {
      return handleExhibitions(req, env, auth);
    }

    // Exhibition Artists list
    const exhibitionArtistsMatch = path.match(/^\/api\/exhibitions\/([^/]+)\/artists$/);
    if (exhibitionArtistsMatch) {
      return handleExhibitionArtists(req, env, auth, exhibitionArtistsMatch[1]);
    }

    // Exhibition by ID
    const exhibitionIdMatch = path.match(/^\/api\/exhibitions\/([^/]+)$/);
    if (exhibitionIdMatch) {
      return handleExhibitionById(req, env, auth, exhibitionIdMatch[1], ctx);
    }

    // Rooms
    if (path === '/api/rooms') {
      return handleRooms(req, env, auth);
    }

    // Artists CRUD
    if (path === '/api/artists') {
      return handleArtists(req, env, auth);
    }

    const artistIdMatch = path.match(/^\/api\/artists\/([^/]+)$/);
    if (artistIdMatch) {
      return handleArtistById(req, env, auth, artistIdMatch[1]);
    }

    // Artworks
    if (path === '/api/artworks') {
      return handleArtworks(req, env, auth);
    }

    const artworkIdMatch = path.match(/^\/api\/artworks\/([^/]+)$/);
    if (artworkIdMatch) {
      return handleArtworkById(req, env, auth, artworkIdMatch[1]);
    }

    // Hotspots
    if (path === '/api/hotspots') {
      return handleHotspots(req, env, auth);
    }

    const hotspotIdMatch = path.match(/^\/api\/hotspots\/([^/]+)$/);
    if (hotspotIdMatch) {
      return handleHotspotById(req, env, auth, hotspotIdMatch[1]);
    }

    return new Response('Not Found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;
