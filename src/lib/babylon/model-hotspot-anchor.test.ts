import { describe, it, expect } from 'vitest';
import { Vector3 } from '@babylonjs/core';
import { serializeAnchor, parseAnchor } from './model-hotspot-anchor';

describe('anchor serialize/parse', () => {
  it('round-trips a point and normal', () => {
    const json = serializeAnchor(new Vector3(1, 2, 3), new Vector3(0, 0, 1));
    expect(JSON.parse(json)).toEqual({ p: [1, 2, 3], n: [0, 0, 1] });
    const parsed = parseAnchor(json)!;
    expect(parsed.p.asArray()).toEqual([1, 2, 3]);
    expect(parsed.n.asArray()).toEqual([0, 0, 1]);
  });
  it('returns null for null/invalid input', () => {
    expect(parseAnchor(null)).toBeNull();
    expect(parseAnchor('not json')).toBeNull();
  });
});
