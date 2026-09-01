import { describe, it, expect, beforeEach } from 'vitest';
import { registerMediaTokens, getMediaToken, clearMediaTokens } from './media-tokens';

describe('media-tokens registry', () => {
  beforeEach(() => clearMediaTokens());

  it('stores and retrieves tokens', () => {
    registerMediaTokens({ a: '123.sig' });
    expect(getMediaToken('a')).toBe('123.sig');
  });

  it('merges rather than replacing', () => {
    registerMediaTokens({ a: '1.x' });
    registerMediaTokens({ b: '2.y' });
    expect(getMediaToken('a')).toBe('1.x');
    expect(getMediaToken('b')).toBe('2.y');
  });

  it('ignores undefined maps', () => {
    registerMediaTokens(undefined);
    expect(getMediaToken('a')).toBeUndefined();
  });
});
