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
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const stateParam = url.searchParams.get('state');
  const stateCookie = readCookie(req, 'oauth_state');

  if (!code) {
    return new Response('Missing auth code', { status: 400 });
  }

  if (!stateParam || !stateCookie || stateParam !== stateCookie) {
    return new Response('Invalid OAuth state', { status: 403 });
  }

  // Exchange code for tokens
  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_OAUTH_CLIENT_ID,
      client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET,
      redirect_uri: getRedirectUri(req),
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenRes.ok) {
    return new Response('Token exchange failed', { status: 502 });
  }

  const tokens = await tokenRes.json<{ access_token: string }>();

  // Get user info
  const userRes = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!userRes.ok) {
    return new Response('Failed to get user info', { status: 502 });
  }

  const userInfo = await userRes.json<{
    sub: string;
    email: string;
    name: string;
  }>();

  const user = await upsertGoogleUser(
    env.DB,
    userInfo.sub,
    userInfo.email,
    userInfo.name
  );

  const token = await signJwt(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      is_team: user.role === 'admin' || (user as any).is_team_member === 1,
    },
    env.JWT_SECRET_KEY
  );

  const headers = new Headers({ Location: '/' });
  headers.append('Set-Cookie', buildAuthCookie(token));
  headers.append('Set-Cookie', clearStateCookie());

  return new Response(null, {
    status: 302,
    headers,
  });
}

// ─── Password auth ────────────────────────────────────────────────────────────

export async function handlePasswordRegister(
  req: Request,
  env: Env
): Promise<Response> {
  let body: { email?: string; password?: string; full_name?: string };
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const { email, password, full_name } = body;
  if (!email || !password || !full_name) {
    return new Response('Missing fields', { status: 400 });
  }

  const existing = await getUserByEmail(env.DB, email);
  if (existing) {
    return new Response('Email already registered', { status: 409 });
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

  const token = await signJwt(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      is_team: user.role === 'admin' || (user as any).is_team_member === 1,
    },
    env.JWT_SECRET_KEY
  );

  return new Response(JSON.stringify({ id: user.id }), {
    status: 201,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': buildAuthCookie(token),
    },
  });
}

export async function handlePasswordLogin(
  req: Request,
  env: Env
): Promise<Response> {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const { email, password } = body;
  if (!email || !password) {
    return new Response('Missing fields', { status: 400 });
  }

  const user = await getUserByEmail(env.DB, email);
  if (!user || !user.password_hash) {
    return new Response('Invalid credentials', { status: 401 });
  }

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) {
    return new Response('Invalid credentials', { status: 401 });
  }

  const token = await signJwt(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      is_team: user.role === 'admin' || (user as any).is_team_member === 1,
    },
    env.JWT_SECRET_KEY
  );

  return new Response(JSON.stringify({ id: user.id }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': buildAuthCookie(token),
    },
  });
}

export function handleLogout(): Response {
  return new Response(null, {
    status: 200,
    headers: { 'Set-Cookie': clearAuthCookie() },
  });
}
