import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pemToPkcs8, buildServiceAccountAssertion, getDriveAccessToken } from './gdrive-auth';
import { base64url } from './jwt';

async function makePemKeypair() {
  const pair = await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true, ['sign', 'verify']
  );
  const pkcs8 = await crypto.subtle.exportKey('pkcs8', pair.privateKey);
  const b64 = base64url(pkcs8).replace(/-/g, '+').replace(/_/g, '/');
  const pem = `-----BEGIN PRIVATE KEY-----\n${b64.replace(/(.{64})/g, '$1\n')}\n-----END PRIVATE KEY-----\n`;
  return { pem, publicKey: pair.publicKey };
}

describe('gdrive-auth', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('parses a PEM into DER bytes', async () => {
    const { pem } = await makePemKeypair();
    const der = pemToPkcs8(pem);
    expect(der.byteLength).toBeGreaterThan(100);
  });

  it('builds an RS256 assertion that verifies against the public key', async () => {
    const { pem, publicKey } = await makePemKeypair();
    const jwt = await buildServiceAccountAssertion('svc@proj.iam.gserviceaccount.com', pem, 1_700_000_000);
    const [h, p, s] = jwt.split('.');
    expect(h && p && s).toBeTruthy();
    const sig = Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
    const ok = await crypto.subtle.verify(
      { name: 'RSASSA-PKCS1-v1_5' }, publicKey, sig, new TextEncoder().encode(`${h}.${p}`)
    );
    expect(ok).toBe(true);
    const claim = JSON.parse(atob(p.replace(/-/g, '+').replace(/_/g, '/')));
    expect(claim.iss).toBe('svc@proj.iam.gserviceaccount.com');
    expect(claim.scope).toContain('drive.readonly');
    expect(claim.aud).toBe('https://oauth2.googleapis.com/token');
  });

  it('exchanges the assertion for an access token and caches it', async () => {
    const { pem } = await makePemKeypair();
    const env: any = { GDRIVE_SA_CLIENT_EMAIL: 'svc@x.iam', GDRIVE_SA_PRIVATE_KEY: pem };
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ access_token: 'ya29.TOKEN', expires_in: 3600 }), { status: 200 })
    );
    vi.stubGlobal('fetch', fetchMock);
    const t1 = await getDriveAccessToken(env);
    const t2 = await getDriveAccessToken(env);
    expect(t1).toBe('ya29.TOKEN');
    expect(t2).toBe('ya29.TOKEN');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });
});
