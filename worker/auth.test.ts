/**
 * Task 4: Auth tests — PBKDF2, JWT, requireAuth
 */
import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from './crypto';
import { signJwt, verifyJwt, requireAuth } from './jwt';
import { handleGoogleAuthStart, handleGoogleAuthCallback } from './auth';

const TEST_SECRET = 'test-secret-key-at-least-32-chars!!';

// ─── PBKDF2 tests ────────────────────────────────────────────────────────────
describe('hashPassword / verifyPassword', () => {
  it('hash is not equal to plaintext', async () => {
    const hash = await hashPassword('hunter2');
    expect(hash).not.toBe('hunter2');
    expect(hash).toMatch(/^pbkdf2:sha256:/);
  });

  it('verify returns true for correct password', async () => {
    const hash = await hashPassword('correct-horse-battery-staple');
    expect(await verifyPassword('correct-horse-battery-staple', hash)).toBe(true);
  });

  it('verify returns false for wrong password', async () => {
    const hash = await hashPassword('correct-horse-battery-staple');
    expect(await verifyPassword('wrong-password', hash)).toBe(false);
  });

  it('two hashes of the same password differ (salted)', async () => {
    const h1 = await hashPassword('same-pass');
    const h2 = await hashPassword('same-pass');
    expect(h1).not.toBe(h2);
  });
});

// ─── JWT tests ────────────────────────────────────────────────────────────────
describe('signJwt / verifyJwt', () => {
  const payload = { sub: 'user-123', email: 'test@example.com', role: 'curator' };

  it('sign → verify round-trips correctly', async () => {
    const token = await signJwt(payload, TEST_SECRET);
    const verified = await verifyJwt(token, TEST_SECRET);

    expect(verified).not.toBeNull();
    expect(verified!.sub).toBe('user-123');
    expect(verified!.email).toBe('test@example.com');
    expect(verified!.role).toBe('curator');
  });

  it('rejects a token signed with a different secret', async () => {
    const token = await signJwt(payload, TEST_SECRET);
    const verified = await verifyJwt(token, 'different-secret-key-that-is-long-enough');
    expect(verified).toBeNull();
  });

  it('rejects a tampered payload', async () => {
    const token = await signJwt(payload, TEST_SECRET);
    const parts = token.split('.');
    // Modify the payload segment
    const tamperedBody = btoa(JSON.stringify({ ...payload, role: 'admin' }))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const tampered = `${parts[0]}.${tamperedBody}.${parts[2]}`;
    expect(await verifyJwt(tampered, TEST_SECRET)).toBeNull();
  });

  it('rejects an expired token', async () => {
    const token = await signJwt(payload, TEST_SECRET, -1); // already expired
    expect(await verifyJwt(token, TEST_SECRET)).toBeNull();
  });
});

// ─── requireAuth tests ────────────────────────────────────────────────────────
describe('requireAuth', () => {
  const payload = { sub: 'user-456', email: 'auth@example.com', role: 'curator' };

  it('returns payload for valid auth_token cookie', async () => {
    const token = await signJwt(payload, TEST_SECRET);
    const req = new Request('https://example.com/api/me', {
      headers: { Cookie: `auth_token=${token}` },
    });
    const result = await requireAuth(req, TEST_SECRET);
    expect(result).not.toBeNull();
    expect(result!.sub).toBe('user-456');
  });

  it('returns null when cookie is missing', async () => {
    const req = new Request('https://example.com/api/me');
    expect(await requireAuth(req, TEST_SECRET)).toBeNull();
  });

  it('returns null for invalid token in cookie', async () => {
    const req = new Request('https://example.com/api/me', {
      headers: { Cookie: 'auth_token=not.a.valid.jwt' },
    });
    expect(await requireAuth(req, TEST_SECRET)).toBeNull();
  });
});

// ─── Google OAuth state & scope tests ──────────────────────────────────────────
describe('handleGoogleAuthStart / handleGoogleAuthCallback (state & scope)', () => {
  const mockEnv = {
    GOOGLE_OAUTH_CLIENT_ID: 'mock-client-id',
    GOOGLE_OAUTH_CLIENT_SECRET: 'mock-secret',
    JWT_SECRET: TEST_SECRET,
  } as any;

  it('sets an oauth_state cookie and includes state in the Google authorize URL', () => {
    const req = new Request('https://app.example.com/api/auth/google');
    const res = handleGoogleAuthStart(req, mockEnv);
    const location = res.headers.get('Location')!;
    const setCookie = res.headers.get('Set-Cookie')!;
    const stateInUrl = new URL(location).searchParams.get('state');
    expect(stateInUrl).toBeTruthy();
    expect(setCookie).toContain('oauth_state=');
    expect(setCookie).toContain(stateInUrl!); // cookie value matches the URL state
    expect(setCookie).toContain('HttpOnly');
  });

  it('rejects the callback when state is missing or mismatched', async () => {
    // No cookie, no state → 403
    const bad = new Request('https://app.example.com/api/auth/google/callback?code=x');
    expect((await handleGoogleAuthCallback(bad, mockEnv)).status).toBe(403);

    // Mismatched state → 403
    const mismatched = new Request(
      'https://app.example.com/api/auth/google/callback?code=x&state=aaa',
      { headers: { Cookie: 'oauth_state=bbb' } }
    );
    expect((await handleGoogleAuthCallback(mismatched, mockEnv)).status).toBe(403);
  });

  it('requests only identity scopes, not Drive', () => {
    const res = handleGoogleAuthStart(new Request('https://app.example.com/api/auth/google'), mockEnv);
    const scope = new URL(res.headers.get('Location')!).searchParams.get('scope') ?? '';
    expect(scope).toContain('openid');
    expect(scope).toContain('email');
    expect(scope).not.toContain('drive');
  });
});


