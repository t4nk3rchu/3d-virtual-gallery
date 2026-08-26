/**
 * Task 4: Auth tests — PBKDF2, JWT, requireAuth
 */
import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from './crypto';
import { signJwt, verifyJwt, requireAuth } from './jwt';

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
