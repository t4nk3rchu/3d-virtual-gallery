/**
 * Task 4: JWT signing and verification via WebCrypto HMAC-SHA256
 *
 * Issues and signs HTTP-only cookies for curator sessions.
 * No external JWT library needed — WebCrypto provides all primitives.
 */

function base64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(b64: string): Uint8Array {
  const padded = b64.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

const ALGORITHM = { name: 'HMAC', hash: 'SHA-256' };

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    ALGORITHM,
    false,
    ['sign', 'verify']
  );
}

export interface JwtPayload {
  sub: string;    // user id
  email: string;
  role: string;
  iat: number;
  exp: number;
}

/**
 * Sign a JWT with HMAC-SHA256.
 * expiresInSeconds defaults to 7 days.
 */
export async function signJwt(
  payload: Omit<JwtPayload, 'iat' | 'exp'>,
  secret: string,
  expiresInSeconds = 60 * 60 * 24 * 7
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: JwtPayload = { ...payload, iat: now, exp: now + expiresInSeconds };

  const header = base64url(new TextEncoder().encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const body = base64url(new TextEncoder().encode(JSON.stringify(fullPayload)));
  const message = `${header}.${body}`;

  const key = await importKey(secret);
  const sig = await crypto.subtle.sign(ALGORITHM, key, new TextEncoder().encode(message));

  return `${message}.${base64url(sig)}`;
}

/**
 * Verify a JWT and return its payload, or null if invalid/expired.
 */
export async function verifyJwt(
  token: string,
  secret: string
): Promise<JwtPayload | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [header, body, signature] = parts;
  const message = `${header}.${body}`;

  const key = await importKey(secret);
  const sigBytes = base64urlDecode(signature);

  let valid: boolean;
  try {
    valid = await crypto.subtle.verify(
      ALGORITHM,
      key,
      sigBytes,
      new TextEncoder().encode(message)
    );
  } catch {
    return null;
  }

  if (!valid) return null;

  let payload: JwtPayload;
  try {
    payload = JSON.parse(new TextDecoder().decode(base64urlDecode(body)));
  } catch {
    return null;
  }

  if (payload.exp < Math.floor(Date.now() / 1000)) return null;

  return payload;
}

/**
 * Extract and verify the JWT from a request's cookie header.
 */
export async function requireAuth(
  req: Request,
  secret: string
): Promise<JwtPayload | null> {
  const cookieHeader = req.headers.get('Cookie') ?? '';
  const match = cookieHeader.match(/(?:^|;\s*)auth_token=([^;]+)/);
  if (!match) return null;

  return verifyJwt(match[1], secret);
}

/**
 * Build a Set-Cookie header value for the auth token.
 */
export function buildAuthCookie(token: string, maxAge = 60 * 60 * 24 * 7): string {
  return `auth_token=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

export function clearAuthCookie(): string {
  return 'auth_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0';
}
