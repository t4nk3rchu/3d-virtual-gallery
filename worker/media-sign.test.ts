import { describe, it, expect } from 'vitest';
import { signMediaToken, verifyMediaToken, buildMediaTokens } from './media-sign';

const KEY = 'test-signing-key-please-be-long';

describe('media-sign', () => {
  it('verifies a token it signed', async () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const tok = await signMediaToken('fileA', exp, KEY);
    expect(await verifyMediaToken('fileA', tok, KEY)).toBe(true);
  });

  it('rejects a token for a different fileId', async () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const tok = await signMediaToken('fileA', exp, KEY);
    expect(await verifyMediaToken('fileB', tok, KEY)).toBe(false);
  });

  it('rejects a tampered signature', async () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const tok = await signMediaToken('fileA', exp, KEY);
    const tampered = tok.slice(0, -2) + (tok.endsWith('AA') ? 'BB' : 'AA');
    expect(await verifyMediaToken('fileA', tampered, KEY)).toBe(false);
  });

  it('rejects an expired token', async () => {
    const past = Math.floor(Date.now() / 1000) - 10;
    const tok = await signMediaToken('fileA', past, KEY);
    expect(await verifyMediaToken('fileA', tok, KEY)).toBe(false);
  });

  it('rejects a malformed token', async () => {
    expect(await verifyMediaToken('fileA', 'garbage', KEY)).toBe(false);
    expect(await verifyMediaToken('fileA', '', KEY)).toBe(false);
  });

  it('builds a token map, skipping falsy and deduping', async () => {
    const map = await buildMediaTokens(['a', 'a', null, undefined, 'b'], KEY, 60);
    expect(Object.keys(map).sort()).toEqual(['a', 'b']);
    expect(await verifyMediaToken('a', map.a, KEY)).toBe(true);
  });
});