// ─── POST /api/auth/change-password tests ─────────────────────────────────────
import worker from './index';

describe('POST /api/auth/change-password', () => {
  function createMockDb(users: Array<{ id: string; email: string; password_hash: string }>) {
    return {
      prepare: (query: string) => {
        return {
          bind: (...args: any[]) => {
            return {
              first: async () => {
                if (query.includes('FROM users WHERE id = ?')) {
                  return users.find((u) => u.id === args[0]) || null;
                }
                if (query.includes('FROM users WHERE email = ?')) {
                  return users.find((u) => u.email === args[0]) || null;
                }
                return null;
              },
              run: async () => {
                if (query.includes('UPDATE users SET password_hash = ? WHERE id = ?')) {
                  const user = users.find((u) => u.id === args[1]);
                  if (user) {
                    user.password_hash = args[0];
                  }
                }
                return { success: true };
              },
            };
          },
        };
      },
    };
  }

  const mockCtx = {
    waitUntil: () => {},
    passThroughOnException: () => {},
  } as any;

  it('rejects an unauthenticated request with 401', async () => {
    const mockEnv = {
      JWT_SECRET_KEY: TEST_SECRET,
      DB: createMockDb([]) as any,
    } as any;

    const res = await worker.fetch(
      new Request('https://app.example.com/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: 'old-password', new_password: 'new-password-123' }),
      }),
      mockEnv,
      mockCtx
    );

    expect(res.status).toBe(401);
    const json = await res.json() as any;
    expect(json.error).toBeTruthy();
  });

  it('rejects missing or short new password with 400', async () => {
    const token = await signJwt({ sub: 'user-1', email: 'u1@example.com', role: 'curator' }, TEST_SECRET);
    const mockEnv = {
      JWT_SECRET_KEY: TEST_SECRET,
      DB: createMockDb([]) as any,
    } as any;

    const resShort = await worker.fetch(
      new Request('https://app.example.com/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `auth_token=${token}`,
        },
        body: JSON.stringify({ current_password: 'old-password', new_password: 'short' }),
      }),
      mockEnv,
      mockCtx
    );

    expect(resShort.status).toBe(400);
  });

  it('rejects wrong current password with 401', async () => {
    const initialHash = await hashPassword('correct-old-password');
    const users = [{ id: 'user-1', email: 'u1@example.com', password_hash: initialHash }];
    const token = await signJwt({ sub: 'user-1', email: 'u1@example.com', role: 'curator' }, TEST_SECRET);

    const mockEnv = {
      JWT_SECRET_KEY: TEST_SECRET,
      DB: createMockDb(users) as any,
    } as any;

    const res = await worker.fetch(
      new Request('https://app.example.com/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `auth_token=${token}`,
        },
        body: JSON.stringify({ current_password: 'wrong-old-password', new_password: 'brand-new-password' }),
      }),
      mockEnv,
      mockCtx
    );

    expect(res.status).toBe(401);
  });

  it('changes password when current is correct and returns 200 { ok: true }', async () => {
    const initialHash = await hashPassword('correct-old-password');
    const users = [{ id: 'user-1', email: 'u1@example.com', password_hash: initialHash }];
    const token = await signJwt({ sub: 'user-1', email: 'u1@example.com', role: 'curator' }, TEST_SECRET);

    const mockEnv = {
      JWT_SECRET_KEY: TEST_SECRET,
      DB: createMockDb(users) as any,
    } as any;

    const res = await worker.fetch(
      new Request('https://app.example.com/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `auth_token=${token}`,
        },
        body: JSON.stringify({ current_password: 'correct-old-password', new_password: 'brand-new-password' }),
      }),
      mockEnv,
      mockCtx
    );

    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.ok).toBe(true);

    // Verify password hash was updated
    expect(users[0].password_hash).not.toBe(initialHash);
    expect(await verifyPassword('brand-new-password', users[0].password_hash)).toBe(true);
  });
});
