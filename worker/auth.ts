/**
 * Task 4: Google OAuth + password auth handlers
 */
import type { Env } from './types';
import { hashPassword, verifyPassword } from './crypto';
import {
  signJwt,
  buildAuthCookie,
  clearAuthCookie,
  buildStateCookie,
  clearStateCookie,
  readCookie,
} from './jwt';
import { getUserByEmail, upsertGoogleUser, createUser } from './db';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

function getRedirectUri(req: Request): string {
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}/api/auth/google/callback`;
}

// ─── Google OAuth ─────────────────────────────────────────────────────────────

export function handleGoogleAuthStart(req: Request, env: Env): Response {
  const redirectUri = getRedirectUri(req);
  const state = crypto.randomUUID();
  // Note: Login flow requests identity scopes only. Drive Picker uses drive.file on demand.
  const params = new URLSearchParams({
    client_id: env.GOOGLE_OAUTH_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
  });
  return new Response(null, {
    status: 302,
    headers: {
      Location: `${GOOGLE_AUTH_URL}?${params}`,
      'Set-Cookie': buildStateCookie(state),
    },
  });
}

export async function handleGoogleAuthCallback(
  req: Request,
  env: Env
): Promise<Response> {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const stateParam = url.searchParams.get('state');
    const errorParam = url.searchParams.get('error');
    const stateCookie = readCookie(req, 'oauth_state');

    if (errorParam) {
      return new Response(`Google OAuth error: ${errorParam}`, { status: 400 });
    }

    if (!code) {
      return new Response('Missing auth code from Google OAuth callback', { status: 400 });
    }

    if (!stateParam || !stateCookie || stateParam !== stateCookie) {
      return new Response(
        'Invalid OAuth state. Please ensure cookies are enabled and try signing in again.',
        { status: 403 }
      );
    }

    if (!env.GOOGLE_OAUTH_CLIENT_SECRET) {
      return new Response(
        'GOOGLE_OAUTH_CLIENT_SECRET is not configured in worker environment. Set it with: wrangler secret put GOOGLE_OAUTH_CLIENT_SECRET',
        { status: 500 }
      );
    }

    // Exchange code for tokens
    const redirectUri = getRedirectUri(req);
    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_OAUTH_CLIENT_ID,
        client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      return new Response(
        `Google token exchange failed (${tokenRes.status}): ${errText}. Redirect URI used: ${redirectUri}`,
        { status: 502 }
      );
    }

    const tokens = await tokenRes.json<{ access_token: string }>();

    // Get user info
    const userRes = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userRes.ok) {
      return new Response('Failed to retrieve user profile info from Google', { status: 502 });
    }

    const userInfo = await userRes.json<{
      sub: string;
      email: string;
      name: string;
    }>();

    if (!env.DB) {
      return new Response('Database binding (DB) is not configured in worker.', { status: 500 });
    }

    const user = await upsertGoogleUser(
      env.DB,
      userInfo.sub,
      userInfo.email,
      userInfo.name
    );

    const jwtSecret = env.JWT_SECRET_KEY || 'reda-gallery-default-jwt-secret-key-32b';
    const token = await signJwt(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        is_team: user.role === 'admin' || (user as any).is_team_member === 1,
      },
      jwtSecret
    );

    const headers = new Headers({ Location: '/' });
    headers.append('Set-Cookie', buildAuthCookie(token));
    headers.append('Set-Cookie', clearStateCookie());

    return new Response(null, {
      status: 302,
      headers,
    });
  } catch (err: any) {
    console.error('Google auth callback error:', err);
    return new Response(
      err?.message?.includes('no such table')
        ? "Database schema not initialized. Please run: 'pnpm wrangler d1 migrations apply reda-database --remote'"
        : `Google OAuth Callback Error: ${err?.message || String(err)}`,
      { status: 500 }
    );
  }
}

// ─── Password auth ────────────────────────────────────────────────────────────

export async function handlePasswordRegister(
  req: Request,
  env: Env
): Promise<Response> {
  try {
    let body: { email?: string; password?: string; full_name?: string };
    try {
      body = await req.json();
    } catch {
      return new Response('Invalid JSON payload in request body', { status: 400 });
    }

    const { email, password, full_name } = body;
    if (!email || !password || !full_name) {
      return new Response('Missing required fields: email, password, and full name are required.', {
        status: 400,
      });
    }

    if (!env.DB) {
      return new Response('Database binding (DB) is not configured in worker environment.', {
        status: 500,
      });
    }

    const existing = await getUserByEmail(env.DB, email);
    if (existing) {
      return new Response('An account with this email is already registered.', { status: 409 });
    }

    const hash = await hashPassword(password);
    const user = await createUser(env.DB, {
      email,
      full_name,
      auth_provider: 'password',
      google_sub: null,
      password_hash: hash,
      role: 'curator',
    });

    const jwtSecret = env.JWT_SECRET_KEY || 'reda-gallery-default-jwt-secret-key-32b';
    const token = await signJwt(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        is_team: user.role === 'admin' || (user as any).is_team_member === 1,
      },
      jwtSecret
    );

    return new Response(JSON.stringify({ id: user.id }), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': buildAuthCookie(token),
      },
    });
  } catch (err: any) {
    console.error('Password register error:', err);
    return new Response(
      err?.message?.includes('no such table')
        ? "Database schema not initialized on remote D1. Please run: 'pnpm wrangler d1 migrations apply reda-database --remote'"
        : `Registration failed: ${err?.message || String(err)}`,
      { status: 500 }
    );
  }
}

export async function handlePasswordLogin(
  req: Request,
  env: Env
): Promise<Response> {
  try {
    let body: { email?: string; password?: string };
    try {
      body = await req.json();
    } catch {
      return new Response('Invalid JSON payload in request body', { status: 400 });
    }

    const { email, password } = body;
    if (!email || !password) {
      return new Response('Missing email or password fields', { status: 400 });
    }

    if (!env.DB) {
      return new Response('Database binding (DB) is not configured in worker environment.', {
        status: 500,
      });
    }

    const user = await getUserByEmail(env.DB, email);
    if (!user || !user.password_hash) {
      return new Response('Invalid email or password credentials', { status: 401 });
    }

    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) {
      return new Response('Invalid email or password credentials', { status: 401 });
    }

    const jwtSecret = env.JWT_SECRET_KEY || 'reda-gallery-default-jwt-secret-key-32b';
    const token = await signJwt(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        is_team: user.role === 'admin' || (user as any).is_team_member === 1,
      },
      jwtSecret
    );

    return new Response(JSON.stringify({ id: user.id }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': buildAuthCookie(token),
      },
    });
  } catch (err: any) {
    console.error('Password login error:', err);
    return new Response(
      err?.message?.includes('no such table')
        ? "Database schema not initialized on remote D1. Please run: 'pnpm wrangler d1 migrations apply reda-database --remote'"
        : `Login failed: ${err?.message || String(err)}`,
      { status: 500 }
    );
  }
}

export function handleLogout(): Response {
  return new Response(null, {
    status: 200,
    headers: { 'Set-Cookie': clearAuthCookie() },
  });
}
